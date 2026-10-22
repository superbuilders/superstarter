import { Schema } from "effect"

/** Every rule the style linter reports, by the id it reports under: its name in the output and its fixture
 * directory. */
export const STYLE_RULES = [
	"no-unresolved-class",
	"no-unverifiable-class",
	"no-dynamic-class",
	"no-conflicting-classes",
	"no-duplicate-class",
	"no-invalid-color",
	"no-arbitrary-color",
	"no-arbitrary-spacing",
	"no-arbitrary-radius",
	"no-arbitrary-shadow",
	"require-data-slot",
	"no-duplicate-data-slot"
] as const

export type StyleRule = (typeof STYLE_RULES)[number]

/** One class as written: its text and where it starts, 1-based. */
export type ClassToken = Readonly<{ text: string; file: string; line: number; column: number }>

/** The classes of one static class string: one literal, or one literal type of a union. Conflicts and duplicates
 * are judged within one list; across lists, `cn` resolves them on purpose. */
export type ClassList = ReadonlyArray<ClassToken>

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

/** Tailwind's parse of one class: a candidate, or nothing Tailwind recognizes as one. */
export type ParsedClass = Candidate | Readonly<{ kind: "unparsed" }>

/** What a class compiles to, as far as conflicts go: the variants it applies under, as written, and the CSS
 * properties it declares, sorted and joined. */
export type CompiledClass = Readonly<{ variants: string; properties: string }>

/** One class with what the design system says about it: Tailwind's parse, and its compiled CSS when it
 * compiles. */
export type ExplainedClass = ClassToken &
	Readonly<{
		candidate: ParsedClass
		compiled: CompiledClass | undefined
	}>

/** The named values a utility root takes from the theme: the namespaces they come from and their token names. */
export type Vocabulary = Readonly<{
	namespaces: ReadonlyArray<string>
	tokens: ReadonlyArray<string>
}>

/** The theme the stylesheet defines: its colors, the design tokens among them (the colors that reference a CSS
 * variable), and the vocabulary of each root that takes named values; a root without one takes bare values only. */
export type Theme = Readonly<{
	colors: ReadonlySet<string>
	colorTokens: ReadonlySet<string>
	vocabularies: ReadonlyMap<string, Vocabulary>
}>

/** What a class rule reads: one class list, explained, and the theme. */
export type ClassRuleInput = Readonly<{ list: ReadonlyArray<ExplainedClass>; theme: Theme }>

/** What a class rule says about one class of the list; the engine stamps the rule's id. */
export type ClassVerdict = Readonly<{ token: ClassToken; message: string; suggestion?: string }>

export type ClassRule = (input: ClassRuleInput) => ReadonlyArray<ClassVerdict>
