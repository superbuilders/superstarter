import { __unstable__loadDesignSystem } from "@tailwindcss/node"
import { Array as Arr, Effect, Predicate, Schema, String as Str } from "effect"
import { DevtoolFailure } from "#scripts/dev/devtool-failure.ts"
import { Candidate, type DesignSystem } from "#scripts/dev/style/types.ts"

/** The utility roots whose values are colors. */
export const COLOR_UTILITIES: ReadonlyArray<string> = [
	"bg",
	"text",
	"border",
	"border-t",
	"border-r",
	"border-b",
	"border-l",
	"border-x",
	"border-y",
	"outline",
	"ring",
	"ring-offset",
	"shadow",
	"accent",
	"caret",
	"fill",
	"stroke",
	"decoration",
	"divide",
	"from",
	"via",
	"to"
]

/** The theme namespaces whose tokens the diagnostics enumerate. */
const THEME_NAMESPACE_PREFIXES: ReadonlyArray<string> = [
	"--color",
	"--animate",
	"--ease",
	"--font",
	"--radius",
	"--shadow",
	"--spacing",
	"--breakpoint",
	"--inset-shadow",
	"--drop-shadow"
]

/** components.json names the stylesheet shadcn writes, which is the design system's entry point. */
export const ComponentsConfig = Schema.Struct({
	tailwind: Schema.Struct({ css: Schema.NonEmptyString })
})

const ThemeEntries = Schema.Array(
	Schema.Tuple([Schema.String, Schema.Struct({ value: Schema.String })])
)

const NamespaceEntries = Schema.Array(Schema.Tuple([Schema.NullOr(Schema.String), Schema.String]))

const isCandidate = Schema.is(Candidate)

const admit =
	<S extends Schema.ConstraintDecoder<unknown>>(schema: S, what: string) =>
	(value: unknown) =>
		Schema.decodeUnknownEffect(schema)(value).pipe(
			Effect.mapError((cause) =>
				DevtoolFailure.make({ detail: `Tailwind returned ${what} in an unknown shape`, cause })
			)
		)

/** @tailwindcss/node's declarations import its Theme and Candidate types from modules the package does not ship,
 * so both arrive untyped; what the linter reads from them is admitted from unknown like any outside value. */
type EntriesSource = Readonly<{ entries: () => unknown }>

type NamespacedTheme = Readonly<{ namespace: (prefix: string) => unknown }>

const hasEntries = (value: unknown): value is EntriesSource =>
	Predicate.hasProperty(value, "entries") && typeof value.entries === "function"

const hasNamespaces = (value: unknown): value is NamespacedTheme =>
	Predicate.hasProperty(value, "namespace") && typeof value.namespace === "function"

const entriesOf = (
	value: unknown,
	what: string
): Effect.Effect<ReadonlyArray<unknown>, DevtoolFailure> => {
	if (!hasEntries(value)) {
		return Effect.fail(
			DevtoolFailure.make({ detail: `Tailwind returned ${what} without entries()` })
		)
	}
	const entries = value.entries()
	if (!Predicate.isIterable(entries)) {
		return Effect.fail(
			DevtoolFailure.make({ detail: `Tailwind returned ${what} whose entries() is not iterable` })
		)
	}
	return Effect.succeed(Arr.fromIterable(entries))
}

/**
 * Loads the full Tailwind v4 design system from the entry stylesheet's text, with imports resolved from its
 * directory. A design system that cannot compile `flex` is a broken stylesheet chain, not an empty theme.
 */
export const loadDesignSystem = (
	entry: Readonly<{ css: string; base: string; path: string }>
): Effect.Effect<DesignSystem, DevtoolFailure> =>
	Effect.gen(function* () {
		const ds = yield* Effect.tryPromise({
			try: () => __unstable__loadDesignSystem(entry.css, { base: entry.base }),
			catch: (cause) =>
				DevtoolFailure.make({
					detail: `The Tailwind design system in ${entry.path} failed to load`,
					cause
				})
		})
		if (ds.candidatesToCss(["flex"])[0] === null) {
			return yield* DevtoolFailure.make({
				detail: `The design system in ${entry.path} is not compiled: candidatesToCss returns null for basic utilities`
			})
		}
		const theme: unknown = ds.theme
		const themeEntries = yield* entriesOf(theme, "a theme").pipe(
			Effect.flatMap(admit(ThemeEntries, "theme entries"))
		)
		if (!hasNamespaces(theme)) {
			return yield* DevtoolFailure.make({ detail: "Tailwind returned a theme without namespace()" })
		}
		const colorEntries = Arr.filter(themeEntries, ([key]) => Str.startsWith("--color-")(key))
		const colorName = Str.slice("--color-".length)
		const allColors = new Set(Arr.map(colorEntries, ([key]) => colorName(key)))
		const allowedColors = new Set(
			Arr.map(
				Arr.filter(colorEntries, ([, token]) => Str.startsWith("var(--")(token.value)),
				([key]) => colorName(key)
			)
		)
		const themeNamespaces = new Map<string, ReadonlySet<string | null>>()
		for (const prefix of THEME_NAMESPACE_PREFIXES) {
			const entries = yield* entriesOf(theme.namespace(prefix), `the ${prefix} namespace`).pipe(
				Effect.flatMap(admit(NamespaceEntries, `the ${prefix} namespace`))
			)
			if (Arr.isReadonlyArrayNonEmpty(entries)) {
				themeNamespaces.set(prefix, new Set(Arr.map(entries, ([name]) => name)))
			}
		}
		const system: DesignSystem = {
			parseCandidate: (className) => {
				const parsed: ReadonlyArray<unknown> = ds.parseCandidate(className)
				return Arr.filter(parsed, isCandidate)
			},
			resolvesToCss: (classNames) =>
				Arr.map(ds.candidatesToCss([...classNames]), (css) => css !== null),
			allowedColors,
			allColors,
			themeNamespaces
		}
		return system
	})
