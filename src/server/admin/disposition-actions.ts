"use server"

// Admin item-disposition server actions. Two actions; structurally mirror
// submitEditAction at edit-actions.ts. Originally Phase 4 sub-phase b §2.4
// commit-0 supported only candidate-source transitions; generalized to
// reversible disposition so admins can demote live → rejected and revive
// rejected → live from the row-level queue affordance on the live/rejected
// cohort tabs.
//
// Transaction shape (per §6.14.31 destructive-operation-gate, per-item
// scope):
//   1. AUDIT — Zod safeParse against approve/rejectInputSchema (input
//      shape + reason-required-on-reject refinement).
//   2. VERIFY — pre-flight SELECT of the item's current status +
//      metadata. Approve accepts source status ∈ {candidate, rejected};
//      reject accepts source status ∈ {candidate, live}. Mismatches return
//      ErrItemNotApprovable / ErrItemNotRejectable.
//   3. GATE — server-side staleness check applies only to the
//      candidate→live approve path (rejected→live revives skip it because
//      the prior validator verdict was already superseded). Reject has no
//      staleness gate (terminal admin judgment doesn't depend on validator
//      state).
//   4. EXECUTE — single db.transaction wrapping items UPDATE +
//      item_admin_actions INSERT. Atomicity guarantees the audit row
//      and the status flip land together or not at all. Approve from
//      rejected clears (rejectedAtMs, rejectedBy, rejectionReason) to
//      NULL; reject (from any source) populates them.
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
import {
	approveInputSchema,
	type DispositionOutput,
	ErrApproveInputInvalid,
	ErrItemNotApprovable,
	ErrItemNotFound,
	ErrItemNotRejectable,
	ErrRejectInputInvalid,
	ErrStaleVerdictNotAcknowledged,
	rejectInputSchema
} from "@/server/admin/disposition-input-schema"
import { isMetadataValidatorStale } from "@/server/admin/staleness"
import { requireAdminEmail } from "@/server/auth/admin-gate"

const ErrDispositionTransactionFailed = errors.new("disposition transaction failed")

async function approveItemAction(rawInput: unknown): Promise<DispositionOutput> {
	const adminCtx = await requireAdminEmail()

	const parse = approveInputSchema.safeParse(rawInput)
	if (!parse.success) {
		logger.error(
			{ adminUserId: adminCtx.userId, error: parse.error },
			"approveItemAction: input validation failed"
		)
		throw errors.wrap(ErrApproveInputInvalid, "input validation")
	}
	const input = parse.data

	const currentResult = await errors.try(
		db
			.select({
				status: items.status,
				metadataJson: items.metadataJson,
				rejectedAtMs: items.rejectedAtMs,
				rejectedBy: items.rejectedBy,
				rejectionReason: items.rejectionReason
			})
			.from(items)
			.where(eq(items.id, input.itemId))
			.limit(1)
	)
	if (currentResult.error) {
		logger.error(
			{ adminUserId: adminCtx.userId, itemId: input.itemId, error: currentResult.error },
			"approveItemAction: pre-flight SELECT failed"
		)
		throw errors.wrap(currentResult.error, "approveItemAction pre-flight SELECT")
	}
	const current = currentResult.data[0]
	if (current === undefined) {
		logger.warn(
			{ adminUserId: adminCtx.userId, itemId: input.itemId },
			"approveItemAction: item not found"
		)
		throw errors.wrap(ErrItemNotFound, `id '${input.itemId}'`)
	}
	if (current.status !== "candidate" && current.status !== "rejected") {
		logger.warn(
			{ adminUserId: adminCtx.userId, itemId: input.itemId, currentStatus: current.status },
			"approveItemAction: item not in an approvable status"
		)
		throw errors.wrap(ErrItemNotApprovable, `id '${input.itemId}' status '${current.status}'`)
	}

	const sourceStatus = current.status
	if (sourceStatus === "candidate") {
		const isStale = isMetadataValidatorStale(current.metadataJson)
		if (isStale && !input.acknowledgeStaleVerdict) {
			logger.warn(
				{ adminUserId: adminCtx.userId, itemId: input.itemId },
				"approveItemAction: stale verdict not acknowledged"
			)
			throw errors.wrap(ErrStaleVerdictNotAcknowledged, `id '${input.itemId}'`)
		}
	}

	const nowMs = Date.now()
	const insertReason = input.reasonNote === undefined ? null : input.reasonNote
	const beforeJson =
		sourceStatus === "rejected"
			? {
					status: "rejected" as const,
					rejectedAtMs: current.rejectedAtMs,
					rejectedBy: current.rejectedBy,
					rejectionReason: current.rejectionReason
				}
			: { status: "candidate" as const }

	const txResult = await errors.try(
		db.transaction(async function applyApprove(tx) {
			const updateResult = await errors.try(
				tx
					.update(items)
					.set({
						status: "live",
						rejectedAtMs: null,
						rejectedBy: null,
						rejectionReason: null
					})
					.where(eq(items.id, input.itemId))
			)
			if (updateResult.error) {
				logger.error(
					{ adminUserId: adminCtx.userId, itemId: input.itemId, error: updateResult.error },
					"approveItemAction: items UPDATE failed"
				)
				throw errors.wrap(updateResult.error, "items UPDATE")
			}
			const insertResult = await errors.try(
				tx.insert(itemAdminActions).values({
					itemId: input.itemId,
					adminUserId: adminCtx.userId,
					actionType: "approve" as const,
					beforeJson,
					afterJson: { status: "live" },
					reason: insertReason,
					createdAtMs: nowMs
				})
			)
			if (insertResult.error) {
				logger.error(
					{ adminUserId: adminCtx.userId, itemId: input.itemId, error: insertResult.error },
					"approveItemAction: item_admin_actions INSERT failed"
				)
				throw errors.wrap(insertResult.error, "item_admin_actions INSERT")
			}
		})
	)
	if (txResult.error) {
		logger.error(
			{ adminUserId: adminCtx.userId, itemId: input.itemId, error: txResult.error },
			"approveItemAction: transaction rolled back"
		)
		throw errors.wrap(ErrDispositionTransactionFailed, "approve transaction")
	}

	logger.info(
		{
			adminUserId: adminCtx.userId,
			itemId: input.itemId,
			sourceStatus,
			staleAcknowledged: input.acknowledgeStaleVerdict,
			hasReasonNote: input.reasonNote !== undefined,
			newStatus: "live"
		},
		"approveItemAction: approve committed"
	)

	revalidatePath("/admin/review")
	revalidatePath(`/admin/review/${input.itemId}`)

	return { outcome: "ok", itemId: input.itemId, newStatus: "live" }
}

async function rejectItemAction(rawInput: unknown): Promise<DispositionOutput> {
	const adminCtx = await requireAdminEmail()

	const parse = rejectInputSchema.safeParse(rawInput)
	if (!parse.success) {
		logger.error(
			{ adminUserId: adminCtx.userId, error: parse.error },
			"rejectItemAction: input validation failed"
		)
		throw errors.wrap(ErrRejectInputInvalid, "input validation")
	}
	const input = parse.data

	const currentResult = await errors.try(
		db.select({ status: items.status }).from(items).where(eq(items.id, input.itemId)).limit(1)
	)
	if (currentResult.error) {
		logger.error(
			{ adminUserId: adminCtx.userId, itemId: input.itemId, error: currentResult.error },
			"rejectItemAction: pre-flight SELECT failed"
		)
		throw errors.wrap(currentResult.error, "rejectItemAction pre-flight SELECT")
	}
	const current = currentResult.data[0]
	if (current === undefined) {
		logger.warn(
			{ adminUserId: adminCtx.userId, itemId: input.itemId },
			"rejectItemAction: item not found"
		)
		throw errors.wrap(ErrItemNotFound, `id '${input.itemId}'`)
	}
	if (current.status !== "candidate" && current.status !== "live") {
		logger.warn(
			{ adminUserId: adminCtx.userId, itemId: input.itemId, currentStatus: current.status },
			"rejectItemAction: item not in a rejectable status"
		)
		throw errors.wrap(ErrItemNotRejectable, `id '${input.itemId}' status '${current.status}'`)
	}

	const sourceStatus = current.status
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
					"rejectItemAction: items UPDATE failed"
				)
				throw errors.wrap(updateResult.error, "items UPDATE")
			}
			const insertResult = await errors.try(
				tx.insert(itemAdminActions).values({
					itemId: input.itemId,
					adminUserId: adminCtx.userId,
					actionType: "reject" as const,
					beforeJson: { status: sourceStatus },
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
					"rejectItemAction: item_admin_actions INSERT failed"
				)
				throw errors.wrap(insertResult.error, "item_admin_actions INSERT")
			}
		})
	)
	if (txResult.error) {
		logger.error(
			{ adminUserId: adminCtx.userId, itemId: input.itemId, error: txResult.error },
			"rejectItemAction: transaction rolled back"
		)
		throw errors.wrap(ErrDispositionTransactionFailed, "reject transaction")
	}

	logger.info(
		{
			adminUserId: adminCtx.userId,
			itemId: input.itemId,
			sourceStatus,
			newStatus: "rejected"
		},
		"rejectItemAction: reject committed"
	)

	revalidatePath("/admin/review")
	revalidatePath(`/admin/review/${input.itemId}`)

	return { outcome: "ok", itemId: input.itemId, newStatus: "rejected" }
}

export { approveItemAction, rejectItemAction }
