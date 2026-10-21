import "server-only"
import type { MeterProvider } from "@opentelemetry/api"
import { OTLPLogExporter } from "@opentelemetry/exporter-logs-otlp-http"
import {
	AggregationTemporalityPreference,
	OTLPMetricExporter
} from "@opentelemetry/exporter-metrics-otlp-http"
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http"
import type { PushMetricExporter } from "@opentelemetry/sdk-metrics"
import {
	POSTHOG_INGESTION_ORIGIN,
	posthogExportRequests
} from "@superstarter/operational-telemetry/destination"
import { makeLocalTelemetryFiles } from "@superstarter/operational-telemetry/file-export"
import type { MetricCadence } from "@superstarter/operational-telemetry/metrics"
import type { OperationalExporters } from "@superstarter/operational-telemetry/remote"
import type { OperationalMetricExportHost } from "@superstarter/operational-telemetry/schema"
import { serializeEvidence } from "@superstarter/operational-telemetry/span-export"
import { getDeadline } from "@vercel/functions"
import { type Cause, Context, DateTime, Effect, Layer } from "effect"
import { PostHog } from "posthog-node"
import { telemetryBackend } from "#env.ts"

/** The function's deadline as Vercel publishes it to the invocation, when it does. */
const observeFunctionHost = (): OperationalMetricExportHost => {
	const deadline = getDeadline()
	return {
		kind: "function",
		deadline:
			deadline === undefined
				? { kind: "unavailable" }
				: { kind: "observed", atMilliseconds: deadline.getTime() }
	}
}

/** One backend's exporters. The metric exporter exists first, because the meter provider it feeds
 * is what the trace and log exporters measure themselves through. */
type BackendExporters = Readonly<{
	metrics: PushMetricExporter
	cadence: MetricCadence
	host: () => OperationalMetricExportHost
	signals: (meterProvider: MeterProvider) => OperationalExporters
}>

/** One server exception and the coordinates it is reported with. */
type ServerException = Readonly<{ error: unknown; properties: Readonly<Record<string, unknown>> }>

/**
 * Where this process's telemetry goes, built once by the web runtime. On a Vercel deployment:
 * PostHog's OTLP endpoints with the project token, and the server's one PostHog client, which
 * captures exceptions explicitly and never autocaptures. Locally: the JSONL files under
 * `out/telemetry/`, in the same OTLP/JSON, with nothing sent anywhere; an exception is one line in
 * `exceptions.jsonl` with the error's own properties, message and stack included, because the file
 * never leaves the machine. Only the PostHog arm reads the project token.
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
				cadence: "periodic",
				host: () => ({ kind: "process" }),
				signals: () => ({ traces: files.traces, logs: files.logs })
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
	return TelemetrySink.of({
		exporters: {
			metrics: new OTLPMetricExporter({
				...requests.metrics,
				temporalityPreference: AggregationTemporalityPreference.DELTA
			}),
			cadence: "invocation",
			host: observeFunctionHost,
			signals: (meterProvider) => ({
				traces: new OTLPTraceExporter({ ...requests.traces, selfObsMeterProvider: meterProvider }),
				logs: new OTLPLogExporter({ ...requests.logs, selfObsMeterProvider: meterProvider })
			})
		},
		sendException: ({ error, properties }) =>
			Effect.tryPromise(() => posthog.captureExceptionImmediate(error, undefined, properties))
	})
})

export const TelemetrySinkLive = Layer.effect(TelemetrySink, sinkOf)
