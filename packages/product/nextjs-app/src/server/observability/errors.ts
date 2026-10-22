import "server-only"
import { trace } from "@opentelemetry/api"
import { requestCorrelation } from "@superstarter/operational-telemetry/correlation"
import {
	OperationalTelemetry,
	withOperationalTelemetry
} from "@superstarter/operational-telemetry/effect"
import type { SharedAttributes } from "@superstarter/operational-telemetry/schema"
import {
	correlationAttributes,
	sessionAliases
} from "@superstarter/operational-telemetry/span-export"
import type { OPERATIONAL_SPANS } from "@superstarter/operational-telemetry/spans"
import { Effect, Function as Fn, Result } from "effect"
import { after } from "next/server"
import { TelemetrySink } from "#server/observability/sink.ts"

/** The coordinates of a failure Next reported, whose `next.error.digest` the browser's boundary
 * capture sets for the same failure; or the action that reported a failure it converted into a value. */
export type ServerExceptionContext =
	| typeof OPERATIONAL_SPANS.frameworkRequestError.opened.Type
	| Required<Pick<SharedAttributes, "superstarter.failure.operation">>

/** Hands `send` to Next's `after()`, which runs it once the response has finished. Outside a
 * request scope `after()` throws, and the send is the caller's to await. */
const scheduledAfterResponse = (send: () => Promise<void>): boolean =>
	Result.isSuccess(
		Result.try(() => {
			after(send)
		})
	)

const captureException = (
	error: unknown,
	context: ServerExceptionContext
): Effect.Effect<void, never, OperationalTelemetry | TelemetrySink> =>
	Effect.gen(function* () {
		const { origin } = yield* OperationalTelemetry
		const { sendException } = yield* TelemetrySink
		const span = trace.getActiveSpan()?.spanContext()
		const correlated = correlationAttributes({ ...requestCorrelation(), ...context })
		const send = sendException({
			error,
			properties: {
				...context,
				...correlated,
				...sessionAliases(correlated),
				service: origin.service,
				deployment: origin.deployment,
				trace_id: span?.traceId,
				span_id: span?.spanId
			}
		}).pipe(
			Effect.tapCause((cause) => Effect.logError("exception export failed", cause)),
			Effect.ignore,
			withOperationalTelemetry
		)
		const runLater = Effect.runPromiseWith(
			yield* Effect.context<OperationalTelemetry | TelemetrySink>()
		)
		if (scheduledAfterResponse(() => runLater(send))) {
			return
		}
		yield* send
	})

/**
 * The one server `$exception` producer. Error Tracking uses PostHog's exception event protocol,
 * not an OTel ERROR status (locally, its JSONL stand-in); tracing and logging still use the sole OTel pipeline. Trace and replay
 * coordinates are read in the request; building the event (stack frames, source context) and its
 * network send run once the response has finished, through Next's `after()`. Next invokes the
 * route-handler error hook after that handler's request scope has closed, where `after()` has no
 * scope to join: there the hook awaits the export itself, delaying only that route's 500.
 * https://nextjs.org/docs/app/api-reference/functions/after
 */
export const captureServerException: {
	(
		context: ServerExceptionContext
	): (error: unknown) => Effect.Effect<void, never, OperationalTelemetry | TelemetrySink>
	(
		error: unknown,
		context: ServerExceptionContext
	): Effect.Effect<void, never, OperationalTelemetry | TelemetrySink>
} = Fn.dual(2, captureException)
