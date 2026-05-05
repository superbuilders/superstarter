// Shared queries for the session lifecycle (start / submit / end). Kept
// separate from src/server/items/queries.ts because these read/write
// `practice_sessions` and `attempts`, while items/queries.ts reads `items`.

import * as errors from "@superbuilders/errors"
import { eq } from "drizzle-orm"
import { db } from "@/db"
import type { Difficulty } from "@/config/sub-types"
import { items } from "@/db/schemas/catalog/items"
import { practiceSessions } from "@/db/schemas/practice/practice-sessions"
import { logger } from "@/logger"

const ErrItemNotFound = errors.new("item not found")
const ErrSessionNotFound = errors.new("session not found")
const ErrSessionAlreadyEnded = errors.new("session already ended")

type SessionType = "diagnostic" | "drill" | "full_length" | "simulation"

interface SessionRow {
	id: string
	userId: string
	type: SessionType
	startedAtMs: number
	endedAtMs: number | null
}

// `type` and `startedAtMs` were added by Phase 3 polish commit 1 so the
// 15-minute hard-cutoff check in `submitAttempt` can derive elapsed
// time without a second SQL round-trip. See
// docs/plans/phase-3-polish-practice-surface-features.md §4.2.
async function readSession(sessionId: string): Promise<SessionRow> {
	const result = await errors.try(
		db
			.select({
				id: practiceSessions.id,
				userId: practiceSessions.userId,
				type: practiceSessions.type,
				startedAtMs: practiceSessions.startedAtMs,
				endedAtMs: practiceSessions.endedAtMs
			})
			.from(practiceSessions)
			.where(eq(practiceSessions.id, sessionId))
			.limit(1)
	)
	if (result.error) {
		logger.error({ error: result.error, sessionId }, "readSession: query failed")
		throw errors.wrap(result.error, "readSession")
	}
	const row = result.data[0]
	if (!row) {
		logger.warn({ sessionId }, "readSession: row missing")
		throw errors.wrap(ErrSessionNotFound, `session id '${sessionId}'`)
	}
	const rowType = row.type
	if (rowType === "review") {
		// 'review' session_type cut from v1 2026-05-04 (PRD §4.3 + SPEC §3.5
		// markers). The schema enum still carries the value until commit 4's
		// migration truncates it; this guard narrows the runtime read for
		// the duration.
		logger.error({ sessionId, type: rowType }, "readSession: 'review' session type cut from v1")
		throw errors.wrap(ErrSessionNotFound, `session '${sessionId}' has cut session_type 'review'`)
	}
	return {
		id: row.id,
		userId: row.userId,
		type: rowType,
		startedAtMs: row.startedAtMs,
		endedAtMs: row.endedAtMs
	}
}

interface ItemAnswer {
	correctAnswer: string
	difficulty: Difficulty
}

async function readItemAnswerAndDifficulty(itemId: string): Promise<ItemAnswer> {
	const result = await errors.try(
		db
			.select({
				correctAnswer: items.correctAnswer,
				difficulty: items.difficulty
			})
			.from(items)
			.where(eq(items.id, itemId))
			.limit(1)
	)
	if (result.error) {
		logger.error({ error: result.error, itemId }, "readItemAnswerAndDifficulty: query failed")
		throw errors.wrap(result.error, "readItemAnswerAndDifficulty")
	}
	const row = result.data[0]
	if (!row) {
		logger.warn({ itemId }, "readItemAnswerAndDifficulty: row missing")
		throw errors.wrap(ErrItemNotFound, `item id '${itemId}'`)
	}
	return row
}

export type { ItemAnswer, SessionRow, SessionType }
export { ErrItemNotFound, ErrSessionAlreadyEnded, ErrSessionNotFound, readItemAnswerAndDifficulty, readSession }
