import { Schema } from "effect"

/** Every rule the style linter reports; no-invalid-color also reports arbitrary color values as no-arbitrary-color. */
const STYLE_RULE_IDS = [
	"no-unresolved-class",
	"no-invalid-color",
	"no-arbitrary-color",
	"no-arbitrary-spacing",
	"no-arbitrary-radius",
	"no-arbitrary-shadow",
	"require-data-slot",
	"no-duplicate-data-slot"
] as const

const StyleRuleId = Schema.Literals(STYLE_RULE_IDS)

export type StyleRuleId = typeof StyleRuleId.Type

export const StyleViolation = Schema.Struct({
	file: Schema.String,
	line: Schema.Int,
	column: Schema.Int,
	rule: StyleRuleId,
	message: Schema.String,
	className: Schema.optional(Schema.String),
	componentName: Schema.optional(Schema.String)
})

export type StyleViolation = typeof StyleViolation.Type

/** One class name written in a source file, at the position of the literal it came from. */
export type ClassLocation = Readonly<{ file: string; text: string; line: number; column: number }>

/** A Tailwind utility value: an arbitrary `[...]` value or a named theme value. */
const UtilityValue = Schema.Union([
	Schema.Struct({ kind: Schema.Literal("arbitrary"), value: Schema.String }),
	Schema.Struct({ kind: Schema.Literal("named"), value: Schema.String })
])

/** The part of a parsed Tailwind candidate the style rules read; Tailwind's own types are not published. */
export const Candidate = Schema.Union([
	Schema.Struct({
		kind: Schema.Literal("functional"),
		root: Schema.String,
		value: Schema.NullOr(UtilityValue),
		raw: Schema.String
	}),
	Schema.Struct({ kind: Schema.Literal("static"), root: Schema.String, raw: Schema.String }),
	Schema.Struct({ kind: Schema.Literal("arbitrary"), raw: Schema.String })
])

export type Candidate = typeof Candidate.Type

/** The loaded Tailwind design system, behind the few typed operations the style rules use. */
export type DesignSystem = Readonly<{
	/** Tailwind's parse of a class name; a parse Tailwind returns in an unknown shape is left out. */
	parseCandidate: (className: string) => ReadonlyArray<Candidate>
	/** Whether each class name compiles to CSS, in input order. */
	resolvesToCss: (classNames: ReadonlyArray<string>) => ReadonlyArray<boolean>
	/** Theme colors that reference a CSS variable: the design tokens. */
	allowedColors: ReadonlySet<string>
	/** Every theme color, Tailwind's default palette included. */
	allColors: ReadonlySet<string>
	/** The token names of each non-empty theme namespace (`--animate`, `--radius`, ...); null names the bare token. */
	themeNamespaces: ReadonlyMap<string, ReadonlySet<string | null>>
}>

export type ClassRule = (
	input: Readonly<{ classes: ReadonlyArray<ClassLocation>; system: DesignSystem }>
) => ReadonlyArray<StyleViolation>
