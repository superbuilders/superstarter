import type { LoadedDesignSystem } from "@scripts/dev/style/design-system"
import type { ClassLocation, Violation } from "@scripts/dev/style/types"

/**
 * Bans arbitrary spacing values in Tailwind classes.
 *
 * BAD:  p-[37px], m-[2.3rem], gap-[18px], space-x-[10px]
 * GOOD: p-4, m-2, gap-6, space-x-2 (use theme spacing tokens)
 * GOOD: h-[calc(--spacing(5.25))] (uses theme function)
 * GOOD: p-[var(--my-spacing)] (uses CSS variable)
 */

const SPACING_ROOTS = new Set([
	// Padding
	"p",
	"px",
	"py",
	"pt",
	"pr",
	"pb",
	"pl",
	"ps",
	"pe",
	// Margin
	"m",
	"mx",
	"my",
	"mt",
	"mr",
	"mb",
	"ml",
	"ms",
	"me",
	// Gap
	"gap",
	"gap-x",
	"gap-y",
	// Space between
	"space-x",
	"space-y",
	// Width/Height
	"w",
	"h",
	"min-w",
	"min-h",
	"max-w",
	"max-h",
	"size",
	// Positioning
	"top",
	"right",
	"bottom",
	"left",
	"inset",
	"inset-x",
	"inset-y",
	// Translate
	"translate-x",
	"translate-y",
	// Scroll margin/padding
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
])

function check(
	classes: ClassLocation[],
	designSystem: LoadedDesignSystem,
	file: string
): Violation[] {
	const violations: Violation[] = []

	for (const cls of classes) {
		const violation = checkClass(cls, designSystem, file)
		if (violation) {
			violations.push(violation)
		}
	}

	return violations
}

function checkClass(
	cls: ClassLocation,
	designSystem: LoadedDesignSystem,
	file: string
): Violation | undefined {
	const { ds } = designSystem
	const parsed = ds.parseCandidate(cls.text)

	for (const candidate of parsed) {
		if (candidate.kind !== "functional") continue
		if (!SPACING_ROOTS.has(candidate.root)) continue

		const value = candidate.value
		if (value === null) continue
		if (typeof value !== "object") continue
		if (value.kind !== "arbitrary") continue

		// Allow theme references
		const rawValue = value.value
		if (typeof rawValue === "string" && isThemeReference(rawValue)) {
			continue
		}

		return {
			file,
			line: cls.line,
			column: cls.column,
			rule: "no-arbitrary-spacing",
			message: `Arbitrary spacing "${candidate.raw}" banned. Use theme spacing tokens.`,
			className: cls.text
		}
	}

	return undefined
}

function isThemeReference(value: string): boolean {
	// CSS variables
	if (value.includes("var(--")) return true
	// Tailwind theme functions
	if (value.includes("--spacing(")) return true
	if (value.includes("--spacing-")) return true
	return false
}

export { check }
