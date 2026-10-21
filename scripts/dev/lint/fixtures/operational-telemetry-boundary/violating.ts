import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http" // violation
import { registerOTel } from "@vercel/otel" // violation
import { Effect } from "effect"
import posthog from "posthog-js" // violation

export const exporter = new OTLPTraceExporter() // violation

export const registered = registerOTel({ serviceName: "fixture" }) // violation

export const spanned = Effect.void.pipe(Effect.withSpan("fixture.span")) // violation

export const annotated = Effect.annotateCurrentSpan({ key: "value" }) // violation

export const traced = Effect.fn("fixture.fn")(function* () { // violation
	yield* Effect.void
})

export const analytics = posthog
