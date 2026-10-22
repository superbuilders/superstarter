import { repositoryFile, ruleTester } from "#scripts/dev/oxlint/rule-tester.ts"
import { telemetryOwnership } from "#scripts/dev/oxlint/rules/telemetry-ownership.ts"

const application = { filename: repositoryFile("packages/product/nextjs-app/src/app/fixture.ts") }
const registration = {
	filename: repositoryFile("packages/product/nextjs-app/src/server/observability/register.ts")
}
const shared = { filename: repositoryFile("packages/platform/operational-telemetry/src/effect.ts") }
const analytics = {
	filename: repositoryFile("packages/product/nextjs-app/src/lib/product-analytics.ts")
}

const EXPORTER_OWNED =
	/^@opentelemetry\/exporter-trace-otlp-http is owned by .*observability\/\. The web registration constructs the OTLP exporters, once\.$/

const SDK_OWNED =
	/^@vercel\/otel is owned by .*observability\/\. The web registration registers the OpenTelemetry SDK, once\.$/
const ANALYTICS_OWNED = /^posthog-js is owned by .*product-analytics\.ts, .*posthog-provider\.tsx\./
const SPAN_WRITER = /^Effect\.\w+ opens or annotates a span outside the registry\./
const NAMED_FN = /^Effect\.fn with a name opens a span outside the registry\./

const VIOLATING = `import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http"
import { registerOTel } from "@vercel/otel"
import { Effect } from "effect"
import posthog from "posthog-js"

export const exporter = new OTLPTraceExporter()

export const registered = registerOTel({ serviceName: "fixture" })

export const spanned = Effect.void.pipe(Effect.withSpan("fixture.span"))

export const annotated = Effect.annotateCurrentSpan({ key: "value" })

export const traced = Effect.fn("fixture.fn")(function* () {
	yield* Effect.void
})

export const analytics = posthog`

const CLEAN = `import type { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http"
import { Console, Effect } from "effect"

export const describe = (exporter: OTLPTraceExporter): string => typeof exporter

export const untraced = Effect.fn(function* () {
	yield* Effect.log("fixture")
	yield* Console.log("fixture")
})`

ruleTester.run("telemetry-ownership", telemetryOwnership, {
	valid: [
		{ ...application, code: CLEAN },
		{
			...registration,
			code: `import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http"
import { registerOTel } from "@vercel/otel"
registerOTel({ traceExporter: new OTLPTraceExporter() })`
		},
		{
			...shared,
			code: `import { Effect } from "effect"
export const spanned = Effect.void.pipe(Effect.withSpan("superstarter.todos.read"))`
		},
		{ ...analytics, code: 'import { posthog } from "posthog-js"\nposthog.init("token")' }
	],
	invalid: [
		{
			...application,
			code: VIOLATING,
			errors: [
				{ message: EXPORTER_OWNED, line: 1 },
				{ message: SDK_OWNED, line: 2 },
				{ message: ANALYTICS_OWNED, line: 4 },
				{ message: EXPORTER_OWNED, line: 6 },
				{ message: SDK_OWNED, line: 8 },
				{ message: SPAN_WRITER, line: 10 },
				{ message: SPAN_WRITER, line: 12 },
				{ message: NAMED_FN, line: 14 }
			]
		},
		{
			...application,
			code: 'import { Effect as Traced } from "effect"\nexport const spanned = Traced.withSpan("x")',
			errors: [{ message: SPAN_WRITER }]
		},
		{
			...application,
			code: 'import { Effect } from "effect"\nconst { withSpan } = Effect',
			errors: [{ message: SPAN_WRITER }]
		},
		{
			...application,
			code: 'import { metric } from "@vercel/functions"',
			errors: [{ message: /^@vercel\/functions#metric is forbidden\./ }]
		},
		{
			...application,
			code: 'export { registerOTel } from "@vercel/otel"',
			errors: [{ message: SDK_OWNED }]
		},
		{
			...application,
			code: 'export const loaded = import("@vercel/otel")',
			errors: [{ message: SDK_OWNED }]
		},
		{
			...shared,
			code: 'import type { getDeadline } from "@vercel/functions"',
			errors: [{ message: /^Shared operational telemetry cannot import @vercel\/functions\./ }]
		},
		{
			...registration,
			code: 'import { Console } from "effect"\nexport const said = Console.log("x")',
			errors: [{ message: /^Effect Console 'log' is forbidden in this operational path/ }]
		}
	]
})
