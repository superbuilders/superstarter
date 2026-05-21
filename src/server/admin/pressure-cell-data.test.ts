// Pure-function tests for the pressure-cell aggregator (Phase 4 sub-phase
// b §2.6 commit 0). Mirrors action-history-data.test.ts in shape: the
// DB-touching loader is NOT exercised here (no DB harness in bun:test);
// only the pure aggregator + per-tier targets are tested.
//
// 56-cell expectation: 14 sub-types × 4 difficulties = 56 cells. Every
// pure-aggregation invocation MUST produce exactly 56 cells regardless
// of the input row set (zero rows → 56 zero-count cells).

import { expect, test } from "bun:test"
import { subTypeIds } from "@/config/sub-types"
import {
	aggregatePressureCells,
	DIFFICULTIES,
	type PressureCell,
	PRESSURE_TARGETS,
	type RawCellRow
} from "@/server/admin/pressure-cell-shared"

// Helper to assert that a cell has pressure semantics (and therefore the
// discriminated branch with target/delta/isPressureCell). Uses an
// `asserts` predicate so callers narrow without an inline if-block,
// avoiding the prefer-early-return lint trip on test bodies that would
// otherwise be a single conditional.
function expectPressureCell(
	cell: PressureCell | undefined
): asserts cell is Extract<PressureCell, { hasPressureSemantics: true }> {
	expect(cell).toBeDefined()
	expect(cell?.hasPressureSemantics).toBe(true)
}

function expectInformationalCell(
	cell: PressureCell | undefined
): asserts cell is Extract<PressureCell, { hasPressureSemantics: false }> {
	expect(cell).toBeDefined()
	expect(cell?.hasPressureSemantics).toBe(false)
}

test("PRESSURE_TARGETS: hard=3, brutal=1, easy/medium absent", function targetsShape() {
	expect(PRESSURE_TARGETS.get("hard")).toBe(3)
	expect(PRESSURE_TARGETS.get("brutal")).toBe(1)
	expect(PRESSURE_TARGETS.get("easy")).toBeUndefined()
	expect(PRESSURE_TARGETS.get("medium")).toBeUndefined()
})

test("DIFFICULTIES: canonical order easy → medium → hard → brutal", function difficultyOrder() {
	expect(DIFFICULTIES).toEqual(["easy", "medium", "hard", "brutal"])
})

test("aggregatePressureCells: empty input → 56 cells, all zero, hard+brutal pressure", function emptyInput() {
	const snapshot = aggregatePressureCells([])
	expect(snapshot.totalCells).toBe(56)
	expect(snapshot.cells.length).toBe(56)
	// 14 sub-types × 2 pressure tiers = 28 pressure cells.
	expect(snapshot.totalPressureCells).toBe(28)
	// Each hard pressure cell needs 3, each brutal needs 1; 14 × (3 + 1) = 56.
	expect(snapshot.totalPressureCandidates).toBe(56)
	for (const cell of snapshot.cells) {
		expect(cell.liveCount).toBe(0)
	}
})

test("aggregatePressureCells: easy + medium cells never have pressure semantics", function noEasyMediumPressure() {
	const snapshot = aggregatePressureCells([])
	for (const cell of snapshot.cells) {
		if (cell.difficulty === "easy" || cell.difficulty === "medium") {
			expect(cell.hasPressureSemantics).toBe(false)
		}
	}
})

test("aggregatePressureCells: hard cell with liveCount=3 → not pressure (at target)", function hardAtTarget() {
	const rows: ReadonlyArray<RawCellRow> = [
		{ subTypeId: "verbal.antonyms", difficulty: "hard", liveCount: 3 }
	]
	const snapshot = aggregatePressureCells(rows)
	const cell = snapshot.cells.find(function find(c) {
		return c.subTypeId === "verbal.antonyms" && c.difficulty === "hard"
	})
	expectPressureCell(cell)
	expect(cell.liveCount).toBe(3)
	expect(cell.target).toBe(3)
	expect(cell.delta).toBe(0)
	expect(cell.isPressureCell).toBe(false)
})

test("aggregatePressureCells: hard cell with liveCount=4 → not pressure (above target)", function hardAboveTarget() {
	const rows: ReadonlyArray<RawCellRow> = [
		{ subTypeId: "verbal.antonyms", difficulty: "hard", liveCount: 4 }
	]
	const snapshot = aggregatePressureCells(rows)
	const cell = snapshot.cells.find(function find(c) {
		return c.subTypeId === "verbal.antonyms" && c.difficulty === "hard"
	})
	expectPressureCell(cell)
	expect(cell.delta).toBe(1)
	expect(cell.isPressureCell).toBe(false)
})

test("aggregatePressureCells: hard cell with liveCount=2 → pressure", function hardUnderTarget() {
	const rows: ReadonlyArray<RawCellRow> = [
		{ subTypeId: "verbal.antonyms", difficulty: "hard", liveCount: 2 }
	]
	const snapshot = aggregatePressureCells(rows)
	const cell = snapshot.cells.find(function find(c) {
		return c.subTypeId === "verbal.antonyms" && c.difficulty === "hard"
	})
	expectPressureCell(cell)
	expect(cell.liveCount).toBe(2)
	expect(cell.delta).toBe(-1)
	expect(cell.isPressureCell).toBe(true)
})

test("aggregatePressureCells: brutal cell with liveCount=1 → not pressure (at target)", function brutalAtTarget() {
	const rows: ReadonlyArray<RawCellRow> = [
		{ subTypeId: "verbal.antonyms", difficulty: "brutal", liveCount: 1 }
	]
	const snapshot = aggregatePressureCells(rows)
	const cell = snapshot.cells.find(function find(c) {
		return c.subTypeId === "verbal.antonyms" && c.difficulty === "brutal"
	})
	expectPressureCell(cell)
	expect(cell.target).toBe(1)
	expect(cell.isPressureCell).toBe(false)
})

test("aggregatePressureCells: brutal cell with liveCount=0 → pressure (delta=-1)", function brutalEmpty() {
	const snapshot = aggregatePressureCells([])
	const cell = snapshot.cells.find(function find(c) {
		return c.subTypeId === "verbal.antonyms" && c.difficulty === "brutal"
	})
	expectPressureCell(cell)
	expect(cell.liveCount).toBe(0)
	expect(cell.delta).toBe(-1)
	expect(cell.isPressureCell).toBe(true)
})

test("aggregatePressureCells: easy cell informational only", function easyShape() {
	const rows: ReadonlyArray<RawCellRow> = [
		{ subTypeId: "verbal.antonyms", difficulty: "easy", liveCount: 7 }
	]
	const snapshot = aggregatePressureCells(rows)
	const cell = snapshot.cells.find(function find(c) {
		return c.subTypeId === "verbal.antonyms" && c.difficulty === "easy"
	})
	expectInformationalCell(cell)
	expect(cell.liveCount).toBe(7)
})

test("aggregatePressureCells: medium cell informational only", function mediumShape() {
	const rows: ReadonlyArray<RawCellRow> = [
		{ subTypeId: "verbal.antonyms", difficulty: "medium", liveCount: 12 }
	]
	const snapshot = aggregatePressureCells(rows)
	const cell = snapshot.cells.find(function find(c) {
		return c.subTypeId === "verbal.antonyms" && c.difficulty === "medium"
	})
	expectInformationalCell(cell)
	expect(cell.liveCount).toBe(12)
})

test("aggregatePressureCells: ignores rows for sub-types not in the canonical list", function unknownSubTypeIgnored() {
	const rows: ReadonlyArray<RawCellRow> = [
		{ subTypeId: "fake.unknown_subtype", difficulty: "hard", liveCount: 99 }
	]
	const snapshot = aggregatePressureCells(rows)
	expect(snapshot.totalCells).toBe(56)
	const validIds: ReadonlySet<string> = new Set<string>(subTypeIds)
	for (const cell of snapshot.cells) {
		expect(validIds.has(cell.subTypeId)).toBe(true)
	}
})

test("aggregatePressureCells: multi-row mix produces correct totals", function multiRow() {
	// Two cells filled to or above target, two pressure (under), rest at zero.
	const rows: ReadonlyArray<RawCellRow> = [
		{ subTypeId: "verbal.antonyms", difficulty: "hard", liveCount: 5 },
		{ subTypeId: "verbal.antonyms", difficulty: "brutal", liveCount: 1 },
		{ subTypeId: "verbal.analogies", difficulty: "hard", liveCount: 1 },
		{ subTypeId: "verbal.analogies", difficulty: "brutal", liveCount: 0 }
	]
	const snapshot = aggregatePressureCells(rows)
	// Pressure cells before adjustments: 28 (all hard+brutal default to pressure).
	// Adjustments:
	//   antonyms:hard 5 → not pressure (-1)
	//   antonyms:brutal 1 → not pressure (-1)
	//   analogies:hard 1 → still pressure (no change)
	//   analogies:brutal 0 → still pressure (no change)
	expect(snapshot.totalPressureCells).toBe(26)
})
