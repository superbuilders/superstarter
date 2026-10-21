import { Array as Arr, Option, String as Str } from "effect"
import { COLOR_UTILITIES } from "#scripts/dev/style/design-system.ts"
import type {
	Candidate,
	ClassLocation,
	ClassRule,
	DesignSystem,
	StyleViolation
} from "#scripts/dev/style/types.ts"

const MAX_LEVENSHTEIN_DISTANCE = 2

/** Only the namespaces where the theme defines custom tokens can tell a typo from a built-in value. */
const themeNamespaceOf = (root: string): string | undefined => {
	if (Arr.contains(COLOR_UTILITIES, root)) {
		return "--color"
	}
	if (root === "animate" || root === "ease") {
		return `--${root}`
	}
	if (root === "rounded" || Str.startsWith("rounded-")(root)) {
		return "--radius"
	}
	if (root === "shadow" || root === "drop-shadow") {
		return "--shadow"
	}
	if (root === "inset-shadow") {
		return "--inset-shadow"
	}
	return Str.startsWith("font")(root) ? "--font" : undefined
}

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

const closestOf = (input: string, candidates: Iterable<string>): string | undefined => {
	let closest: string | undefined = undefined
	let closestDistance = MAX_LEVENSHTEIN_DISTANCE + 1
	for (const candidate of candidates) {
		const distance = levenshtein(input, candidate)
		if (distance < closestDistance) {
			closestDistance = distance
			closest = candidate
		}
	}
	return closest
}

/** "hover:bg-prmary" with root "bg" and suggestion "primary" becomes "hover:bg-primary". */
const suggestionOf = (className: string, root: string, value: string): string => {
	const prefix = Option.match(Str.lastIndexOf(root)(className), {
		onNone: () => "",
		onSome: (index) => Str.slice(0, index)(className)
	})
	return `${prefix}${root}-${value}`
}

/**
 * Why a class does not resolve, from the theme's namespaces; undefined when it is most likely a bare-value
 * utility that the design system cannot resolve rather than a mistake.
 */
const diagnose = (
	location: ClassLocation,
	candidate: Candidate,
	system: DesignSystem
): string | undefined => {
	if (candidate.kind !== "functional" || candidate.value?.kind !== "named") {
		return undefined
	}
	const root = candidate.root
	const typed = candidate.value.value
	const namespace = themeNamespaceOf(root)
	if (namespace === undefined) {
		return undefined
	}
	// text-sm maps to the color namespace too, so a value close to no color is some other utility's value.
	if (namespace === "--color") {
		const closest = closestOf(typed, system.allColors)
		return closest === undefined
			? undefined
			: `did you mean "${suggestionOf(location.text, root, closest)}"?`
	}
	const tokens = system.themeNamespaces.get(namespace)
	if (tokens === undefined) {
		return `no ${Str.slice(2)(namespace)} tokens found in design system — check @theme import chain`
	}
	// An exact token may still fail to compile when an @utility rule is opaque to the design system.
	if (tokens.has(typed)) {
		return undefined
	}
	const closest = closestOf(
		typed,
		Arr.filter(Arr.fromIterable(tokens), (token) => token !== null)
	)
	return closest === undefined
		? undefined
		: `did you mean "${suggestionOf(location.text, root, closest)}"?`
}

/**
 * Every Tailwind class must compile to CSS. A class that does not, and parses as Tailwind syntax, is diagnosed
 * against the theme: an empty namespace means a broken @theme chain, a close token name means a typo.
 */
export const noUnresolvedClass: ClassRule = ({ classes, system }) => {
	const resolved = system.resolvesToCss(Arr.map(classes, (location) => location.text))
	const violations: Array<StyleViolation> = []
	for (const [index, location] of classes.entries()) {
		const candidate = system.parseCandidate(location.text)[0]
		if (resolved[index] === true || candidate === undefined) {
			continue
		}
		const detail = diagnose(location, candidate, system)
		if (detail !== undefined) {
			violations.push({
				file: location.file,
				line: location.line,
				column: location.column,
				rule: "no-unresolved-class",
				message: `Class "${location.text}" — ${detail}`,
				className: location.text
			})
		}
	}
	return violations
}
