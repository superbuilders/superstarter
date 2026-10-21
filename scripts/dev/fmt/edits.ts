import { Array as Arr, Order, String as Str } from "effect"
import type { TextEdit } from "#scripts/dev/fmt/types.ts"

const byStartDescending = Order.flip(Order.mapInput(Order.Number, (edit: TextEdit) => edit.start))

/**
 * Applies edits from the end of the text backwards, so each edit's offsets still refer to the original text. Of two
 * overlapping edits only the later one lands: the other's offsets would be stale, so it is found again, and
 * applied, by the next pass over the rewritten text.
 */
export const applyEdits = <E extends TextEdit>(
	input: Readonly<{ text: string; edits: ReadonlyArray<E>; replacementOf: (edit: E) => string }>
): string => {
	let result = input.text
	let floor = Number.POSITIVE_INFINITY
	for (const edit of Arr.sort(input.edits, byStartDescending)) {
		if (edit.end > floor) {
			continue
		}
		result = `${Str.slice(0, edit.start)(result)}${input.replacementOf(edit)}${Str.slice(edit.end)(result)}`
		floor = edit.start
	}
	return result
}
