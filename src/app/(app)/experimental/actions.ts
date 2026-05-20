"use server"

import * as errors from "@superbuilders/errors"
import { revalidatePath } from "next/cache"
import { z } from "zod"
import { auth } from "@/auth"
import type { SubmitAttemptInput, SubmitAttemptResult } from "@/components/focus-shell/types"
import { logger } from "@/logger"
import {
	assertExperimentalSessionOwnedBy,
	endExperimentalSession,
	submitExperimentalAttempt
} from "@/server/experimental/drill-session"
import {
	type SubmitExperimentalItemAuditInput,
	submitExperimentalItemAudit
} from "@/server/experimental/audit-submission"
import {
	type SubmitExperimentalItemProposalInput,
	submitExperimentalItemProposal
} from "@/server/experimental/proposal-submission"

const ErrUnauthorized = errors.new("unauthorized")
const ErrInvalidActionInput = errors.new("invalid experimental action input")

const submitAttemptInputSchema = z.object({
	sessionId: z.string().uuid(),
	itemId: z.string().uuid(),
	selectedAnswer: z.string().min(1).optional(),
	latencyMs: z.number().int().nonnegative(),
	selection: z.object({
		servedAtTier: z.enum(["easy", "medium", "hard", "brutal"]),
		fallbackFromTier: z.enum(["easy", "medium", "hard", "brutal"]).optional(),
		fallbackLevel: z.enum(["fresh", "session-soft", "recency-soft", "tier-degraded"])
	})
})

async function requireExperimentalUserId(): Promise<string> {
	const session = await auth()
	if (!session?.user?.id) {
		logger.warn("experimental action: no auth session")
		throw errors.wrap(ErrUnauthorized, "no session")
	}
	return session.user.id
}

async function submitExperimentalDrillAttempt(
	input: SubmitAttemptInput
): Promise<SubmitAttemptResult> {
	const parsed = submitAttemptInputSchema.safeParse(input)
	if (!parsed.success) {
		logger.error(
			{ issues: parsed.error.issues },
			"submitExperimentalDrillAttempt: input invalid"
		)
		throw errors.wrap(ErrInvalidActionInput, "submitExperimentalDrillAttempt input")
	}
	const userId = await requireExperimentalUserId()
	await assertExperimentalSessionOwnedBy(parsed.data.sessionId, userId)
	return submitExperimentalAttempt(parsed.data)
}

async function endExperimentalDrillSessionAction(sessionId: string): Promise<void> {
	const userId = await requireExperimentalUserId()
	await assertExperimentalSessionOwnedBy(sessionId, userId)
	await endExperimentalSession(sessionId)
	revalidatePath("/experimental/review")
	revalidatePath(`/experimental/review/${sessionId}`)
}

async function submitExperimentalItemAuditAction(
	input: SubmitExperimentalItemAuditInput
) {
	const userId = await requireExperimentalUserId()
	const savedAudit = await submitExperimentalItemAudit({ userId, audit: input })
	revalidatePath(`/experimental/review/${input.experimentalSessionId}`)
	return savedAudit
}

async function submitExperimentalItemProposalAction(
	input: SubmitExperimentalItemProposalInput
) {
	const userId = await requireExperimentalUserId()
	const savedProposal = await submitExperimentalItemProposal({ userId, proposal: input })
	revalidatePath(`/experimental/review/${input.experimentalSessionId}`)
	return savedProposal
}

export {
	endExperimentalDrillSessionAction,
	submitExperimentalDrillAttempt,
	submitExperimentalItemAuditAction,
	submitExperimentalItemProposalAction
}
