// Client-safe shared module for the pressure-cell dashboard (Phase 4
// sub-phase b §2.6 commit 0).
//
// db-free by design: holds the PressureCell + PressureCellSnapshot
// shapes, the per-tier targets, the pure aggregation function, and the
// canonical DIFFICULTIES order. The DB-touching loader lives in
// pressure-cell-data.ts and imports FROM here.
//
// The split exists because pressure-cell-grid.tsx is reached
// transitively from a "use client" parent (content.tsx). Without the
// split, Next.js bundles pressure-cell-data.ts's db dependency into
// the client (Module not found: Can't resolve 'dns', via pg). Same
// pattern as src/server/admin/action-history-shared.ts at §2.5.

import { type Difficulty, type SubTypeId, subTypeIds } from "@/config/sub-types"

const DIFFICULTIES: ReadonlyArray<Difficulty> = ["easy", "medium", "hard", "brutal"]

// Per-tier live-bank target. Only hard and brutal tiers have pressure
// semantics per plan-doc §0.7. Easy and medium tiers are informational —
// they appear in the dashboard for situational awareness but never
// register as pressure cells. Mirrors PRESSURE_HARD_TARGET (3) and
// PRESSURE_BRUTAL_TARGET (1) in src/server/validator/context.ts.
const PRESSURE_TARGETS: ReadonlyMap<Difficulty, number> = new Map([
	["hard", 3],
	["brutal", 1]
])

// Discriminated union: cells with pressure semantics carry target +
// delta + isPressureCell; informational cells (easy, medium) carry only
// the liveCount. Avoids null-undefined union on target and lets the
// consumer dispatch on hasPressureSemantics directly.
type PressureCell =
	| {
			readonly subTypeId: SubTypeId
			readonly difficulty: Difficulty
			readonly liveCount: number
			readonly hasPressureSemantics: false
	  }
	| {
			readonly subTypeId: SubTypeId
			readonly difficulty: Difficulty
			readonly liveCount: number
			readonly hasPressureSemantics: true
			readonly target: number
			readonly delta: number
			readonly isPressureCell: boolean
	  }

interface PressureCellSnapshot {
	readonly cells: ReadonlyArray<PressureCell>
	readonly totalPressureCells: number
	readonly totalPressureCandidates: number
	readonly totalCells: number
}

interface RawCellRow {
	readonly subTypeId: string
	readonly difficulty: string
	readonly liveCount: number
}

// Pure aggregation. Iterates the canonical subTypeIds × DIFFICULTIES
// product (56 cells), filling in liveCount=0 for any (subType,
// difficulty) pair absent from the SELECT result. Builds the
// discriminated union per cell so the consumer renders without further
// branching.
function aggregatePressureCells(
	rows: ReadonlyArray<RawCellRow>
): PressureCellSnapshot {
	const countsByCell = new Map<string, number>()
	for (const row of rows) {
		countsByCell.set(`${row.subTypeId}:${row.difficulty}`, row.liveCount)
	}

	const cells: PressureCell[] = []
	let totalPressureCells = 0
	let totalPressureCandidates = 0

	for (const subTypeId of subTypeIds) {
		for (const difficulty of DIFFICULTIES) {
			const key = `${subTypeId}:${difficulty}`
			const existing = countsByCell.get(key)
			const liveCount = existing === undefined ? 0 : existing
			const target = PRESSURE_TARGETS.get(difficulty)
			if (target === undefined) {
				cells.push({
					subTypeId,
					difficulty,
					liveCount,
					hasPressureSemantics: false
				})
				continue
			}
			const delta = liveCount - target
			const isPressureCell = liveCount < target
			cells.push({
				subTypeId,
				difficulty,
				liveCount,
				hasPressureSemantics: true,
				target,
				delta,
				isPressureCell
			})
			if (isPressureCell) {
				totalPressureCells += 1
				// `totalPressureCandidates` = sum of (target - liveCount)
				// across pressure cells. Minimum number of approve actions
				// needed to clear all pressure-cell debt.
				totalPressureCandidates += target - liveCount
			}
		}
	}

	return {
		cells,
		totalPressureCells,
		totalPressureCandidates,
		totalCells: cells.length
	}
}

export type { PressureCell, PressureCellSnapshot, RawCellRow }
export { aggregatePressureCells, DIFFICULTIES, PRESSURE_TARGETS }
