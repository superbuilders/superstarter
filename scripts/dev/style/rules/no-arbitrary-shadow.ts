import type { LoadedDesignSystem } from "@scripts/dev/style/design-system"
import type { ClassLocation, Violation } from "@scripts/dev/style/types"

/**
 * Bans arbitrary shadow values in Tailwind classes.
 *
 * BAD:  shadow-[0_4px_12px_rgba(0,0,0,0.1)], drop-shadow-[0_2px_4px_#000]
 * GOOD: shadow-sm, shadow-md, shadow-lg (use theme shadow tokens)
 * GOOD: shadow-[var(--shadow-custom)] (uses CSS variable)
 */

const SHADOW_ROOTS = new Set(["shadow", "drop-shadow"])

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
		if (!SHADOW_ROOTS.has(candidate.root)) continue

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
			rule: "no-arbitrary-shadow",
			message: `Arbitrary shadow "${candidate.raw}" banned. Use theme shadow tokens.`,
			className: cls.text
		}
	}

	return undefined
}

function isThemeReference(value: string): boolean {
	// CSS variables
	if (value.includes("var(--")) return true
	// Tailwind theme functions
	if (value.includes("--shadow(")) return true
	return false
}

export { check }
