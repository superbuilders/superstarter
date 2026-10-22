import { Array as Arr, Option } from "effect"
import { perClass } from "#scripts/dev/style/rules/per-class.ts"
import type { Candidate, ExplainedClass } from "#scripts/dev/style/types.ts"
import { COLOR_UTILITIES } from "#scripts/dev/style/utilities.ts"

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

type ColorValue = NonNullable<Extract<Candidate, { kind: "functional" }>["value"]>

/** The value of a color utility; only the color roots are read, so `font-black` is a weight, not a color. */
const colorValueOf = ({ candidate }: ExplainedClass): Option.Option<ColorValue> => {
	if (candidate.kind !== "functional" || !Arr.contains(COLOR_UTILITIES, candidate.root)) {
		return Option.none()
	}
	return Option.fromNullOr(candidate.value)
}

/** Color utilities name the theme's tokens: bg-blue-500 and text-gray-700 (Tailwind's palette) are refused;
 * bg-primary and text-muted-foreground are tokens. */
export const noInvalidColor = perClass((explained, theme) =>
	Option.flatMap(colorValueOf(explained), (value) =>
		value.kind === "named" && theme.colors.has(value.value) && !theme.colorTokens.has(value.value)
			? Option.some({
					message: `Color "${value.value}" is Tailwind's palette, not a design token.`,
					suggestion: "Use a theme color token, such as primary or muted-foreground."
				})
			: Option.none()
	)
)

/** A color utility takes no arbitrary color value: bg-[#fff] and text-[oklch(…)] are refused. */
export const noArbitraryColor = perClass((explained) =>
	Option.flatMap(colorValueOf(explained), (value) =>
		value.kind === "arbitrary" && Arr.some(COLOR_FUNCTIONS, (pattern) => pattern.test(value.value))
			? Option.some({
					message: `Arbitrary color value "${value.value}" is banned.`,
					suggestion: "Use a theme color token."
				})
			: Option.none()
	)
)
