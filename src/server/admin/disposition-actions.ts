"use server"

// Admin candidate-disposition server actions (Phase 4 sub-phase b §2.4
// commit 0). Two actions; structurally mirror submitEditAction at
// edit-actions.ts (the canonical immediate-prior precedent).
//
// Transaction shape (per §6.14.31 destructive-operation-gate, per-item
// scope):
//   1. AUDIT — Zod safeParse against approve/rejectInputSchema (input
//      shape + reason-required-on-reject refinement).
//   2. VERIFY — pre-flight SELECT of the candidate's current status +
//      metadata (refuse non-candidate items; gate approve on staleness).
//   3. GATE — server-side staleness check for approve; UI confirmation
//      modal (ApproveStaleConfirm) is the corresponding client-side
//      affordance. Reject has no staleness gate (terminal admin
//      judgment doesn't depend on validator state).
//   4. EXECUTE — single db.transaction wrapping items UPDATE +
//      item_admin_actions INSERT. Atomicity guarantees the audit row
//      and the status flip land together or not at all.
//   5. POSTVERIFY — transaction commit success implies both writes
//      landed; revalidatePath fires for queue + item-detail; logger.info
//      records the disposition.
//
// Pressure-cell decrement is implicit: loadAdminQueueData computes
// pressureCellCount inline (queue-data.ts:230-239) from the current
// candidate set. Approve removes the item from that set, so its
// contribution to pressureCellCount drops on the next load (forced by
// revalidatePath). No explicit cache invalidation needed.

import * as errors from "@superbuilders/errors"
import { eq } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import { db } from "@/db"
import { itemAdminActions } from "@/db/schemas/catalog/item-admin-actions"
import { items } from "@/db/schemas/catalog/items"
import { logger } from "@/logger"
import { requireAdminEmail } from "@/server/auth/admin-gate"
import {
	approveInputSchema,
	type DispositionOutput,
	ErrApproveInputInvalid,
	ErrItemNotCandidate,
	ErrItemNotFound,
	ErrRejectInputInvalid,
	ErrStaleVerdictNotAcknowledged,
	rejectInputSchema
} from "@/server/admin/disposition-input-schema"
import { isMetadataValidatorStale } from "@/server/admin/staleness"

const ErrDispositionTransactionFailed = errors.new("disposition transaction failed")

async function approveCandidateAction(rawInput: unknown): Promise<DispositionOutput> {
	const adminCtx = await requireAdminEmail()

	const parse = approveInputSchema.safeParse(rawInput)
	if (!parse.success) {
		logger.error(
			{ adminUserId: adminCtx.userId, error: parse.error },
			"approveCandidateAction: input validation failed"
		)
		throw errors.wrap(ErrApproveInputInvalid, "input validation")
	}
	const input = parse.data

	const currentResult = await errors.try(
		db
			.select({ status: items.status, metadataJson: items.metadataJson })
			.from(items)
			.where(eq(items.id, input.itemId))
			.limit(1)
	)
	if (currentResult.error) {
		logger.error(
			{ adminUserId: adminCtx.userId, itemId: input.itemId, error: currentResult.error },
			"approveCandidateAction: pre-flight SELECT failed"
		)
		throw errors.wrap(currentResult.error, "approveCandidateAction pre-flight SELECT")
	}
	const current = currentResult.data[0]
	if (current === undefined) {
		logger.warn(
			{ adminUserId: adminCtx.userId, itemId: input.itemId },
			"approveCandidateAction: item not found"
		)
		throw errors.wrap(ErrItemNotFound, `id '${input.itemId}'`)
	}
	if (current.status !== "candidate") {
		logger.warn(
			{ adminUserId: adminCtx.userId, itemId: input.itemId, currentStatus: current.status },
			"approveCandidateAction: item not in candidate status"
		)
		throw errors.wrap(ErrItemNotCandidate, `id '${input.itemId}' status '${current.status}'`)
	}

	const isStale = isMetadataValidatorStale(current.metadataJson)
	if (isStale && !input.acknowledgeStaleVerdict) {
		logger.warn(
			{ adminUserId: adminCtx.userId, itemId: input.itemId },
			"approveCandidateAction: stale verdict not acknowledged"
		)
		throw errors.wrap(ErrStaleVerdictNotAcknowledged, `id '${input.itemId}'`)
	}

	const nowMs = Date.now()
	const insertReason = input.reasonNote === undefined ? null : input.reasonNote

	const txResult = await errors.try(
		db.transaction(async function applyApprove(tx) {
			const updateResult = await errors.try(
				tx.update(items).set({ status: "live" }).where(eq(items.id, input.itemId))
			)
			if (updateResult.error) {
				logger.error(
					{ adminUserId: adminCtx.userId, itemId: input.itemId, error: updateResult.error },
					"approveCandidateAction: items UPDATE failed"
				)
				throw errors.wrap(updateResult.error, "items UPDATE")
			}
			const insertResult = await errors.try(
				tx.insert(itemAdminActions).values({
					itemId: input.itemId,
					adminUserId: adminCtx.userId,
					actionType: "approve" as const,
					beforeJson: { status: "candidate" },
					afterJson: { status: "live" },
					reason: insertReason,
					createdAtMs: nowMs
				})
			)
			if (insertResult.error) {
				logger.error(
					{ adminUserId: adminCtx.userId, itemId: input.itemId, error: insertResult.error },
					"approveCandidateAction: item_admin_actions INSERT failed"
				)
				throw errors.wrap(insertResult.error, "item_admin_actions INSERT")
			}
		})
	)
	if (txResult.error) {
		logger.error(
			{ adminUserId: adminCtx.userId, itemId: input.itemId, error: txResult.error },
			"approveCandidateAction: transaction rolled back"
		)
		throw errors.wrap(ErrDispositionTransactionFailed, "approve transaction")
	}

	logger.info(
		{
			adminUserId: adminCtx.userId,
			itemId: input.itemId,
			staleAcknowledged: input.acknowledgeStaleVerdict,
			hasReasonNote: input.reasonNote !== undefined,
			newStatus: "live"
		},
		"approveCandidateAction: approve committed"
	)

	revalidatePath("/admin/review")
	revalidatePath(`/admin/review/${input.itemId}`)

	return { outcome: "ok", itemId: input.itemId, newStatus: "live" }
}

async function rejectCandidateAction(rawInput: unknown): Promise<DispositionOutput> {
	const adminCtx = await requireAdminEmail()

	const parse = rejectInputSchema.safeParse(rawInput)
	if (!parse.success) {
		logger.error(
			{ adminUserId: adminCtx.userId, error: parse.error },
			"rejectCandidateAction: input validation failed"
		)
		throw errors.wrap(ErrRejectInputInvalid, "input validation")
	}
	const input = parse.data

	const currentResult = await errors.try(
		db
			.select({ status: items.status })
			.from(items)
			.where(eq(items.id, input.itemId))
			.limit(1)
	)
	if (currentResult.error) {
		logger.error(
			{ adminUserId: adminCtx.userId, itemId: input.itemId, error: currentResult.error },
			"rejectCandidateAction: pre-flight SELECT failed"
		)
		throw errors.wrap(currentResult.error, "rejectCandidateAction pre-flight SELECT")
	}
	const current = currentResult.data[0]
	if (current === undefined) {
		logger.warn(
			{ adminUserId: adminCtx.userId, itemId: input.itemId },
			"rejectCandidateAction: item not found"
		)
		throw errors.wrap(ErrItemNotFound, `id '${input.itemId}'`)
	}
	if (current.status !== "candidate") {
		logger.warn(
			{ adminUserId: adminCtx.userId, itemId: input.itemId, currentStatus: current.status },
			"rejectCandidateAction: item not in candidate status"
		)
		throw errors.wrap(ErrItemNotCandidate, `id '${input.itemId}' status '${current.status}'`)
	}

	const nowMs = Date.now()

	const txResult = await errors.try(
		db.transaction(async function applyReject(tx) {
			const updateResult = await errors.try(
				tx
					.update(items)
					.set({
						status: "rejected",
						rejectedAtMs: nowMs,
						rejectedBy: adminCtx.userId,
						rejectionReason: input.reasonNote
					})
					.where(eq(items.id, input.itemId))
			)
			if (updateResult.error) {
				logger.error(
					{ adminUserId: adminCtx.userId, itemId: input.itemId, error: updateResult.error },
					"rejectCandidateAction: items UPDATE failed"
				)
				throw errors.wrap(updateResult.error, "items UPDATE")
			}
			const insertResult = await errors.try(
				tx.insert(itemAdminActions).values({
					itemId: input.itemId,
					adminUserId: adminCtx.userId,
					actionType: "reject" as const,
					beforeJson: { status: "candidate" },
					afterJson: {
						status: "rejected",
						rejectedAtMs: nowMs,
						rejectedBy: adminCtx.userId,
						rejectionReason: input.reasonNote
					},
					reason: input.reasonNote,
					createdAtMs: nowMs
				})
			)
			if (insertResult.error) {
				logger.error(
					{ adminUserId: adminCtx.userId, itemId: input.itemId, error: insertResult.error },
					"rejectCandidateAction: item_admin_actions INSERT failed"
				)
				throw errors.wrap(insertResult.error, "item_admin_actions INSERT")
			}
		})
	)
	if (txResult.error) {
		logger.error(
			{ adminUserId: adminCtx.userId, itemId: input.itemId, error: txResult.error },
			"rejectCandidateAction: transaction rolled back"
		)
		throw errors.wrap(ErrDispositionTransactionFailed, "reject transaction")
	}

	logger.info(
		{
			adminUserId: adminCtx.userId,
			itemId: input.itemId,
			newStatus: "rejected"
		},
		"rejectCandidateAction: reject committed"
	)

	revalidatePath("/admin/review")
	revalidatePath(`/admin/review/${input.itemId}`)

	return { outcome: "ok", itemId: input.itemId, newStatus: "rejected" }
}

export { approveCandidateAction, rejectCandidateAction }
