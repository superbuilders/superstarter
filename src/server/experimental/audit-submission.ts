import * as errors from "@superbuilders/errors"
import { and, desc, eq, isNotNull } from "drizzle-orm"
import { z } from "zod"
import { subTypeIds } from "@/config/sub-types"
import { db } from "@/db"
import { itemAudits } from "@/db/schemas/experimental/item-audits"
import { experimentalAttempts } from "@/db/schemas/experimental/experimental-attempts"
import { experimentalSessions } from "@/db/schemas/experimental/experimental-sessions"
import { logger } from "@/logger"
import type { ExperimentalReviewItemAudit } from "@/server/experimental/review-data"

const ErrExperimentalAuditInputInvalid = errors.new("experimental audit input invalid")
const ErrExperimentalAuditTargetNotFound = errors.new("experimental audit target not found")
const ErrExperimentalAuditEmpty = errors.new("experimental audit requires at least one field")

const auditInputSchema = z.object({
	experimentalSessionId: z.string().uuid(),
	experimentalAttemptId: z.string().uuid(),
	experimentalItemId: z.string().uuid(),
	makesSense: z.boolean().optional(),
	correctAnswerIsRight: z.boolean().optional(),
	subjectTagIsRight: z.boolean().optional(),
	difficultyIsRight: z.boolean().optional(),
	suggestedSubject: z.enum(subTypeIds).optional(),
	suggestedDifficulty: z.enum(["easy", "medium", "hard", "brutal"]).optional(),
	notes: z.string().max(4000).optional()
})

interface SubmitExperimentalItemAuditInput {
	experimentalSessionId: string
	experimentalAttemptId: string
	experimentalItemId: string
	makesSense?: boolean
	correctAnswerIsRight?: boolean
	subjectTagIsRight?: boolean
	difficultyIsRight?: boolean
	suggestedSubject?: string
	suggestedDifficulty?: "easy" | "medium" | "hard" | "brutal"
	notes?: string
}

function normalizeNotes(notes: string | undefined): string | undefined {
	if (notes === undefined) return undefined
	const trimmed = notes.trim()
	if (trimmed.length === 0) return undefined
	return trimmed
}

function hasAuditContent(input: SubmitExperimentalItemAuditInput): boolean {
	if (input.makesSense !== undefined) return true
	if (input.correctAnswerIsRight !== undefined) return true
	if (input.subjectTagIsRight !== undefined) return true
	if (input.difficultyIsRight !== undefined) return true
	if (input.suggestedSubject !== undefined) return true
	if (input.suggestedDifficulty !== undefined) return true
	if (input.notes !== undefined) return true
	return false
}

async function submitExperimentalItemAudit(input: {
	userId: string
	audit: SubmitExperimentalItemAuditInput
}): Promise<ExperimentalReviewItemAudit> {
	const normalizedAudit = {
		...input.audit,
		notes: normalizeNotes(input.audit.notes)
	}
	const parsed = auditInputSchema.safeParse(normalizedAudit)
	if (!parsed.success) {
		logger.error(
			{ issues: parsed.error.issues, userId: input.userId },
			"submitExperimentalItemAudit: input invalid"
		)
		throw errors.wrap(ErrExperimentalAuditInputInvalid, "submitExperimentalItemAudit")
	}
	const audit = parsed.data
	if (!hasAuditContent(audit)) {
		logger.warn(
			{
				userId: input.userId,
				experimentalSessionId: audit.experimentalSessionId,
				experimentalAttemptId: audit.experimentalAttemptId
			},
			"submitExperimentalItemAudit: empty audit rejected"
		)
		throw errors.wrap(ErrExperimentalAuditEmpty, "submitExperimentalItemAudit")
	}
	const targetResult = await errors.try(
		db
			.select({
				experimentalSessionId: experimentalSessions.id,
				experimentalAttemptId: experimentalAttempts.id,
				experimentalItemId: experimentalAttempts.experimentalItemId
			})
			.from(experimentalAttempts)
			.innerJoin(experimentalSessions, eq(experimentalSessions.id, experimentalAttempts.sessionId))
			.where(
				and(
					eq(experimentalAttempts.id, audit.experimentalAttemptId),
					eq(experimentalAttempts.experimentalItemId, audit.experimentalItemId),
					eq(experimentalSessions.id, audit.experimentalSessionId),
					eq(experimentalSessions.userId, input.userId),
					isNotNull(experimentalSessions.endedAtMs),
					eq(experimentalSessions.completionReason, "completed")
				)
			)
			.limit(1)
	)
	if (targetResult.error) {
		logger.error(
			{ error: targetResult.error, userId: input.userId, audit },
			"submitExperimentalItemAudit: ownership query failed"
		)
		throw errors.wrap(targetResult.error, "submitExperimentalItemAudit target")
	}
	const targetRow = targetResult.data[0]
	if (!targetRow) {
		logger.warn(
			{ userId: input.userId, audit },
			"submitExperimentalItemAudit: target not found or not owned"
		)
		throw errors.wrap(ErrExperimentalAuditTargetNotFound, "submitExperimentalItemAudit")
	}
	const existingResult = await errors.try(
		db
			.select({ id: itemAudits.id })
			.from(itemAudits)
			.where(
				and(
					eq(itemAudits.userId, input.userId),
					eq(itemAudits.experimentalAttemptId, audit.experimentalAttemptId)
				)
			)
			.orderBy(desc(itemAudits.submittedAtMs), desc(itemAudits.id))
			.limit(1)
	)
	if (existingResult.error) {
		logger.error(
			{ error: existingResult.error, userId: input.userId, audit },
			"submitExperimentalItemAudit: existing audit query failed"
		)
		throw errors.wrap(existingResult.error, "submitExperimentalItemAudit existing")
	}
	const existing = existingResult.data[0]
	const values = {
		experimentalItemId: audit.experimentalItemId,
		userId: input.userId,
		experimentalSessionId: audit.experimentalSessionId,
		experimentalAttemptId: audit.experimentalAttemptId,
		makesSense: audit.makesSense,
		correctAnswerIsRight: audit.correctAnswerIsRight,
		subjectTagIsRight: audit.subjectTagIsRight,
		difficultyIsRight: audit.difficultyIsRight,
		suggestedSubject: audit.suggestedSubject,
		suggestedDifficulty: audit.suggestedDifficulty,
		notes: audit.notes,
		submittedAtMs: Date.now()
	}
	const writeResult =
		existing === undefined
			? await errors.try(
				db
					.insert(itemAudits)
					.values(values)
					.returning({
						id: itemAudits.id,
						makesSense: itemAudits.makesSense,
						correctAnswerIsRight: itemAudits.correctAnswerIsRight,
						subjectTagIsRight: itemAudits.subjectTagIsRight,
						difficultyIsRight: itemAudits.difficultyIsRight,
						suggestedSubject: itemAudits.suggestedSubject,
						suggestedDifficulty: itemAudits.suggestedDifficulty,
						notes: itemAudits.notes,
						submittedAtMs: itemAudits.submittedAtMs
					})
			)
			: await errors.try(
				db
					.update(itemAudits)
					.set(values)
					.where(eq(itemAudits.id, existing.id))
					.returning({
						id: itemAudits.id,
						makesSense: itemAudits.makesSense,
						correctAnswerIsRight: itemAudits.correctAnswerIsRight,
						subjectTagIsRight: itemAudits.subjectTagIsRight,
						difficultyIsRight: itemAudits.difficultyIsRight,
						suggestedSubject: itemAudits.suggestedSubject,
						suggestedDifficulty: itemAudits.suggestedDifficulty,
						notes: itemAudits.notes,
						submittedAtMs: itemAudits.submittedAtMs
					})
			)
	if (writeResult.error) {
		logger.error(
			{ error: writeResult.error, userId: input.userId, audit },
			"submitExperimentalItemAudit: write failed"
		)
		throw errors.wrap(writeResult.error, "submitExperimentalItemAudit write")
	}
	const saved = writeResult.data[0]
	if (!saved) {
		logger.error(
			{ userId: input.userId, audit },
			"submitExperimentalItemAudit: write returned no rows"
		)
		throw errors.new("submitExperimentalItemAudit: write returned no rows")
	}
	return {
		id: saved.id,
		makesSense: saved.makesSense === null ? undefined : saved.makesSense,
		correctAnswerIsRight:
			saved.correctAnswerIsRight === null ? undefined : saved.correctAnswerIsRight,
		subjectTagIsRight: saved.subjectTagIsRight === null ? undefined : saved.subjectTagIsRight,
		difficultyIsRight: saved.difficultyIsRight === null ? undefined : saved.difficultyIsRight,
		suggestedSubject: saved.suggestedSubject === null ? undefined : saved.suggestedSubject,
		suggestedDifficulty:
			saved.suggestedDifficulty === null ? undefined : saved.suggestedDifficulty,
		notes: saved.notes === null ? undefined : saved.notes,
		submittedAtMs: saved.submittedAtMs
	}
}

export type { SubmitExperimentalItemAuditInput }
export { submitExperimentalItemAudit }
