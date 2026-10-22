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
		propagators: [outboundTraceContextPropagator, "baggage", replayPropagator],
		spanProcessors: [processor, metricExportProcessor(metricsOwner)],
		traceSampler: "always_on",
		spanLimits: nativeSpanLimits,
		instrumentations: ["fetch", new RuntimeNodeInstrumentation({ captureUncaughtException: true })],
		attributes: operationalResourceAttributes(origin)
	})
})

/** Registers this process's telemetry on its one runtime, so the instrumentation bundle and every
 * app bundle report under the same instance, tracer and sinks. */
export const registerWebObservability = (): Promise<void> => webRuntime().runPromise(registration)
