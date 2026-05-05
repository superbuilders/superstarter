// startSession — underlying function. Auth is the caller's responsibility
// (the (app)/actions.ts wrapper resolves userId from auth() and passes it
// through). Keeping userId explicit lets dev/test paths exercise this from
// raw Bun without Next.js context, which is what the commit-1 smoke does.
//
// SPEC §7.1 / Plan §6.1 (diagnostic) and §6.4 (drill).
//
// Idempotency on in-progress sessions:
// Before inserting a new practice_sessions row, look up an existing
// in-progress session for the same `(user_id, type, sub_type_id)` (the
// sub_type_id condition becomes IS NULL for diagnostic / full_length /
// simulation, where the column is always null by construction). The
// behavior depends on the existing row's last_heartbeat_ms:
//
//   - fresh    (last_heartbeat_ms within ABANDON_THRESHOLD_MS of now):
//     return the existing sessionId verbatim. Resumed-session path —
//     `recency_excluded_item_ids` is left as it was at original session
//     start, since it's a frozen snapshot per plan §3.2.
//
//   - stale    (last_heartbeat_ms older than the threshold): finalize the
//     row as 'abandoned' (same UPDATE shape the abandon-sweep cron uses,
//     plan §7.3) atomically with the fresh insert in a single transaction,
//     so no caller can observe a state where the stale row is still
//     in-progress while the fresh row also exists.
//
//   - none: just insert.
//
// This closes the strict-mode + cacheComponents double-render orphan
// source observed during Phase 3 commit-5 smoke (the run-page server-
// render fired twice on a single request, leaving an unfinalized "twin"
// drill row). It does NOT close the post-completion orphan source:
// after `endSession` fires from a form action, Next.js auto-revalidates
// the form-action's source route, which re-runs the run page's
// server-side `startSession` — by then the previous session is
// finalized so the idempotency check correctly inserts a fresh row.
// Plan §11 tracks this as a Phase 5 follow-up (probably switch the
// run page's post-completion flow from `revalidatePath()` +
// source-route re-render to an explicit `redirect()`). Until then,
// `phase3-commit5.ts:loadDrillSession` filters on
// `ended_at_ms IS NOT NULL` to express "the drill we just completed"
// independent of orphan source.

import * as errors from "@superbuilders/errors"
import { and, desc, eq, isNull, sql } from "drizzle-orm"
import type { SubTypeId } from "@/config/sub-types"
import { db } from "@/db"
import { practiceSessions } from "@/db/schemas/practice/practice-sessions"
import { logger } from "@/logger"
import { computeRecencyExcludedSet } from "@/server/items/recency"
import { getNextItem, type ItemForRender } from "@/server/items/selection"
import {
	ABANDON_THRESHOLD_MS,
	HEARTBEAT_GRACE_MS
} from "@/server/sessions/abandon-threshold"

const ErrInvalidStartInput = errors.new("invalid startSession input")
const ErrSessionInsertFailed = errors.new("session insert returned no rows")
const ErrFirstItemMissing = errors.new("first item could not be selected")

type SessionType = "diagnostic" | "drill" | "full_length" | "simulation"
type TimerMode = "standard"
type DrillLength = 5 | 10 | 20

interface StartSessionInput {
	userId: string
	type: SessionType
	subTypeId?: SubTypeId
	timerMode?: TimerMode
	drillLength?: DrillLength
}

interface StartSessionResult {
	sessionId: string
	firstItem: ItemForRender
}

interface ExistingInProgress {
	id: string
	lastHeartbeatMs: number
}

function targetQuestionCountFor(input: StartSessionInput): number {
	if (input.type === "diagnostic") return 50
	if (input.type === "drill") {
		if (input.drillLength === undefined) {
			logger.error({ type: input.type }, "startSession: drill missing drillLength")
			throw errors.wrap(ErrInvalidStartInput, "drill requires drillLength")
		}
		return input.drillLength
	}
	if (input.type === "full_length" || input.type === "simulation") return 50
	const _exhaustive: never = input.type
	return _exhaustive
}

function validateInputShape(input: StartSessionInput): void {
	if (input.type === "drill") {
		if (input.subTypeId === undefined) {
			logger.error({ type: input.type }, "startSession: drill missing subTypeId")
			throw errors.wrap(ErrInvalidStartInput, "drill requires subTypeId")
		}
	}
}

async function findExistingInProgress(
	userId: string,
	type: SessionType,
	subTypeForRow: SubTypeId | null
): Promise<ExistingInProgress | null> {
	const subTypeMatch =
		subTypeForRow === null
			? isNull(practiceSessions.subTypeId)
			: eq(practiceSessions.subTypeId, subTypeForRow)
	const result = await errors.try(
		db
			.select({
				id: practiceSessions.id,
				lastHeartbeatMs: practiceSessions.lastHeartbeatMs
			})
			.from(practiceSessions)
			.where(
				and(
					eq(practiceSessions.userId, userId),
					eq(practiceSessions.type, type),
					subTypeMatch,
					isNull(practiceSessions.endedAtMs)
				)
			)
			.orderBy(desc(practiceSessions.id))
			.limit(1)
	)
	if (result.error) {
		logger.error(
			{ error: result.error, userId, type, subTypeId: subTypeForRow },
			"findExistingInProgress: query failed"
		)
		throw errors.wrap(result.error, "findExistingInProgress")
	}
	const row = result.data[0]
	if (!row) return null
	return row
}

async function startSession(input: StartSessionInput): Promise<StartSessionResult> {
	validateInputShape(input)
	const target = targetQuestionCountFor(input)
	const nowMs = Date.now()
	const cutoffMs = nowMs - ABANDON_THRESHOLD_MS

	// timerMode is `'standard'` for drill, NULL for non-drill types. v1
	// only writes 'standard' (PRD §4.4 + SPEC §3.4 cut markers — speed-ramp
	// + brutal drill modes cut from v1 2026-05-04).
	let timerModeForRow: TimerMode | null = null
	if (input.type === "drill") {
		timerModeForRow = "standard"
	}

	// subTypeId is NULL for diagnostic/full_length/simulation; required for drill.
	let subTypeForRow: SubTypeId | null = null
	if (input.type === "drill" && input.subTypeId !== undefined) {
		subTypeForRow = input.subTypeId
	}

	// Idempotency probe — read-only, no transaction yet.
	const existing = await findExistingInProgress(input.userId, input.type, subTypeForRow)

	// Fresh-resume path. The existing row is still within the abandon
	// threshold, so return it. recency_excluded_item_ids stays as it was
	// at original session start (frozen snapshot — see plan §3.2).
	if (existing && existing.lastHeartbeatMs >= cutoffMs) {
		logger.info(
			{
				sessionId: existing.id,
				userId: input.userId,
				type: input.type,
				subTypeId: subTypeForRow,
				lastHeartbeatMs: existing.lastHeartbeatMs,
				cutoffMs
			},
			"startSession: returning existing in-progress session (fresh)"
		)
		const firstItem = await getNextItem(existing.id)
		if (!firstItem) {
			logger.error(
				{ sessionId: existing.id, type: input.type },
				"startSession: resumed session has no selectable first item"
			)
			throw errors.wrap(ErrFirstItemMissing, `resumed session '${existing.id}'`)
		}
		return { sessionId: existing.id, firstItem }
	}

	// Stale-or-none path. Compute recency outside the transaction (it's a
	// pure read; the 7-day window can't be invalidated by abandoning a
	// session since attempts rows are unaffected).
	const recencyExcluded = await computeRecencyExcludedSet(input.userId, nowMs)

	// Atomic: finalize the stale row (if any) AND insert the fresh row.
	// Same UPDATE shape as the abandon-sweep cron (plan §7.3) so any
	// downstream reader sees identical row state regardless of which path
	// finalized it.
	const txResult = await errors.try(
		db.transaction(async (tx) => {
			if (existing) {
				const abandonResult = await tx
					.update(practiceSessions)
					.set({
						endedAtMs: sql`${practiceSessions.lastHeartbeatMs} + ${HEARTBEAT_GRACE_MS}`,
						completionReason: "abandoned"
					})
					.where(eq(practiceSessions.id, existing.id))
					.returning({ id: practiceSessions.id })
				logger.info(
					{
						staleSessionId: existing.id,
						lastHeartbeatMs: existing.lastHeartbeatMs,
						cutoffMs,
						userId: input.userId,
						type: input.type,
						finalized: abandonResult.length > 0
					},
					"startSession: finalized stale in-progress session as abandoned"
				)
			}
			const insertedRows = await tx
				.insert(practiceSessions)
				.values({
					userId: input.userId,
					type: input.type,
					subTypeId: subTypeForRow,
					timerMode: timerModeForRow,
					targetQuestionCount: target,
					startedAtMs: nowMs,
					lastHeartbeatMs: nowMs,
					recencyExcludedItemIds: recencyExcluded
				})
				.returning({ id: practiceSessions.id })
			return insertedRows
		})
	)
	if (txResult.error) {
		logger.error(
			{ error: txResult.error, userId: input.userId, type: input.type },
			"startSession: insert transaction failed"
		)
		throw errors.wrap(txResult.error, "startSession insert")
	}
	const inserted = txResult.data[0]
	if (!inserted) {
		logger.error(
			{ userId: input.userId, type: input.type },
			"startSession: insert returning empty"
		)
		throw errors.wrap(ErrSessionInsertFailed, `user '${input.userId}' type '${input.type}'`)
	}

	const sessionId = inserted.id

	logger.info(
		{
			sessionId,
			userId: input.userId,
			type: input.type,
			subTypeId: subTypeForRow,
			targetQuestionCount: target,
			recencyExcludedCount: recencyExcluded.length,
			abandonedStaleSessionId: existing?.id
		},
		"startSession: inserted"
	)

	const firstItem = await getNextItem(sessionId)
	if (!firstItem) {
		logger.error({ sessionId, type: input.type }, "startSession: no first item selectable")
		throw errors.wrap(ErrFirstItemMissing, `session '${sessionId}'`)
	}
	return { sessionId, firstItem }
}

export type { DrillLength, SessionType, StartSessionInput, StartSessionResult, TimerMode }
export { ErrFirstItemMissing, ErrInvalidStartInput, ErrSessionInsertFailed, startSession }
