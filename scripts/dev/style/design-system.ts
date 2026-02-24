import * as fs from "node:fs"
import * as path from "node:path"
import { __unstable__loadDesignSystem } from "tailwindcss"
import * as errors from "@superbuilders/errors"
import * as logger from "@superbuilders/slog"

type DesignSystem = Awaited<ReturnType<typeof __unstable__loadDesignSystem>>

interface LoadedDesignSystem {
	ds: DesignSystem
	allowedColors: Set<string>
	allColors: Set<string>
	classList: Set<string>
	themeNamespaces: Map<string, Map<string | null, string>>
}

const COLOR_UTILITIES = new Set([
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
])

/**
 * Known theme namespace prefixes.
 * Used to enumerate tokens by category for diagnostics.
 */
const THEME_NAMESPACE_PREFIXES = [
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

function readGlobalsPath(): string {
	const raw = fs.readFileSync("components.json", "utf-8")
	const config = JSON.parse(raw)
	return config.tailwind.css
}

/**
 * Derives the theme entry point from the globals.css path.
 * Convention: index.css in the same directory as globals.css
 * is the full theme entry point (imports globals + tokens + components).
 */
function readEntryPath(): string {
	const globalsPath = readGlobalsPath()
	const dir = path.dirname(globalsPath)
	return path.join(dir, "index.css")
}

function resolveViaPkgJson(
	id: string
): { path: string; content: string; base: string } | undefined {
	const pkgPath = path.resolve("node_modules", id, "package.json")
	if (!fs.existsSync(pkgPath)) return undefined

	const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf-8"))
	const entry = typeof pkg.style === "string" ? pkg.style : pkg.main
	if (typeof entry !== "string") return undefined
	if (!entry.endsWith(".css")) return undefined

	const resolved = path.resolve("node_modules", id, entry)
	if (!fs.existsSync(resolved)) return undefined

	return {
		path: resolved,
		content: fs.readFileSync(resolved, "utf-8"),
		base: path.dirname(resolved)
	}
}

function resolveStylesheet(
	id: string,
	base: string
): { path: string; content: string; base: string } {
	// Relative imports: resolve against importing file's directory
	if (id.startsWith("./") || id.startsWith("../")) {
		const resolved = path.resolve(base, id)
		const content = fs.existsSync(resolved) ? fs.readFileSync(resolved, "utf-8") : ""
		return { path: resolved, content, base: path.dirname(resolved) }
	}

	// npm packages: try <id>/index.css
	const indexPath = path.resolve("node_modules", id, "index.css")
	if (fs.existsSync(indexPath)) {
		return {
			path: indexPath,
			content: fs.readFileSync(indexPath, "utf-8"),
			base: path.dirname(indexPath)
		}
	}

	// npm packages: try <id>.css
	const cssPath = path.resolve("node_modules", `${id}.css`)
	if (fs.existsSync(cssPath)) {
		return {
			path: cssPath,
			content: fs.readFileSync(cssPath, "utf-8"),
			base: path.dirname(cssPath)
		}
	}

	// npm packages: resolve via package.json "style" or "main" field
	const pkgJsonResolved = resolveViaPkgJson(id)
	if (pkgJsonResolved) return pkgJsonResolved

	return { path: id, content: "", base }
}

async function loadDesignSystem(entryPath = readEntryPath()): Promise<LoadedDesignSystem> {
	const css = fs.readFileSync(entryPath, "utf-8")

	const ds = await __unstable__loadDesignSystem(css, {
		base: path.dirname(path.resolve(entryPath)),
		loadStylesheet: async (id, base) => resolveStylesheet(id, base)
	})

	// Sanity check: verify the design system is properly compiled
	const sanityResult = ds.candidatesToCss(["flex"])
	if (sanityResult[0] === null) {
		logger.error("design system sanity check failed", { entryPath })
		throw errors.new(
			"design system not properly compiled — candidatesToCss returns null for basic utilities"
		)
	}

	// Extract all color tokens and allowed colors from theme
	const allColors = new Set<string>()
	const allowedColors = new Set<string>()

	for (const [key, obj] of ds.theme.entries()) {
		if (key.startsWith("--color-")) {
			const colorName = key.slice("--color-".length)
			allColors.add(colorName)
			// Allowed colors are those that reference CSS variables (Shadcn tokens)
			if (obj.value.startsWith("var(--")) {
				allowedColors.add(colorName)
			}
		}
	}

	// Build class list from design system for fuzzy matching
	const classList = new Set<string>()
	for (const [name] of ds.getClassList()) {
		classList.add(name)
	}

	// Build theme namespace map for targeted diagnostics
	const themeNamespaces = new Map<string, Map<string | null, string>>()
	for (const prefix of THEME_NAMESPACE_PREFIXES) {
		const ns = ds.theme.namespace(prefix)
		if (ns.size > 0) {
			themeNamespaces.set(prefix, ns)
		}
	}

	return { ds, allowedColors, allColors, classList, themeNamespaces }
}

function isColorUtility(root: string): boolean {
	return COLOR_UTILITIES.has(root)
}

export { COLOR_UTILITIES, THEME_NAMESPACE_PREFIXES, isColorUtility, loadDesignSystem }
export type { DesignSystem, LoadedDesignSystem }
