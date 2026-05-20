import * as errors from "@superbuilders/errors"
import { and, desc, eq, isNotNull } from "drizzle-orm"
import { z } from "zod"
import { subTypeIds } from "@/config/sub-types"
import { db } from "@/db"
import { itemEditProposals } from "@/db/schemas/experimental/item-edit-proposals"
import { experimentalAttempts } from "@/db/schemas/experimental/experimental-attempts"
import { experimentalSessions } from "@/db/schemas/experimental/experimental-sessions"
import { logger } from "@/logger"
import { bodyText } from "@/server/items/body-schema"
import type { ExperimentalReviewItemProposal } from "@/server/experimental/review-data"

const ErrExperimentalProposalInputInvalid = errors.new("experimental proposal input invalid")
const ErrExperimentalProposalTargetNotFound = errors.new("experimental proposal target not found")
const ErrExperimentalProposalEmpty = errors.new("experimental proposal requires content")
const ErrExperimentalProposalOptionsInvalid = errors.new("experimental proposal options invalid")
const ErrExperimentalProposalCorrectAnswerInvalid = errors.new(
	"experimental proposal correct answer invalid"
)

const proposedOptionsSchema = z
	.array(
		z.object({
			id: z.string().min(1).max(64),
			text: z.string().min(1).max(2000)
		})
	)
	.min(2)
	.max(5)

const proposalInputSchema = z.object({
	experimentalSessionId: z.string().uuid(),
	experimentalAttemptId: z.string().uuid(),
	experimentalItemId: z.string().uuid(),
	proposedStem: z.string().max(8000).optional(),
	proposedOptions: proposedOptionsSchema.optional(),
	proposedCorrectAnswer: z.string().max(64).optional(),
	proposedExplanation: z.string().max(8000).optional(),
	suggestedSubject: z.enum(subTypeIds).optional(),
	suggestedDifficulty: z.enum(["easy", "medium", "hard", "brutal"]).optional(),
	rationale: z.string().max(8000).optional()
})

interface SubmitExperimentalItemProposalInput {
	experimentalSessionId: string
	experimentalAttemptId: string
	experimentalItemId: string
	proposedStem?: string
	proposedOptions?: { id: string; text: string }[]
	proposedCorrectAnswer?: string
	proposedExplanation?: string
	suggestedSubject?: string
	suggestedDifficulty?: "easy" | "medium" | "hard" | "brutal"
	rationale?: string
}

function normalizeText(value: string | undefined): string | undefined {
	if (value === undefined) return undefined
	const trimmed = value.trim()
	if (trimmed.length === 0) return undefined
	return trimmed
}

function hasProposalContent(input: SubmitExperimentalItemProposalInput): boolean {
	if (input.proposedStem !== undefined) return true
	if (input.proposedOptions !== undefined) return true
	if (input.proposedCorrectAnswer !== undefined) return true
	if (input.proposedExplanation !== undefined) return true
	if (input.suggestedSubject !== undefined) return true
	if (input.suggestedDifficulty !== undefined) return true
	if (input.rationale !== undefined) return true
	return false
}

function validateProposedAnswerFields(proposal: z.infer<typeof proposalInputSchema>): void {
	const proposedOptions = proposal.proposedOptions
	const proposedCorrectAnswer = proposal.proposedCorrectAnswer
	if (proposedOptions !== undefined && proposedCorrectAnswer !== undefined) {
		const matchesOption = proposedOptions.some(function matchOption(option) {
			return option.id === proposedCorrectAnswer
		})
		if (matchesOption) return
		logger.warn(
			{ proposal },
			"submitExperimentalItemProposal: proposed correct answer missing from options"
		)
		throw errors.wrap(ErrExperimentalProposalCorrectAnswerInvalid, "submitExperimentalItemProposal")
	}
	if (proposedOptions !== undefined || proposedCorrectAnswer === undefined) return
	logger.warn(
		{ proposal },
		"submitExperimentalItemProposal: proposed correct answer supplied without options"
	)
	throw errors.wrap(ErrExperimentalProposalOptionsInvalid, "submitExperimentalItemProposal")
}

function mapProposalRecord(row: {
	id: string
	proposedBody: unknown
	proposedOptionsJson: unknown
	proposedCorrectAnswer: string | null
	proposedExplanation: string | null
	suggestedSubject: string | null
	suggestedDifficulty: "easy" | "medium" | "hard" | "brutal" | null
	rationale: string | null
	submittedAtMs: number
}): ExperimentalReviewItemProposal {
	let proposedStem: string | undefined
	const parsedBody = bodyText.safeParse(row.proposedBody)
	if (parsedBody.success) {
		proposedStem = parsedBody.data.text
	}
	let proposedOptions: ReadonlyArray<{ id: string; text: string }> | undefined
	const parsedOptions = proposedOptionsSchema.safeParse(row.proposedOptionsJson)
	if (parsedOptions.success) {
		proposedOptions = parsedOptions.data
	}
	const proposedCorrectAnswer =
		row.proposedCorrectAnswer === null ? undefined : row.proposedCorrectAnswer
	const proposedExplanation = row.proposedExplanation === null ? undefined : row.proposedExplanation
	const suggestedSubject = row.suggestedSubject === null ? undefined : row.suggestedSubject
	const suggestedDifficulty =
		row.suggestedDifficulty === null ? undefined : row.suggestedDifficulty
	const rationale = row.rationale === null ? undefined : row.rationale
	return {
		id: row.id,
		proposedStem,
		proposedOptions,
		proposedCorrectAnswer,
		proposedExplanation,
		suggestedSubject,
		suggestedDifficulty,
		rationale,
		submittedAtMs: row.submittedAtMs
	}
}

async function submitExperimentalItemProposal(input: {
	userId: string
	proposal: SubmitExperimentalItemProposalInput
}): Promise<ExperimentalReviewItemProposal> {
	const normalizedProposal: SubmitExperimentalItemProposalInput = {
		...input.proposal,
		proposedStem: normalizeText(input.proposal.proposedStem),
		proposedExplanation: normalizeText(input.proposal.proposedExplanation),
		rationale: normalizeText(input.proposal.rationale),
		proposedCorrectAnswer: normalizeText(input.proposal.proposedCorrectAnswer)
	}
	const parsed = proposalInputSchema.safeParse(normalizedProposal)
	if (!parsed.success) {
		logger.error(
			{ issues: parsed.error.issues, userId: input.userId },
			"submitExperimentalItemProposal: input invalid"
		)
		throw errors.wrap(ErrExperimentalProposalInputInvalid, "submitExperimentalItemProposal")
	}
	const proposal = parsed.data
	if (!hasProposalContent(proposal)) {
		logger.warn(
			{
				userId: input.userId,
				experimentalSessionId: proposal.experimentalSessionId,
				experimentalAttemptId: proposal.experimentalAttemptId
			},
			"submitExperimentalItemProposal: empty proposal rejected"
		)
		throw errors.wrap(ErrExperimentalProposalEmpty, "submitExperimentalItemProposal")
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
					eq(experimentalAttempts.id, proposal.experimentalAttemptId),
					eq(experimentalAttempts.experimentalItemId, proposal.experimentalItemId),
					eq(experimentalSessions.id, proposal.experimentalSessionId),
					eq(experimentalSessions.userId, input.userId),
					isNotNull(experimentalSessions.endedAtMs),
					eq(experimentalSessions.completionReason, "completed")
				)
			)
			.limit(1)
	)
	if (targetResult.error) {
		logger.error(
			{ error: targetResult.error, userId: input.userId, proposal },
			"submitExperimentalItemProposal: ownership query failed"
		)
		throw errors.wrap(targetResult.error, "submitExperimentalItemProposal target")
	}
	const targetRow = targetResult.data[0]
	if (!targetRow) {
		logger.warn(
			{ userId: input.userId, proposal },
			"submitExperimentalItemProposal: target not found or not owned"
		)
		throw errors.wrap(ErrExperimentalProposalTargetNotFound, "submitExperimentalItemProposal")
	}
	validateProposedAnswerFields(proposal)
	const proposedOptions = proposal.proposedOptions
	const proposedCorrectAnswer = proposal.proposedCorrectAnswer
	const existingResult = await errors.try(
		db
			.select({ id: itemEditProposals.id })
			.from(itemEditProposals)
			.where(
				and(
					eq(itemEditProposals.userId, input.userId),
					eq(itemEditProposals.experimentalItemId, proposal.experimentalItemId)
				)
			)
			.orderBy(desc(itemEditProposals.submittedAtMs), desc(itemEditProposals.id))
			.limit(1)
	)
	if (existingResult.error) {
		logger.error(
			{ error: existingResult.error, userId: input.userId, proposal },
			"submitExperimentalItemProposal: existing proposal query failed"
		)
		throw errors.wrap(existingResult.error, "submitExperimentalItemProposal existing")
	}
	const existing = existingResult.data[0]
	const values = {
		experimentalItemId: proposal.experimentalItemId,
		userId: input.userId,
		proposedBody:
			proposal.proposedStem === undefined ? null : { kind: "text", text: proposal.proposedStem },
		proposedOptionsJson: proposedOptions === undefined ? null : proposedOptions,
		proposedCorrectAnswer: proposedCorrectAnswer,
		proposedExplanation: proposal.proposedExplanation,
		suggestedSubject: proposal.suggestedSubject,
		suggestedDifficulty: proposal.suggestedDifficulty,
		rationale: proposal.rationale,
		submittedAtMs: Date.now()
	}
	const writeResult =
		existing === undefined
			? await errors.try(
				db
					.insert(itemEditProposals)
					.values(values)
					.returning({
						id: itemEditProposals.id,
						proposedBody: itemEditProposals.proposedBody,
						proposedOptionsJson: itemEditProposals.proposedOptionsJson,
						proposedCorrectAnswer: itemEditProposals.proposedCorrectAnswer,
						proposedExplanation: itemEditProposals.proposedExplanation,
						suggestedSubject: itemEditProposals.suggestedSubject,
						suggestedDifficulty: itemEditProposals.suggestedDifficulty,
						rationale: itemEditProposals.rationale,
						submittedAtMs: itemEditProposals.submittedAtMs
					})
			)
			: await errors.try(
				db
					.update(itemEditProposals)
					.set(values)
					.where(eq(itemEditProposals.id, existing.id))
					.returning({
						id: itemEditProposals.id,
						proposedBody: itemEditProposals.proposedBody,
						proposedOptionsJson: itemEditProposals.proposedOptionsJson,
						proposedCorrectAnswer: itemEditProposals.proposedCorrectAnswer,
						proposedExplanation: itemEditProposals.proposedExplanation,
						suggestedSubject: itemEditProposals.suggestedSubject,
						suggestedDifficulty: itemEditProposals.suggestedDifficulty,
						rationale: itemEditProposals.rationale,
						submittedAtMs: itemEditProposals.submittedAtMs
					})
			)
	if (writeResult.error) {
		logger.error(
			{ error: writeResult.error, userId: input.userId, proposal },
			"submitExperimentalItemProposal: write failed"
		)
		throw errors.wrap(writeResult.error, "submitExperimentalItemProposal write")
	}
	const saved = writeResult.data[0]
	if (!saved) {
		logger.error(
			{ userId: input.userId, proposal },
			"submitExperimentalItemProposal: write returned no rows"
		)
		throw errors.new("submitExperimentalItemProposal: write returned no rows")
	}
	return mapProposalRecord(saved)
}

export type { SubmitExperimentalItemProposalInput }
export { mapProposalRecord, submitExperimentalItemProposal }
