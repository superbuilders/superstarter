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
import { Array as Arr, Cause, Effect, Exit, Function as Fn, Option, Schema } from "effect"
import { isNextSignal } from "#lib/next-signal.ts"
import { reportHandledFailure } from "#server/observability/request-error.ts"
import type { TelemetrySink } from "#server/observability/sink.ts"
import { runWeb, type WebServices } from "#server/runtime.ts"

type ServerActionScope = OperationScope<typeof OPERATIONAL_SPANS.serverAction.name>

type ServerActionResultKind =
	(typeof OPERATIONAL_SPANS.serverAction.learned.Type)["superstarter.result.kind"]

/** How one finished run leaves the action: its kind, and the Exit the wire carries (or Next's
 * signal, raised again as itself). */
type Crossing<S, E> = Readonly<{
	kind: ServerActionResultKind
	wire: Effect.Effect<Exit.Exit<S, E | ActionFailed>, never, OperationalTelemetry | TelemetrySink>
}>

/** The cause's one reason, when it has exactly one: a refusal or a signal speaks for a run only when
 * nothing else went wrong beside it. */
const soleReasonOf = <X>(cause: Cause.Cause<X>): Option.Option<Cause.Reason<X>> =>
	cause.reasons.length === 1 ? Arr.head(cause.reasons) : Option.none()

const errorOf = <X>(reason: Cause.Reason<X>): Option.Option<X> =>
	Cause.isFailReason(reason) ? Option.some(reason.error) : Option.none()

const defectOf = <X>(reason: Cause.Reason<X>): Option.Option<unknown> =>
	Cause.isDieReason(reason) ? Option.some(reason.defect) : Option.none()

/**
 * What crosses the wire for one finished run. Success crosses as it is, and so does a failure the
 * contract names when it is the run's only reason: the contract is the allow-list of what the
 * browser may see. A Next signal leaves the action as itself so Next can act on it. Anything else (a
 * failure the contract does not name, a refusal beside another failure, a defect, an interruption)
 * is reported once here and crosses only as the opaque `ActionFailed`, so its message never reaches
 * the browser.
 */
const crossingOf = <S, E, X>(
	name: ServerActionName,
	isRefusal: (error: unknown) => error is E,
	exit: Exit.Exit<S, X>
): Crossing<S, E> => {
	if (Exit.isSuccess(exit)) {
		return { kind: "succeeded", wire: Effect.succeed(Exit.succeed(exit.value)) }
	}
	const sole = soleReasonOf(exit.cause)
	const refusal = Option.filter(Option.flatMap(sole, errorOf), isRefusal)
	if (Option.isSome(refusal)) {
		return { kind: "refused", wire: Effect.succeed(Exit.fail(refusal.value)) }
	}
	const signal = Option.filter(Option.flatMap(sole, defectOf), isNextSignal)
	if (Option.isSome(signal)) {
		return { kind: "navigated", wire: Effect.die(signal.value) }
	}
	return {
		kind: "failed",
		wire: reportHandledFailure(name, exit.cause).pipe(Effect.as(Exit.fail(ActionFailed.make({}))))
	}
}

const settledOf = <S, E, X>(
	name: ServerActionName,
	isRefusal: (error: unknown) => error is E,
	exit: Exit.Exit<S, X>
): Effect.Effect<
	Exit.Exit<S, E | ActionFailed>,
	never,
	ServerActionScope | OperationalTelemetry | TelemetrySink
> => {
	const { kind, wire } = crossingOf(name, isRefusal, exit)
	return annotateOperation(OPERATIONAL_SPANS.serverAction, {
		"superstarter.result.kind": kind
	}).pipe(Effect.andThen(wire))
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
