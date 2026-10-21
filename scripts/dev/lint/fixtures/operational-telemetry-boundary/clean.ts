import type { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http"
import { Effect } from "effect"

export const describe = (exporter: OTLPTraceExporter): string => typeof exporter

export const untraced = Effect.fn(function* () {
	yield* Effect.log("fixture")
})
