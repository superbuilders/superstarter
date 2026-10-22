import { Array as Arr, String as Str } from "effect"
import { arbitraryValueBan } from "#scripts/dev/style/rules/arbitrary-value.ts"
import type { ClassRule } from "#scripts/dev/style/types.ts"
import { RADIUS_UTILITIES } from "#scripts/dev/style/utilities.ts"

/**
 * Bans arbitrary border radii: rounded-[13px] is a violation, rounded-md and rounded-[var(--radius-md)] are not.
 * CSS variables and the --radius() theme function are theme references.
 */
export const noArbitraryRadius: ClassRule = arbitraryValueBan({
	roots: RADIUS_UTILITIES,
	isThemeReference: (value) =>
		Arr.some(["var(--", "--radius("], (marker) => Str.includes(marker)(value)),
	noun: "radius"
})
