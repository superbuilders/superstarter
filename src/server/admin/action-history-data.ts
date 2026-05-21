// Server-side data loader for the admin item-detail audit-history tab
// (Phase 4 sub-phase b §2.5 commit 0).
//
// Reads item_admin_actions rows for a single item, joined with users for
// admin email display, ordered desc by created_at_ms (newest first).
// Per-row Zod narrowing on action_type protects against future enum
// extensions silently widening the rendered surface; jsonb columns are
// type-guarded into Record<string, unknown> for safe key-level diff
// rendering downstream.
//
// Read-only retrospective surface — no audit trail is written by this
// loader. The history is visible regardless of the item's current status
// (live, candidate, rejected) so admins can review past dispositions on
// any item.
//
// Re-validation events are NOT in the ledger per §2.4 commit-1
// ratification (re-validation is refresh, not disposition).
//
// File split: pure-function helpers + Zod schema + shared interface live
// in action-history-shared.ts to keep audit-history-tab.tsx (a transitive
// child of a "use client" parent) free of the db import graph.

import * as errors from "@superbuilders/errors"
import { desc, eq } from "drizzle-orm"
import { connection } from "next/server"
import { db } from "@/db"
import { users } from "@/db/schemas/auth/users"
import { itemAdminActions } from "@/db/schemas/catalog/item-admin-actions"
import { logger } from "@/logger"
import {
	type AdminActionHistoryEntry,
	adminActionTypeSchema,
	isPlainObject
} from "@/server/admin/action-history-shared"

const ErrLoadActionHistoryQueryFailed = errors.new(
	"loadAdminActionHistory: query failed"
)
const ErrAdminActionRowInvalid = errors.new(
	"loadAdminActionHistory: row narrowing failed"
)

async function loadAdminActionHistory(
	itemId: string
): Promise<ReadonlyArray<AdminActionHistoryEntry>> {
	// Mark request-bound for Next.js 16 Cache Components — the audit
	// ledger mutates as admins disposition candidates, so it can't be
	// cached. Pino's logger reads Date.now() internally, which trips
	// next-prerender-current-time without an explicit upstream marker.
	await connection()
	logger.info({ itemId }, "loadAdminActionHistory: querying")

	const queryResult = await errors.try(
		db
			.select({
				id: itemAdminActions.id,
				itemId: itemAdminActions.itemId,
				adminEmail: users.email,
				actionType: itemAdminActions.actionType,
				beforeJson: itemAdminActions.beforeJson,
				afterJson: itemAdminActions.afterJson,
				reason: itemAdminActions.reason,
				createdAtMs: itemAdminActions.createdAtMs
			})
			.from(itemAdminActions)
			.innerJoin(users, eq(itemAdminActions.adminUserId, users.id))
			.where(eq(itemAdminActions.itemId, itemId))
			.orderBy(desc(itemAdminActions.createdAtMs))
	)
	if (queryResult.error) {
		logger.error(
			{ itemId, error: queryResult.error },
			"loadAdminActionHistory: query failed"
		)
		throw errors.wrap(ErrLoadActionHistoryQueryFailed, "loadAdminActionHistory")
	}

	const rows = queryResult.data
	const narrowed: AdminActionHistoryEntry[] = []
	for (const row of rows) {
		const actionTypeParse = adminActionTypeSchema.safeParse(row.actionType)
		if (!actionTypeParse.success) {
			logger.error(
				{
					itemId,
					rowId: row.id,
					actionType: row.actionType,
					error: actionTypeParse.error
				},
				"loadAdminActionHistory: row narrowing failed"
			)
			throw errors.wrap(ErrAdminActionRowInvalid, `row '${row.id}'`)
		}
		const beforeJsonNarrowed = isPlainObject(row.beforeJson) ? row.beforeJson : {}
		const afterJsonNarrowed = isPlainObject(row.afterJson) ? row.afterJson : {}
		const reasonValue = row.reason === null ? undefined : row.reason
		narrowed.push({
			id: row.id,
			itemId: row.itemId,
			adminEmail: row.adminEmail,
			actionType: actionTypeParse.data,
			beforeJson: beforeJsonNarrowed,
			afterJson: afterJsonNarrowed,
			reason: reasonValue,
			createdAtMs: row.createdAtMs
		})
	}

	logger.info(
		{ itemId, rowCount: narrowed.length },
		"loadAdminActionHistory: complete"
	)
	return narrowed
}

export {
	ErrAdminActionRowInvalid,
	ErrLoadActionHistoryQueryFailed,
	loadAdminActionHistory
}
