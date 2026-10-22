import { Array as Arr, Option, Order, String as Str } from "effect"
import { type ClassSaying, perClass } from "#scripts/dev/style/rules/per-class.ts"
import type { ExplainedClass, Theme } from "#scripts/dev/style/types.ts"

const MAX_LEVENSHTEIN_DISTANCE = 2

/** Tailwind's `group` and `peer` markers compile to no CSS of their own: the group-* and peer-* variants select
 * the element that carries them. */
const VARIANT_ANCHOR = /^(group|peer)(\/[\w-]+)?$/

/** One row of the edit-distance table: the distances from the first `i` characters of `a`, whose last is
 * `character`, to every prefix of `b`; undefined when the previous row is too short. */
const nextRow = (
	input: Readonly<{
		previous: ReadonlyArray<number>
		character: string | undefined
		b: string
		i: number
	}>
): ReadonlyArray<number> | undefined => {
	const { previous, character, b, i } = input
	const current = [i]
	for (let j = 1; j <= b.length; j += 1) {
		const cost = character === b[j - 1] ? 0 : 1
		const above = previous[j]
		const left = current[j - 1]
		const diagonal = previous[j - 1]
		if (above === undefined || left === undefined || diagonal === undefined) {
			return undefined
		}
		current.push(Math.min(above + 1, left + 1, diagonal + cost))
	}
	return current
}

const levenshtein = (a: string, b: string): number => {
	let previous: ReadonlyArray<number> = Arr.makeBy(b.length + 1, (index) => index)
	for (let i = 1; i <= a.length; i += 1) {
		const current = nextRow({ previous, character: a[i - 1], b, i })
		if (current === undefined) {
			return a.length + b.length
		}
		previous = current
	}
	const distance = previous[b.length]
	return distance === undefined ? a.length + b.length : distance
}

const closestOf = (typed: string, tokens: ReadonlyArray<string>): Option.Option<string> =>
	Option.filter(
		Arr.head(Arr.sortWith(tokens, (token) => levenshtein(typed, token), Order.Number)),
		(token) => levenshtein(typed, token) <= MAX_LEVENSHTEIN_DISTANCE
	)

/** "hover:bg-prmary" with root "bg" and the token "primary" becomes "hover:bg-primary". */
const correctedOf = (className: string, root: string, token: string): string => {
	const prefix = Option.match(Str.lastIndexOf(root)(className), {
		onNone: () => "",
		onSome: (index) => Str.slice(0, index)(className)
	})
	return `${prefix}${root}-${token}`
}

/** A hint for a class that does not compile, from the theme: an empty vocabulary means a broken @theme chain, a
 * close token name a typo. A root that takes bare values only has no hint. */
const hintOf = ({ candidate, text }: ExplainedClass, theme: Theme): Option.Option<string> => {
	if (candidate.kind !== "functional" || candidate.value?.kind !== "named") {
		return Option.none()
	}
	const { root } = candidate
	const typed = candidate.value.value
	return Option.flatMap(Option.fromUndefinedOr(theme.vocabularies.get(root)), (vocabulary) => {
		if (!Arr.isReadonlyArrayNonEmpty(vocabulary.tokens)) {
			return Option.some(
				`The design system has no ${Arr.join(vocabulary.namespaces, " or ")} tokens: check the @theme import chain.`
			)
		}
		return Option.map(
			closestOf(typed, vocabulary.tokens),
			(token) => `Did you mean "${correctedOf(text, root, token)}"?`
		)
	})
}

/**
 * Every class compiles to CSS. A class that does not is reported whatever it looks like; the theme's hint, when
 * there is one, is a suggestion, not the reason to report.
 */
export const noUnresolvedClass = perClass((explained, theme) => {
	if (explained.compiled !== undefined || VARIANT_ANCHOR.test(explained.text)) {
		return Option.none()
	}
	const message = `Class "${explained.text}" does not compile.`
	return Option.some(
		Option.match(hintOf(explained, theme), {
			onNone: (): ClassSaying => ({ message }),
			onSome: (suggestion): ClassSaying => ({ message, suggestion })
		})
	)
})
