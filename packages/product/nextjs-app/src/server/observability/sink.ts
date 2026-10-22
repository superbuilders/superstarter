import "server-only"
import type { MeterProvider } from "@opentelemetry/api"
import { OTLPLogExporter } from "@opentelemetry/exporter-logs-otlp-http"
import {
	AggregationTemporalityPreference,
	OTLPMetricExporter
} from "@opentelemetry/exporter-metrics-otlp-http"
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http"
import { CompressionAlgorithm } from "@opentelemetry/otlp-exporter-base"
import type { PushMetricExporter } from "@opentelemetry/sdk-metrics"
import {
	POSTHOG_INGESTION_ORIGIN,
	posthogExportRequests
} from "@superstarter/operational-telemetry/destination"
import { makeLocalTelemetryFiles } from "@superstarter/operational-telemetry/file-export"
import type { OperationalExporters } from "@superstarter/operational-telemetry/remote"
import type {
	FunctionDeadline,
	TelemetryLifetime
} from "@superstarter/operational-telemetry/schema"
import { serializeEvidence } from "@superstarter/operational-telemetry/span-export"
import { getDeadline } from "@vercel/functions"
import { type Cause, Context, DateTime, Effect, Layer } from "effect"
import { PostHog } from "posthog-node"
import { telemetryBackend } from "#env.ts"

/** The function's deadline as Vercel publishes it to the invocation, when it does. */
const observeFunctionDeadline = (): FunctionDeadline => {
	const deadline = getDeadline()
	return deadline === undefined
		? { kind: "unavailable" }
		: { kind: "observed", atMilliseconds: deadline.getTime() }
}

/** One backend's exporters and how long its telemetry lives. The metric exporter exists first,
 * because the meter provider it feeds is what every exporter measures itself through: `bind`
 * hands that provider to the metric exporter and builds the trace and log exporters on it. */
type BackendExporters = Readonly<{
	metrics: PushMetricExporter
	lifetime: TelemetryLifetime
	bind: (meterProvider: MeterProvider) => OperationalExporters
}>

/** One server exception and the coordinates it is reported with. */
type ServerException = Readonly<{ error: unknown; properties: Readonly<Record<string, unknown>> }>

/**
 * Where this process's telemetry goes, built once by the web runtime. On a Vercel deployment:
 * PostHog's OTLP endpoints with the project token, gzip-compressed as PostHog's SDK spec asks,
 * drained by `@vercel/otel` when each request ends, and the server's one PostHog client, which
 * captures exceptions explicitly and never autocaptures. Locally: the JSONL files under
 * `out/telemetry/`, in the same OTLP/JSON, with nothing sent anywhere and the pipeline drained as
 * each request's root span ends; an exception is one line in `exceptions.jsonl` with the error's
 * own properties, message and stack included, because the file never leaves the machine. Only
 * the PostHog arm reads the project token.
 */
export class TelemetrySink extends Context.Service<
	TelemetrySink,
	Readonly<{
		exporters: BackendExporters
		sendException: (exception: ServerException) => Effect.Effect<void, Cause.UnknownError>
	}>
>()("@superstarter/nextjs-app/server/observability/sink/TelemetrySink") {}

const sinkOf = Effect.gen(function* () {
	const backend = yield* Effect.orDie(telemetryBackend)
	if (backend.kind === "local") {
		const files = yield* makeLocalTelemetryFiles
		return TelemetrySink.of({
			exporters: {
				metrics: files.metrics,
				lifetime: { kind: "process" },
				bind: () => ({ traces: files.traces, logs: files.logs })
			},
			sendException: ({ error, properties }) =>
				Effect.tryPromise(() =>
					files.append({
						stream: "exceptions",
						line: String(
							serializeEvidence({
								time: DateTime.formatIso(DateTime.nowUnsafe()),
								exception: error,
								properties
							})
						)
					})
				)
		})
	}
	const requests = posthogExportRequests(backend.token)
	const posthog = new PostHog(backend.token, {
		host: POSTHOG_INGESTION_ORIGIN,
		enableExceptionAutocapture: false
	})
	const metrics = new OTLPMetricExporter({
		...requests.metrics,
		compression: CompressionAlgorithm.GZIP,
		temporalityPreference: AggregationTemporalityPreference.DELTA
	})
	return TelemetrySink.of({
		exporters: {
			metrics,
			lifetime: { kind: "invocation", deadline: observeFunctionDeadline },
			bind: (meterProvider) => {
				metrics.setSelfObsMeterProvider(meterProvider)
				return {
					traces: new OTLPTraceExporter({
						...requests.traces,
						compression: CompressionAlgorithm.GZIP,
						selfObsMeterProvider: meterProvider
					}),
					logs: new OTLPLogExporter({
						...requests.logs,
						compression: CompressionAlgorithm.GZIP,
						selfObsMeterProvider: meterProvider
					})
				}
			}
		},
		sendException: ({ error, properties }) =>
			Effect.tryPromise(() => posthog.captureExceptionImmediate(error, undefined, properties))
	})
})

export const TelemetrySinkLive = Layer.effect(TelemetrySink, sinkOf)
