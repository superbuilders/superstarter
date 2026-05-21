// Pure-function tests for the admin queue filter + sort helpers.
//
// Test discipline matches belt-indicator.test.ts header note: the codebase
// has no React component test infrastructure (no DOM shim, no React Testing
// Library, no per-component .test.tsx files). All existing tests are
// pure-function or server-integration. Filter + sort logic was extracted
// from queue-list.tsx so the JSX-rendering path can stay untested while the
// list-shaping logic is fully covered.

import { expect, test } from "bun:test"
import {
	applyFilters,
	applySort,
	compareForSort,
	DEFAULT_FILTER_STATE,
	DEFAULT_SORT_KEY,
	flagCountOf,
	matchesFilters,
	type FilterState
} from "@/components/admin-review/queue-filters"
import type { AdminQueueItem, ValidatorVerdict } from "@/server/admin/queue-data"

function makeItem(over: Partial<AdminQueueItem> & { id: string }): AdminQueueItem {
	const baseFlags: Record<string, ValidatorVerdict> = {}
	return {
		id: over.id,
		subTypeId: over.subTypeId === undefined ? "verbal.antonyms" : over.subTypeId,
		difficulty: over.difficulty === undefined ? "medium" : over.difficulty,
		source: over.source === undefined ? "generated" : over.source,
		correctAnswer: over.correctAnswer === undefined ? "A" : over.correctAnswer,
		bodyPreview: over.bodyPreview === undefined ? "Stem text." : over.bodyPreview,
		hasAnyFlag: over.hasAnyFlag === undefined ? false : over.hasAnyFlag,
		isPressureCell: over.isPressureCell === undefined ? false : over.isPressureCell,
		flagsByName: over.flagsByName === undefined ? baseFlags : over.flagsByName,
		evaluatedAtMs: over.evaluatedAtMs,
		staleAfterMs: over.staleAfterMs,
		validatorStale: over.validatorStale === undefined ? false : over.validatorStale,
		cohortKey: over.cohortKey,
		invokedByAdminEmail: over.invokedByAdminEmail
	}
}

test("flagCountOf: counts flag + error verdicts, excludes pass", function counts() {
	const item = makeItem({
		id: "a",
		flagsByName: {
			"criterion-1": { kind: "pass" },
			"criterion-2": { kind: "flag", reason: "x", metadata: {} },
			"criterion-3": { kind: "error", reason: "y" },
			"criterion-4": { kind: "pass" }
		}
	})
	expect(flagCountOf(item)).toBe(2)
})

test("flagCountOf: empty flagsByName returns 0", function emptyFlags() {
	const item = makeItem({ id: "a" })
	expect(flagCountOf(item)).toBe(0)
})

test("matchesFilters: 'all' state passes everything", function allPass() {
	const item = makeItem({ id: "a", hasAnyFlag: true, isPressureCell: true })
	const state: FilterState = {
		flag: "all",
		pressure: "all",
		subType: "all",
		difficulty: "all",
		stale: "all"
	}
	expect(matchesFilters(item, state)).toBe(true)
})

test("matchesFilters: flag='flagged' rejects clean rows", function flaggedOnly() {
	const item = makeItem({ id: "a", hasAnyFlag: false })
	const state: FilterState = {
		flag: "flagged",
		pressure: "all",
		subType: "all",
		difficulty: "all",
		stale: "all"
	}
	expect(matchesFilters(item, state)).toBe(false)
})

test("matchesFilters: flag='clean' rejects flagged rows", function cleanOnly() {
	const item = makeItem({ id: "a", hasAnyFlag: true })
	const state: FilterState = {
		flag: "clean",
		pressure: "all",
		subType: "all",
		difficulty: "all",
		stale: "all"
	}
	expect(matchesFilters(item, state)).toBe(false)
})

test("matchesFilters: pressure='pressure' rejects non-pressure rows", function pressureOnly() {
	const item = makeItem({ id: "a", isPressureCell: false })
	const state: FilterState = {
		flag: "all",
		pressure: "pressure",
		subType: "all",
		difficulty: "all",
		stale: "all"
	}
	expect(matchesFilters(item, state)).toBe(false)
})

test("matchesFilters: subType filter matches exact id", function subTypeMatch() {
	const item = makeItem({ id: "a", subTypeId: "numerical.fractions" })
	const stateMatch: FilterState = {
		flag: "all",
		pressure: "all",
		subType: "numerical.fractions",
		difficulty: "all",
		stale: "all"
	}
	const stateMiss: FilterState = {
		flag: "all",
		pressure: "all",
		subType: "verbal.antonyms",
		difficulty: "all",
		stale: "all"
	}
	expect(matchesFilters(item, stateMatch)).toBe(true)
	expect(matchesFilters(item, stateMiss)).toBe(false)
})

test("matchesFilters: difficulty filter matches exact tier", function difficultyMatch() {
	const item = makeItem({ id: "a", difficulty: "hard" })
	const stateMatch: FilterState = {
		flag: "all",
		pressure: "all",
		subType: "all",
		difficulty: "hard",
		stale: "all"
	}
	const stateMiss: FilterState = {
		flag: "all",
		pressure: "all",
		subType: "all",
		difficulty: "easy",
		stale: "all"
	}
	expect(matchesFilters(item, stateMatch)).toBe(true)
	expect(matchesFilters(item, stateMiss)).toBe(false)
})

test("applyFilters: combines multiple criteria conjunctively", function combineAnd() {
	const queueItems = [
		makeItem({ id: "a", hasAnyFlag: true, isPressureCell: true, subTypeId: "verbal.antonyms" }),
		makeItem({ id: "b", hasAnyFlag: true, isPressureCell: false, subTypeId: "verbal.antonyms" }),
		makeItem({ id: "c", hasAnyFlag: false, isPressureCell: true, subTypeId: "verbal.antonyms" }),
		makeItem({ id: "d", hasAnyFlag: true, isPressureCell: true, subTypeId: "numerical.fractions" })
	]
	const state: FilterState = {
		flag: "flagged",
		pressure: "pressure",
		subType: "verbal.antonyms",
		difficulty: "all",
		stale: "all"
	}
	const out = applyFilters(queueItems, state)
	expect(out.map(function id(item) { return item.id })).toEqual(["a"])
})

test("compareForSort: 'newest' orders descending by id", function newest() {
	const a = makeItem({ id: "01a" })
	const b = makeItem({ id: "01b" })
	expect(compareForSort(a, b, "newest")).toBeGreaterThan(0)
	expect(compareForSort(b, a, "newest")).toBeLessThan(0)
})

test("compareForSort: 'oldest' orders ascending by id", function oldest() {
	const a = makeItem({ id: "01a" })
	const b = makeItem({ id: "01b" })
	expect(compareForSort(a, b, "oldest")).toBeLessThan(0)
	expect(compareForSort(b, a, "oldest")).toBeGreaterThan(0)
})

test("compareForSort: 'flag-count' puts higher-flag-count first", function byFlagCount() {
	const a = makeItem({
		id: "01a",
		flagsByName: {
			"c-1": { kind: "flag", reason: "", metadata: {} }
		}
	})
	const b = makeItem({
		id: "01b",
		flagsByName: {
			"c-1": { kind: "flag", reason: "", metadata: {} },
			"c-2": { kind: "flag", reason: "", metadata: {} }
		}
	})
	expect(compareForSort(a, b, "flag-count")).toBeGreaterThan(0)
	expect(compareForSort(b, a, "flag-count")).toBeLessThan(0)
})

test("compareForSort: 'sub-type' alphabetizes by sub-type id", function bySubType() {
	const a = makeItem({ id: "01a", subTypeId: "numerical.fractions" })
	const b = makeItem({ id: "01b", subTypeId: "verbal.antonyms" })
	expect(compareForSort(a, b, "sub-type")).toBeLessThan(0)
	expect(compareForSort(b, a, "sub-type")).toBeGreaterThan(0)
})

test("applySort: produces a new array (does not mutate input)", function noMutation() {
	const queueItems = [
		makeItem({ id: "01b" }),
		makeItem({ id: "01a" })
	]
	const before = queueItems.map(function pickId(it) { return it.id })
	const sorted = applySort(queueItems, "oldest")
	const after = queueItems.map(function pickId(it) { return it.id })
	expect(after).toEqual(before)
	expect(sorted.map(function pickId(it) { return it.id })).toEqual(["01a", "01b"])
})

test("DEFAULT_FILTER_STATE: focuses queue on flagged candidates", function defaultFlagged() {
	expect(DEFAULT_FILTER_STATE.flag).toBe("flagged")
	expect(DEFAULT_FILTER_STATE.pressure).toBe("all")
	expect(DEFAULT_FILTER_STATE.stale).toBe("all")
})

test("matchesFilters: stale='stale' rejects fresh rows", function staleOnlyExcludesFresh() {
	const fresh = makeItem({ id: "a", validatorStale: false })
	const state: FilterState = {
		flag: "all",
		pressure: "all",
		subType: "all",
		difficulty: "all",
		stale: "stale"
	}
	expect(matchesFilters(fresh, state)).toBe(false)
})

test("matchesFilters: stale='stale' accepts stale rows", function staleOnlyAcceptsStale() {
	const stale = makeItem({ id: "a", validatorStale: true })
	const state: FilterState = {
		flag: "all",
		pressure: "all",
		subType: "all",
		difficulty: "all",
		stale: "stale"
	}
	expect(matchesFilters(stale, state)).toBe(true)
})

test("matchesFilters: stale='fresh' rejects stale rows", function freshOnlyExcludesStale() {
	const stale = makeItem({ id: "a", validatorStale: true })
	const state: FilterState = {
		flag: "all",
		pressure: "all",
		subType: "all",
		difficulty: "all",
		stale: "fresh"
	}
	expect(matchesFilters(stale, state)).toBe(false)
})

test("DEFAULT_SORT_KEY: highest-flag-count first by default", function defaultSort() {
	expect(DEFAULT_SORT_KEY).toBe("flag-count")
})
