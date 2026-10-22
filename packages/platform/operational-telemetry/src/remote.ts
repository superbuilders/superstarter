import { type Attributes, type MeterProvider, type Span, trace } from "@opentelemetry/api"
import type { LogRecordExporter } from "@opentelemetry/sdk-logs"
import { BatchSpanProcessor } from "@opentelemetry/sdk-trace"
import type { ReadableSpan, SpanExporter, SpanProcessor } from "@opentelemetry/sdk-trace-base"
import { Array as Arr, Effect, Function as Fn } from "effect"
import { requestCorrelation } from "#correlation.ts"
import type { OperationalTelemetryProviderConflict } from "#destination.ts"
import { exportScopeOf, makeExportHealth } from "#export-health.ts"
import {
	drainLifecycle,
	type FlushMethod,
	makeExportLedger,
	rejectedReasons,
	settled,
	TelemetryFlushFailure
} from "#flush.ts"
import { createOperationalLogProcessor } from "#logs.ts"
import { createSpanMeasurements } from "#metrics.ts"
import { exportBisecting } from "#otlp-batch.ts"
import { OPERATIONAL_SCOPE } from "#resource.ts"
import type { OperationalOrigin } from "#schema.ts"
import { traceBatchDefaults } from "#sdk-limits.ts"
import { correlationAttributes, definedAttributes, operationalSpan } from "#span-export.ts"

/** A trace exporter the drain can flush: PostHog's OTLP exporter or the local file sink. */
export type TraceExporter = SpanExporter & Readonly<{ forceFlush: () => Promise<void> }>

/** The trace and log exporters of one backend. */
export type OperationalExporters = Readonly<{ traces: TraceExporter; logs: LogRecordExporter }>

/**
 * Who drains the pipeline when a request ends. `host`: the host's own per-request flush, as
 * `@vercel/otel` flushes every span processor under `waitUntil` once a request's root span ends on
 * Vercel. `root-span`: the pipeline itself, as each root span ends, where no host flushes (a local
 * process), so a request's spans and logs are written as soon as the request ends.
 */
export type RequestDrain = "host" | "root-span"

/** The SDK's own span, as the active span of a child's parent context; an external or
 * non-recording span has no attributes to inherit. */
const isReadable = (span: Span): span is Span & Pick<ReadableSpan, "attributes"> =>
	"attributes" in span && typeof span.attributes === "object" && span.attributes !== null

const parentAttributes = (parent: Parameters<SpanProcessor["onStart"]>[1]): Attributes => {
	const span = trace.getSpan(parent)
	return span !== undefined && isReadable(span) ? span.attributes : {}
}

/** The process's telemetry pipeline: who it describes, its backend's trace and log exporters, the
 * installed meter provider every SDK component measures itself through, and who drains it when a
 * request ends. */
export type OperationalPipeline = Readonly<{
	origin: OperationalOrigin
	exporters: OperationalExporters
	meterProvider: MeterProvider
	requestDrain: RequestDrain
}>

/** One content policy, two native receivers (the local sink writes the same packets PostHog
 * receives), one drain owner. Spans project through `operationalSpan` in their batch exporter,
 * never at span end. The pipeline, including the process log provider, exists as soon as this
 * owner does: a log emitted before the first span is exported too. SDK self-observability binds to
 * the installed meter provider the caller passes. Metrics are not drained here: the metric reader
 * exports on its own cadence, never on a request's finalization. */
export const operationalProcessor = ({
	origin,
	exporters,
	meterProvider,
	requestDrain
}: OperationalPipeline): Effect.Effect<SpanProcessor, OperationalTelemetryProviderConflict> => {
	const health = makeExportHealth({ origin, meter: meterProvider.getMeter(OPERATIONAL_SCOPE) })
	return createOperationalLogProcessor({
		origin,
		exporter: exporters.logs,
		meterProvider,
		health
	}).pipe(
		Effect.map((logs): SpanProcessor => {
			const ledger = makeExportLedger("traces")
			const measurements = createSpanMeasurements(meterProvider)
			const traces = new BatchSpanProcessor({
				...traceBatchDefaults,
				selfObsMeterProvider: meterProvider,
				exporter: {
					export(batch, callback) {
						exportBisecting<ReadableSpan>({
							signal: "traces",
							records: Arr.map(batch, operationalSpan),
							send: (records, done) => {
								exporters.traces.export([...records], done)
							},
							callback: ledger.track(callback),
							health,
							scopeOf: (records) =>
								exportScopeOf(
									Arr.map(records, (span) => ({
										context: span.spanContext(),
										time: span.startTime
									}))
								)
						})
					},
					shutdown: () => exporters.traces.shutdown()
				}
			})
			const pass = (method: FlushMethod) =>
				Effect.gen(function* () {
					const signals = yield* settled([
						Promise.resolve().then(() => traces[method]()),
						Promise.resolve().then(() => logs.forceFlush())
					])
					const pending = yield* settled([
						Promise.resolve().then(() => exporters.traces.forceFlush())
					])
					const failed = yield* ledger.receipt
					const receipts = yield* settled([Promise.resolve().then(() => logs[method]())])
					const causes = [...rejectedReasons([...signals, ...pending, ...receipts]), ...failed]
					health.observeFlush({ signal: "all", method, causes })
					if (Arr.isArrayNonEmpty(causes)) {
						return yield* TelemetryFlushFailure.make({ signal: "all", method, causes })
					}
				})
			const lifecycle = drainLifecycle({ signal: "all", pass })
			const drainAtRequestEnd = (span: ReadableSpan): void => {
				if (requestDrain === "root-span" && span.parentSpanContext === undefined) {
					void lifecycle.forceFlush().then(Fn.constVoid, Fn.constVoid)
				}
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
					health.observeSpanLoss(span)
					measurements.onEnd(span)
					traces.onEnd(span)
					drainAtRequestEnd(span)
				},
				forceFlush: lifecycle.forceFlush,
				shutdown: lifecycle.shutdown
			}
		})
	)
}
