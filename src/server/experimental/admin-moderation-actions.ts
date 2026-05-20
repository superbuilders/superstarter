"use server"

import * as errors from "@superbuilders/errors"
import { and, eq } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import { db } from "@/db"
import { experimentalItems } from "@/db/schemas/experimental/experimental-items"
import { itemEditProposals } from "@/db/schemas/experimental/item-edit-proposals"
import { itemRevisionDecisions } from "@/db/schemas/experimental/item-revision-decisions"
import { logger } from "@/logger"
import { requireAdminEmail } from "@/server/auth/admin-gate"
import {
	type ExperimentalModerationAuditStatus,
	type ModerateExperimentalItemOutput,
	ErrExperimentalModerationInputInvalid,
	ErrExperimentalModerationItemNotFound,
	ErrExperimentalModerationProposalNotFound,
	ErrExperimentalModerationTransactionFailed,
	moderateExperimentalItemInputSchema
} from "@/server/experimental/admin-moderation-input-schema"

function deriveNextAuditStatus(input: {
	currentAuditStatus: ExperimentalModerationAuditStatus
	decision: "approve_as_is" | "approve_edit" | "reject" | "needs_revision" | "hide"
}): ExperimentalModerationAuditStatus {
	if (input.decision === "approve_as_is" || input.decision === "approve_edit") {
		return "approved"
	}
	if (input.decision === "reject") return "rejected"
	if (input.decision === "needs_revision") return "needs_revision"
	return input.currentAuditStatus
}

function deriveHiddenAtMs(input: {
	currentHiddenAtMs: number | null
	decision: "approve_as_is" | "approve_edit" | "reject" | "needs_revision" | "hide"
	nowMs: number
}): number | null {
	if (input.decision === "hide") return input.nowMs
	return null
}

async function moderateExperimentalItemAction(
	rawInput: unknown
): Promise<ModerateExperimentalItemOutput> {
	const adminCtx = await requireAdminEmail()
	const parse = moderateExperimentalItemInputSchema.safeParse(rawInput)
	if (!parse.success) {
		logger.error(
			{ adminUserId: adminCtx.userId, error: parse.error },
			"moderateExperimentalItemAction: input validation failed"
		)
		throw errors.wrap(ErrExperimentalModerationInputInvalid, "input validation")
	}
	const input = parse.data

	const currentResult = await errors.try(
		db
			.select({
				id: experimentalItems.id,
				auditStatus: experimentalItems.auditStatus,
				hiddenAtMs: experimentalItems.hiddenAtMs
			})
			.from(experimentalItems)
			.where(eq(experimentalItems.id, input.experimentalItemId))
			.limit(1)
	)
	if (currentResult.error) {
		logger.error(
			{
				adminUserId: adminCtx.userId,
				experimentalItemId: input.experimentalItemId,
				error: currentResult.error
			},
			"moderateExperimentalItemAction: pre-flight item SELECT failed"
		)
		throw errors.wrap(currentResult.error, "moderateExperimentalItemAction item SELECT")
	}
	const current = currentResult.data[0]
	if (current === undefined) {
		logger.warn(
			{ adminUserId: adminCtx.userId, experimentalItemId: input.experimentalItemId },
			"moderateExperimentalItemAction: experimental item not found"
		)
		throw errors.wrap(ErrExperimentalModerationItemNotFound, `id '${input.experimentalItemId}'`)
	}

	let validatedProposalId: string | null = null
	if (input.proposalId !== undefined) {
		const proposalResult = await errors.try(
			db
				.select({ id: itemEditProposals.id })
				.from(itemEditProposals)
				.where(
					and(
						eq(itemEditProposals.id, input.proposalId),
						eq(itemEditProposals.experimentalItemId, input.experimentalItemId)
					)
				)
				.limit(1)
		)
		if (proposalResult.error) {
			logger.error(
				{
					adminUserId: adminCtx.userId,
					experimentalItemId: input.experimentalItemId,
					proposalId: input.proposalId,
					error: proposalResult.error
				},
				"moderateExperimentalItemAction: pre-flight proposal SELECT failed"
			)
			throw errors.wrap(proposalResult.error, "moderateExperimentalItemAction proposal SELECT")
		}
		const proposal = proposalResult.data[0]
		if (proposal === undefined) {
			logger.warn(
				{
					adminUserId: adminCtx.userId,
					experimentalItemId: input.experimentalItemId,
					proposalId: input.proposalId
				},
				"moderateExperimentalItemAction: proposal not found for experimental item"
			)
			throw errors.wrap(
				ErrExperimentalModerationProposalNotFound,
				`proposal '${input.proposalId}' for item '${input.experimentalItemId}'`
			)
		}
		validatedProposalId = proposal.id
	}

	const nowMs = Date.now()
	const nextAuditStatus = deriveNextAuditStatus({
		currentAuditStatus: current.auditStatus,
		decision: input.decision
	})
	const nextHiddenAtMs = deriveHiddenAtMs({
		currentHiddenAtMs: current.hiddenAtMs,
		decision: input.decision,
		nowMs
	})
	const decisionNotes = input.decisionNotes === undefined ? null : input.decisionNotes

	const txResult = await errors.try(
		db.transaction(async function applyModeration(tx) {
			const updateResult = await errors.try(
				tx
					.update(experimentalItems)
					.set({
						auditStatus: nextAuditStatus,
						hiddenAtMs: nextHiddenAtMs,
						updatedAtMs: nowMs
					})
					.where(eq(experimentalItems.id, input.experimentalItemId))
			)
			if (updateResult.error) {
				logger.error(
					{
						adminUserId: adminCtx.userId,
						experimentalItemId: input.experimentalItemId,
						error: updateResult.error
					},
					"moderateExperimentalItemAction: experimental_items UPDATE failed"
				)
				throw errors.wrap(updateResult.error, "experimental_items UPDATE")
			}
			const insertResult = await errors.try(
				tx
					.insert(itemRevisionDecisions)
					.values({
						experimentalItemId: input.experimentalItemId,
						proposalId: validatedProposalId,
						actedByUserId: adminCtx.userId,
						decision: input.decision,
						decisionNotes,
						actedAtMs: nowMs
					})
					.returning({ id: itemRevisionDecisions.id })
			)
			if (insertResult.error) {
				logger.error(
					{
						adminUserId: adminCtx.userId,
						experimentalItemId: input.experimentalItemId,
						error: insertResult.error
					},
					"moderateExperimentalItemAction: item_revision_decisions INSERT failed"
				)
				throw errors.wrap(insertResult.error, "item_revision_decisions INSERT")
			}
			const inserted = insertResult.data[0]
			if (inserted === undefined) {
				logger.error(
					{ adminUserId: adminCtx.userId, experimentalItemId: input.experimentalItemId },
					"moderateExperimentalItemAction: decision returning missing"
				)
				throw errors.wrap(
					ErrExperimentalModerationTransactionFailed,
					"decision returning missing"
				)
			}
			return inserted.id
		})
	)
	if (txResult.error) {
		logger.error(
			{
				adminUserId: adminCtx.userId,
				experimentalItemId: input.experimentalItemId,
				decision: input.decision,
				error: txResult.error
			},
			"moderateExperimentalItemAction: transaction rolled back"
		)
		throw errors.wrap(ErrExperimentalModerationTransactionFailed, "moderation transaction")
	}

	logger.info(
		{
			adminUserId: adminCtx.userId,
			adminEmail: adminCtx.email,
			experimentalItemId: input.experimentalItemId,
			decision: input.decision,
			proposalId: validatedProposalId,
			nextAuditStatus,
			nextHiddenAtMs
		},
		"moderateExperimentalItemAction: moderation committed"
	)

	revalidatePath("/admin/experimental")
	revalidatePath(`/admin/experimental/${input.experimentalItemId}`)

	return {
		outcome: "ok",
		decisionId: txResult.data,
		experimentalItemId: input.experimentalItemId,
		decision: input.decision,
		auditStatus: nextAuditStatus,
		hiddenAtMs: nextHiddenAtMs === null ? undefined : nextHiddenAtMs,
		proposalId: validatedProposalId === null ? undefined : validatedProposalId,
		decisionNotes: input.decisionNotes,
		actedAtMs: nowMs,
		actedByEmail: adminCtx.email
	}
}

export { moderateExperimentalItemAction }
