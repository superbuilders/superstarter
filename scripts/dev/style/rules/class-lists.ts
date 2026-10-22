import { Array as Arr, Option, Result } from "effect"
import type { ClassRule, CompiledClass } from "#scripts/dev/style/types.ts"

const isSameEffect = (left: CompiledClass, right: CompiledClass): boolean =>
	left.variants === right.variants && left.properties === right.properties

/**
 * Two classes of one list that compile to the same CSS properties under the same variants conflict: which one wins
 * is decided by Tailwind's stylesheet order, not by their order in the list, so one of them is dead or the list
 * is wrong. `p-2 px-4` refines and `text-sm leading-6` overrides one property on purpose; neither conflicts.
 */
export const noConflictingClasses: ClassRule = ({ list }) =>
	Arr.filterMap(list, (later, index) => {
		const compiled = later.compiled
		if (compiled === undefined || compiled.properties === "") {
			return Result.failVoid
		}
		const earlier = Arr.findFirst(
			Arr.take(list, index),
			(candidate) =>
				candidate.text !== later.text &&
				candidate.compiled !== undefined &&
				isSameEffect(candidate.compiled, compiled)
		)
		if (Option.isNone(earlier)) {
			return Result.failVoid
		}
		return Result.succeed({
			token: later,
			message: `Class "${later.text}" sets ${compiled.properties} like "${earlier.value.text}" in the same list; Tailwind's stylesheet order picks the winner, not this order.`,
			suggestion: "Keep one. To switch between them, choose a complete class string per state."
		})
	})

/** A class appears once in its list. */
export const noDuplicateClass: ClassRule = ({ list }) =>
	Arr.filterMap(list, (later, index) =>
		Arr.some(Arr.take(list, index), (earlier) => earlier.text === later.text)
			? Result.succeed({
					token: later,
					message: `Class "${later.text}" appears twice in this list.`
				})
			: Result.failVoid
	)
