import { type Attributes, type MeterProvider, type Span, trace } from "@opentelemetry/api"
import { ExportResultCode } from "@opentelemetry/core"
import { JsonTraceSerializer } from "@opentelemetry/otlp-transformer"
import type { LogRecordExporter } from "@opentelemetry/sdk-logs"
import { BatchSpanProcessor } from "@opentelemetry/sdk-trace"
import type { ReadableSpan, SpanExporter, SpanProcessor } from "@opentelemetry/sdk-trace-base"
import { Array as Arr, Cause, Effect, Exit, Schema } from "effect"
import { requestCorrelation } from "#correlation.ts"
import type { OperationalTelemetryProviderConflict } from "#destination.ts"
import { spanEvidenceParts } from "#evidence-parts.ts"
import {
	exportScopeOf,
	observeExport,
	observeExportAttempt,
	observeFlush,
	observeSpanLoss
} from "#export-health.ts"
import { coalescedFlush, rejectedReasons, settled } from "#flush.ts"
import { createOperationalLogProcessor } from "#logs.ts"
import { createSpanMeasurements } from "#metrics.ts"
import { exportSizedBatch, operationalBatchLimits } from "#otlp-batch.ts"
import type { OperationalOrigin } from "#schema.ts"
import { traceBatchDefaults } from "#sdk-limits.ts"
import { correlationAttributes, definedAttributes, operationalSpan } from "#span-export.ts"

/** A drain or shutdown of the whole pipeline left a signal, an exporter or a packet unsettled. */
class TelemetryFlushFailure extends Schema.TaggedError<
	TelemetryFlushFailure,
	{ readonly brand: unique symbol }
>()("TelemetryFlushFailure", {
	method: Schema.Literals(["forceFlush", "shutdown"]),
	causes: Schema.Array(Schema.Unknown)
}) {}

/** A trace exporter the drain can flush: PostHog's OTLP exporter or the local file sink. */
export type TraceExporter = SpanExporter & Readonly<{ forceFlush: () => Promise<void> }>

/** The trace and log exporters of one backend. */
export type OperationalExporters = Readonly<{ traces: TraceExporter; logs: LogRecordExporter }>

/** The SDK's own span, as the active span of a child's parent context; an external or
 * non-recording span has no attributes to inherit. */
const isReadable = (span: Span): span is Span & Pick<ReadableSpan, "attributes"> =>
	"attributes" in span && typeof span.attributes === "object" && span.attributes !== null

const parentAttributes = (parent: Parameters<SpanProcessor["onStart"]>[1]): Attributes => {
	const span = trace.getSpan(parent)
	return span !== undefined && isReadable(span) ? span.attributes : {}
}

/** The process's telemetry pipeline: who it describes, its backend's trace and log exporters, and
 * the installed meter provider every SDK component measures itself through. */
export type OperationalPipeline = Readonly<{
	origin: OperationalOrigin
	exporters: OperationalExporters
	meterProvider: MeterProvider
}>

/** One content policy, two native receivers with PostHog's published packet limits (the local
 * sink writes the same packets), one drain owner. Spans
 * project through `operationalSpan` in their batch exporter, never at span end. The pipeline,
 * including the process log provider, exists as soon as this owner does: a log emitted before the
 * first span is exported too. SDK self-observability binds to the installed meter provider the
 * caller passes. Metrics are not drained here: the metric reader exports on its own cadence,
 * never on a request's finalization. */
export const operationalProcessor = ({
	origin,
	exporters,
	meterProvider
}: OperationalPipeline): Effect.Effect<SpanProcessor, OperationalTelemetryProviderConflict> =>
	createOperationalLogProcessor({ origin, exporter: exporters.logs, meterProvider }).pipe(
		Effect.map((logs): SpanProcessor => {
			const inFlight = new Set<Promise<void>>()
			let exportFailure: { failedBatches: number; firstExportFailure: unknown } | undefined =
				undefined
			const measurements = createSpanMeasurements(meterProvider)
			const traces = new BatchSpanProcessor({
				...traceBatchDefaults,
				selfObsMeterProvider: meterProvider,
				exporter: {
					export(batch, callback) {
						const completed = Promise.withResolvers<void>()
						inFlight.add(completed.promise)
						exportSizedBatch({
							items: Arr.map(batch, operationalSpan),
							serialize: (records) => JsonTraceSerializer.serializeRequest([...records]),
							send: (records, done) => {
								observeExportAttempt({ signal: "traces", count: records.length })
								exporters.traces.export([...records], done)
							},
							callback: (result) => {
								if (result.code !== ExportResultCode.SUCCESS) {
									const held =
										exportFailure === undefined
											? {
													failedBatches: 0,
													firstExportFailure: result.error === undefined ? result : result.error
												}
											: exportFailure
									held.failedBatches += 1
									exportFailure = held
								}
								inFlight.delete(completed.promise)
								completed.resolve()
								callback(result)
							},
							observe: (records, result, kind) => {
								observeExport({
									origin,
									signal: "traces",
									count: records.length,
									result,
									scopeOf: () =>
										exportScopeOf(
											Arr.map(records, (span) => ({
												context: span.spanContext(),
												time: span.startTime
											}))
										),
									kind
								})
							},
							limits: operationalBatchLimits,
							signal: "traces",
							expandOversized: spanEvidenceParts
						})
					},
					shutdown: () => exporters.traces.shutdown()
				}
			})
			const finish = (method: "forceFlush" | "shutdown") =>
				Effect.gen(function* () {
					const signals = yield* settled([
						Promise.resolve().then(() => traces[method]()),
						Promise.resolve().then(() => logs.forceFlush())
					])
					const pending = yield* settled([
						Promise.resolve().then(() => exporters.traces.forceFlush())
					])
					yield* settled([...inFlight])
					const receipts = yield* settled([Promise.resolve().then(() => logs[method]())])
					const failed = exportFailure === undefined ? [] : [{ signal: "traces", ...exportFailure }]
					const causes = [...rejectedReasons([...signals, ...pending, ...receipts]), ...failed]
					exportFailure = undefined
					observeFlush({ origin, signal: "all", method, causes })
					if (Arr.isArrayNonEmpty(causes)) {
						return yield* TelemetryFlushFailure.make({ method, causes })
					}
				})
			const drain = coalescedFlush(() => Effect.runPromise(finish("forceFlush")))
			const shutdownPass = Effect.gen(function* () {
				const flushed = yield* settled([drain()])
				const closed = yield* Effect.exit(finish("shutdown"))
				const unclosed = Exit.isFailure(closed) ? [Cause.squash(closed.cause)] : []
				const causes = [...rejectedReasons(flushed), ...unclosed]
				if (Arr.isArrayNonEmpty(causes)) {
					return yield* TelemetryFlushFailure.make({ method: "shutdown", causes })
				}
			})
			let closing: Promise<void> | undefined = undefined
			const shutdown = (): Promise<void> => {
				if (closing !== undefined) {
					return closing
				}
				const receipt = Effect.runPromise(shutdownPass)
				closing = receipt
				return receipt
			}
			return {
				onStart(span, parent) {
					span.setAttributes(
						definedAttributes(
							correlationAttributes({
								...requestCorrelation(parent),
								...definedAttributes(parentAttributes(parent))
							})
						)
					)
					measurements.onStart(span, parent)
					traces.onStart(span, parent)
				},
				onEnd(span) {
					observeSpanLoss({ origin, span })
					measurements.onEnd(span)
					traces.onEnd(span)
				},
				forceFlush: () => (closing === undefined ? drain() : closing),
				shutdown
			}
		})
	)
