import type { OperationalDeployment } from "@superstarter/operational-telemetry/schema"
import { Function as Fn } from "effect"
import type { Instrumentation } from "next"
import type { ErrorContext, ErrorRequest } from "#server/observability/request-error.ts"

declare global {
	namespace NodeJS {
		interface ProcessEnv {
			/** The runtime Next compiles a module for, inlined at compile time. */
			readonly NEXT_RUNTIME?: "nodejs" | "edge"
			/** Next's switch for tracing every framework phase, read as each of its spans starts. */
			NEXT_OTEL_VERBOSE?: "1"
		}
	}
}

/** Next compiles this file for the Edge runtime too, where the telemetry (Node code) never runs.
 * The Node graph loads only behind Next's compile-time runtime check, so no Edge bundle holds it. */
const nodeTelemetry = () => {
	// oxlint-disable node/no-process-env -- Next's compile-time runtime intrinsic, not configuration.
	// @effect-diagnostics-next-line processEnv:off
	if (process.env.NEXT_RUNTIME === "nodejs") {
		// oxlint-enable node/no-process-env -- the intrinsic is the condition alone.
		return Promise.all([
			import("#server/observability/register.ts"),
			import("#server/observability/request-error.ts")
		]).then(([registration, requestError]) => ({
			registration: registration.registerWebObservability,
			report: requestError.reportWebRequestError
		}))
	}
	return Promise.resolve(undefined)
}

/** Next traces every framework phase, not only its default span allowlist, while
 * `NEXT_OTEL_VERBOSE` is `1`, so the time a request spends after its render shows in its trace. A
 * local process always traces them; a Vercel deployment opts in through its own environment. */
const traceFrameworkPhases = (deployment: OperationalDeployment): void => {
	if (deployment.kind === "local") {
		// oxlint-disable node/no-process-env -- Next's own tracing switch, set for this process alone.
		// @effect-diagnostics-next-line processEnv:off
		process.env.NEXT_OTEL_VERBOSE = "1"
		// oxlint-enable node/no-process-env -- the switch is the assignment alone.
	}
}

/** Next runs this once per server process, before the first request: the whole telemetry
 * pipeline exists before anything it observes. */
export const register = (): Promise<void> =>
	nodeTelemetry().then((telemetry) =>
		telemetry === undefined ? undefined : telemetry.registration().then(traceFrameworkPhases)
	)

const reportRequestError = (
	error: unknown,
	request: ErrorRequest,
	context: ErrorContext
): Promise<void> =>
	nodeTelemetry().then((telemetry) =>
		telemetry === undefined ? undefined : telemetry.report(error, request, context)
	)

/** Every failure Next renders or answers reaches the one reporter. */
export const onRequestError: {
	(request: ErrorRequest, context: ErrorContext): (error: unknown) => Promise<void>
	(error: unknown, request: ErrorRequest, context: ErrorContext): Promise<void>
} = Fn.dual(3, reportRequestError) satisfies Instrumentation.onRequestError
