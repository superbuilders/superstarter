// Dashboard streak chip helper. Returns the user's current
// consecutive-UTC-day practice streak.
//
// **Definition (v1, all UTC):**
//   - A "practice day" is any UTC day on which the user submitted at
//     least one row in `attempts`. Skipped questions count
//     (selectedAnswer NULL still creates an attempts row); abandoned
//     and completed sessions both count, as long as ≥1 attempt
//     exists. Sessions started but never answered (zero attempts)
//     do NOT count — the user has to engage at least once.
//   - The streak is the longest run of consecutive UTC days ending
//     at the most recent practice day, with one grace day:
//       * Most recent practice day = today (UTC) → streak ends today.
//       * Most recent practice day = yesterday (UTC) → streak ends
//         yesterday. Today is the grace day; the user can still
//         maintain the streak by practicing before the next UTC midnight.
//       * Most recent practice day = N days ago (N ≥ 2) → streak = 0.
//
// All time math is in UTC. A future Streaks PRD may add per-user
// timezones; not in scope here.
//
// **Query shape.** SELECT DISTINCT a per-row UTC date string from
// practice_sessions joined to attempts (INNER JOIN drops sessions
// with zero attempts):
//
//   SELECT DISTINCT
//     to_char(to_timestamp(started_at_ms / 1000.0) AT TIME ZONE 'UTC',
//             'YYYY-MM-DD') AS practice_day
//   FROM practice_sessions
//   INNER JOIN attempts ON attempts.session_id = practice_sessions.id
//   WHERE practice_sessions.user_id = $1
//   ORDER BY practice_day DESC
//
// startedAtMs is bucketed (NOT each individual attempt's UUIDv7
// timestamp) so the SQL stays simple and uses the existing bigint
// column. The (rare) edge case of a session that begins at 23:55
// UTC and submits attempts past midnight rolls forward into a
// single day per its start; this is acceptable for v1 streak
// semantics.
//
// **Empty / never-practiced:** zero practice-day rows → streak = 0
// → <StreakChip> renders the neutral "Start your streak" pill.
//
// Pure helpers (`computeStreakFromDays`, `previousDayStr`,
// `utcDateStr`) are exported for unit tests; the DB-coupled
// `computeStreak` is the only consumer of `loadPracticeDaysDesc`.

import * as errors from "@superbuilders/errors"
import { eq, sql } from "drizzle-orm"
import { db } from "@/db"
import { attempts } from "@/db/schemas/practice/attempts"
import { practiceSessions } from "@/db/schemas/practice/practice-sessions"
import { logger } from "@/logger"

const ONE_DAY_MS = 86_400_000

/** Format a unix-ms instant as a YYYY-MM-DD UTC date string. */
function utcDateStr(ms: number): string {
	if (!Number.isFinite(ms)) {
		logger.error({ ms }, "utcDateStr: non-finite ms input")
		throw errors.new("utcDateStr: non-finite ms input")
	}
	return new Date(ms).toISOString().slice(0, 10)
}

/** Given a YYYY-MM-DD UTC date string, return the previous UTC day. */
function previousDayStr(dateStr: string): string {
	const ms = Date.parse(`${dateStr}T00:00:00Z`)
	if (!Number.isFinite(ms)) {
		logger.error({ dateStr }, "previousDayStr: invalid date string")
		throw errors.new("previousDayStr: invalid date")
	}
	return utcDateStr(ms - ONE_DAY_MS)
}

/**
 * Pure streak calculator.
 *
 * @param practiceDaysDesc YYYY-MM-DD UTC strings, sorted DESC, with
 *   no duplicates. Caller guarantees both invariants (the SELECT
 *   DISTINCT + ORDER BY DESC in `loadPracticeDaysDesc` does so).
 * @param todayUtcStr today's UTC date as YYYY-MM-DD.
 *
 * Returns 0 when no practice days, or when the most recent practice
 * day is older than yesterday. Otherwise returns the count of
 * consecutive days ending at the most recent practice day.
 */
function computeStreakFromDays(
	practiceDaysDesc: ReadonlyArray<string>,
	todayUtcStr: string
): number {
	if (practiceDaysDesc.length === 0) return 0
	const mostRecent = practiceDaysDesc[0]
	if (mostRecent === undefined) return 0
	const yesterdayUtcStr = previousDayStr(todayUtcStr)
	// Streak is broken if the latest practice day is older than the
	// grace window (today | yesterday).
	if (mostRecent !== todayUtcStr && mostRecent !== yesterdayUtcStr) return 0
	let streak = 1
	let cursor = mostRecent
	for (let i = 1; i < practiceDaysDesc.length; i++) {
		const day = practiceDaysDesc[i]
		if (day === undefined) break
		const expected = previousDayStr(cursor)
		if (day === expected) {
			streak++
			cursor = expected
			continue
		}
		// Same day repeated: caller's contract bans this, but defending
		// is cheap — skip without breaking.
		if (day === cursor) continue
		// Anything else means a gap → streak ends here.
		break
	}
	return streak
}

async function loadPracticeDaysDesc(userId: string): Promise<ReadonlyArray<string>> {
	const result = await errors.try(
		db
			.selectDistinct({
				practiceDay: sql<string>`to_char(to_timestamp(${practiceSessions.startedAtMs}::float8 / 1000) AT TIME ZONE 'UTC', 'YYYY-MM-DD')`
			})
			.from(practiceSessions)
			.innerJoin(attempts, eq(attempts.sessionId, practiceSessions.id))
			.where(eq(practiceSessions.userId, userId))
			.orderBy(sql`1 DESC`)
	)
	if (result.error) {
		logger.error({ error: result.error, userId }, "loadPracticeDaysDesc: query failed")
		throw errors.wrap(result.error, "loadPracticeDaysDesc")
	}
	return result.data.map(function pickDay(r) {
		return r.practiceDay
	})
}

async function computeStreak(userId: string): Promise<number> {
	const days = await loadPracticeDaysDesc(userId)
	const todayUtcStr = utcDateStr(Date.now())
	const streak = computeStreakFromDays(days, todayUtcStr)
	logger.debug(
		{ userId, streakDays: streak, practiceDayCount: days.length },
		"computeStreak: resolved"
	)
	return streak
}

export { computeStreak, computeStreakFromDays, previousDayStr, utcDateStr }
