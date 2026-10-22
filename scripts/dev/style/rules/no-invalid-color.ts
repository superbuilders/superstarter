import { Array as Arr, Option } from "effect"
import type {
	Candidate,
	ClassLocation,
	ClassRule,
	DesignSystem,
	StyleViolation
} from "#scripts/dev/style/types.ts"

const COLOR_FUNCTIONS: ReadonlyArray<RegExp> = [
	/^#[0-9a-fA-F]{3,8}$/,
	/^rgba?\s*\(/,
	/^hsla?\s*\(/,
	/^oklch\s*\(/,
	/^oklab\s*\(/,
	/^lch\s*\(/,
	/^lab\s*\(/,
	/^color\s*\(/
]

const isColorValue = (value: string): boolean =>
	Arr.some(COLOR_FUNCTIONS, (pattern) => pattern.test(value))

const candidateViolation = (
	candidate: Candidate,
	location: ClassLocation,
	system: DesignSystem
): StyleViolation | undefined => {
	if (candidate.kind !== "functional" || candidate.value === null) {
		return undefined
	}
	const value = candidate.value
	if (value.kind === "arbitrary") {
		if (!isColorValue(value.value)) {
			return undefined
		}
		return {
			file: location.file,
			line: location.line,
			column: location.column,
			rule: "no-arbitrary-color",
			message: `Arbitrary color value "${value.value}" banned. Use theme tokens.`,
			className: location.text
		}
	}
	if (!system.allColors.has(value.value) || system.allowedColors.has(value.value)) {
		return undefined
	}
	return {
		file: location.file,
		line: location.line,
		column: location.column,
		rule: "no-invalid-color",
		message: `Color "${value.value}" not in theme. Use a design token.`,
		className: location.text
	}
}

/**
 * Color utilities use the theme's tokens: bg-blue-500 and text-gray-700 (Tailwind defaults) are violations, so is
 * an arbitrary color like bg-[#fff]; bg-primary, text-muted-foreground and non-color values like text-sm are not.
 */
export const noInvalidColor: ClassRule = ({ classes, system }) => {
	const violations: Array<StyleViolation> = []
	for (const location of classes) {
		const violation = Arr.findFirst(system.parseCandidate(location.text), (candidate) =>
			Option.fromUndefinedOr(candidateViolation(candidate, location, system))
		)
		if (Option.isSome(violation)) {
			violations.push(violation.value)
		}
	}
	return violations
}
