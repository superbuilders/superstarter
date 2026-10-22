import "server-only"
import { REPLAY_HEADER, replayAttributes } from "@superstarter/operational-telemetry/correlation"
import { type OperationalTelemetry, observed } from "@superstarter/operational-telemetry/effect"
import { failureExceptionOf, loggedFailureOf } from "@superstarter/operational-telemetry/failure"
import { type SharedAttributes, Token } from "@superstarter/operational-telemetry/schema"
import { OPERATIONAL_SPANS } from "@superstarter/operational-telemetry/spans"
import type { ServerActionName } from "@superstarter/todo-protocol/action"
import { Array as Arr, Cause, Effect, Function as Fn, Option, Predicate, Schema } from "effect"
import type { Instrumentation } from "next"
import { captureServerException } from "#server/observability/errors.ts"
import type { TelemetrySink } from "#server/observability/sink.ts"
import { runWeb } from "#server/runtime.ts"

/** The request and route context Next hands its request-error hook. */
export type ErrorRequest = Parameters<Instrumentation.onRequestError>[1]
export type ErrorContext = Parameters<Instrumentation.onRequestError>[2]

const headerOf = (request: ErrorRequest, name: string): string | undefined => {
	const value = request.headers[name]
	return Arr.isArray(value) ? value[0] : value
}

/** React assigns the digest the browser boundary receives in place of the redacted message. */
const digestOf = (error: unknown): unknown =>
	Predicate.hasProperty(error, "digest") ? error.digest : undefined

/** An untrusted value the span carries only as a `Token`: one that does not decode is dropped,
 * never exported raw. */
const admitToken = Schema.decodeUnknownOption(Token)

/** Next's `request.path` is the resource path with its query; only the path is exported. The
 * route file path is Next's own low-cardinality route identity. The action header and the replay
 * header come from the browser and the digest from whatever was thrown, so each is admitted by the
 * span's own Schema or left out: the action id is Next's opaque id, never its arguments. */
const requestErrorAttributes = (
	error: unknown,
	request: ErrorRequest,
	context: ErrorContext
): typeof OPERATIONAL_SPANS.frameworkRequestError.opened.Type => {
	const path = URL.parse(request.path, "http://request.invalid")?.pathname
	const action = admitToken(headerOf(request, "next-action"))
	const digest = admitToken(digestOf(error))
	return {
		"next.router_kind": context.routerKind,
		"next.route_path": context.routePath,
		"next.route_type": context.routeType,
		...(context.renderSource === undefined ? {} : { "next.render_source": context.renderSource }),
		...(context.revalidateReason === undefined
			? {}
			: { "next.revalidate_reason": context.revalidateReason }),
		...Option.match(action, { onNone: () => ({}), onSome: (id) => ({ "next.action_id": id }) }),
		...Option.match(digest, {
			onNone: () => ({}),
			onSome: (admitted) => ({ "next.error.digest": admitted })
		}),
		"http.request.method": request.method,
		...(path === undefined ? {} : { "url.path": path }),
		...replayAttributes(headerOf(request, REPLAY_HEADER))
	}
}

/** One log, one span and one exception for a failure Next rendered or answered, attributed to
 * the route, the digest and the replay session. The log carries the failure's closed reasons and
 * SQLSTATEs, never the error. The span fails with the error as a defect: from this program's
 * side, a failure that reached Next's hook is one. */
const reportRequestError = (
	error: unknown,
	request: ErrorRequest,
	context: ErrorContext
): Promise<void> => {
	const attributes = requestErrorAttributes(error, request, context)
	return runWeb(
		Effect.logError("request failed", loggedFailureOf(Cause.die(error))).pipe(
			Effect.andThen(captureServerException(error, attributes)),
			Effect.andThen(Effect.die(error)),
			observed(OPERATIONAL_SPANS.frameworkRequestError, attributes),
			Effect.ignoreCause
		)
	)
}

/** Next's hook for every failure it renders or answers. Next calls it data-first with the error,
 * the request and its route context. */
export const reportWebRequestError: {
	(request: ErrorRequest, context: ErrorContext): (error: unknown) => Promise<void>
	(error: unknown, request: ErrorRequest, context: ErrorContext): Promise<void>
} = Fn.dual(3, reportRequestError)

const reportFailure = (
	operation: ServerActionName,
	cause: Cause.Cause<unknown>
): Effect.Effect<void, never, OperationalTelemetry | TelemetrySink> => {
	const captured = Cause.hasInterruptsOnly(cause)
		? Effect.void
		: captureServerException(failureExceptionOf(cause), {
				"superstarter.failure.operation": operation
			})
	return Effect.logError("handled failure", loggedFailureOf(cause)).pipe(
		Effect.annotateLogs({ "superstarter.failure.operation": operation } satisfies SharedAttributes),
		Effect.andThen(captured)
	)
}

/**
 * A failure converted into a value never reaches Next's error hook, so its owner reports it once,
 * saying only what a cause may say outside the process: to the logs its closed reasons and
 * SQLSTATEs (`loggedFailureOf`), to Error Tracking its tag and failure codes
 * (`failureExceptionOf`). Interruption is a cancelled request, not an exception.
 */
export const reportHandledFailure: {
	(
		cause: Cause.Cause<unknown>
	): (
		operation: ServerActionName
	) => Effect.Effect<void, never, OperationalTelemetry | TelemetrySink>
	(
		operation: ServerActionName,
		cause: Cause.Cause<unknown>
	): Effect.Effect<void, never, OperationalTelemetry | TelemetrySink>
} = Fn.dual(2, reportFailure)
