import { Array as Arr, Option } from "effect"
import { perClass } from "#scripts/dev/style/rules/per-class.ts"
import type { ClassRule } from "#scripts/dev/style/types.ts"

/**
 * The shared shape of the arbitrary-value bans: a class whose candidate has a banned root and an arbitrary `[...]`
 * value that references no theme token is refused.
 */
export const arbitraryValueBan = (
	ban: Readonly<{
		roots: ReadonlyArray<string>
		isThemeReference: (value: string) => boolean
		noun: string
	}>
): ClassRule =>
	perClass(({ candidate }) => {
		if (
			candidate.kind !== "functional" ||
			!Arr.contains(ban.roots, candidate.root) ||
			candidate.value?.kind !== "arbitrary" ||
			ban.isThemeReference(candidate.value.value)
		) {
			return Option.none()
		}
		return Option.some({
			message: `Arbitrary ${ban.noun} "${candidate.raw}" is banned.`,
			suggestion: `Use the theme's ${ban.noun} tokens.`
		})
	})
