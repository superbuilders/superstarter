// Today's completed-session counters for the dashboard mission card.
// Counts the number of *completed* practice_sessions of a given type
// the user finished today (UTC). Drives the "Show up + 1 practice
// test + 3 drills" progress + mission completion acknowledgment on
// <MissionCard>.
//
// **What counts:**
//   - type matches the supplied session type
//     ("drill" or "full_length")
//   - completion_reason = 'completed' (abandoned sessions do NOT
//     count toward today's mission)
//   - ended_at_ms within today's UTC window
//     [todayStartMs, todayEndMs)
//
// Using UTC for the day window matches `computeStreak`'s convention.
// Per-user timezones are a future concern (same caveat as the streak
// helper at src/server/dashboard/streak.ts).

import * as errors from "@superbuilders/errors"
import { and, count, eq, gte, lt } from "drizzle-orm"
import { db } from "@/db"
import { practiceSessions } from "@/db/schemas/practice/practice-sessions"
import { logger } from "@/logger"

type CountedSessionType = "drill" | "full_length"

const ONE_DAY_MS = 86_400_000

/**
 * Given an arbitrary unix-ms instant, return the [start, end) range
 * of the UTC day it falls in. End is exclusive (next-day midnight).
 */
function utcDayWindowMs(nowMs: number): { startMs: number; endMs: number } {
	if (!Number.isFinite(nowMs)) {
		logger.error({ nowMs }, "utcDayWindowMs: non-finite ms input")
		throw errors.new("utcDayWindowMs: non-finite input")
	}
	const startMs = Math.floor(nowMs / ONE_DAY_MS) * ONE_DAY_MS
	const endMs = startMs + ONE_DAY_MS
	return { startMs, endMs }
}

async function countCompletedSessionsToday(
	userId: string,
	sessionType: CountedSessionType,
	nowMs: number
): Promise<number> {
	const { startMs, endMs } = utcDayWindowMs(nowMs)
	const result = await errors.try(
		db
			.select({ count: count() })
			.from(practiceSessions)
			.where(
				and(
					eq(practiceSessions.userId, userId),
					eq(practiceSessions.type, sessionType),
					eq(practiceSessions.completionReason, "completed"),
					gte(practiceSessions.endedAtMs, startMs),
					lt(practiceSessions.endedAtMs, endMs)
				)
			)
	)
	if (result.error) {
		logger.error(
			{ error: result.error, userId, sessionType, startMs, endMs },
			"countCompletedSessionsToday: query failed"
		)
		throw errors.wrap(result.error, "countCompletedSessionsToday")
	}
	const row = result.data[0]
	if (row === undefined) {
		logger.error(
			{ userId, sessionType },
			"countCompletedSessionsToday: COUNT returned no rows (impossible)"
		)
		throw errors.new("countCompletedSessionsToday: empty result")
	}
	logger.debug(
		{ userId, sessionType, count: row.count, startMs, endMs },
		"countCompletedSessionsToday: resolved"
	)
	return row.count
}

async function countDrillsCompletedToday(userId: string, nowMs: number): Promise<number> {
	return countCompletedSessionsToday(userId, "drill", nowMs)
}

async function countPracticeTestsCompletedToday(userId: string, nowMs: number): Promise<number> {
	return countCompletedSessionsToday(userId, "full_length", nowMs)
}

export type { CountedSessionType }
export {
	countCompletedSessionsToday,
	countDrillsCompletedToday,
	countPracticeTestsCompletedToday,
	utcDayWindowMs
}
