import { Console, Effect, Inspectable, Schema } from "effect"

/**
 * The failure of a repository dev tool, in words. Built-in Error subclasses are banned, so every Effect.try catch
 * clause and admission check in the dev tools fails with this instead. The entry point prints the detail and exits
 * with status 2, which keeps 1 free to mean "violations found".
 */
export class DevtoolFailure extends Schema.TaggedError<
	DevtoolFailure,
	{ readonly brand: unique symbol }
>()("DevtoolFailure", {
	detail: Schema.String,
	cause: Schema.optional(Schema.Defect())
}) {}

/** Status 1 means the tool ran and found violations; status 2 means the tool itself could not run. */
export const exitWith = (code: 0 | 1 | 2): Effect.Effect<void> =>
	Effect.sync(() => {
		process.exitCode = code
	})

/** Prints a dev tool failure and its cause, then sets status 2 so a caller can tell it from violations. It reads only
 * the failure's detail and cause. */
export const reportFailure = (
	failure: Readonly<Pick<DevtoolFailure, "detail" | "cause">>
): Effect.Effect<void> =>
	Effect.gen(function* () {
		const cause =
			failure.cause === undefined ? "" : `\n${Inspectable.toStringUnknown(failure.cause)}`
		yield* Console.error(`${failure.detail}${cause}`)
		yield* exitWith(2)
	})
