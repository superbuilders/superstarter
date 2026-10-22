import { context, type MeterProvider, TraceFlags, trace } from "@opentelemetry/api"
import { type AnyValueMap, logs, SeverityNumber } from "@opentelemetry/api-logs"
import { resourceFromAttributes } from "@opentelemetry/resources"
import {
	BatchLogRecordProcessor,
	LoggerProvider,
	type LogRecordExporter
} from "@opentelemetry/sdk-logs"
import type { SpanProcessor } from "@opentelemetry/sdk-trace-base"
import {
	Array as Arr,
	Console,
	Effect,
	Formatter,
	type LogLevel,
	Record,
	Result,
	String as Str
} from "effect"
import { OperationalTelemetryProviderConflict } from "#destination.ts"
import { type ExportHealth, exportScopeOf } from "#export-health.ts"
import {
	drainLifecycle,
	type FlushMethod,
	makeExportLedger,
	rejectedReasons,
	settled,
	TelemetryFlushFailure
} from "#flush.ts"
import { exportBisecting } from "#otlp-batch.ts"
import { OPERATIONAL_SCOPE, operationalResourceAttributes } from "#resource.ts"
import type { OperationalOrigin } from "#schema.ts"
import {
	correlationAttributes,
	type NativeAttributes,
	searchableTelemetryAttributes,
	serializeEvidence
} from "#span-export.ts"

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

/** One structured record and the level it was written at. */
export type OperationalLogEntry = Readonly<{
	record: Readonly<Record<string, unknown>>
	level: LogLevel.LogLevel
}>

/** Full structured body plus native searchable attributes. Correlation uses the same aliases as
 * spans, not nested JSON paths that require project settings. The host console receives the same
 * body, so Vercel Logs hold every record even when PostHog is unreachable. */
export const emitOperationalLog = ({ record, level }: OperationalLogEntry) =>
	Result.try(() => {
		const fields = searchableTelemetryAttributes(Record.remove(record, "message"))
		const { attributes: nested } = record
		const annotations: NativeAttributes =
			typeof nested === "object" && nested !== null && !Arr.isArray(nested)
				? searchableTelemetryAttributes({ ...nested })
				: {}
		const attributes: AnyValueMap = {
			...fields,
			...annotations,
			...correlationAttributes(annotations)
		}
		const { traceId, spanId } = fields
		const held =
			typeof traceId === "string" && typeof spanId === "string"
				? trace.setSpanContext(context.active(), {
						traceId,
						spanId,
						traceFlags: TraceFlags.SAMPLED
					})
				: context.active()
		const evidence = Result.try(() => serializeEvidence(record))
		const body = Result.getOrElse(
			Result.flatMap(evidence, (serialized) =>
				serialized === undefined ? Result.fail(serialized) : Result.succeed(serialized)
			),
			() => Formatter.formatJson(record)
		)
		const write = FAILED_LEVELS.has(level) ? Console.error : Console.log
		Effect.runSync(write(body))
		logs.getLogger(OPERATIONAL_SCOPE).emit({
			body,
			attributes,
			context: held,
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

/** The existing host span lifecycle flushes this log provider too. Vercel's CompositeSpanProcessor
 * waits for every processor's forceFlush after requests. SDK batching defaults are retained. The
 * process meter provider receives the SDK's own log and processor measurements
 * (`otel.sdk.log.created`, `otel.sdk.processor.log.*`), including native queue-full drops.
 * https://posthog.com/docs/logs/installation/nextjs
 * https://opentelemetry.io/docs/specs/semconv/otel/sdk-metrics/ */
export const createOperationalLogProcessor = ({
	origin,
	exporter,
	meterProvider,
	health
}: OperationalLogPipeline): Effect.Effect<SpanProcessor, OperationalTelemetryProviderConflict> =>
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
		const pass = (method: FlushMethod) =>
			Effect.gen(function* () {
				const native = yield* settled([Promise.resolve().then(() => batch[method]())])
				const failed = yield* ledger.receipt
				const causes = [...rejectedReasons(native), ...failed]
				health.observeFlush({ signal: "logs", method, causes })
				if (Arr.isArrayNonEmpty(causes)) {
					return yield* TelemetryFlushFailure.make({ signal: "logs", method, causes })
				}
			})
		const lifecycle = drainLifecycle({ signal: "logs", pass })
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
		const processor: SpanProcessor = {
			onStart() {},
			onEnd() {},
			forceFlush: lifecycle.forceFlush,
			shutdown: () =>
				provider.shutdown().finally(() => {
					logs.disable()
				})
		}
		return Effect.succeed(processor)
	})
