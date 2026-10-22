import { Array as Arr, String as Str } from "effect"
import { arbitraryValueBan } from "#scripts/dev/style/rules/arbitrary-value.ts"
import type { ClassRule } from "#scripts/dev/style/types.ts"

/**
 * Bans arbitrary shadows: shadow-[0_4px_12px_rgba(0,0,0,0.1)] is a violation, shadow-md and
 * shadow-[var(--shadow-custom)] are not. CSS variables and the --shadow() theme function are theme references.
 */
export const noArbitraryShadow: ClassRule = arbitraryValueBan({
	roots: ["shadow", "drop-shadow"],
	isThemeReference: (value) =>
		Arr.some(["var(--", "--shadow("], (marker) => Str.includes(marker)(value)),
	noun: "shadow"
})
