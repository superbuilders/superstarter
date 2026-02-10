import * as fs from "node:fs"
import * as path from "node:path"
import { __unstable__loadDesignSystem } from "tailwindcss"

type DesignSystem = Awaited<ReturnType<typeof __unstable__loadDesignSystem>>

interface LoadedDesignSystem {
	ds: DesignSystem
	allowedColors: Set<string>
	allColors: Set<string>
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

async function loadDesignSystem(globalsPath = "src/app/globals.css"): Promise<LoadedDesignSystem> {
	const css = fs.readFileSync(globalsPath, "utf-8")

	const ds = await __unstable__loadDesignSystem(css, {
		loadStylesheet: async (id, base) => {
			// Non-tailwindcss imports: return empty
			if (id !== "tailwindcss" && !id.startsWith("tailwindcss/")) {
				return { path: id, content: "", base }
			}

			// Try index.css first
			const resolved = path.resolve("node_modules", id, "index.css")
			if (fs.existsSync(resolved)) {
				return {
					path: resolved,
					content: fs.readFileSync(resolved, "utf-8"),
					base: path.dirname(resolved)
				}
			}

			// Try .css extension
			const altResolved = path.resolve("node_modules", `${id}.css`)
			if (fs.existsSync(altResolved)) {
				return {
					path: altResolved,
					content: fs.readFileSync(altResolved, "utf-8"),
					base: path.dirname(altResolved)
				}
			}

			return { path: id, content: "", base }
		}
	})

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

	return { ds, allowedColors, allColors }
}

function isColorUtility(root: string): boolean {
	return COLOR_UTILITIES.has(root)
}

export { COLOR_UTILITIES, isColorUtility, loadDesignSystem }
export type { DesignSystem, LoadedDesignSystem }
