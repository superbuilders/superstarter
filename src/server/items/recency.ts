// computeRecencyExcludedSet — returns the set of item ids the user
// attempted in the last 7 days, materialized at session start so the
// `getNextItem` selection can filter against a frozen set instead of
// re-querying every call.
//
// Plan §3.2 / SPEC §7.1. Time bound uses uuidv7LowerBound on
// `attempts.id` so the read scans the PK index rather than a separate
// timestamp index (no created_at column exists per
// `rules/no-timestamp-columns.md`).

import * as errors from "@superbuilders/errors"
import { eq, sql } from "drizzle-orm"
import { db } from "@/db"
import { attempts } from "@/db/schemas/practice/attempts"
import { practiceSessions } from "@/db/schemas/practice/practice-sessions"
import { uuidv7LowerBound } from "@/db/lib/uuid-time"
import { logger } from "@/logger"

const RECENCY_WINDOW_MS = 7 * 86_400_000

async function computeRecencyExcludedSet(
	userId: string,
	nowMs: number
): Promise<string[]> {
	const lowerBound = uuidv7LowerBound(new Date(nowMs - RECENCY_WINDOW_MS))
	const result = await errors.try(
		db
			.selectDistinct({ itemId: attempts.itemId })
			.from(attempts)
			.innerJoin(practiceSessions, eq(attempts.sessionId, practiceSessions.id))
			.where(
				sql`${practiceSessions.userId} = ${userId} AND ${attempts.id} >= ${lowerBound}::uuid`
			)
	)
	if (result.error) {
		logger.error(
			{ error: result.error, userId, nowMs },
			"computeRecencyExcludedSet: query failed"
		)
		throw errors.wrap(result.error, "computeRecencyExcludedSet")
	}
	const ids: string[] = []
	for (const row of result.data) {
		ids.push(row.itemId)
	}
	logger.debug(
		{ userId, count: ids.length, windowMs: RECENCY_WINDOW_MS },
		"computeRecencyExcludedSet: resolved"
	)
	return ids
}

export { computeRecencyExcludedSet }
