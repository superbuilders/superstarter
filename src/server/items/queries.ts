// Colocated Drizzle queries used by selection.ts. No barrel exports — each
// helper is invoked directly from selection.ts. Split out to keep
// selection.ts focused on dispatch + fallback logic, not query plumbing.
//
// All queries here are issued per-getNextItem-call (Phase 3); the call
// volume is small (one per submit) and prepared statements would tie
// the helpers to a specific db instance, which complicates testing
// against admin-db connections in scripts/. Plain query builder is fine.

import * as errors from "@superbuilders/errors"
import { and, count, eq, sql } from "drizzle-orm"
import type { Difficulty, SubTypeId } from "@/config/sub-types"
import { db } from "@/db"
import { items } from "@/db/schemas/catalog/items"
import { attempts } from "@/db/schemas/practice/attempts"
import { logger } from "@/logger"

interface SelectedRow {
	id: string
	body: unknown
	optionsJson: unknown
}

// Build a Postgres array literal of the form '{a,b,c}' (or '{}' when
// empty). The drizzle-orm parameter binding for empty JS arrays renders
// as bare `()`, which Postgres rejects with `syntax error at or near ")"`.
// Casting an explicit text literal sidesteps this completely.
function pgUuidArrayLiteral(ids: ReadonlyArray<string>): string {
	if (ids.length === 0) return "{}"
	return `{${ids.join(",")}}`
}

async function pickItemRow(args: {
	subTypeId: SubTypeId
	tier: Difficulty
	excludedIds: ReadonlyArray<string>
	sessionIdSalt: string
}): Promise<SelectedRow | null> {
	const excludedLiteral = pgUuidArrayLiteral(args.excludedIds)
	const result = await errors.try(
		db
			.select({
				id: items.id,
				body: items.body,
				optionsJson: items.optionsJson
			})
			.from(items)
			.where(
				and(
					eq(items.subTypeId, args.subTypeId),
					eq(items.difficulty, args.tier),
					eq(items.status, "live"),
					sql`${items.id} <> ALL(${excludedLiteral}::uuid[])`
				)
			)
			.orderBy(sql`md5(${items.id}::text || ${args.sessionIdSalt})`)
			.limit(1)
	)
	if (result.error) {
		logger.error(
			{
				error: result.error,
				subTypeId: args.subTypeId,
				tier: args.tier,
				excludedCount: args.excludedIds.length
			},
			"pickItemRow: query failed"
		)
		throw errors.wrap(result.error, "pickItemRow")
	}
	const row = result.data[0]
	if (!row) return null
	return row
}

async function countAttemptsInSession(sessionId: string): Promise<number> {
	const result = await errors.try(
		db
			.select({ n: count() })
			.from(attempts)
			.where(eq(attempts.sessionId, sessionId))
	)
	if (result.error) {
		logger.error(
			{ error: result.error, sessionId },
			"countAttemptsInSession: query failed"
		)
		throw errors.wrap(result.error, "countAttemptsInSession")
	}
	const row = result.data[0]
	if (!row) return 0
	return row.n
}

async function readSessionAttemptedItemIds(sessionId: string): Promise<string[]> {
	const result = await errors.try(
		db
			.selectDistinct({ itemId: attempts.itemId })
			.from(attempts)
			.where(eq(attempts.sessionId, sessionId))
	)
	if (result.error) {
		logger.error(
			{ error: result.error, sessionId },
			"readSessionAttemptedItemIds: query failed"
		)
		throw errors.wrap(result.error, "readSessionAttemptedItemIds")
	}
	const ids: string[] = []
	for (const row of result.data) {
		ids.push(row.itemId)
	}
	return ids
}

export type { SelectedRow }
export { countAttemptsInSession, pickItemRow, readSessionAttemptedItemIds }
