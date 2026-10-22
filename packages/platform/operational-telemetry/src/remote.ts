import { type Attributes, type Span, SpanKind, trace } from "@opentelemetry/api"
import type { LogRecordExporter } from "@opentelemetry/sdk-logs"
import { BatchSpanProcessor } from "@opentelemetry/sdk-trace"
import type { ReadableSpan, SpanExporter, SpanProcessor } from "@opentelemetry/sdk-trace-base"
import { Array as Arr, Effect, Function as Fn } from "effect"
import { requestCorrelation } from "#correlation.ts"
import type { OperationalTelemetryProviderConflict } from "#destination.ts"
import { exportScopeOf } from "#export-health.ts"
import { drainLifecycle, makeExportLedger } from "#flush.ts"
import { createOperationalLogProcessor } from "#logs.ts"
import { createSpanMeasurements, type OperationalMetrics } from "#metrics.ts"
import { exportBisecting } from "#otlp-batch.ts"
import type {
	OperationalOrigin,
	OutsideRequests,
	SharedAttributes,
	TelemetryLifetime
} from "#schema.ts"
import { traceBatchDefaults } from "#sdk-limits.ts"
import { correlationAttributes, operationalSpan } from "#span-export.ts"

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

/** The process's telemetry pipeline: who it describes, its backend's trace and log exporters, the
 * installed metrics owner every SDK component measures itself through, how long the process's
 * telemetry lives, and the async context outside every request. */
export type OperationalPipeline = Readonly<{
	origin: OperationalOrigin
	exporters: OperationalExporters
	metrics: OperationalMetrics
	lifetime: TelemetryLifetime
	outsideRequests: OutsideRequests
}>

/** Who drains the pipeline when a request ends. An invocation's host does, as `@vercel/otel`
 * flushes every span processor under `waitUntil` once a request's root span ends; a process drains
 * itself as each root span ends, so a request's spans and logs are written as soon as it ends. */
const requestDrainOf = (
	lifetime: TelemetryLifetime,
	drain: () => Promise<void>
): ((span: ReadableSpan) => void) => {
	if (lifetime.kind === "invocation") {
		return Fn.constVoid
	}
	return (span) => {
		if (span.parentSpanContext === undefined) {
			void drain().then(Fn.constVoid, Fn.constVoid)
		}
	}
}

/**
 * One content policy, two native receivers (the local sink writes the same packets PostHog
 * receives), one drain owner. Spans project through `operationalSpan` in their batch exporter,
 * never at span end. The pipeline, including the process log provider, exists as soon as this
 * owner does: a log emitted before the first span is exported too. SDK self-observability binds to
 * the installed meter provider. A drain pass exports metrics first when their cadence is due, so
 * the export's own lifecycle logs leave in the same pass, then drains spans, then logs once.
 *
 * The process's first server span, the first request it serves, is its cold start: OpenTelemetry's
 * `faas.coldstart` belongs on the invocation's server span, and Next's own startup spans and its
 * request-handler span above the server span are neither. Everything a span's end sets off runs
 * outside the request: Next's render must not see a metric's clock read as its own.
 * https://opentelemetry.io/docs/specs/semconv/faas/faas-spans/
 */
export const operationalProcessor = ({
	origin,
	exporters,
	metrics,
	lifetime,
	outsideRequests
}: OperationalPipeline): Effect.Effect<SpanProcessor, OperationalTelemetryProviderConflict> => {
	const { meterProvider, health } = metrics
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
			const lifecycle = drainLifecycle({
				signal: "all",
				ledger,
				health,
				steps: (method) => [
					() => metrics.exportIfDue(),
					() => traces[method](),
					() => exporters.traces.forceFlush(),
					() => logs[method]()
				]
			})
			const drainAtRequestEnd = requestDrainOf(lifetime, lifecycle.forceFlush)
			let coldStart = true
			return {
				onStart(span, parent) {
					span.setAttributes(
						correlationAttributes({
							...requestCorrelation(parent),
							...parentAttributes(parent)
						})
					)
					if (coldStart && span.kind === SpanKind.SERVER) {
						coldStart = false
						span.setAttributes({ "faas.coldstart": true } satisfies SharedAttributes)
					}
					measurements.onStart(span, parent)
					traces.onStart(span, parent)
				},
				onEnd(span) {
					outsideRequests(() => {
						traces.onEnd(span)
						measurements.onEnd(span)
						health.observeSpanLoss(span)
						drainAtRequestEnd(span)
					})
				},
				forceFlush: lifecycle.forceFlush,
				shutdown: lifecycle.shutdown
			}
		})
	)
}
