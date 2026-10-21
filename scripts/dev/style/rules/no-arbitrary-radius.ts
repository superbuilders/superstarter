import { Array as Arr, String as Str } from "effect"
import { arbitraryValueBan } from "#scripts/dev/style/rules/arbitrary-value.ts"
import type { ClassRule } from "#scripts/dev/style/types.ts"

const RADIUS_ROOTS: ReadonlyArray<string> = [
	"rounded",
	"rounded-t",
	"rounded-r",
	"rounded-b",
	"rounded-l",
	"rounded-tl",
	"rounded-tr",
	"rounded-br",
	"rounded-bl",
	"rounded-s",
	"rounded-e",
	"rounded-ss",
	"rounded-se",
	"rounded-es",
	"rounded-ee"
]

/**
 * Bans arbitrary border radii: rounded-[13px] is a violation, rounded-md and rounded-[var(--radius-md)] are not.
 * CSS variables and the --radius() theme function are theme references.
 */
export const noArbitraryRadius: ClassRule = arbitraryValueBan({
	rule: "no-arbitrary-radius",
	roots: RADIUS_ROOTS,
	isThemeReference: (value) =>
		Arr.some(["var(--", "--radius("], (marker) => Str.includes(marker)(value)),
	noun: "radius"
})
