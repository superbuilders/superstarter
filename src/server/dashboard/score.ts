// Dashboard score-strip + last-sim helpers. Real reads against
// practice_sessions + attempts; both helpers query the most recent
// `type='full_length'` sessions for the given user.
//
// Practice round commit 5 (`docs/plans/practice-round.md` §5 commit 5)
// replaced the dashboard-round STUB returns with the queries below.
// Per dashboard round Decision E (`docs/plans/dashboard.md` §3): full
// sims store as `type='full_length'` (NOT `'simulation'`); the latter
// enum value is reserved for a future test-day-simulation surface and
// is never written by v1 code. Practice-round Decision E held against
// the codebase audit at commit 5 (the enum still includes both;
// `'simulation'` is still unwritten); these helpers filter on
// `type='full_length'` exclusively.
//
// **Shared query shape.** Both helpers call the private
// `loadLastSimsWithScores(userId, limit)` which does a single
// JOIN + GROUP BY + ORDER BY + LIMIT against
// practice_sessions_user_type_ended_idx (per `docs/plans/practice-
// round.md` §2.5 audit confirming index coverage). For each
// returned row, `correctCount` is computed via `SUM(CASE WHEN
// attempts.correct THEN 1 ELSE 0 END)::int` (cross-DB-portable;
// no COUNT-FILTER precedent existed in the codebase pre-this-commit).
// computeScoreEstimate consumes 2 rows for {current, delta}.
// getLastFullSim consumes 1 row for the lastSim display shape.
//
// **Empty-state semantics:**
//   - 0 prior sims    → computeScoreEstimate {current: undefined,
//                       delta: undefined}; getLastFullSim undefined.
//   - 1 prior sim     → computeScoreEstimate {current: count, delta:
//                       undefined}; getLastFullSim populated.
//   - 2+ prior sims   → computeScoreEstimate {current, delta both
//                       defined}; getLastFullSim populated with the
//                       most recent.
//
// Decision E note (`docs/plans/dashboard.md` §3): if a future Sim
// Scoring PRD wants to combine 'full_length' + 'simulation' enum
// values, widen the WHERE clause here. Today only 'full_length' is
// written.

import * as errors from "@superbuilders/errors"
import { and, eq, isNotNull, sql } from "drizzle-orm"
import { db } from "@/db"
import { attempts } from "@/db/schemas/practice/attempts"
import { practiceSessions } from "@/db/schemas/practice/practice-sessions"
import { logger } from "@/logger"
import type { DashboardData } from "@/server/dashboard/types"

interface ScoreEstimate {
	current?: number
	delta?: number
}

interface SimRow {
	sessionId: string
	startedAtMs: number
	endedAtMs: number
	correctCount: number
}

const FULL_SIM_QUESTION_COUNT = 50

async function loadLastSimsWithScores(
	userId: string,
	limit: number
): Promise<ReadonlyArray<SimRow>> {
	const result = await errors.try(
		db
			.select({
				sessionId: practiceSessions.id,
				startedAtMs: practiceSessions.startedAtMs,
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
		// endedAtMs is filtered NOT NULL in the WHERE; the column type
		// stays nullable but the row narrowing happens at SQL level.
		// Drizzle returns the column as `number | null` per its schema
		// declaration; we coerce to number after the IS NOT NULL gate.
		const ended = row.endedAtMs
		if (ended === null) {
			logger.error(
				{ userId, sessionId: row.sessionId },
				"loadLastSimsWithScores: endedAtMs null after IS NOT NULL filter (impossible)"
			)
			throw errors.new("loadLastSimsWithScores: endedAtMs null after filter")
		}
		// correctCount is `number` per the sql<number> template; SQL-
		// level COALESCE(...,0) handles the LEFT JOIN's empty-attempts
		// case (SUM over zero rows returns NULL pre-COALESCE), so no
		// JS-side null check is needed and the type is honest.
		return {
			sessionId: row.sessionId,
			startedAtMs: row.startedAtMs,
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
		// Defensive — Array.length > 0 implies rows[0] !== undefined,
		// but the type narrowing under noUncheckedIndexedAccess wants
		// the explicit guard.
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

async function getLastFullSim(userId: string): Promise<DashboardData["lastSim"]> {
	const rows = await loadLastSimsWithScores(userId, 1)
	logger.debug(
		{ userId, rowCount: rows.length },
		"getLastFullSim: queried last-1 full-length sim"
	)
	if (rows.length === 0) return undefined
	const row = rows[0]
	if (row === undefined) return undefined
	const nowMs = Date.now()
	const daysAgoRaw = Math.floor((nowMs - row.endedAtMs) / 86_400_000)
	const daysAgo = daysAgoRaw < 0 ? 0 : daysAgoRaw
	const durationMsRaw = row.endedAtMs - row.startedAtMs
	const durationSeconds = durationMsRaw < 0 ? 0 : Math.floor(durationMsRaw / 1000)
	return {
		score: row.correctCount,
		outOf: FULL_SIM_QUESTION_COUNT,
		daysAgo,
		durationSeconds,
		href: `/post-session/${row.sessionId}`
	}
}

export { computeScoreEstimate, getLastFullSim }
