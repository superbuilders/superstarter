// recomputeForUser(userId, subTypeId, source): the DB-touching half of the
// mastery pipeline. Pure function lives in compute.ts; this file reads the
// last 10 cross-session attempts on the (user, sub-type) pair, looks up
// the previous mastery_state row, calls computeMastery, and upserts.
//
// SPEC §9.3. Idempotent — running twice on the same input window yields
// the same upsert. The masteryRecomputeWorkflow calls this once per
// distinct sub-type touched in a session.

import * as errors from "@superbuilders/errors"
import { desc, eq, sql } from "drizzle-orm"
import type { SubTypeId } from "@/config/sub-types"
import { subTypes as subTypesTable } from "@/config/sub-types"
import { db } from "@/db"
import { masteryState } from "@/db/schemas/practice/mastery-state"
import { attempts } from "@/db/schemas/practice/attempts"
import { practiceSessions } from "@/db/schemas/practice/practice-sessions"
import { items } from "@/db/schemas/catalog/items"
import { logger } from "@/logger"
import { computeMastery, type MasteryLevel, type MasterySource } from "@/server/mastery/compute"

const ErrSubTypeNotFound = errors.new("sub type not found")
const ErrUpsertFailed = errors.new("mastery state upsert failed")

const RECOMPUTE_WINDOW = 10

function latencyThresholdFor(subTypeId: SubTypeId): number {
	const cfg = subTypesTable.find(function bySubTypeId(s) {
		return s.id === subTypeId
	})
	if (!cfg) {
		logger.error({ subTypeId }, "recompute: sub type config missing")
		throw errors.wrap(ErrSubTypeNotFound, `sub type id '${subTypeId}'`)
	}
	return cfg.latencyThresholdMs
}

async function readLastNAttempts(
	userId: string,
	subTypeId: SubTypeId
): Promise<{ correct: boolean[]; latencyMs: number[] }> {
	const result = await errors.try(
		db
			.select({ correct: attempts.correct, latencyMs: attempts.latencyMs })
			.from(attempts)
			.innerJoin(items, eq(attempts.itemId, items.id))
			.innerJoin(practiceSessions, eq(attempts.sessionId, practiceSessions.id))
			.where(
				sql`${practiceSessions.userId} = ${userId} AND ${items.subTypeId} = ${subTypeId}`
			)
			.orderBy(desc(attempts.id))
			.limit(RECOMPUTE_WINDOW)
	)
	if (result.error) {
		logger.error(
			{ error: result.error, userId, subTypeId },
			"recompute: read last-n attempts failed"
		)
		throw errors.wrap(result.error, "recompute: read attempts")
	}
	const correct: boolean[] = []
	const latencyMs: number[] = []
	for (const row of result.data) {
		correct.push(row.correct)
		latencyMs.push(row.latencyMs)
	}
	return { correct, latencyMs }
}

async function readPreviousState(
	userId: string,
	subTypeId: SubTypeId
): Promise<MasteryLevel | undefined> {
	const result = await errors.try(
		db
			.select({ currentState: masteryState.currentState })
			.from(masteryState)
			.where(
				sql`${masteryState.userId} = ${userId} AND ${masteryState.subTypeId} = ${subTypeId}`
			)
			.limit(1)
	)
	if (result.error) {
		logger.error(
			{ error: result.error, userId, subTypeId },
			"recompute: read previous mastery state failed"
		)
		throw errors.wrap(result.error, "recompute: read previous state")
	}
	const row = result.data[0]
	if (!row) return undefined
	return row.currentState
}

async function recomputeForUser(
	userId: string,
	subTypeId: SubTypeId,
	source: MasterySource
): Promise<MasteryLevel> {
	const tRecomputeStart = Date.now()
	logger.info({ userId, subTypeId }, "recompute:user:start")
	const tReadAttemptsStart = Date.now()
	const window = await readLastNAttempts(userId, subTypeId)
	logger.info(
		{ userId, subTypeId, readAttemptsMs: Date.now() - tReadAttemptsStart },
		"recompute:user:readAttempts"
	)
	const tReadStateStart = Date.now()
	const previous = await readPreviousState(userId, subTypeId)
	logger.info(
		{ userId, subTypeId, readStateMs: Date.now() - tReadStateStart },
		"recompute:user:readState"
	)
	const newState = computeMastery({
		last10Correct: window.correct,
		last10LatencyMs: window.latencyMs,
		latencyThresholdMs: latencyThresholdFor(subTypeId),
		previousState: previous,
		source
	})

	let wasMasteredFlag = false
	if (newState === "mastered") wasMasteredFlag = true
	if (newState === "decayed") wasMasteredFlag = true
	const nowMs = Date.now()

	const tUpsertStart = Date.now()
	const upsertResult = await errors.try(
		db
			.insert(masteryState)
			.values({
				userId,
				subTypeId,
				currentState: newState,
				wasMastered: wasMasteredFlag,
				updatedAtMs: nowMs
			})
			.onConflictDoUpdate({
				target: [masteryState.userId, masteryState.subTypeId],
				set: {
					currentState: newState,
					// idempotent OR — never flip back to false once true
					wasMastered: sql`${masteryState.wasMastered} OR ${wasMasteredFlag}`,
					updatedAtMs: nowMs
				}
			})
			.returning({ currentState: masteryState.currentState })
	)
	logger.info(
		{ userId, subTypeId, upsertMs: Date.now() - tUpsertStart },
		"recompute:user:upsert"
	)
	if (upsertResult.error) {
		logger.error(
			{ error: upsertResult.error, userId, subTypeId, newState },
			"recompute: upsert failed"
		)
		throw errors.wrap(upsertResult.error, "recompute: upsert")
	}
	const upserted = upsertResult.data[0]
	if (!upserted) {
		logger.error({ userId, subTypeId, newState }, "recompute: upsert returning empty")
		throw errors.wrap(ErrUpsertFailed, `user '${userId}' sub-type '${subTypeId}'`)
	}

	logger.info(
		{
			userId,
			subTypeId,
			source,
			previousState: previous,
			newState,
			windowSize: window.correct.length
		},
		"recompute: mastery state upserted"
	)

	logger.info(
		{ userId, subTypeId, totalMs: Date.now() - tRecomputeStart },
		"recompute:user:complete"
	)
	return upserted.currentState
}

export { ErrSubTypeNotFound, ErrUpsertFailed, recomputeForUser }
