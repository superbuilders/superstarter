import "server-only"
import { RuntimeNodeInstrumentation } from "@opentelemetry/instrumentation-runtime-node"
import {
	outboundTraceContextPropagator,
	replayPropagator
} from "@superstarter/operational-telemetry/correlation"
import { OperationalTelemetry } from "@superstarter/operational-telemetry/effect"
import { observeSdkDiagnostics } from "@superstarter/operational-telemetry/export-health"
import { startOperationalMetrics } from "@superstarter/operational-telemetry/metrics"
import { operationalProcessor } from "@superstarter/operational-telemetry/remote"
import { operationalResourceAttributes } from "@superstarter/operational-telemetry/resource"
import { nativeSpanLimits } from "@superstarter/operational-telemetry/sdk-limits"
import { registerOTel } from "@vercel/otel"
import { Effect, Layer } from "effect"
import { TelemetrySink } from "#server/observability/sink.ts"

/**
 * The process's OpenTelemetry pipeline, a resource of the web runtime. Order is the dependency: SDK
 * diagnostics first, so no registration message is discarded; the meter provider before every
 * component that measures itself; the log provider (inside the operational processor) before the
 * tracer, so the first log of the process is exported. Disposing the runtime closes it in reverse:
 * metrics first, whose last export writes its own lifecycle logs, then the span processor, which
 * drains spans and then logs. A failed shutdown is already reported by the drain's receipts. A
 * second owner of a global provider is a broken process.
 */
export const WebObservabilityLive = Layer.effectDiscard(
	Effect.gen(function* () {
		const { origin, outsideRequests } = yield* OperationalTelemetry
		const { exporters } = yield* TelemetrySink
		observeSdkDiagnostics({ origin, outsideRequests })
		const metrics = yield* startOperationalMetrics({
			origin,
			exporter: exporters.metrics,
			lifetime: exporters.lifetime
		})
		const processor = yield* operationalProcessor({
			origin,
			exporters: exporters.bind(metrics.meterProvider),
			metrics,
			lifetime: exporters.lifetime,
			outsideRequests
		})
		yield* Effect.addFinalizer(() =>
			Effect.tryPromise(() => processor.shutdown()).pipe(Effect.ignore)
		)
		yield* Effect.addFinalizer(() =>
			Effect.tryPromise(() => metrics.shutdown()).pipe(Effect.ignore)
		)
		registerOTel({
			serviceName: origin.service,
			autoDetectResources: false,
			resourceDetectors: [],
			propagators: [outboundTraceContextPropagator, "baggage", replayPropagator],
			spanProcessors: [processor],
			traceSampler: "always_on",
			spanLimits: nativeSpanLimits,
			instrumentations: [
				"fetch",
				new RuntimeNodeInstrumentation({ captureUncaughtException: true })
			],
			attributes: operationalResourceAttributes(origin)
		})
	}).pipe(Effect.orDie)
)
