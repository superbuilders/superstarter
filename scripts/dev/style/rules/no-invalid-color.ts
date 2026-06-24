import type { LoadedDesignSystem } from "@scripts/dev/style/design-system"
import type { ClassLocation, Violation } from "@scripts/dev/style/types"

/**
 * Validates that color utilities only use allowed theme tokens.
 *
 * BAD:  bg-blue-500 (Tailwind default, not in our theme)
 * BAD:  text-gray-700 (Tailwind default)
 * GOOD: bg-primary, bg-background, bg-muted
 * GOOD: text-foreground, text-muted-foreground
 * GOOD: text-sm, ring-1, border-t (not color utilities)
 */
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
	const { ds, allowedColors, allColors } = designSystem
	const parsed = ds.parseCandidate(cls.text)

	for (const candidate of parsed) {
		if (candidate.kind !== "functional") continue

		const value = candidate.value
		if (value === null) continue
		if (typeof value !== "object") continue

		const violation = checkCandidateValue(value, cls, file, allowedColors, allColors)
		if (violation) {
			return violation
		}
	}

	return undefined
}

interface CandidateValue {
	kind: string
	value?: unknown
}

function checkCandidateValue(
	value: CandidateValue,
	cls: ClassLocation,
	file: string,
	allowedColors: Set<string>,
	allColors: Set<string>
): Violation | undefined {
	if (value.kind === "arbitrary") {
		return checkArbitraryValue(value, cls, file)
	}

	if (value.kind === "named") {
		return checkNamedValue(value, cls, file, allowedColors, allColors)
	}

	return undefined
}

function checkArbitraryValue(
	value: CandidateValue,
	cls: ClassLocation,
	file: string
): Violation | undefined {
	if (typeof value.value !== "string") {
		return undefined
	}

	if (isColorValue(value.value)) {
		return {
			file,
			line: cls.line,
			column: cls.column,
			rule: "no-arbitrary-color",
			message: `Arbitrary color value "${value.value}" banned. Use theme tokens.`,
			className: cls.text
		}
	}

	return undefined
}

function checkNamedValue(
	value: CandidateValue,
	cls: ClassLocation,
	file: string,
	allowedColors: Set<string>,
	allColors: Set<string>
): Violation | undefined {
	if (typeof value.value !== "string") {
		return undefined
	}

	const colorName = value.value

	// Skip if this value isn't even a color (e.g., "sm", "1", "t", "none")
	if (!allColors.has(colorName)) {
		return undefined
	}

	// Flag if it's a color but not in allowed colors
	if (!allowedColors.has(colorName)) {
		return {
			file,
			line: cls.line,
			column: cls.column,
			rule: "no-invalid-color",
			message: `Color "${colorName}" not in theme. Use a design token.`,
			className: cls.text
		}
	}

	return undefined
}

function isColorValue(value: string): boolean {
	// Hex colors
	if (/^#[0-9a-fA-F]{3,8}$/.test(value)) return true
	// rgb/rgba
	if (/^rgba?\s*\(/.test(value)) return true
	// hsl/hsla
	if (/^hsla?\s*\(/.test(value)) return true
	// oklch/oklab
	if (/^oklch\s*\(/.test(value)) return true
	if (/^oklab\s*\(/.test(value)) return true
	// lch/lab
	if (/^lch\s*\(/.test(value)) return true
	if (/^lab\s*\(/.test(value)) return true
	// color()
	if (/^color\s*\(/.test(value)) return true

	return false
}

export { check }
