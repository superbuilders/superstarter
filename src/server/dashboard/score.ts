// Dashboard score-strip helpers. Real reads against practice_sessions
// + attempts; both helpers query the most recent `type='full_length'`
// sessions for the given user.
//
// Practice round commit 5 (`docs/plans/practice-round.md` §5 commit 5)
// replaced the dashboard-round STUB returns. Practice round commit 9
// added `getLast5SimScores` to feed the rebuilt <ScoreStrip>'s
// 5-bar Previous Score sparkline. Practice round commit 10 (atomic
// bottom-strip removal) removed the `getLastFullSim` helper along
// with its sole consumer (the deleted <LastSimTile>).
//
// Per dashboard round Decision E (`docs/plans/dashboard.md` §3): full
// sims store as `type='full_length'` (NOT `'simulation'`); the latter
// enum value is reserved for a future test-day-simulation surface and
// is never written by v1 code. These helpers filter on
// `type='full_length'` exclusively.
//
// **Shared query shape.** Both helpers call the private
// `loadLastSimsWithScores(userId, limit)` which does a single
// JOIN + GROUP BY + ORDER BY + LIMIT against
// practice_sessions_user_type_ended_idx. For each returned row,
// `correctCount` is computed via `SUM(CASE WHEN attempts.correct
// THEN 1 ELSE 0 END)::int` (cross-DB-portable; SQL-level COALESCE
// handles the LEFT JOIN's empty-attempts case). computeScoreEstimate
// consumes 2 rows for {current, delta}; getLast5SimScores consumes
// 5 rows.
//
// **Empty-state semantics:**
//   - 0 prior sims    → computeScoreEstimate {current: undefined,
//                       delta: undefined}; getLast5SimScores
//                       [u, u, u, u, u].
//   - 1 prior sim     → computeScoreEstimate {current: count, delta:
//                       undefined}; getLast5SimScores
//                       [u, u, u, u, score].
//   - 2+ prior sims   → computeScoreEstimate {current, delta both
//                       defined}; getLast5SimScores right-aligned
//                       array, oldest-to-newest.

import * as errors from "@superbuilders/errors"
import { and, eq, isNotNull, sql } from "drizzle-orm"
import { db } from "@/db"
import { attempts } from "@/db/schemas/practice/attempts"
import { practiceSessions } from "@/db/schemas/practice/practice-sessions"
import { logger } from "@/logger"

interface ScoreEstimate {
	current?: number
	delta?: number
}

interface SimRow {
	sessionId: string
	endedAtMs: number
	correctCount: number
}

const SIM_HISTORY_LENGTH = 5

async function loadLastSimsWithScores(
	userId: string,
	limit: number
): Promise<ReadonlyArray<SimRow>> {
	const result = await errors.try(
		db
			.select({
				sessionId: practiceSessions.id,
				endedAtMs: practiceSessions.endedAtMs,
				correctCount: sql<number>`COALESCE(SUM(CASE WHEN ${attempts.correct} THEN 1 ELSE 0 END), 0)::int`
			})
			.from(practiceSessions)
			.leftJoin(attempts, eq(attempts.sessionId, practiceSessions.id))
			.where(
				and(
					eq(practiceSessions.userId, userId),
					eq(practiceSessions.type, "full_length"),
					isNotNull(practiceSessions.endedAtMs)
				)
			)
			.groupBy(practiceSessions.id)
			.orderBy(sql`${practiceSessions.endedAtMs} DESC`)
			.limit(limit)
	)
	if (result.error) {
		logger.error(
			{ error: result.error, userId, limit },
			"loadLastSimsWithScores: query failed"
		)
		throw errors.wrap(result.error, "loadLastSimsWithScores")
	}
	return result.data.map(function toSimRow(row): SimRow {
		const ended = row.endedAtMs
		if (ended === null) {
			logger.error(
				{ userId, sessionId: row.sessionId },
				"loadLastSimsWithScores: endedAtMs null after IS NOT NULL filter (impossible)"
			)
			throw errors.new("loadLastSimsWithScores: endedAtMs null after filter")
		}
		return {
			sessionId: row.sessionId,
			endedAtMs: ended,
			correctCount: row.correctCount
		}
	})
}

async function computeScoreEstimate(userId: string): Promise<ScoreEstimate> {
	const rows = await loadLastSimsWithScores(userId, 2)
	logger.debug(
		{ userId, rowCount: rows.length },
		"computeScoreEstimate: queried last-2 full-length sims"
	)
	if (rows.length === 0) {
		return { current: undefined, delta: undefined }
	}
	const current = rows[0]
	if (current === undefined) {
		return { current: undefined, delta: undefined }
	}
	if (rows.length === 1) {
		return { current: current.correctCount, delta: undefined }
	}
	const prior = rows[1]
	if (prior === undefined) {
		return { current: current.correctCount, delta: undefined }
	}
	return {
		current: current.correctCount,
		delta: current.correctCount - prior.correctCount
	}
}

// Practice round commit 9: feeds the <ScoreStrip>'s Previous Score
// sparkline. Returns a length-5 array of correct-counts, OLDEST-TO-
// NEWEST, right-aligned with undefined padding for missing slots.
// Mirrors pace.ts's last5SimMedianMs shape and ordering.
async function getLast5SimScores(userId: string): Promise<ReadonlyArray<number | undefined>> {
	const rows = await loadLastSimsWithScores(userId, SIM_HISTORY_LENGTH)
	logger.debug(
		{ userId, rowCount: rows.length },
		"getLast5SimScores: queried last-5 full-length sims"
	)
	const last5: Array<number | undefined> = [undefined, undefined, undefined, undefined, undefined]
	for (let i = 0; i < rows.length; i++) {
		// rows[0] is newest → goes to slot 4 (last). rows[1] → slot 3.
		const slot = SIM_HISTORY_LENGTH - 1 - i
		const row = rows[i]
		if (row === undefined) continue
		last5[slot] = row.correctCount
	}
	return last5
}

export { computeScoreEstimate, getLast5SimScores }
