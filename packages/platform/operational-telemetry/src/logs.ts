import {
	context,
	type MeterProvider,
	type ObservableResult,
	TraceFlags,
	trace
} from "@opentelemetry/api"
import { type AnyValueMap, logs, SeverityNumber } from "@opentelemetry/api-logs"
import { ExportResultCode } from "@opentelemetry/core"
import { JsonLogsSerializer } from "@opentelemetry/otlp-transformer"
import { resourceFromAttributes } from "@opentelemetry/resources"
import {
	BatchLogRecordProcessor,
	LoggerProvider,
	type LogRecordExporter,
	type ReadableLogRecord
} from "@opentelemetry/sdk-logs"
import type { SpanProcessor } from "@opentelemetry/sdk-trace-base"
import {
	Array as Arr,
	Cause,
	Console,
	Effect,
	Exit,
	Formatter,
	type LogLevel,
	Record,
	Result,
	Schema,
	String as Str
} from "effect"
import { OperationalTelemetryProviderConflict } from "#destination.ts"
import { logEvidenceParts } from "#evidence-parts.ts"
import { exportScopeOf, observeExport, observeExportAttempt, observeFlush } from "#export-health.ts"
import { coalescedFlush, rejectedReasons, settled } from "#flush.ts"
import { exportSizedBatch, operationalBatchLimits } from "#otlp-batch.ts"
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
 * @constraint SDK default, explicitly preserved by our sole log processor
 * @source https://github.com/open-telemetry/opentelemetry-js/blob/experimental/v0.222.0/experimental/packages/sdk-logs/src/export/BatchLogRecordProcessorBase.ts
 * The installed SDK defaults maxExportBatchSize to 512 and maxQueueSize to 2048.
 * @verified 2026-09-29
 */
const OPERATIONAL_LOG_EXPORT_BATCH_SIZE = 512

/** Shutting the log provider down left a drain or the provider itself unsettled. */
class OperationalLogShutdownFailure extends Schema.TaggedError<
	OperationalLogShutdownFailure,
	{ readonly brand: unique symbol }
>()("OperationalLogShutdownFailure", {
	causes: Schema.Array(Schema.Unknown)
}) {}

/** One drain pass's receipt when any offered record was rejected, unexported or proven dropped. */
class LogDrainFailure extends Schema.TaggedError<
	LogDrainFailure,
	{ readonly brand: unique symbol }
>()("LogDrainFailure", {
	rejectedBatches: Schema.Int,
	firstExportFailure: Schema.Unknown,
	incompleteBatches: Schema.Int,
	transportFailures: Schema.Int,
	firstTransportFailure: Schema.Unknown,
	droppedRecords: Schema.Int,
	causes: Schema.Array(Schema.Unknown)
}) {}

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

/** Offered records and how many of them the batch handed to export, per drain generation. */
type Admissions = { offered: number; handed: number }

/** The process log pipeline: who it describes, the OTLP exporter it drains into, and the installed
 * meter provider its SDK measurements bind to. */
export type OperationalLogPipeline = Readonly<{
	origin: OperationalOrigin
	exporter: LogRecordExporter
	meterProvider: MeterProvider
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
	meterProvider
}: OperationalLogPipeline): Effect.Effect<SpanProcessor, OperationalTelemetryProviderConflict> =>
	Effect.suspend(() => {
		let admissions: Admissions = { offered: 0, handed: 0 }
		const attribution = new WeakMap<ReadableLogRecord, Admissions>()
		const unsettledAdmissions = new Set<Admissions>()
		let awaitingExport = 0
		const inFlight = new Set<Promise<void>>()
		let transportFailures = 0
		let firstTransportFailure: unknown = undefined
		let rejectedBatches = 0
		let firstExportFailure: unknown = undefined
		const meter = meterProvider.getMeter(OPERATIONAL_SCOPE)
		const offered = meter.createCounter("superstarter.telemetry.logs.offered", {
			unit: "{log_record}"
		})
		const dropped = meter.createCounter("superstarter.telemetry.logs.dropped", {
			unit: "{log_record}"
		})
		const awaiting = meter.createObservableGauge("superstarter.telemetry.logs.awaiting_export", {
			unit: "{log_record}",
			description:
				"Offered original records not yet handed to export or proven dropped by a completed drain; not exact SDK queue depth."
		})
		const observeAwaiting = (result: ObservableResult) => {
			result.observe(awaitingExport)
		}
		awaiting.addCallback(observeAwaiting)
		const batch = new BatchLogRecordProcessor({
			selfObsMeterProvider: meterProvider,
			exporter: {
				export(records, callback) {
					for (const record of records) {
						const admission = attribution.get(record)
						if (admission !== undefined) {
							admission.handed += 1
							awaitingExport -= 1
						}
					}
					const completed = Promise.withResolvers<void>()
					inFlight.add(completed.promise)
					exportSizedBatch({
						items: records,
						serialize: (packet) => JsonLogsSerializer.serializeRequest([...packet]),
						send: (packet, done) => {
							observeExportAttempt({ signal: "logs", count: packet.length })
							exporter.export([...packet], done)
						},
						callback: (result) => {
							inFlight.delete(completed.promise)
							completed.resolve()
							if (result.code !== ExportResultCode.SUCCESS) {
								rejectedBatches += 1
								if (firstExportFailure === undefined) {
									firstExportFailure = result.error === undefined ? result : result.error
								}
							}
							callback(result)
						},
						observe: (packet, result, kind) => {
							observeExport({
								origin,
								signal: "logs",
								count: packet.length,
								result,
								scopeOf: () =>
									exportScopeOf(
										Arr.map(packet, (record) => ({
											context: record.spanContext,
											time: record.hrTime
										}))
									),
								kind
							})
						},
						limits: operationalBatchLimits,
						signal: "logs",
						expandOversized: logEvidenceParts
					})
				},
				forceFlush: () =>
					Promise.resolve()
						.then(() => exporter.forceFlush())
						.catch((error: unknown) => {
							transportFailures += 1
							if (firstTransportFailure === undefined) {
								firstTransportFailure = error
							}
						}),
				shutdown: () => exporter.shutdown()
			},
			maxExportBatchSize: OPERATIONAL_LOG_EXPORT_BATCH_SIZE
		})

		const settleDropped = (
			through: ReadonlyArray<Readonly<Admissions>>,
			drained: boolean
		): number => {
			if (!drained) {
				return 0
			}
			let droppedRecords = 0
			for (const admission of through) {
				droppedRecords += admission.offered - admission.handed
				unsettledAdmissions.delete(admission)
			}
			awaitingExport -= droppedRecords
			dropped.add(droppedRecords, { reason: "not_exported_after_drain" })
			return droppedRecords
		}
		/** This pass's receipt; the counters start again for the next pass. */
		const takeReceipt = (causes: readonly unknown[], droppedRecords: number) => {
			const receipt = {
				rejectedBatches,
				firstExportFailure,
				incompleteBatches: inFlight.size,
				transportFailures,
				firstTransportFailure,
				droppedRecords,
				causes
			}
			rejectedBatches = 0
			firstExportFailure = undefined
			transportFailures = 0
			firstTransportFailure = undefined
			return receipt
		}
		const drainNative = (method: "forceFlush" | "shutdown") =>
			Effect.gen(function* () {
				unsettledAdmissions.add(admissions)
				admissions = { offered: 0, handed: 0 }
				const through = [...unsettledAdmissions]
				const native = yield* settled([Promise.resolve().then(() => batch[method]())])
				const transport = yield* settled(
					method === "forceFlush" ? [Promise.resolve().then(() => exporter.forceFlush())] : []
				)
				yield* settled([...inFlight])
				const causes = rejectedReasons([...native, ...transport])
				const drained = !Arr.isArrayNonEmpty(causes) && inFlight.size === 0
				const receipt = takeReceipt(causes, settleDropped(through, drained))
				const clean =
					drained &&
					receipt.rejectedBatches === 0 &&
					receipt.transportFailures === 0 &&
					receipt.droppedRecords === 0
				if (!clean) {
					const failure = LogDrainFailure.make(receipt)
					observeFlush({ origin, signal: "logs", method, causes: [failure] })
					return yield* failure
				}
				observeFlush({ origin, signal: "logs", method, causes: [] })
			})
		const flush = coalescedFlush(() => Effect.runPromise(drainNative("forceFlush")))
		const shutdownProvider = Effect.gen(function* () {
			const receipts = yield* settled([flush()])
			const closed = yield* Effect.exit(drainNative("shutdown"))
			awaiting.removeCallback(observeAwaiting)
			const causes = [
				...rejectedReasons(receipts),
				...(Exit.isFailure(closed) ? [Cause.squash(closed.cause)] : [])
			]
			if (Arr.isArrayNonEmpty(causes)) {
				return yield* OperationalLogShutdownFailure.make({ causes })
			}
		})
		const provider = new LoggerProvider({
			meterProvider,
			resource: resourceFromAttributes(operationalResourceAttributes(origin)),
			processors: [
				{
					onEmit(record) {
						admissions.offered += 1
						attribution.set(record, admissions)
						awaitingExport += 1
						offered.add(1)
						batch.onEmit(record)
					},
					forceFlush: flush,
					shutdown: () => Effect.runPromise(shutdownProvider)
				}
			]
		})
		if (logs.setGlobalLoggerProvider(provider) !== provider) {
			return OperationalTelemetryProviderConflict.make({ signal: "logs" })
		}
		const processor: SpanProcessor = {
			onStart() {},
			onEnd() {},
			forceFlush: flush,
			shutdown: () =>
				provider.shutdown().finally(() => {
					logs.disable()
				})
		}
		return Effect.succeed(processor)
	})
