import { Array as Arr, String as Str } from "effect"

/**
 * The repository root, three directories above this module, wherever a tool is started from. The dev tools assume
 * POSIX paths: every path they build joins segments with "/".
 */
export const repositoryRoot: string = Str.slice(
	0,
	-1
)(decodeURIComponent(new URL("../../../", import.meta.url).pathname))

/** Files under these directory segments are generated or installed, never maintained source. */
const GENERATED_SEGMENTS: ReadonlyArray<string> = ["node_modules", ".next", ".git"]

/** A repository-relative path; a file outside the repository keeps its absolute path. */
export const repositoryPath = (file: string): string =>
	Str.startsWith(`${repositoryRoot}/`)(file) ? Str.slice(repositoryRoot.length + 1)(file) : file

/** True when the file lies under a directory that holds generated or installed code. */
export const isGeneratedPath = (file: string): boolean =>
	Arr.some(Str.split("/")(file), (segment) => Arr.contains(GENERATED_SEGMENTS, segment))

/** A selected path covers a file when the file is that path or lies under it. */
export const covers = (input: Readonly<{ selected: string; file: string }>): boolean => {
	if (input.file === input.selected) {
		return true
	}
	return Str.startsWith(`${input.selected}/`)(input.file)
}

/** TypeScript and TSX sources, declaration files included; callers decide about declarations. */
export const isTypeScriptPath = (file: string): boolean =>
	Arr.some([".ts", ".tsx"], (extension) => Str.endsWith(extension)(file))

/** Vendored code is reinstalled from upstream, never edited, so the linters and the formatter leave it alone. */
const VENDORED_PREFIXES: ReadonlyArray<string> = ["packages/product/nextjs-app/src/ui/"]

/** True for files under a vendored directory (shadcn's components live in the app's src/ui). */
export const isVendoredPath = (file: string): boolean =>
	Arr.some(VENDORED_PREFIXES, (prefix) => Str.startsWith(prefix)(repositoryPath(file)))

/** The Next app's package root: the style linter's design system, components.json and program live there. */
export const appRoot = `${repositoryRoot}/packages/product/nextjs-app`
