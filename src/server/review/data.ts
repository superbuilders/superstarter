// /review page data orchestrator. Reads the user's completed
// practice_sessions of type 'drill', 'full_length', or 'simulation'
// (the diagnostic is excluded — its surface lives in /diagnostic and
// its post-session review at /post-session/<id>; this listing is the
// "history" of post-diagnostic practice). Each row is joined to
// `attempts` for total + correct counts so the card can show a
// scorecard alongside the relative-time + sub-type label.
//
// Per Decision E (`docs/plans/dashboard.md` §3): full sims are stored
// as type='full_length'; 'simulation' is reserved for a future
// test-day-simulation surface and is never written by v1 code today.
// Both values are accepted here so a future surface that does write
// 'simulation' rows shows up in this listing without a follow-up.
//
// Sessions still in progress (endedAtMs IS NULL) are filtered out at
// the SQL layer — they aren't ready for "review."

import * as errors from "@superbuilders/errors"
import { and, desc, eq, inArray, isNotNull, sql } from "drizzle-orm"
import { db } from "@/db"
import { users } from "@/db/schemas/auth/users"
import { attempts } from "@/db/schemas/practice/attempts"
import { practiceSessions } from "@/db/schemas/practice/practice-sessions"
import { logger } from "@/logger"
import { computeStreak } from "@/server/dashboard/streak"

type ReviewSessionType = "drill" | "full_length" | "simulation"
type ReviewCompletionReason = "completed" | "abandoned"

interface ReviewSession {
	id: string
	type: ReviewSessionType
	subTypeId?: string
	startedAtMs: number
	endedAtMs: number
	completionReason?: ReviewCompletionReason
	targetQuestionCount: number
	totalAttempts: number
	correctAttempts: number
	/** Attempts where the user submitted no answer (selectedAnswer IS
	 * NULL). These count as incorrect for scoring but render with a
	 * distinct "Skipped" treatment on the per-session review surface. */
	skippedAttempts: number
}

interface ReviewPageData {
	user: {
		initials: string
		streakDays: number
	}
	practiceTests: ReadonlyArray<ReviewSession>
	drills: ReadonlyArray<ReviewSession>
}

async function loadUserInitials(userId: string): Promise<string> {
	const result = await errors.try(
		db.select({ name: users.name }).from(users).where(eq(users.id, userId)).limit(1)
	)
	if (result.error) {
		logger.error({ error: result.error, userId }, "loadUserInitials: query failed")
		throw errors.wrap(result.error, "loadUserInitials")
	}
	const row = result.data[0]
	if (row === undefined) {
		logger.error({ userId }, "loadUserInitials: user row missing")
		throw errors.new("review user row missing")
	}
	if (row.name === null) {
		logger.error({ userId }, "loadUserInitials: user has no name (auth invariant broken)")
		throw errors.new("user has no name")
	}
	return initialsFor(row.name)
}

function initialsFor(name: string): string {
	const parts = name
		.trim()
		.split(/\s+/)
		.filter(function nonEmpty(p) {
			return p.length > 0
		})
	if (parts.length === 0) return "?"
	if (parts.length === 1) {
		const single = parts[0]
		if (single === undefined) return "?"
		return single.charAt(0).toUpperCase()
	}
	const first = parts[0]
	const last = parts[parts.length - 1]
	if (first === undefined || last === undefined) return "?"
	return `${first.charAt(0)}${last.charAt(0)}`.toUpperCase()
}

async function loadReviewSessions(userId: string): Promise<ReadonlyArray<ReviewSession>> {
	const result = await errors.try(
		db
			.select({
				id: practiceSessions.id,
				type: practiceSessions.type,
				subTypeId: practiceSessions.subTypeId,
				startedAtMs: practiceSessions.startedAtMs,
				endedAtMs: practiceSessions.endedAtMs,
				completionReason: practiceSessions.completionReason,
				targetQuestionCount: practiceSessions.targetQuestionCount,
				totalAttempts: sql<number>`COUNT(${attempts.id})::int`,
				correctAttempts: sql<number>`COALESCE(SUM(CASE WHEN ${attempts.correct} THEN 1 ELSE 0 END), 0)::int`,
				// LEFT JOIN safety: when a session has zero attempts the join
				// emits one phantom row with all attempt fields NULL. The
				// `${attempts.id} IS NOT NULL` guard ignores that phantom so
				// a never-attempted session reads as 0 skipped (not 1).
				skippedAttempts: sql<number>`COALESCE(SUM(CASE WHEN ${attempts.id} IS NOT NULL AND ${attempts.selectedAnswer} IS NULL THEN 1 ELSE 0 END), 0)::int`
			})
			.from(practiceSessions)
			.leftJoin(attempts, eq(attempts.sessionId, practiceSessions.id))
			.where(
				and(
					eq(practiceSessions.userId, userId),
					inArray(practiceSessions.type, ["drill", "full_length", "simulation"]),
					isNotNull(practiceSessions.endedAtMs),
					// Abandoned sessions (the abandon-sweep cron / fresh-start
					// path writes completionReason='abandoned') represent
					// sessions the user walked away from. They aren't
					// meaningful for "review" — drop them from the listing.
					eq(practiceSessions.completionReason, "completed")
				)
			)
			.groupBy(practiceSessions.id)
			.orderBy(desc(practiceSessions.id))
	)
	if (result.error) {
		logger.error({ error: result.error, userId }, "loadReviewSessions: query failed")
		throw errors.wrap(result.error, "loadReviewSessions")
	}
	return result.data.flatMap(function normalize(row): ReviewSession[] {
		// inArray excludes 'diagnostic' at SQL; this guard narrows the TS
		// union to ReviewSessionType without an `as` cast.
		if (row.type === "diagnostic") return []
		const endedAtMs = row.endedAtMs
		if (endedAtMs === null) {
			logger.error(
				{ userId, sessionId: row.id },
				"loadReviewSessions: endedAtMs null after IS NOT NULL filter (impossible)"
			)
			throw errors.new("loadReviewSessions: endedAtMs null after filter")
		}
		const completionReason = row.completionReason === null ? undefined : row.completionReason
		const subTypeId = row.subTypeId === null ? undefined : row.subTypeId
		return [
			{
				id: row.id,
				type: row.type,
				subTypeId,
				startedAtMs: row.startedAtMs,
				endedAtMs,
				completionReason,
				targetQuestionCount: row.targetQuestionCount,
				totalAttempts: row.totalAttempts,
				correctAttempts: row.correctAttempts,
				skippedAttempts: row.skippedAttempts
			}
		]
	})
}

async function getReviewPageData(userId: string): Promise<ReviewPageData> {
	logger.info({ userId }, "review data requested")
	const [initials, streakDays, sessions] = await Promise.all([
		loadUserInitials(userId),
		computeStreak(userId),
		loadReviewSessions(userId)
	])
	const practiceTests = sessions.filter(function isPracticeTest(s) {
		return s.type === "full_length" || s.type === "simulation"
	})
	const drills = sessions.filter(function isDrill(s) {
		return s.type === "drill"
	})
	logger.debug(
		{ userId, practiceTests: practiceTests.length, drills: drills.length },
		"review data assembled"
	)
	return {
		user: { initials, streakDays },
		practiceTests,
		drills
	}
}

export type { ReviewCompletionReason, ReviewPageData, ReviewSession, ReviewSessionType }
export { getReviewPageData }
