import { Array as Arr, Effect, Path, String as Str } from "effect"
import { DevtoolFailure } from "#scripts/dev/shared/devtool.ts"

/** A dev tool's command line: the flags it was given and the absolute paths it was pointed at, in order. */
export type Invocation = Readonly<{
	flags: ReadonlySet<string>
	paths: ReadonlyArray<string>
}>

const isFlag = Str.startsWith("--")

/**
 * Reads the command line, resolving paths against the working directory. An unknown flag is a failure, because a
 * misspelled flag would otherwise be ignored. It resolves with Effect's Path service, which is unstable, and so is
 * it.
 *
 * @stability unstable
 */
export const invocationOf = (
	allowed: ReadonlyArray<string>
): Effect.Effect<Invocation, DevtoolFailure, Path.Path> =>
	Effect.gen(function* () {
		const path = yield* Path.Path
		const argv = yield* Effect.sync((): ReadonlyArray<string> => process.argv.slice(2))
		const flags = Arr.filter(argv, isFlag)
		const unknown = Arr.filter(flags, (flag) => !Arr.contains(allowed, flag))
		if (Arr.isReadonlyArrayNonEmpty(unknown)) {
			return yield* DevtoolFailure.make({
				detail: `Unknown option ${Arr.join(unknown, ", ")}; expected ${Arr.join(allowed, ", ")}`
			})
		}
		return {
			flags: new Set(flags),
			paths: Arr.map(
				Arr.filter(argv, (argument) => !isFlag(argument)),
				(argument) => path.resolve(argument)
			)
		}
	})
