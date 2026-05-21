import { expect, test } from "bun:test"
import { sortSubtypes } from "@/components/dashboard/subtype-sort"
import type { SubtypeRow } from "@/server/dashboard/types"

function row(
	id: string,
	name: string,
	belt: SubtypeRow["belt"],
	lastAttemptedAtMs: number | undefined
): SubtypeRow {
	return {
		id,
		slug: id,
		name,
		belt,
		lastAttemptedAtMs,
		atRisk: false,
		href: `/drill/${id}`
	}
}

const NOW = 1_700_000_000_000
const ONE_DAY = 24 * 60 * 60_000

test("recent: most-recently-drilled first, never-drilled at bottom", () => {
	const rows: ReadonlyArray<SubtypeRow> = [
		row("a", "Antonyms", "blue", NOW - 1 * ONE_DAY),
		row("b", "Letter Series", "white", undefined),
		row("c", "Analogies", "white", NOW - 5 * ONE_DAY),
		row("d", "Sentence Completion", "white", undefined),
		row("e", "Critical Reasoning", "white", NOW - 0)
	]
	const sorted = sortSubtypes(rows, "recent", false)
	expect(sorted.map(function id(r) { return r.id })).toEqual([
		"e", // 0d ago
		"a", // 1d ago
		"c", // 5d ago
		"b", // never (config order: b before d)
		"d"  // never
	])
})

test("recent reversed: pure reverse of the default order", () => {
	const rows: ReadonlyArray<SubtypeRow> = [
		row("a", "Antonyms", "blue", NOW - 1 * ONE_DAY),
		row("b", "Letter Series", "white", undefined),
		row("c", "Analogies", "white", NOW - 5 * ONE_DAY),
		row("d", "Sentence Completion", "white", undefined),
		row("e", "Critical Reasoning", "white", NOW - 0)
	]
	const sorted = sortSubtypes(rows, "recent", true)
	expect(sorted.map(function id(r) { return r.id })).toEqual(["d", "b", "c", "a", "e"])
})

test("rank: highest belt first, ties broken by recent", () => {
	const rows: ReadonlyArray<SubtypeRow> = [
		row("a", "Antonyms", "white", NOW - 0),
		row("b", "Analogies", "blue", NOW - 5 * ONE_DAY),
		row("c", "Critical Reasoning", "blue", NOW - 1 * ONE_DAY),
		row("d", "Letter Series", "black", NOW - 10 * ONE_DAY),
		row("e", "Sentence Completion", "brown", undefined)
	]
	const sorted = sortSubtypes(rows, "rank", false)
	expect(sorted.map(function id(r) { return r.id })).toEqual([
		"d", // black
		"e", // brown
		"c", // blue, 1d ago
		"b", // blue, 5d ago
		"a"  // white
	])
})

test("rank reversed: pure reverse of the default order", () => {
	const rows: ReadonlyArray<SubtypeRow> = [
		row("a", "Antonyms", "white", NOW - 0),
		row("b", "Analogies", "blue", NOW - 5 * ONE_DAY),
		row("c", "Critical Reasoning", "blue", NOW - 1 * ONE_DAY),
		row("d", "Letter Series", "black", NOW - 10 * ONE_DAY),
		row("e", "Sentence Completion", "brown", undefined)
	]
	const sorted = sortSubtypes(rows, "rank", true)
	expect(sorted.map(function id(r) { return r.id })).toEqual(["a", "b", "c", "e", "d"])
})

test("alpha: A→Z by name", () => {
	const rows: ReadonlyArray<SubtypeRow> = [
		row("a", "Sentence Completion", "white", undefined),
		row("b", "Antonyms", "blue", NOW),
		row("c", "Letter Series", "white", undefined),
		row("d", "Analogies", "white", undefined),
		row("e", "Critical Reasoning", "white", undefined)
	]
	const sorted = sortSubtypes(rows, "alpha", false)
	expect(sorted.map(function name(r) { return r.name })).toEqual([
		"Analogies",
		"Antonyms",
		"Critical Reasoning",
		"Letter Series",
		"Sentence Completion"
	])
})

test("alpha reversed: Z→A", () => {
	const rows: ReadonlyArray<SubtypeRow> = [
		row("a", "Sentence Completion", "white", undefined),
		row("b", "Antonyms", "blue", NOW),
		row("c", "Letter Series", "white", undefined),
		row("d", "Analogies", "white", undefined),
		row("e", "Critical Reasoning", "white", undefined)
	]
	const sorted = sortSubtypes(rows, "alpha", true)
	expect(sorted.map(function name(r) { return r.name })).toEqual([
		"Sentence Completion",
		"Letter Series",
		"Critical Reasoning",
		"Antonyms",
		"Analogies"
	])
})

test("does not mutate the input array", () => {
	const rows: ReadonlyArray<SubtypeRow> = [
		row("a", "Antonyms", "white", NOW - 5 * ONE_DAY),
		row("b", "Analogies", "blue", NOW - 1 * ONE_DAY)
	]
	const before = rows.map(function id(r) { return r.id })
	sortSubtypes(rows, "recent", true)
	const after = rows.map(function id(r) { return r.id })
	expect(after).toEqual(before)
})
