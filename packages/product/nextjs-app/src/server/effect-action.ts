import "server-only"
import {
	annotateOperation,
	type OperationalTelemetry,
	observed
} from "@superstarter/operational-telemetry/effect"
import { OPERATIONAL_SPANS, type OperationScope } from "@superstarter/operational-telemetry/spans"
import {
	type ActionContract,
	ActionFailed,
	exitCodecOf,
	type ServerAction,
	type ServerActionName,
	type WireSchema
} from "@superstarter/todo-protocol/action"
import { Cause, Effect, Exit, Function as Fn, Option, Result, Schema } from "effect"
import { unstable_rethrow } from "next/navigation"
import { reportHandledFailure } from "#server/observability/request-error.ts"
import type { TelemetrySink } from "#server/observability/sink.ts"
import { runWeb, type WebServices } from "#server/runtime.ts"

/** `redirect()` and `notFound()` throw Next's own signals; `unstable_rethrow` recognises them. */
const isNextSignal = (defect: unknown): boolean =>
	Result.isFailure(
		Result.try(() => {
			unstable_rethrow(defect)
		})
	)

type ServerActionScope = OperationScope<typeof OPERATIONAL_SPANS.serverAction.name>

/**
 * What crosses the wire for one finished run. Success crosses as it is, and so does a failure the
 * contract names: the contract is the allow-list of what the browser may see. A Next signal leaves
 * the action as itself so Next can act on it. Anything else (a failure the contract does not name,
 * a defect, an interruption) is reported once here and crosses only as the opaque `ActionFailed`,
 * so its message never reaches the browser.
 */
const settledOf = <S, E, X>(
	name: ServerActionName,
	isRefusal: (error: unknown) => error is E,
	exit: Exit.Exit<S, X>
): Effect.Effect<
	Exit.Exit<S, E | ActionFailed>,
	never,
	ServerActionScope | OperationalTelemetry | TelemetrySink
> => {
	if (Exit.isSuccess(exit)) {
		return annotateOperation(OPERATIONAL_SPANS.serverAction, {
			"superstarter.result.kind": "succeeded"
		}).pipe(Effect.as(Exit.succeed(exit.value)))
	}
	const refusal = Option.filter(Cause.findErrorOption(exit.cause), isRefusal)
	if (Option.isSome(refusal)) {
		return annotateOperation(OPERATIONAL_SPANS.serverAction, {
			"superstarter.result.kind": "refused"
		}).pipe(Effect.as(Exit.fail(refusal.value)))
	}
	const signal = Option.filter(Result.getSuccess(Cause.findDefect(exit.cause)), isNextSignal)
	if (Option.isSome(signal)) {
		return annotateOperation(OPERATIONAL_SPANS.serverAction, {
			"superstarter.result.kind": "navigated"
		}).pipe(Effect.andThen(Effect.die(signal.value)))
	}
	return reportHandledFailure(name, exit.cause).pipe(
		Effect.andThen(
			annotateOperation(OPERATIONAL_SPANS.serverAction, { "superstarter.result.kind": "failed" })
		),
		Effect.as(Exit.fail(ActionFailed.make({})))
	)
}

const effectActionOf = <P extends WireSchema, S extends WireSchema, X>(
	contract: ActionContract<P, S, WireSchema>,
	handler: (payload: P["Type"]) => Effect.Effect<S["Type"], X, WebServices>
): ServerAction<P> => {
	const decodePayload = Schema.decodeUnknownEffect(contract.payload)
	const isRefusal = Schema.is(contract.error)
	const encodeExit = Schema.encodeEffect(exitCodecOf(contract))
	return (input) =>
		runWeb(
			decodePayload(input).pipe(
				Effect.orDie,
				Effect.flatMap(handler),
				Effect.exit,
				Effect.flatMap((exit) => settledOf(contract.name, isRefusal, exit)),
				Effect.flatMap((settled) => encodeExit(settled).pipe(Effect.orDie)),
				observed(OPERATIONAL_SPANS.serverAction, { "superstarter.action.name": contract.name })
			)
		)
}

/**
 * Turns a contract and an Effect handler into a server action. The handler may fail with anything;
 * only the failures its contract names reach the caller as themselves. The result is a plain function that
 * returns a Promise, not an `async` function: Next accepts a wrapper's result as a `"use server"`
 * export, so action files stay free of `async`. Export only values built by this wrapper from a
 * `"use server"` file; Next still refuses a directly written non-async function there.
 */
export const effectAction: {
	<P extends WireSchema, S extends WireSchema, X>(
		handler: (payload: P["Type"]) => Effect.Effect<S["Type"], X, WebServices>
	): (contract: ActionContract<P, S, WireSchema>) => ServerAction<P>
	<P extends WireSchema, S extends WireSchema, X>(
		contract: ActionContract<P, S, WireSchema>,
		handler: (payload: P["Type"]) => Effect.Effect<S["Type"], X, WebServices>
	): ServerAction<P>
} = Fn.dual(2, effectActionOf)
