import type { MeterProvider } from "@opentelemetry/api"
import { logs, SeverityNumber } from "@opentelemetry/api-logs"
import { resourceFromAttributes } from "@opentelemetry/resources"
import {
	BatchLogRecordProcessor,
	LoggerProvider,
	type LogRecordExporter
} from "@opentelemetry/sdk-logs"

import {
	Array as Arr,
	Console,
	Effect,
	Formatter,
	type LogLevel,
	Result,
	String as Str
} from "effect"
import { OperationalTelemetryProviderConflict } from "#destination.ts"
import { type ExportHealth, exportScopeOf } from "#export-health.ts"
import { type DrainLifecycle, drainLifecycle, makeExportLedger } from "#flush.ts"
import { exportBisecting } from "#otlp-batch.ts"
import { OPERATIONAL_SCOPE, operationalResourceAttributes } from "#resource.ts"
import type { OperationalOrigin } from "#schema.ts"
import { searchableTelemetryAttributes, serializeEvidence, sessionAliases } from "#span-export.ts"

/**
 * @limitKind published
 * @owner OpenTelemetry JavaScript logs SDK
 * @unit log records
 * @scope one export batch
 * @constraint SDK default, explicitly preserved by our sole log processor as our documented
 * per-request record cap; PostHog's SDK spec leaves the cap to each SDK and halves on a 413
 * @source https://github.com/open-telemetry/opentelemetry-js/blob/experimental/v0.222.0/experimental/packages/sdk-logs/src/export/BatchLogRecordProcessorBase.ts
 * The installed SDK defaults maxExportBatchSize to 512 and maxQueueSize to 2048.
 * @verified 2026-09-29
 */
const OPERATIONAL_LOG_EXPORT_BATCH_SIZE = 512

const severities = {
	All: SeverityNumber.TRACE,
	Trace: SeverityNumber.TRACE,
	Debug: SeverityNumber.DEBUG,
	Info: SeverityNumber.INFO,
	Warn: SeverityNumber.WARN,
	Error: SeverityNumber.ERROR,
	Fatal: SeverityNumber.FATAL,
	None: SeverityNumber.UNSPECIFIED
} satisfies Record<LogLevel.LogLevel, SeverityNumber>

/** Levels whose records the host console writes as errors. */
const FAILED_LEVELS: ReadonlySet<LogLevel.LogLevel> = new Set(["Error", "Fatal"])

/** One structured record, the facts it is searched by, and the level it was written at. */
export type OperationalLogEntry = Readonly<{
	body: Readonly<Record<string, unknown>>
	attributes: Readonly<Record<string, unknown>>
	level: LogLevel.LogLevel
}>

/** The full structured body once, plus the native scalar attributes it is searched by and
 * PostHog's session aliases, not nested JSON paths that require project settings. The record's
 * trace and span are the active context's, as the SDK reads it. The host console receives the
 * same body, so Vercel Logs hold every record even when PostHog is unreachable. */
export const emitOperationalLog = ({ body, attributes, level }: OperationalLogEntry) =>
	Result.try(() => {
		const searchable = searchableTelemetryAttributes(attributes)
		const evidence = Result.try(() => serializeEvidence(body))
		const text = Result.getOrElse(
			Result.flatMap(evidence, (serialized) =>
				serialized === undefined ? Result.fail(serialized) : Result.succeed(serialized)
			),
			() => Formatter.formatJson(body)
		)
		const write = FAILED_LEVELS.has(level) ? Console.error : Console.log
		Effect.runSync(write(text))
		logs.getLogger(OPERATIONAL_SCOPE).emit({
			body: text,
			attributes: { ...searchable, ...sessionAliases(searchable) },
			severityNumber: severities[level],
			severityText: Str.toUpperCase(level)
		})
	})

/** The process log pipeline: who it describes, the OTLP exporter it drains into, the installed
 * meter provider its SDK measurements bind to, and the pipeline's export health. */
export type OperationalLogPipeline = Readonly<{
	origin: OperationalOrigin
	exporter: LogRecordExporter
	meterProvider: MeterProvider
	health: ExportHealth
}>

/** The process's one log provider, drained by the operational processor's pass: it is that
 * pass's last step, so every log the pass's own work wrote leaves with it. SDK batching defaults
 * are retained. The
 * process meter provider receives the SDK's own log and processor measurements
 * (`otel.sdk.log.created`, `otel.sdk.processor.log.*`), including native queue-full drops.
 * https://posthog.com/docs/logs/installation/nextjs
 * https://opentelemetry.io/docs/specs/semconv/otel/sdk-metrics/ */
export const createOperationalLogProcessor = ({
	origin,
	exporter,
	meterProvider,
	health
}: OperationalLogPipeline): Effect.Effect<DrainLifecycle, OperationalTelemetryProviderConflict> =>
	Effect.suspend(() => {
		const ledger = makeExportLedger("logs")
		const batch = new BatchLogRecordProcessor({
			selfObsMeterProvider: meterProvider,
			exporter: {
				export(records, callback) {
					exportBisecting({
						signal: "logs",
						records,
						send: (packet, done) => {
							exporter.export([...packet], done)
						},
						callback: ledger.track(callback),
						health,
						scopeOf: (packet) =>
							exportScopeOf(
								Arr.map(packet, (record) => ({ context: record.spanContext, time: record.hrTime }))
							)
					})
				},
				forceFlush: () => exporter.forceFlush(),
				shutdown: () => exporter.shutdown()
			},
			maxExportBatchSize: OPERATIONAL_LOG_EXPORT_BATCH_SIZE
		})
		const lifecycle = drainLifecycle({
			signal: "logs",
			ledger,
			health,
			steps: (method) => [() => batch[method]()]
		})
		const provider = new LoggerProvider({
			meterProvider,
			resource: resourceFromAttributes(operationalResourceAttributes(origin)),
			processors: [
				{
					onEmit: (record) => {
						batch.onEmit(record)
					},
					forceFlush: lifecycle.forceFlush,
					shutdown: lifecycle.shutdown
				}
			]
		})
		if (logs.setGlobalLoggerProvider(provider) !== provider) {
			return OperationalTelemetryProviderConflict.make({ signal: "logs" })
		}
		return Effect.succeed({
			forceFlush: lifecycle.forceFlush,
			shutdown: () =>
				provider.shutdown().finally(() => {
					logs.disable()
				})
		})
	})
