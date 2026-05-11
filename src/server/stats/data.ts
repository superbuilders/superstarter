// /stats page data orchestrator.
//
// Loads the user's completed practice tests + drills (the same set
// surfaced by /review) along with the per-attempt rows that back the
// Pacing matrix + topic-proficiency radars. The Stats surface re-uses
// the post-session matrix and radar components, but aggregated across
// any combination of completed sessions instead of a single sessionId
// like the post-session route.
//
// Aggregation strategy: per-attempt rows are returned to the client so
// the picker can filter session-by-session without a server round-trip
// per selection change. Volume estimate: 50 sessions × 50 attempts ≈
// 2.5k rows, each ~80 bytes after JSON serialization — well under the
// budget for a client-component prop drill.
//
// Median latency cannot be combined from per-session medians (median
// of medians ≠ true median), so client-side aggregation walks the
// per-attempt rows directly. The matrix's mean-time stats are also
// derived client-side from the same rows.

import * as errors from "@superbuilders/errors"
import { and, eq, inArray, isNotNull, sql } from "drizzle-orm"
import type { SubTypeId } from "@/config/sub-types"
import { db } from "@/db"
import { items } from "@/db/schemas/catalog/items"
import { attempts as attemptsTable } from "@/db/schemas/practice/attempts"
import { practiceSessions } from "@/db/schemas/practice/practice-sessions"
import { logger } from "@/logger"

type StatsSessionType = "drill" | "full_length" | "simulation"
type ItemDifficulty = "easy" | "medium" | "hard" | "brutal"

interface StatsSession {
	id: string
	type: StatsSessionType
	subTypeId?: SubTypeId
	startedAtMs: number
	endedAtMs: number
}

interface StatsAttempt {
	attemptId: string
	sessionId: string
	latencyMs: number
	correct: boolean
	subTypeId: SubTypeId
	difficulty: ItemDifficulty
}

interface StatsPageData {
	sessions: ReadonlyArray<StatsSession>
	attempts: ReadonlyArray<StatsAttempt>
}

async function loadSessions(userId: string): Promise<StatsSession[]> {
	const result = await errors.try(
		db
			.select({
				id: practiceSessions.id,
				type: practiceSessions.type,
				subTypeId: sql<SubTypeId | null>`${practiceSessions.subTypeId}`,
				startedAtMs: practiceSessions.startedAtMs,
				endedAtMs: practiceSessions.endedAtMs
			})
			.from(practiceSessions)
			.where(
				and(
					eq(practiceSessions.userId, userId),
					inArray(practiceSessions.type, ["drill", "full_length", "simulation"]),
					isNotNull(practiceSessions.endedAtMs),
					eq(practiceSessions.completionReason, "completed")
				)
			)
	)
	if (result.error) {
		logger.error({ error: result.error, userId }, "loadStatsData: sessions query failed")
		throw errors.wrap(result.error, "loadStatsData sessions")
	}
	const out: StatsSession[] = []
	for (const row of result.data) {
		if (row.type === "diagnostic") continue
		if (row.endedAtMs === null) continue
		const subTypeId = row.subTypeId === null ? undefined : row.subTypeId
		out.push({
			id: row.id,
			type: row.type,
			subTypeId,
			startedAtMs: row.startedAtMs,
			endedAtMs: row.endedAtMs
		})
	}
	out.sort(function byNewestFirst(a, b) {
		if (a.id < b.id) return 1
		if (a.id > b.id) return -1
		return 0
	})
	return out
}

async function loadAttemptsForSessions(sessionIds: ReadonlyArray<string>): Promise<StatsAttempt[]> {
	if (sessionIds.length === 0) return []
	const result = await errors.try(
		db
			.select({
				attemptId: attemptsTable.id,
				sessionId: attemptsTable.sessionId,
				latencyMs: attemptsTable.latencyMs,
				correct: attemptsTable.correct,
				subTypeId: sql<SubTypeId>`${items.subTypeId}`,
				difficulty: sql<ItemDifficulty>`${items.difficulty}`
			})
			.from(attemptsTable)
			.innerJoin(items, eq(attemptsTable.itemId, items.id))
			.where(inArray(attemptsTable.sessionId, [...sessionIds]))
			.orderBy(attemptsTable.id)
	)
	if (result.error) {
		logger.error({ error: result.error }, "loadStatsData: attempts query failed")
		throw errors.wrap(result.error, "loadStatsData attempts")
	}
	const out: StatsAttempt[] = []
	for (const row of result.data) {
		out.push({
			attemptId: row.attemptId,
			sessionId: row.sessionId,
			latencyMs: row.latencyMs,
			correct: row.correct,
			subTypeId: row.subTypeId,
			difficulty: row.difficulty
		})
	}
	return out
}

async function loadStatsData(userId: string): Promise<StatsPageData> {
	logger.info({ userId }, "stats data requested")
	const sessions = await loadSessions(userId)
	if (sessions.length === 0) {
		return { sessions: [], attempts: [] }
	}
	const sessionIds = sessions.map(function pickId(s) {
		return s.id
	})
	const attempts = await loadAttemptsForSessions(sessionIds)
	logger.debug(
		{ userId, sessionCount: sessions.length, attemptCount: attempts.length },
		"stats data assembled"
	)
	return { sessions, attempts }
}

export type { ItemDifficulty, StatsAttempt, StatsPageData, StatsSession, StatsSessionType }
export { loadStatsData }
