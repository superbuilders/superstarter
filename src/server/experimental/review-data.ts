import * as errors from "@superbuilders/errors"
import { and, desc, eq, inArray, isNotNull, sql } from "drizzle-orm"
import { z } from "zod"
import { db } from "@/db"
import { itemAudits } from "@/db/schemas/experimental/item-audits"
import { itemEditProposals } from "@/db/schemas/experimental/item-edit-proposals"
import { experimentalAttempts } from "@/db/schemas/experimental/experimental-attempts"
import { experimentalItems } from "@/db/schemas/experimental/experimental-items"
import { experimentalSessions } from "@/db/schemas/experimental/experimental-sessions"
import { logger } from "@/logger"
import { bodyText, itemBody } from "@/server/items/body-schema"

const UUID_V4_OR_V7 = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

const optionsJsonSchema = z
	.array(
		z.object({
			id: z.string().min(1),
			text: z.string().min(1)
		})
	)
	.min(2)
	.max(5)

type ExperimentalReviewSessionType = "practice_test" | "drill" | "review"
type ExperimentalReviewCompletionReason = "completed" | "abandoned"
type ExperimentalReviewDifficulty = "easy" | "medium" | "hard" | "brutal"

interface ExperimentalReviewSession {
	id: string
	type: ExperimentalReviewSessionType
	subTypeId?: string
	startedAtMs: number
	endedAtMs: number
	completionReason?: ExperimentalReviewCompletionReason
	targetQuestionCount: number
	durationMinutes?: number
	totalAttempts: number
	correctAttempts: number
	skippedAttempts: number
}

interface ExperimentalReviewPageData {
	sessions: ReadonlyArray<ExperimentalReviewSession>
}

interface ExperimentalReviewItemAudit {
	id: string
	makesSense?: boolean
	correctAnswerIsRight?: boolean
	subjectTagIsRight?: boolean
	difficultyIsRight?: boolean
	suggestedSubject?: string
	suggestedDifficulty?: ExperimentalReviewDifficulty
	notes?: string
	submittedAtMs: number
}

interface ExperimentalReviewItemProposal {
	id: string
	proposedStem?: string
	proposedOptions?: ReadonlyArray<{ id: string; text: string }>
	proposedCorrectAnswer?: string
	proposedExplanation?: string
	suggestedSubject?: string
	suggestedDifficulty?: ExperimentalReviewDifficulty
	rationale?: string
	submittedAtMs: number
}

interface ExperimentalReviewItem {
	attemptId: string
	experimentalItemId: string
	subTypeId: string
	difficulty: ExperimentalReviewDifficulty
	correct: boolean
	latencyMs: number
	prompt: string
	options: ReadonlyArray<{ id: string; text: string }>
	selectedAnswer?: string
	selectedAnswerText?: string
	correctAnswer: string
	correctAnswerText: string
	explanation?: string
	audit?: ExperimentalReviewItemAudit
	proposal?: ExperimentalReviewItemProposal
}

interface ExperimentalReviewSessionDetail {
	session: ExperimentalReviewSession
	items: ReadonlyArray<ExperimentalReviewItem>
}

type ReviewSessionRow = {
	id: string
	type: ExperimentalReviewSessionType
	subTypeId: string | null
	startedAtMs: number
	endedAtMs: number | null
	completionReason: ExperimentalReviewCompletionReason | null
	targetQuestionCount: number
	metadataJson: unknown
	totalAttempts: number
	correctAttempts: number
	skippedAttempts: number
}

type ReviewItemRow = {
	attemptId: string
	experimentalItemId: string
	subTypeId: string
	difficulty: ExperimentalReviewDifficulty
	correct: boolean
	latencyMs: number
	selectedAnswer: string | null
	correctAnswer: string
	body: unknown
	optionsJson: unknown
	explanation: string | null
}

type ReviewAuditRow = {
	id: string
	experimentalAttemptId: string | null
	makesSense: boolean | null
	correctAnswerIsRight: boolean | null
	subjectTagIsRight: boolean | null
	difficultyIsRight: boolean | null
	suggestedSubject: string | null
	suggestedDifficulty: ExperimentalReviewDifficulty | null
	notes: string | null
	submittedAtMs: number
}

type ReviewProposalRow = {
	id: string
	experimentalItemId: string
	proposedBody: unknown
	proposedOptionsJson: unknown
	proposedCorrectAnswer: string | null
	proposedExplanation: string | null
	suggestedSubject: string | null
	suggestedDifficulty: ExperimentalReviewDifficulty | null
	rationale: string | null
	submittedAtMs: number
}

const experimentalSessionMetadataSchema = z
	.object({
		durationMinutes: z.number().int().positive().optional()
	})
	.passthrough()

function maybeUndefined<T>(value: T | null): T | undefined {
	if (value === null) return undefined
	return value
}

function mapReviewSessionRow(row: ReviewSessionRow): ExperimentalReviewSession | null {
	if (row.endedAtMs === null) return null
	const metadata = experimentalSessionMetadataSchema.safeParse(row.metadataJson)
	return {
		id: row.id,
		type: row.type,
		subTypeId: maybeUndefined(row.subTypeId),
		startedAtMs: row.startedAtMs,
		endedAtMs: row.endedAtMs,
		completionReason: maybeUndefined(row.completionReason),
		targetQuestionCount: row.targetQuestionCount,
		durationMinutes: metadata.success ? metadata.data.durationMinutes : undefined,
		totalAttempts: row.totalAttempts,
		correctAttempts: row.correctAttempts,
		skippedAttempts: row.skippedAttempts
	}
}

function mapReviewAuditRow(row: ReviewAuditRow): {
	experimentalAttemptId: string
	audit: ExperimentalReviewItemAudit
} | null {
	const experimentalAttemptId = row.experimentalAttemptId
	if (experimentalAttemptId === null) return null
	return {
		experimentalAttemptId,
		audit: {
			id: row.id,
			makesSense: maybeUndefined(row.makesSense),
			correctAnswerIsRight: maybeUndefined(row.correctAnswerIsRight),
			subjectTagIsRight: maybeUndefined(row.subjectTagIsRight),
			difficultyIsRight: maybeUndefined(row.difficultyIsRight),
			suggestedSubject: maybeUndefined(row.suggestedSubject),
			suggestedDifficulty: maybeUndefined(row.suggestedDifficulty),
			notes: maybeUndefined(row.notes),
			submittedAtMs: row.submittedAtMs
		}
	}
}

function mapReviewProposalRow(row: ReviewProposalRow): {
	experimentalItemId: string
	proposal: ExperimentalReviewItemProposal
} {
	let proposedStem: string | undefined
	const parsedBody = bodyText.safeParse(row.proposedBody)
	if (parsedBody.success) {
		proposedStem = parsedBody.data.text
	}
	let proposedOptions: ReadonlyArray<{ id: string; text: string }> | undefined
	const parsedOptions = optionsJsonSchema.safeParse(row.proposedOptionsJson)
	if (parsedOptions.success) {
		proposedOptions = parsedOptions.data
	}
	return {
		experimentalItemId: row.experimentalItemId,
		proposal: {
			id: row.id,
			proposedStem,
			proposedOptions,
			proposedCorrectAnswer: maybeUndefined(row.proposedCorrectAnswer),
			proposedExplanation: maybeUndefined(row.proposedExplanation),
			suggestedSubject: maybeUndefined(row.suggestedSubject),
			suggestedDifficulty: maybeUndefined(row.suggestedDifficulty),
			rationale: maybeUndefined(row.rationale),
			submittedAtMs: row.submittedAtMs
		}
	}
}

function resolveOptionText(
	options: ReadonlyArray<{ id: string; text: string }>,
	optionId: string
): string {
	const option = options.find(function findOption(candidate) {
		return candidate.id === optionId
	})
	if (option === undefined) return optionId
	return option.text
}

function mapReviewItemRow(input: {
	row: ReviewItemRow
	sessionId: string
	auditByAttemptId: ReadonlyMap<string, ExperimentalReviewItemAudit>
}): ExperimentalReviewItem {
	const parsedBody = itemBody.safeParse(input.row.body)
	if (!parsedBody.success) {
		logger.error(
			{
				sessionId: input.sessionId,
				experimentalItemId: input.row.experimentalItemId,
				issues: parsedBody.error.issues
			},
			"loadExperimentalReviewSessionDetail: invalid item body"
		)
		throw errors.wrap(parsedBody.error, "loadExperimentalReviewSessionDetail item body")
	}
	const parsedOptions = optionsJsonSchema.safeParse(input.row.optionsJson)
	if (!parsedOptions.success) {
		logger.error(
			{
				sessionId: input.sessionId,
				experimentalItemId: input.row.experimentalItemId,
				issues: parsedOptions.error.issues
			},
			"loadExperimentalReviewSessionDetail: invalid item options"
		)
		throw errors.wrap(parsedOptions.error, "loadExperimentalReviewSessionDetail item options")
	}
	const options = parsedOptions.data
	const correctAnswerText = resolveOptionText(options, input.row.correctAnswer)
	const selectedAnswer = maybeUndefined(input.row.selectedAnswer)
	let selectedAnswerText: string | undefined
	if (selectedAnswer !== undefined) {
		selectedAnswerText = resolveOptionText(options, selectedAnswer)
	}
	return {
		attemptId: input.row.attemptId,
		experimentalItemId: input.row.experimentalItemId,
		subTypeId: input.row.subTypeId,
		difficulty: input.row.difficulty,
		correct: input.row.correct,
		latencyMs: input.row.latencyMs,
		prompt: parsedBody.data.text,
		options,
		selectedAnswer,
		selectedAnswerText,
		correctAnswer: input.row.correctAnswer,
		correctAnswerText,
		explanation: maybeUndefined(input.row.explanation),
		audit: input.auditByAttemptId.get(input.row.attemptId)
	}
}

async function loadExperimentalReviewSessions(
	userId: string
): Promise<ReadonlyArray<ExperimentalReviewSession>> {
	const result = await errors.try(
		db
			.select({
				id: experimentalSessions.id,
				type: experimentalSessions.type,
				subTypeId: experimentalSessions.subTypeId,
				startedAtMs: experimentalSessions.startedAtMs,
				endedAtMs: experimentalSessions.endedAtMs,
				completionReason: experimentalSessions.completionReason,
				targetQuestionCount: experimentalSessions.targetQuestionCount,
				metadataJson: experimentalSessions.metadataJson,
				totalAttempts: sql<number>`COUNT(${experimentalAttempts.id})::int`,
				correctAttempts: sql<number>`COALESCE(SUM(CASE WHEN ${experimentalAttempts.correct} THEN 1 ELSE 0 END), 0)::int`,
				skippedAttempts: sql<number>`COALESCE(SUM(CASE WHEN ${experimentalAttempts.id} IS NOT NULL AND ${experimentalAttempts.selectedAnswer} IS NULL THEN 1 ELSE 0 END), 0)::int`
			})
			.from(experimentalSessions)
			.leftJoin(experimentalAttempts, eq(experimentalAttempts.sessionId, experimentalSessions.id))
			.where(
				and(
					eq(experimentalSessions.userId, userId),
					isNotNull(experimentalSessions.endedAtMs),
					eq(experimentalSessions.completionReason, "completed")
				)
			)
			.groupBy(experimentalSessions.id)
			.orderBy(desc(experimentalSessions.id))
	)
	if (result.error) {
		logger.error({ error: result.error, userId }, "loadExperimentalReviewSessions: query failed")
		throw errors.wrap(result.error, "loadExperimentalReviewSessions")
	}
	return result.data.flatMap(function normalize(row): ExperimentalReviewSession[] {
		const mapped = mapReviewSessionRow(row)
		if (mapped === null) return []
		return [mapped]
	})
}

async function loadExperimentalReviewPageData(userId: string): Promise<ExperimentalReviewPageData> {
	const sessions = await loadExperimentalReviewSessions(userId)
	return { sessions }
}

async function loadReviewSessionRow(
	userId: string,
	sessionId: string
): Promise<ReviewSessionRow | null> {
	const result = await errors.try(
		db
			.select({
				id: experimentalSessions.id,
				type: experimentalSessions.type,
				subTypeId: experimentalSessions.subTypeId,
				startedAtMs: experimentalSessions.startedAtMs,
				endedAtMs: experimentalSessions.endedAtMs,
				completionReason: experimentalSessions.completionReason,
				targetQuestionCount: experimentalSessions.targetQuestionCount,
				metadataJson: experimentalSessions.metadataJson,
				totalAttempts: sql<number>`COUNT(${experimentalAttempts.id})::int`,
				correctAttempts: sql<number>`COALESCE(SUM(CASE WHEN ${experimentalAttempts.correct} THEN 1 ELSE 0 END), 0)::int`,
				skippedAttempts: sql<number>`COALESCE(SUM(CASE WHEN ${experimentalAttempts.id} IS NOT NULL AND ${experimentalAttempts.selectedAnswer} IS NULL THEN 1 ELSE 0 END), 0)::int`
			})
			.from(experimentalSessions)
			.leftJoin(experimentalAttempts, eq(experimentalAttempts.sessionId, experimentalSessions.id))
			.where(
				and(
					eq(experimentalSessions.id, sessionId),
					eq(experimentalSessions.userId, userId),
					isNotNull(experimentalSessions.endedAtMs),
					eq(experimentalSessions.completionReason, "completed")
				)
			)
			.groupBy(experimentalSessions.id)
			.limit(1)
	)
	if (result.error) {
		logger.error(
			{ error: result.error, userId, sessionId },
			"loadExperimentalReviewSessionDetail: session query failed"
		)
		throw errors.wrap(result.error, "loadExperimentalReviewSessionDetail session")
	}
	const row = result.data[0]
	if (row === undefined) return null
	return row
}

async function loadReviewItemRows(sessionId: string, userId: string): Promise<ReadonlyArray<ReviewItemRow>> {
	const result = await errors.try(
		db
			.select({
				attemptId: experimentalAttempts.id,
				experimentalItemId: experimentalItems.id,
				subTypeId: experimentalItems.subTypeId,
				difficulty: experimentalItems.difficulty,
				correct: experimentalAttempts.correct,
				latencyMs: experimentalAttempts.latencyMs,
				selectedAnswer: experimentalAttempts.selectedAnswer,
				correctAnswer: experimentalItems.correctAnswer,
				body: experimentalItems.body,
				optionsJson: experimentalItems.optionsJson,
				explanation: experimentalItems.explanation
			})
			.from(experimentalAttempts)
			.innerJoin(experimentalItems, eq(experimentalAttempts.experimentalItemId, experimentalItems.id))
			.where(eq(experimentalAttempts.sessionId, sessionId))
			.orderBy(experimentalAttempts.id)
	)
	if (result.error) {
		logger.error(
			{ error: result.error, userId, sessionId },
			"loadExperimentalReviewSessionDetail: items query failed"
		)
		throw errors.wrap(result.error, "loadExperimentalReviewSessionDetail items")
	}
	return result.data
}

async function loadReviewAuditMap(
	userId: string,
	sessionId: string
): Promise<ReadonlyMap<string, ExperimentalReviewItemAudit>> {
	const result = await errors.try(
		db
			.select({
				id: itemAudits.id,
				experimentalAttemptId: itemAudits.experimentalAttemptId,
				makesSense: itemAudits.makesSense,
				correctAnswerIsRight: itemAudits.correctAnswerIsRight,
				subjectTagIsRight: itemAudits.subjectTagIsRight,
				difficultyIsRight: itemAudits.difficultyIsRight,
				suggestedSubject: itemAudits.suggestedSubject,
				suggestedDifficulty: itemAudits.suggestedDifficulty,
				notes: itemAudits.notes,
				submittedAtMs: itemAudits.submittedAtMs
			})
			.from(itemAudits)
			.where(
				and(eq(itemAudits.userId, userId), eq(itemAudits.experimentalSessionId, sessionId))
			)
			.orderBy(desc(itemAudits.submittedAtMs), desc(itemAudits.id))
	)
	if (result.error) {
		logger.error(
			{ error: result.error, userId, sessionId },
			"loadExperimentalReviewSessionDetail: audits query failed"
		)
		throw errors.wrap(result.error, "loadExperimentalReviewSessionDetail audits")
	}
	const auditByAttemptId = new Map<string, ExperimentalReviewItemAudit>()
	for (const row of result.data) {
		const mapped = mapReviewAuditRow(row)
		if (mapped === null) continue
		if (auditByAttemptId.has(mapped.experimentalAttemptId)) continue
		auditByAttemptId.set(mapped.experimentalAttemptId, mapped.audit)
	}
	return auditByAttemptId
}

async function loadReviewProposalMap(
	userId: string,
	itemIds: ReadonlyArray<string>
): Promise<ReadonlyMap<string, ExperimentalReviewItemProposal>> {
	if (itemIds.length === 0) return new Map()
	const result = await errors.try(
		db
			.select({
				id: itemEditProposals.id,
				experimentalItemId: itemEditProposals.experimentalItemId,
				proposedBody: itemEditProposals.proposedBody,
				proposedOptionsJson: itemEditProposals.proposedOptionsJson,
				proposedCorrectAnswer: itemEditProposals.proposedCorrectAnswer,
				proposedExplanation: itemEditProposals.proposedExplanation,
				suggestedSubject: itemEditProposals.suggestedSubject,
				suggestedDifficulty: itemEditProposals.suggestedDifficulty,
				rationale: itemEditProposals.rationale,
				submittedAtMs: itemEditProposals.submittedAtMs
			})
			.from(itemEditProposals)
			.where(
				and(eq(itemEditProposals.userId, userId), inArray(itemEditProposals.experimentalItemId, [...itemIds]))
			)
			.orderBy(desc(itemEditProposals.submittedAtMs), desc(itemEditProposals.id))
	)
	if (result.error) {
		logger.error(
			{ error: result.error, userId, itemIds },
			"loadExperimentalReviewSessionDetail: proposals query failed"
		)
		throw errors.wrap(result.error, "loadExperimentalReviewSessionDetail proposals")
	}
	const proposalByItemId = new Map<string, ExperimentalReviewItemProposal>()
	for (const row of result.data) {
		const mapped = mapReviewProposalRow(row)
		if (proposalByItemId.has(mapped.experimentalItemId)) continue
		proposalByItemId.set(mapped.experimentalItemId, mapped.proposal)
	}
	return proposalByItemId
}

async function loadExperimentalReviewSessionDetail(
	userId: string,
	sessionId: string
): Promise<ExperimentalReviewSessionDetail | null> {
	if (!UUID_V4_OR_V7.test(sessionId)) return null
	const sessionRow = await loadReviewSessionRow(userId, sessionId)
	if (sessionRow === null) return null
	const session = mapReviewSessionRow(sessionRow)
	if (session === null) return null
	const itemRows = await loadReviewItemRows(sessionId, userId)
	const itemIds = itemRows.map(function mapItemId(row) {
		return row.experimentalItemId
	})
	const [auditByAttemptId, proposalByItemId] = await Promise.all([
		loadReviewAuditMap(userId, sessionId),
		loadReviewProposalMap(userId, itemIds)
	])
	const items = itemRows.map(function mapRow(row): ExperimentalReviewItem {
		const item = mapReviewItemRow({ row, sessionId, auditByAttemptId })
		return { ...item, proposal: proposalByItemId.get(row.experimentalItemId) }
	})
	return { session, items }
}

async function loadExperimentalAuditPageData(
	userId: string
): Promise<ExperimentalReviewPageData> {
	return loadExperimentalReviewPageData(userId)
}

async function loadExperimentalAuditSessionDetail(
	userId: string,
	sessionId: string
): Promise<ExperimentalReviewSessionDetail | null> {
	return loadExperimentalReviewSessionDetail(userId, sessionId)
}

export type {
	ExperimentalReviewItem,
	ExperimentalReviewItemAudit,
	ExperimentalReviewItemProposal,
	ExperimentalReviewPageData,
	ExperimentalReviewSession,
	ExperimentalReviewSessionDetail,
	ExperimentalReviewSessionType
}
export {
	loadExperimentalAuditPageData,
	loadExperimentalAuditSessionDetail,
	loadExperimentalReviewPageData,
	loadExperimentalReviewSessionDetail
}
