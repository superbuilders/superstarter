import { COLOR_UTILITIES } from "@scripts/dev/style/design-system"
import type { LoadedDesignSystem } from "@scripts/dev/style/design-system"
import type { ClassLocation, Violation } from "@scripts/dev/style/types"

/**
 * Validates that Tailwind utility classes referencing custom @theme tokens
 * actually resolve to CSS output.
 *
 * Catches:
 *   - Broken @theme chain: namespace is empty → "No animation tokens found"
 *   - Typos in token names: close Levenshtein match → "Did you mean?"
 *
 * Skips:
 *   - Classes that resolve via candidatesToCss (valid)
 *   - Non-Tailwind syntax (fragments, unknown roots)
 *   - Bare-value utilities (p-4, text-sm, animate-spin) that __unstable__loadDesignSystem
 *     cannot resolve — these use Tailwind's built-in scales, not @theme tokens
 *
 * Three-layer validation:
 *   1. candidatesToCss — positive signal (resolves → valid)
 *   2. parseCandidate + theme namespace — targeted check for custom tokens
 *   3. Levenshtein diagnostics — smart error messages
 */

const MAX_LEVENSHTEIN_DISTANCE = 2

/**
 * Maps utility roots to theme namespace prefixes.
 * Only namespaces where we define CUSTOM tokens are useful for validation.
 */
function getThemeNamespace(root: string): string | undefined {
	if (COLOR_UTILITIES.has(root)) return "--color"
	if (root === "animate") return "--animate"
	if (root === "ease") return "--ease"
	if (root === "rounded" || root.startsWith("rounded-")) return "--radius"
	if (root === "shadow" || root === "drop-shadow") return "--shadow"
	if (root === "inset-shadow") return "--inset-shadow"
	if (root.startsWith("font")) return "--font"
	return undefined
}

function levenshtein(a: string, b: string): number {
	const m = a.length
	const n = b.length

	// Single-row DP — extract indexed values into locals for strict-mode narrowing
	let prev = new Int32Array(n + 1)
	let curr = new Int32Array(n + 1)

	for (let j = 0; j <= n; j++) prev[j] = j

	for (let i = 1; i <= m; i++) {
		curr[0] = i
		for (let j = 1; j <= n; j++) {
			const cost = a[i - 1] === b[j - 1] ? 0 : 1
			const above = prev[j]
			const left = curr[j - 1]
			const diag = prev[j - 1]
			if (above === undefined || left === undefined || diag === undefined) continue
			curr[j] = Math.min(above + 1, left + 1, diag + cost)
		}
		;[prev, curr] = [curr, prev]
	}

	const result = prev[n]
	if (result === undefined) return m + n
	return result
}

function findClosest(input: string, candidates: string[]): string | undefined {
	let closest: string | undefined
	let closestDist = MAX_LEVENSHTEIN_DISTANCE + 1

	for (const candidate of candidates) {
		const dist = levenshtein(input, candidate)
		if (dist < closestDist) {
			closestDist = dist
			closest = candidate
		}
	}

	return closest
}

interface ParsedCandidate {
	kind: string
	root?: string
	value: string | { kind: string; value?: unknown } | null
	raw: string
}

/**
 * Reconstructs a full class string with variant prefixes and a corrected value.
 * "hover:bg-prmary" + root "bg" + suggestion "primary" → "hover:bg-primary"
 */
function rebuildSuggestion(originalClass: string, root: string, suggestedValue: string): string {
	const rootIndex = originalClass.lastIndexOf(root)
	const prefix = originalClass.slice(0, rootIndex)
	return `${prefix}${root}-${suggestedValue}`
}

/**
 * Diagnoses WHY a class doesn't resolve, using theme namespace introspection.
 *
 * Returns a violation message if high-confidence the class is wrong, or undefined
 * if the class is likely a bare-value utility that __unstable__loadDesignSystem
 * simply can't resolve.
 */
function diagnose(
	cls: ClassLocation,
	candidate: ParsedCandidate,
	designSystem: LoadedDesignSystem
): string | undefined {
	const root = candidate.root
	if (!root) return undefined // Arbitrary candidate (no root) → skip

	const { themeNamespaces, allColors } = designSystem
	const namespace = getThemeNamespace(root)

	// No namespace mapping → bare-value utility (p-4, tracking-tight, etc.) → skip
	if (!namespace) return undefined

	// Extract the named value the user typed
	const typedValue =
		candidate.value &&
		typeof candidate.value === "object" &&
		candidate.value.kind === "named" &&
		typeof candidate.value.value === "string"
			? candidate.value.value
			: undefined

	if (!typedValue) return undefined

	// Special case: color namespace
	// text-sm, text-lg etc. have root "text" which maps to --color,
	// but "sm"/"lg" are font-size values, not colors. Check for typos
	// among known colors; if not close to any color, skip (non-color value).
	if (namespace === "--color") {
		const colorNames = [...allColors]
		const closest = findClosest(typedValue, colorNames)
		if (closest) {
			const suggestion = rebuildSuggestion(cls.text, root, closest)
			return `did you mean "${suggestion}"?`
		}
		return undefined
	}

	const ns = themeNamespaces.get(namespace)

	// Empty namespace → @theme chain is broken
	if (!ns || ns.size === 0) {
		const label = namespace.slice(2) // "--animate" → "animate"
		return `no ${label} tokens found in design system — check @theme import chain`
	}

	// Exact match in namespace → valid token (may fail candidatesToCss due to
	// @utility rules being opaque to __unstable__loadDesignSystem, e.g. tw-animate-css)
	if (ns.has(typedValue)) return undefined

	// Check for close Levenshtein match → typo
	const tokenNames = [...ns.keys()].filter((k): k is string => k !== null)
	const closest = findClosest(typedValue, tokenNames)

	if (closest) {
		const suggestion = rebuildSuggestion(cls.text, root, closest)
		return `did you mean "${suggestion}"?`
	}

	// No close match → probably a built-in value (animate-spin, shadow-md, etc.) → skip
	return undefined
}

function check(
	classes: ClassLocation[],
	designSystem: LoadedDesignSystem,
	file: string
): Violation[] {
	const { ds } = designSystem

	// Layer 1: batch resolution check — classes that produce CSS are valid
	const classTexts = classes.map((c) => c.text)
	const cssResults = ds.candidatesToCss(classTexts)

	// Collect unresolved classes that also parse as Tailwind syntax
	const unresolved: { cls: ClassLocation; candidate: ParsedCandidate }[] = []
	for (let i = 0; i < classes.length; i++) {
		const cls = classes[i]
		if (!cls) continue
		if (cssResults[i] !== null) continue // Resolves to CSS — valid

		const parsed = ds.parseCandidate(cls.text)
		const first = parsed[0]
		if (!first) continue // Not Tailwind syntax — skip

		const root = "root" in first ? first.root : undefined
		const value = "value" in first ? first.value : null
		const candidate: ParsedCandidate = { kind: first.kind, root, value, raw: first.raw }
		unresolved.push({ cls, candidate })
	}

	// Layer 2 + 3: diagnose unresolved classes against theme namespaces
	const violations: Violation[] = []
	for (const { cls, candidate } of unresolved) {
		const detail = diagnose(cls, candidate, designSystem)
		if (!detail) continue // Likely a bare-value utility — skip

		violations.push({
			file,
			line: cls.line,
			column: cls.column,
			rule: "no-unresolved-class",
			message: `Class "${cls.text}" — ${detail}`,
			className: cls.text
		})
	}

	return violations
}

export { check }
