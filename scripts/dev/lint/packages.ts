import { Array as Arr, Option, String as Str } from "effect"
import type { Symbol as NativeSymbol } from "typescript/unstable/sync"

/**
 * The package a declaration file belongs to, from its last node_modules segment. Declaration paths come from the
 * compiler's node handles, which are lower-cased on a case-insensitive file system; package names are lower case.
 */
export const packageNameFromFile = (file: string): string | undefined => {
	const marker = "/node_modules/"
	const index = Str.lastIndexOf(marker)(file)
	if (Option.isNone(index)) {
		return undefined
	}
	const segments = Str.split("/")(Str.slice(index.value + marker.length)(file))
	const [scope, name] = segments
	if (scope === "") {
		return undefined
	}
	if (!Str.startsWith("@")(scope)) {
		return scope
	}
	if (name === undefined || name === "") {
		return undefined
	}
	return `${scope}/${name}`
}

/** A symbol's package, from its first declaration's file, read off the node handle without fetching the tree. */
export const packageOfSymbol = (symbol: NativeSymbol): string | undefined => {
	const file = symbol.declarations[0]?.path
	return file === undefined ? undefined : packageNameFromFile(file)
}

/** The module of a package that declares a symbol, by its file name without extension and in lower case:
 * `schema` for `effect/dist/Schema.d.ts`. */
export const declaringModuleOf = (symbol: NativeSymbol): Option.Option<string> =>
	Option.map(Option.fromNullishOr(symbol.declarations[0]?.path), (file) =>
		Str.replace(/\.d\.[cm]?ts$/, "")(Str.toLowerCase(Arr.lastNonEmpty(Str.split("/")(file))))
	)
