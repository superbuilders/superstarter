import { Array as Arr, Result } from "effect"

/** The utility roots whose values are colors: the only roots the color rules read, so `font-black` is a weight
 * and `text-sm` a size, never a color. */
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
	"inset-shadow",
	"drop-shadow",
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

export const RADIUS_UTILITIES: ReadonlyArray<string> = [
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
]

/** The roots whose named values come from a theme namespace besides `--color`, and those namespaces. */
const NAMED_VALUE_NAMESPACES: ReadonlyArray<readonly [string, ReadonlyArray<string>]> = [
	["text", ["--text"]],
	["shadow", ["--shadow"]],
	["inset-shadow", ["--inset-shadow"]],
	["drop-shadow", ["--drop-shadow"]],
	["font", ["--font", "--font-weight"]],
	["animate", ["--animate"]],
	["ease", ["--ease"]],
	["leading", ["--leading"]],
	["tracking", ["--tracking"]],
	...Arr.map(RADIUS_UTILITIES, (root) => [root, ["--radius"]] as const)
]

/** The theme namespaces whose token names each utility root takes as named values: the vocabulary a misspelled
 * class is matched against for its hint. A root outside the table takes bare values only. */
export const NAMESPACES_OF_ROOT: ReadonlyMap<string, ReadonlyArray<string>> = new Map([
	...Arr.map(NAMED_VALUE_NAMESPACES, ([root, namespaces]) =>
		Arr.contains(COLOR_UTILITIES, root)
			? ([root, [...namespaces, "--color"]] as const)
			: ([root, namespaces] as const)
	),
	...Arr.filterMap(COLOR_UTILITIES, (root) =>
		Arr.some(NAMED_VALUE_NAMESPACES, ([named]) => named === root)
			? Result.failVoid
			: Result.succeed([root, ["--color"]] as const)
	)
])

/** Every namespace the hints read. */
export const HINT_NAMESPACES: ReadonlyArray<string> = Arr.dedupe(
	Arr.flatten(Arr.fromIterable(NAMESPACES_OF_ROOT.values()))
)
