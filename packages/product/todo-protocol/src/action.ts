import { Effect, Function as Fn, Schema } from "effect"

/** Every server action the app exposes. Each is one contract's `name` and the
 * `superstarter.action.name` of its span. */
export const SERVER_ACTIONS = ["todos.create", "todos.toggle", "todos.delete"] as const
export type ServerActionName = (typeof SERVER_ACTIONS)[number]

/** A Schema that decodes and encodes without services, so both sides of the wire can run it. */
export type WireSchema = Schema.Top & {
	readonly DecodingServices: never
	readonly EncodingServices: never
}

/**
 * What one server action admits, answers and refuses. The contract lives in browser-safe code so the
 * server action and its caller share one definition: the payload decodes on the server, and the
 * outcome, typed errors included, decodes back into the same classes in the browser.
 */
export type ActionContract<
	P extends WireSchema,
	S extends WireSchema,
	E extends WireSchema
> = Readonly<{
	name: ServerActionName
	payload: P
	success: S
	error: E
}>

/** The action failed in a way the person cannot fix. Its cause never crosses the wire; the server
 * reported it. */
export class ActionFailed extends Schema.TaggedError<
	ActionFailed,
	{ readonly brand: unique symbol }
>()("ActionFailed", {}) {}

/** The action's request never answered: the page went away or the request failed in transit. The
 * change may or may not have landed, so the caller never retries it on its own. */
export class ActionUnconfirmed extends Schema.TaggedError<
	ActionUnconfirmed,
	{ readonly brand: unique symbol }
>()("ActionUnconfirmed", {}) {}

/** A server action as the client imports it. It answers JSON: the Exit of its Effect, encoded by its
 * contract. */
export type ServerAction<P extends WireSchema> = (input: P["Encoded"]) => Promise<Schema.Json>

/** The one encoding of an action's outcome: success, a contract error, or the opaque ActionFailed. */
export const exitCodecOf = <S extends WireSchema, E extends WireSchema>(
	contract: ActionContract<WireSchema, S, E>
) =>
	Schema.toCodecJson(
		Schema.Exit(contract.success, Schema.Union([contract.error, ActionFailed]), Schema.Never)
	)

const callActionOf = <P extends WireSchema, S extends WireSchema, E extends WireSchema>(
	contract: ActionContract<P, S, E>,
	action: ServerAction<P>
) => {
	const encodePayload = Schema.encodeEffect(contract.payload)
	const decodeExit = Schema.decodeUnknownEffect(exitCodecOf(contract))
	return (
		payload: P["Type"]
	): Effect.Effect<S["Type"], E["Type"] | ActionFailed | ActionUnconfirmed> =>
		encodePayload(payload).pipe(
			Effect.orDie,
			Effect.flatMap((encoded) =>
				Effect.tryPromise({ try: () => action(encoded), catch: () => ActionUnconfirmed.make({}) })
			),
			Effect.flatMap((wire) => decodeExit(wire).pipe(Effect.orDie)),
			Effect.flatten
		)
}

/** The client's view of a server action: an Effect that fails with the contract's own errors. */
export const callAction: {
	<P extends WireSchema, S extends WireSchema, E extends WireSchema>(
		action: ServerAction<P>
	): (
		contract: ActionContract<P, S, E>
	) => (
		payload: P["Type"]
	) => Effect.Effect<S["Type"], E["Type"] | ActionFailed | ActionUnconfirmed>
	<P extends WireSchema, S extends WireSchema, E extends WireSchema>(
		contract: ActionContract<P, S, E>,
		action: ServerAction<P>
	): (payload: P["Type"]) => Effect.Effect<S["Type"], E["Type"] | ActionFailed | ActionUnconfirmed>
} = Fn.dual(2, callActionOf)
