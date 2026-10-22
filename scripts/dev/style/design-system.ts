import { __unstable__loadDesignSystem } from "@tailwindcss/node"
import { Array as Arr, Effect, Option, Predicate, Result, Schema, String as Str } from "effect"
import { DevtoolFailure } from "#scripts/dev/shared/devtool.ts"
import {
	Candidate,
	type ClassList,
	type CompiledClass,
	type ExplainedClass,
	type ParsedClass,
	type Theme
} from "#scripts/dev/style/types.ts"
import { HINT_NAMESPACES, NAMESPACES_OF_ROOT } from "#scripts/dev/style/utilities.ts"

/** components.json names the stylesheet shadcn writes, which is the design system's entry point. */
export const ComponentsConfig = Schema.Struct({
	tailwind: Schema.Struct({ css: Schema.NonEmptyString })
})

const NamespaceEntries = Schema.Array(Schema.Tuple([Schema.NullOr(Schema.String), Schema.String]))

/** The nodes of Tailwind's compiled CSS the conflict check reads. Recursive, so its type is declared. */
type CssNode =
	| Readonly<{ kind: "declaration"; property: string }>
	| Readonly<{ kind: "rule" | "context" | "at-root"; nodes: ReadonlyArray<CssNode> }>
	| Readonly<{ kind: "at-rule"; name: string; nodes: ReadonlyArray<CssNode> }>
	| Readonly<{ kind: "comment" }>

const CssNode: Schema.Codec<CssNode> = Schema.Union([
	Schema.Struct({ kind: Schema.Literal("declaration"), property: Schema.String }),
	Schema.Struct({
		kind: Schema.Literals(["rule", "context", "at-root"]),
		nodes: Schema.Array(Schema.suspend((): Schema.Codec<CssNode> => CssNode))
	}),
	Schema.Struct({
		kind: Schema.Literal("at-rule"),
		name: Schema.String,
		nodes: Schema.Array(Schema.suspend((): Schema.Codec<CssNode> => CssNode))
	}),
	Schema.Struct({ kind: Schema.Literal("comment") })
])

const decodeCompiled = Schema.decodeUnknownEffect(Schema.Array(Schema.Array(CssNode)))

const isCandidate = Schema.is(Candidate)

/** Global output a class carries beside its rule (registered custom properties, keyframes, hoisted rules) declares
 * nothing about the element. */
const GLOBAL_AT_RULES: ReadonlyArray<string> = ["@property", "@keyframes"]

const propertiesOf = (nodes: ReadonlyArray<CssNode>): ReadonlyArray<string> =>
	Arr.flatMap(nodes, (node) => {
		switch (node.kind) {
			case "declaration":
				return [node.property]
			case "comment":
			case "at-root":
				return []
			case "at-rule":
				return Arr.contains(GLOBAL_AT_RULES, node.name) ? [] : propertiesOf(node.nodes)
			case "rule":
			case "context":
				return propertiesOf(node.nodes)
		}
	})

const OPENERS: ReadonlyArray<string> = ["[", "("]

const CLOSERS: ReadonlyArray<string> = ["]", ")"]

/** The variant prefix of a class as written: everything before its last `:` outside brackets and parentheses. */
const variantsOf = (className: string): string => {
	let depth = 0
	let end = 0
	for (const [index, character] of Arr.fromIterable(className).entries()) {
		if (Arr.contains(OPENERS, character)) {
			depth += 1
		}
		if (Arr.contains(CLOSERS, character)) {
			depth -= 1
		}
		if (character === ":" && depth === 0) {
			end = index
		}
	}
	return Str.slice(0, end)(className)
}

const compiledOf = (className: string, nodes: ReadonlyArray<CssNode>): CompiledClass | undefined =>
	Arr.isReadonlyArrayNonEmpty(nodes)
		? {
				variants: variantsOf(className),
				properties: Arr.join(Arr.sort(Arr.dedupe(propertiesOf(nodes)), Str.Order), ",")
			}
		: undefined

/** @tailwindcss/node's declarations import its Theme type from a module the package does not ship, so the theme
 * arrives untyped; what the linter reads from it is admitted from unknown like any outside value. */
type NamespacedTheme = Readonly<{ namespace: (prefix: string) => unknown }>

const hasNamespaces = (value: unknown): value is NamespacedTheme =>
	Predicate.hasProperty(value, "namespace") && typeof value.namespace === "function"

const hasEntries = (value: unknown): value is Readonly<{ entries: () => unknown }> =>
	Predicate.hasProperty(value, "entries") && typeof value.entries === "function"

/** One theme namespace's entries, admitted: the token names and their values. */
const namespaceOf = (theme: NamespacedTheme, prefix: string) =>
	Effect.gen(function* () {
		const namespace = theme.namespace(prefix)
		const entries = hasEntries(namespace) ? namespace.entries() : undefined
		if (!Predicate.isIterable(entries)) {
			return yield* DevtoolFailure.make({
				detail: `Tailwind returned the ${prefix} namespace without iterable entries`
			})
		}
		return yield* Schema.decodeUnknownEffect(NamespaceEntries)(Arr.fromIterable(entries)).pipe(
			Effect.mapError((cause) =>
				DevtoolFailure.make({
					detail: `Tailwind returned the ${prefix} namespace in an unknown shape`,
					cause
				})
			)
		)
	})

/** A namespace's token names; `sm--line-height` is a property of `sm`, not a token of its own. */
const tokenNamesOf = (
	entries: ReadonlyArray<readonly [string | null, string]>
): ReadonlyArray<string> =>
	Arr.filterMap(entries, ([name]) =>
		name !== null && !Str.includes("--")(name) ? Result.succeed(name) : Result.failVoid
	)

/** The loaded design system: the theme, and what it says about each class of a class list. */
export type DesignSystem = Readonly<{
	theme: Theme
	explain: (list: ClassList) => Effect.Effect<ReadonlyArray<ExplainedClass>, DevtoolFailure>
}>

/**
 * Loads the full Tailwind v4 design system from the entry stylesheet's text, with imports resolved from its
 * directory. A design system that cannot compile `flex` is a broken stylesheet chain, not an empty theme. The
 * theme's colors are read once from the `--color` namespace.
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
		const compile = (classNames: ReadonlyArray<string>) =>
			Effect.try({
				try: (): ReadonlyArray<unknown> => ds.candidatesToAst([...classNames]),
				catch: (cause) => DevtoolFailure.make({ detail: "Tailwind failed to compile", cause })
			}).pipe(
				Effect.flatMap(decodeCompiled),
				Effect.mapError((cause) =>
					DevtoolFailure.make({ detail: "Tailwind compiled CSS in an unknown shape", cause })
				)
			)
		const [flex] = yield* compile(["flex"])
		if (flex === undefined || !Arr.isReadonlyArrayNonEmpty(flex)) {
			return yield* DevtoolFailure.make({
				detail: `The design system in ${entry.path} is not compiled: it compiles no CSS for flex`
			})
		}
		const theme: unknown = ds.theme
		if (!hasNamespaces(theme)) {
			return yield* DevtoolFailure.make({ detail: "Tailwind returned a theme without namespace()" })
		}
		const colorEntries = yield* namespaceOf(theme, "--color")
		const hinted = yield* Effect.forEach(HINT_NAMESPACES, (prefix) =>
			Effect.map(namespaceOf(theme, prefix), (entries) => [prefix, tokenNamesOf(entries)] as const)
		)
		const explain = (list: ClassList) =>
			Effect.gen(function* () {
				const compiled = yield* compile(Arr.map(list, (token) => token.text))
				const candidates = yield* Effect.try({
					try: () =>
						Arr.map(list, (token) => {
							const parsed: ReadonlyArray<unknown> = ds.parseCandidate(token.text)
							return Option.getOrElse(Arr.findFirst(parsed, isCandidate), (): ParsedClass => ({
								kind: "unparsed"
							}))
						}),
					catch: (cause) => DevtoolFailure.make({ detail: "Tailwind failed to parse", cause })
				})
				return Arr.map(
					Arr.zip(list, Arr.zip(candidates, compiled)),
					([token, [candidate, nodes]]): ExplainedClass => ({
						...token,
						candidate,
						compiled: compiledOf(token.text, nodes)
					})
				)
			})
		return {
			theme: {
				colors: new Set(tokenNamesOf(colorEntries)),
				colorTokens: new Set(
					tokenNamesOf(Arr.filter(colorEntries, ([, value]) => Str.startsWith("var(--")(value)))
				),
				vocabularies: new Map(
					Arr.map(Arr.fromIterable(NAMESPACES_OF_ROOT), ([root, namespaces]) => [
						root,
						{
							namespaces,
							tokens: Arr.flatMap(hinted, ([prefix, tokens]) =>
								Arr.contains(namespaces, prefix) ? tokens : []
							)
						}
					])
				)
			},
			explain
		}
	})
