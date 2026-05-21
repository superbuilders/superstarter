// Pure filter + sort helpers for the admin review queue UI (Phase 4
// sub-phase b §2.1 commit 0). Extracted from queue-list.tsx so the logic
// can be unit-tested as pure functions, matching the project's test
// discipline (no React component test infrastructure; see
// belt-indicator.test.ts header note).
//
// State shape lives here so the consumer (queue-list) wires React.useState
// directly against `FilterState` and `SortKey`.

import type { AdminQueueItem } from "@/server/admin/queue-data"
import type { Difficulty, SubTypeId } from "@/config/sub-types"

type FlagFilter = "all" | "flagged" | "clean"
type PressureFilter = "all" | "pressure" | "non-pressure"
type SubTypeFilter = "all" | SubTypeId
type DifficultyFilter = "all" | Difficulty
type StaleFilter = "all" | "stale" | "fresh"

interface FilterState {
	readonly flag: FlagFilter
	readonly pressure: PressureFilter
	readonly subType: SubTypeFilter
	readonly difficulty: DifficultyFilter
	readonly stale: StaleFilter
}

type SortKey = "newest" | "oldest" | "flag-count" | "sub-type"

function matchesFlag(flag: FlagFilter, hasAnyFlag: boolean): boolean {
	if (flag === "flagged") return hasAnyFlag
	if (flag === "clean") return !hasAnyFlag
	return true
}

function matchesPressure(pressure: PressureFilter, isPressureCell: boolean): boolean {
	if (pressure === "pressure") return isPressureCell
	if (pressure === "non-pressure") return !isPressureCell
	return true
}

function matchesStale(stale: StaleFilter, validatorStale: boolean): boolean {
	if (stale === "stale") return validatorStale
	if (stale === "fresh") return !validatorStale
	return true
}

function matchesFilters(item: AdminQueueItem, state: FilterState): boolean {
	if (!matchesFlag(state.flag, item.hasAnyFlag)) return false
	if (!matchesPressure(state.pressure, item.isPressureCell)) return false
	if (state.subType !== "all" && item.subTypeId !== state.subType) return false
	if (state.difficulty !== "all" && item.difficulty !== state.difficulty) return false
	if (!matchesStale(state.stale, item.validatorStale)) return false
	return true
}

function applyFilters(
	queueItems: ReadonlyArray<AdminQueueItem>,
	state: FilterState
): ReadonlyArray<AdminQueueItem> {
	const out: AdminQueueItem[] = []
	for (const item of queueItems) {
		if (matchesFilters(item, state)) out.push(item)
	}
	return out
}

function flagCountOf(item: AdminQueueItem): number {
	let n = 0
	for (const verdict of Object.values(item.flagsByName)) {
		if (verdict.kind === "flag" || verdict.kind === "error") n += 1
	}
	return n
}

function compareById(a: AdminQueueItem, b: AdminQueueItem): number {
	if (a.id < b.id) return -1
	if (a.id > b.id) return 1
	return 0
}

function compareForSort(a: AdminQueueItem, b: AdminQueueItem, sortKey: SortKey): number {
	if (sortKey === "newest") return -compareById(a, b)
	if (sortKey === "oldest") return compareById(a, b)
	if (sortKey === "flag-count") {
		const diff = flagCountOf(b) - flagCountOf(a)
		if (diff !== 0) return diff
		return -compareById(a, b)
	}
	// sub-type
	if (a.subTypeId < b.subTypeId) return -1
	if (a.subTypeId > b.subTypeId) return 1
	return -compareById(a, b)
}

function applySort(
	queueItems: ReadonlyArray<AdminQueueItem>,
	sortKey: SortKey
): ReadonlyArray<AdminQueueItem> {
	const copy = queueItems.slice()
	copy.sort(function bySort(a, b) {
		return compareForSort(a, b, sortKey)
	})
	return copy
}

const DEFAULT_FILTER_STATE: FilterState = {
	flag: "flagged",
	pressure: "all",
	subType: "all",
	difficulty: "all",
	stale: "all"
}

const DEFAULT_SORT_KEY: SortKey = "flag-count"

export type {
	DifficultyFilter,
	FilterState,
	FlagFilter,
	PressureFilter,
	SortKey,
	StaleFilter,
	SubTypeFilter
}
export {
	applyFilters,
	applySort,
	compareForSort,
	DEFAULT_FILTER_STATE,
	DEFAULT_SORT_KEY,
	flagCountOf,
	matchesFilters
}
