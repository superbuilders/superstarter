import { Array as Arr, Option } from "effect"
import type { Candidate, ClassRule, StyleRuleId, StyleViolation } from "#scripts/dev/style/types.ts"

export type ArbitraryValueBan = Readonly<{
	rule: StyleRuleId
	roots: ReadonlyArray<string>
	isThemeReference: (value: string) => boolean
	noun: string
}>

/**
 * The shared shape of the arbitrary-value bans: a class whose first functional candidate with a banned root carries
 * an arbitrary `[...]` value that is no theme reference is reported once.
 */
export const arbitraryValueBan = (ban: ArbitraryValueBan): ClassRule => {
	const isBanned = (candidate: Candidate): boolean =>
		candidate.kind === "functional" &&
		Arr.contains(ban.roots, candidate.root) &&
		candidate.value?.kind === "arbitrary" &&
		!ban.isThemeReference(candidate.value.value)
	return (input) => {
		const violations: Array<StyleViolation> = []
		for (const location of input.classes) {
			const banned = Arr.findFirst(input.system.parseCandidate(location.text), isBanned)
			if (Option.isSome(banned)) {
				violations.push({
					file: location.file,
					line: location.line,
					column: location.column,
					rule: ban.rule,
					message: `Arbitrary ${ban.noun} "${banned.value.raw}" banned. Use theme ${ban.noun} tokens.`,
					className: location.text
				})
			}
		}
		return violations
	}
}
