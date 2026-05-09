// Sort comparators for the dashboard's <DojoCard> rows. Pure
// functions of (row, row) → number; consumed by <Dashboard>'s sorted-
// row derivation per the user-selected sort key.
//
// Sort keys (each lists its NATURAL / non-reversed direction):
//   - "recent": most-recently-drilled at top, never-drilled at the
//     bottom. Tie-breaker is the canonical config order (preserved
//     by Array.prototype.sort being stable in V8/Bun).
//   - "rank":   highest belt at top (black > brown > blue > white).
//     Tie-breaker is "recent" (so two blue belts sort by which one
//     was drilled most recently).
//   - "alpha":  display name A→Z (locale-aware compare).
//
// `reversed`: when true, the sorted output is `.reverse()`d wholesale.
// This means "Never" rows flip to the top under reversed Recent /
// reversed Rank — interpret as "least information first" rather than
// "always pinned to the bottom" — and "alpha" reversed becomes Z→A.
// Pure-reverse semantics chosen for predictability over special-
// casing the Never bucket per sort key.
//
// "Recent" is the default sort surfaced in <Dashboard> per the
// dashboard-belt-sort-and-last-drilled redirect; default direction
// is non-reversed (the natural per-key order above).

import type { BeltLevel, SubtypeRow } from "@/server/dashboard/types"

type SubtypeSortKey = "recent" | "rank" | "alpha"

const BELT_RANK: Record<BeltLevel, number> = {
	black: 3,
	brown: 2,
	blue: 1,
	white: 0
}

function compareByRecent(a: SubtypeRow, b: SubtypeRow): number {
	const aMs = a.lastAttemptedAtMs
	const bMs = b.lastAttemptedAtMs
	if (aMs === undefined && bMs === undefined) return 0
	if (aMs === undefined) return 1
	if (bMs === undefined) return -1
	return bMs - aMs
}

function compareByRank(a: SubtypeRow, b: SubtypeRow): number {
	const rankDiff = BELT_RANK[b.belt] - BELT_RANK[a.belt]
	if (rankDiff !== 0) return rankDiff
	return compareByRecent(a, b)
}

function sortSubtypes(
	rows: ReadonlyArray<SubtypeRow>,
	sortKey: SubtypeSortKey,
	reversed: boolean
): ReadonlyArray<SubtypeRow> {
	const copy = [...rows]
	if (sortKey === "recent") {
		copy.sort(compareByRecent)
	} else if (sortKey === "rank") {
		copy.sort(compareByRank)
	} else if (sortKey === "alpha") {
		copy.sort(function compareByAlpha(a, b) {
			return a.name.localeCompare(b.name)
		})
	} else {
		const _exhaustive: never = sortKey
		return _exhaustive
	}
	if (reversed) copy.reverse()
	return copy
}

export type { SubtypeSortKey }
export { sortSubtypes }
