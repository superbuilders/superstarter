import type { LoadedDesignSystem } from "@scripts/dev/style/design-system"
import type { ClassLocation, Violation } from "@scripts/dev/style/types"

/**
 * Bans arbitrary border-radius values in Tailwind classes.
 *
 * BAD:  rounded-[13px], rounded-t-[0.5rem], rounded-tl-[4px]
 * GOOD: rounded-md, rounded-lg, rounded-xl (use theme radius tokens)
 * GOOD: rounded-[var(--radius-md)] (uses CSS variable)
 */

const RADIUS_ROOTS = new Set([
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
		if (!RADIUS_ROOTS.has(candidate.root)) continue

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
			rule: "no-arbitrary-radius",
			message: `Arbitrary radius "${candidate.raw}" banned. Use theme radius tokens.`,
			className: cls.text
		}
	}

	return undefined
}

function isThemeReference(value: string): boolean {
	// CSS variables (including theme radius vars)
	if (value.includes("var(--")) return true
	// Tailwind theme functions
	if (value.includes("--radius(")) return true
	return false
}

export { check }
