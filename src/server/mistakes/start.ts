// startMistakesSession — bespoke session-start for the mistakes redrill
// flow. Picks N random items the user has gotten wrong (and never
// gotten right since), inserts a fresh practice_sessions row of
// type='mistakes' with subTypeId=NULL (mistakes redrills span multiple
// sub-types), and returns the queue of items.
//
// Unlike the generic startSession, there's no idempotency check: every
// click on the dashboard "Mistakes" link picks 5 fresh items. The
// dedicated session type lets the post-session shell skip the drill-
// specific belt + heading without overloading drill semantics.

import * as errors from "@superbuilders/errors"
import { db } from "@/db"
import { practiceSessions } from "@/db/schemas/practice/practice-sessions"
import { logger } from "@/logger"
import type { ItemForRender } from "@/server/items/selection"
import { pickMistakeItems } from "@/server/mistakes/pick-items"

const ErrSessionInsertFailed = errors.new("mistakes session insert returned no rows")

const MISTAKES_DRILL_LENGTH = 5

interface MistakesSessionReady {
	kind: "ready"
	sessionId: string
	items: ItemForRender[]
}

type MistakesSessionInit = MistakesSessionReady | { kind: "empty" }

async function startMistakesSession(userId: string): Promise<MistakesSessionInit> {
	const picked = await pickMistakeItems(userId, MISTAKES_DRILL_LENGTH)
	if (picked.length === 0) {
		logger.info({ userId }, "startMistakesSession: no mistake items available")
		return { kind: "empty" }
	}

	const nowMs = Date.now()
	const inserted = await errors.try(
		db
			.insert(practiceSessions)
			.values({
				userId,
				type: "mistakes",
				subTypeId: null,
				timerMode: "standard",
				targetQuestionCount: picked.length,
				startedAtMs: nowMs,
				lastHeartbeatMs: nowMs,
				recencyExcludedItemIds: []
			})
			.returning({ id: practiceSessions.id })
	)
	if (inserted.error) {
		logger.error(
			{ error: inserted.error, userId },
			"startMistakesSession: insert failed"
		)
		throw errors.wrap(inserted.error, "startMistakesSession insert")
	}
	const row = inserted.data[0]
	if (!row) {
		logger.error({ userId }, "startMistakesSession: insert returning empty")
		throw errors.wrap(ErrSessionInsertFailed, `user '${userId}'`)
	}

	logger.info(
		{ sessionId: row.id, userId, count: picked.length },
		"startMistakesSession: inserted"
	)

	return {
		kind: "ready",
		sessionId: row.id,
		items: picked.map(function pickItem(p) {
			return p.item
		})
	}
}

export type { MistakesSessionInit }
export { MISTAKES_DRILL_LENGTH, startMistakesSession }
