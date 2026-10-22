import { Array as Arr, String as Str } from "effect"
import { arbitraryValueBan } from "#scripts/dev/style/rules/arbitrary-value.ts"
import type { ClassRule } from "#scripts/dev/style/types.ts"

const SPACING_ROOTS: ReadonlyArray<string> = [
	"p",
	"px",
	"py",
	"pt",
	"pr",
	"pb",
	"pl",
	"ps",
	"pe",
	"m",
	"mx",
	"my",
	"mt",
	"mr",
	"mb",
	"ml",
	"ms",
	"me",
	"gap",
	"gap-x",
	"gap-y",
	"space-x",
	"space-y",
	"w",
	"h",
	"min-w",
	"min-h",
	"max-w",
	"max-h",
	"size",
	"top",
	"right",
	"bottom",
	"left",
	"inset",
	"inset-x",
	"inset-y",
	"translate-x",
	"translate-y",
	"scroll-m",
	"scroll-mx",
	"scroll-my",
	"scroll-mt",
	"scroll-mr",
	"scroll-mb",
	"scroll-ml",
	"scroll-p",
	"scroll-px",
	"scroll-py",
	"scroll-pt",
	"scroll-pr",
	"scroll-pb",
	"scroll-pl"
]

/**
 * Bans arbitrary spacing and sizing: p-[37px] and gap-[18px] are violations, p-4,
 * h-[calc(--spacing(5.25))] and p-[var(--my-spacing)] are not. CSS variables and the spacing theme function and
 * tokens are theme references.
 */
export const noArbitrarySpacing: ClassRule = arbitraryValueBan({
	roots: SPACING_ROOTS,
	isThemeReference: (value) =>
		Arr.some(["var(--", "--spacing(", "--spacing-"], (marker) => Str.includes(marker)(value)),
	noun: "spacing"
})
