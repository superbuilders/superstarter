// Server-side loader for the pressure-cell dashboard at queue head
// (Phase 4 sub-phase b §2.6 commit 0).
//
// Aggregates per-cell live counts across 14 sub-types × 4 difficulties
// (56 cells total) so the admin can see which cells are pressure cells
// (under-target on hard or brutal tier per plan-doc §0.7) and which
// are filled.
//
// File split: pure-function aggregator + types + per-tier targets +
// canonical DIFFICULTIES order live in pressure-cell-shared.ts to keep
// pressure-cell-grid.tsx (a transitive child of the "use client"
// content.tsx) free of the db import graph. Same pattern as
// action-history-shared.ts at §2.5.
//
// IMPORTANT — divergences from the validator's pressure-cell semantics:
//   1. Validator's loadPressureCells iterates sub-types derived from
//      cells.map(c => c.subTypeId), so a sub-type with ZERO live items
//      in any tier is silently skipped (and therefore items in that
//      sub-type's hard/brutal tier are NOT marked isPressureCell by the
//      validator at batch time). The dashboard iterates the canonical
//      @/config/sub-types subTypeIds, so every sub-type contributes
//      hard + brutal cells regardless of live state. Consequence:
//      dashboard's totalPressureCells can legitimately exceed validator's
//      pressureCells.size for sub-types that are entirely empty.
//   2. queue-data.ts's pressureCellCount counts CANDIDATES whose
//      validatorResult.isPressureCell=true; the dashboard's
//      totalPressureCells counts CELLS (subType × hard|brutal) under
//      target. Same word, different denominators — both correct, not
//      expected to match.

import * as errors from "@superbuilders/errors"
import { eq, sql } from "drizzle-orm"
import { connection } from "next/server"
import { db } from "@/db"
import { items } from "@/db/schemas/catalog/items"
import { logger } from "@/logger"
import {
	aggregatePressureCells,
	type PressureCellSnapshot
} from "@/server/admin/pressure-cell-shared"

const ErrLoadPressureCellQueryFailed = errors.new(
	"loadPressureCellSnapshot: query failed"
)

async function loadPressureCellSnapshot(): Promise<PressureCellSnapshot> {
	// Mark request-bound for Next.js 16 Cache Components — pressure-cell
	// counts mutate every time an admin approve/reject lands, so this
	// must reflect current items state, not a cached snapshot.
	await connection()
	logger.info("loadPressureCellSnapshot: querying live-cell counts")

	const queryResult = await errors.try(
		db
			.select({
				subTypeId: items.subTypeId,
				difficulty: items.difficulty,
				liveCount: sql<number>`COUNT(*)::int`.as("live_count")
			})
			.from(items)
			.where(eq(items.status, "live"))
			.groupBy(items.subTypeId, items.difficulty)
	)
	if (queryResult.error) {
		logger.error(
			{ error: queryResult.error },
			"loadPressureCellSnapshot: query failed"
		)
		throw errors.wrap(ErrLoadPressureCellQueryFailed, "loadPressureCellSnapshot")
	}

	const snapshot = aggregatePressureCells(queryResult.data)
	logger.info(
		{
			totalCells: snapshot.totalCells,
			totalPressureCells: snapshot.totalPressureCells,
			totalPressureCandidates: snapshot.totalPressureCandidates
		},
		"loadPressureCellSnapshot: complete"
	)
	return snapshot
}

export { ErrLoadPressureCellQueryFailed, loadPressureCellSnapshot }
