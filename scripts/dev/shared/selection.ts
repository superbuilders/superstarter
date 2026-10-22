import { Array as Arr, Effect } from "effect"
import { DevtoolFailure } from "#scripts/dev/shared/devtool.ts"
import { covers } from "#scripts/dev/shared/repository.ts"

const selectedBy = (selected: string) => (file: string) => covers({ selected, file })

/**
 * The files a tool runs on, out of the files it can run on: all of them, or with explicit paths the ones at or under
 * a path. A path that selects no file is a failure, so a misspelled or missing path never passes as a clean run.
 */
export const selectFiles = (
	input: Readonly<{ available: ReadonlyArray<string>; paths: ReadonlyArray<string> }>
): Effect.Effect<ReadonlyArray<string>, DevtoolFailure> => {
	if (!Arr.isReadonlyArrayNonEmpty(input.paths)) {
		return Effect.succeed(input.available)
	}
	const unmatched = Arr.filter(
		input.paths,
		(selected) => !Arr.some(input.available, selectedBy(selected))
	)
	if (Arr.isReadonlyArrayNonEmpty(unmatched)) {
		return Effect.fail(
			DevtoolFailure.make({ detail: `No file to check at ${Arr.join(unmatched, ", ")}` })
		)
	}
	return Effect.succeed(
		Arr.filter(input.available, (file) =>
			Arr.some(input.paths, (selected) => selectedBy(selected)(file))
		)
	)
}
