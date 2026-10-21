import "server-only"
import { RuntimeNodeInstrumentation } from "@opentelemetry/instrumentation-runtime-node"
import {
	outboundTraceContextPropagator,
	replayPropagator
} from "@superstarter/operational-telemetry/correlation"
import { OperationalTelemetry } from "@superstarter/operational-telemetry/effect"
import { observeSdkDiagnostics } from "@superstarter/operational-telemetry/export-health"
import {
	metricExportProcessor,
	startOperationalMetrics
} from "@superstarter/operational-telemetry/metrics"
import { operationalProcessor } from "@superstarter/operational-telemetry/remote"
import { operationalResourceAttributes } from "@superstarter/operational-telemetry/resource"
import { nativeSpanLimits } from "@superstarter/operational-telemetry/sdk-limits"
import { registerOTel } from "@vercel/otel"
import { Effect } from "effect"
import { TelemetrySink } from "#server/observability/sink.ts"
import { webRuntime } from "#server/runtime.ts"

/** Order is the dependency: SDK diagnostics first, so no registration message is discarded; the
 * meter provider before every component that measures itself; the log provider (inside the
 * operational processor) before the tracer, so the first log of the process is exported. Next's
 * tracer emits every framework phase, not only its default span allowlist, when the deployment
 * sets `NEXT_OTEL_VERBOSE=1`. */
const registration = Effect.gen(function* () {
	const { origin } = yield* OperationalTelemetry
	const { exporters } = yield* TelemetrySink
	observeSdkDiagnostics(origin)
	// Metrics export inside live invocations on Vercel: a request's telemetry flush exports them
	// once their cadence has elapsed, never an idle instance's timer. Locally, once a minute.
	const metricsOwner = yield* startOperationalMetrics({
		origin,
		exporter: exporters.metrics,
		host: { observe: exporters.host },
		cadence: exporters.cadence
	})
	const { meterProvider } = metricsOwner
	const processor = yield* operationalProcessor({
		origin,
		exporters: exporters.signals(meterProvider),
		meterProvider
	})
	registerOTel({
		serviceName: origin.service,
		autoDetectResources: false,
		resourceDetectors: [],
		// Request spans are roots: neither Vercel's runtime propagator ("auto") nor W3C extraction
		// adopts the proxy's inbound trace context, whose span never reaches PostHog.
		propagators: [outboundTraceContextPropagator, "baggage", replayPropagator],
		spanProcessors: [processor, metricExportProcessor(metricsOwner)],
		traceSampler: "always_on",
		spanLimits: nativeSpanLimits,
		// "fetch" is the library default; the runtime instrumentation adds event-loop delay and
		// utilization, GC and heap-space metrics, and exports an uncaught exception as a log.
		instrumentations: ["fetch", new RuntimeNodeInstrumentation({ captureUncaughtException: true })],
		attributes: operationalResourceAttributes(origin)
	})
})

/** Registers this process's telemetry on its one runtime, so the instrumentation bundle and every
 * app bundle report under the same instance, tracer and sinks. */
export const registerWebObservability = (): Promise<void> => webRuntime().runPromise(registration)
