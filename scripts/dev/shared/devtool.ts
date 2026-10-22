import { NodeRuntime, NodeServices } from "@effect/platform-node"
import { Cause, Console, Effect, Inspectable, Option, Schema } from "effect"

/**
 * The failure of a repository dev tool, in words. Built-in Error subclasses are banned, so every Effect.try catch
 * clause and admission check in the dev tools fails with this instead.
 */
export class DevtoolFailure extends Schema.TaggedError<
	DevtoolFailure,
	{ readonly brand: unique symbol }
>()("DevtoolFailure", {
	detail: Schema.String,
	cause: Schema.optional(Schema.Defect())
}) {}

const isDevtoolFailure = Schema.is(DevtoolFailure)

/** A dev tool failure prints its detail and cause; any other cause prints in full. */
const failureText = <E>(cause: Cause.Cause<E>): string =>
	Option.match(Option.filter(Cause.findErrorOption(cause), isDevtoolFailure), {
		onNone: () => Cause.pretty(cause),
		onSome: (failure) =>
			failure.cause === undefined
				? failure.detail
				: `${failure.detail}\n${Inspectable.toStringUnknown(failure.cause)}`
	})

/**
 * Runs a dev tool's program, which answers its exit status: 0 when it found nothing, 1 when it found something, or
 * whatever status a tool it launched answered. Every failure of the tool itself, a defect or an interruption
 * included, prints and exits 2, so 1 always means findings. It hands the program Effect's Node platform services,
 * which are unstable, and so is it.
 *
 * @stability unstable
 */
export const runDevtool = <E>(main: Effect.Effect<number, E, NodeServices.NodeServices>): void => {
	const program = main.pipe(
		Effect.catchCause((cause) => Effect.as(Console.error(failureText(cause)), 2)),
		Effect.flatMap((status) =>
			Effect.sync(() => {
				process.exitCode = status
			})
		)
	)
	// @effect-diagnostics-next-line strictEffectProvide:off
	NodeRuntime.runMain(program.pipe(Effect.provide(NodeServices.layer)))
}
