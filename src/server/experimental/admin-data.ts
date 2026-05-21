import * as errors from "@superbuilders/errors"
import { desc, eq, sql } from "drizzle-orm"
import { connection } from "next/server"
import { z } from "zod"
import { subTypes } from "@/config/sub-types"
import { db } from "@/db"
import { users } from "@/db/schemas/auth/users"
import { experimentalItems } from "@/db/schemas/experimental/experimental-items"
import { itemAudits } from "@/db/schemas/experimental/item-audits"
import { itemEditProposals } from "@/db/schemas/experimental/item-edit-proposals"
import { itemRevisionDecisions } from "@/db/schemas/experimental/item-revision-decisions"
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

type ExperimentalAdminDifficulty = "easy" | "medium" | "hard" | "brutal"
type ExperimentalAdminAuditStatus = "unaudited" | "approved" | "rejected" | "needs_revision"
type ExperimentalAdminDecisionType =
	| "approve_as_is"
	| "approve_edit"
	| "reject"
	| "needs_revision"
	| "hide"

interface ExperimentalAdminQueueItem {
	id: string
	subTypeId: string
	difficulty: ExperimentalAdminDifficulty
	auditStatus: ExperimentalAdminAuditStatus
	hiddenAtMs?: number
	sourceVersion: number
	parentExperimentalItemId?: string
	promotedItemId?: string
	createdAtMs: number
	updatedAtMs: number
	promptPreview: string
	auditCount: number
	proposalCount: number
	decisionCount: number
	latestAuditAtMs?: number
	latestProposalAtMs?: number
	latestDecisionAtMs?: number
}

interface ExperimentalAdminQueueSection {
	key: "pending" | "approved" | "rejected" | "hidden"
	title: string
	description: string
	items: ReadonlyArray<ExperimentalAdminQueueItem>
}

interface ExperimentalAdminQueueData {
	sections: ReadonlyArray<ExperimentalAdminQueueSection>
	totals: {
		pending: number
		approved: number
		rejected: number
		hidden: number
	}
}

interface ExperimentalAdminAuditBooleanSummary {
	yes: number
	no: number
	blank: number
}

interface ExperimentalAdminAuditNote {
	id: string
	userEmail: string
	notes: string
	submittedAtMs: number
}

interface ExperimentalAdminAuditAggregate {
	totalAudits: number
	notesCount: number
	makesSense: ExperimentalAdminAuditBooleanSummary
	correctAnswerIsRight: ExperimentalAdminAuditBooleanSummary
	subjectTagIsRight: ExperimentalAdminAuditBooleanSummary
	difficultyIsRight: ExperimentalAdminAuditBooleanSummary
	suggestedSubjects: ReadonlyArray<{ subTypeId: string; count: number }>
	suggestedDifficulties: ReadonlyArray<{ difficulty: ExperimentalAdminDifficulty; count: number }>
	notes: ReadonlyArray<ExperimentalAdminAuditNote>
}

interface ExperimentalAdminProposal {
	id: string
	userEmail: string
	proposedStem?: string
	proposedOptions?: ReadonlyArray<{ id: string; text: string }>
	proposedCorrectAnswer?: string
	proposedExplanation?: string
	suggestedSubject?: string
	suggestedDifficulty?: ExperimentalAdminDifficulty
	rationale?: string
	submittedAtMs: number
}

interface ExperimentalAdminDecisionHistoryEntry {
	id: string
	decision: ExperimentalAdminDecisionType
	adminEmail: string
	proposalId?: string
	decisionNotes?: string
	promotedItemId?: string
	actedAtMs: number
}

interface ExperimentalAdminItemSummary {
	id: string
	subTypeId: string
	difficulty: ExperimentalAdminDifficulty
	auditStatus: ExperimentalAdminAuditStatus
	hiddenAtMs?: number
	sourceVersion: number
	parentExperimentalItemId?: string
	promotedItemId?: string
	createdByUserId?: string
	createdAtMs: number
	updatedAtMs: number
	prompt: string
	options: ReadonlyArray<{ id: string; text: string }>
	correctAnswer: string
	correctAnswerText: string
	explanation?: string
}

interface ExperimentalAdminParentSummary {
	id: string
	prompt: string
}

interface ExperimentalAdminItemDetail {
	item: ExperimentalAdminItemSummary
	parentItem?: ExperimentalAdminParentSummary
	auditAggregate: ExperimentalAdminAuditAggregate
	proposals: ReadonlyArray<ExperimentalAdminProposal>
	decisions: ReadonlyArray<ExperimentalAdminDecisionHistoryEntry>
}

type QueueRow = {
	id: string
	subTypeId: string
	difficulty: ExperimentalAdminDifficulty
	auditStatus: ExperimentalAdminAuditStatus
	hiddenAtMs: number | null
	sourceVersion: number
	parentExperimentalItemId: string | null
	promotedItemId: string | null
	createdAtMs: number
	updatedAtMs: number
	body: unknown
	auditCount: number
	proposalCount: number
	decisionCount: number
	latestAuditAtMs: number | null
	latestProposalAtMs: number | null
	latestDecisionAtMs: number | null
}

type AuditRow = {
	id: string
	userEmail: string
	makesSense: boolean | null
	correctAnswerIsRight: boolean | null
	subjectTagIsRight: boolean | null
	difficultyIsRight: boolean | null
	suggestedSubject: string | null
	suggestedDifficulty: ExperimentalAdminDifficulty | null
	notes: string | null
	submittedAtMs: number
}

function maybeUndefined<T>(value: T | null): T | undefined {
	if (value === null) return undefined
	return value
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

function parsePrompt(body: unknown, context: { itemId: string; source: string }): string {
	const parsedBody = itemBody.safeParse(body)
	if (!parsedBody.success) {
		logger.error({ ...context, issues: parsedBody.error.issues }, "admin-data: invalid item body")
		throw errors.wrap(parsedBody.error, `${context.source} body parse`)
	}
	return parsedBody.data.text
}

function parseOptions(
	optionsJson: unknown,
	context: { itemId: string; source: string }
): ReadonlyArray<{ id: string; text: string }> {
	const parsedOptions = optionsJsonSchema.safeParse(optionsJson)
	if (!parsedOptions.success) {
		logger.error(
			{ ...context, issues: parsedOptions.error.issues },
			"admin-data: invalid item options"
		)
		throw errors.wrap(parsedOptions.error, `${context.source} options parse`)
	}
	return parsedOptions.data
}

function summarizeBoolean(
	rows: ReadonlyArray<AuditRow>,
	pick: (row: AuditRow) => boolean | null
): ExperimentalAdminAuditBooleanSummary {
	const summary: ExperimentalAdminAuditBooleanSummary = { yes: 0, no: 0, blank: 0 }
	for (const row of rows) {
		const value = pick(row)
		if (value === true) {
			summary.yes += 1
			continue
		}
		if (value === false) {
			summary.no += 1
			continue
		}
		summary.blank += 1
	}
	return summary
}

function frequencyEntries<T extends string>(values: ReadonlyArray<T>): ReadonlyArray<{ value: T; count: number }> {
	const counts = new Map<T, number>()
	for (const value of values) {
		const currentCount = counts.get(value)
		if (currentCount === undefined) {
			counts.set(value, 1)
			continue
		}
		counts.set(value, currentCount + 1)
	}
	return Array.from(counts.entries())
		.map(function mapEntry([value, count]) {
			return { value, count }
		})
		.sort(function sortDescending(a, b) {
			if (b.count !== a.count) return b.count - a.count
			return String(a.value).localeCompare(String(b.value))
		})
}

function mapQueueRow(row: QueueRow): ExperimentalAdminQueueItem {
	const promptPreview = parsePrompt(row.body, {
		itemId: row.id,
		source: "loadExperimentalAdminQueueData"
	})
	return {
		id: row.id,
		subTypeId: row.subTypeId,
		difficulty: row.difficulty,
		auditStatus: row.auditStatus,
		hiddenAtMs: maybeUndefined(row.hiddenAtMs),
		sourceVersion: row.sourceVersion,
		parentExperimentalItemId: maybeUndefined(row.parentExperimentalItemId),
		promotedItemId: maybeUndefined(row.promotedItemId),
		createdAtMs: row.createdAtMs,
		updatedAtMs: row.updatedAtMs,
		promptPreview,
		auditCount: row.auditCount,
		proposalCount: row.proposalCount,
		decisionCount: row.decisionCount,
		latestAuditAtMs: maybeUndefined(row.latestAuditAtMs),
		latestProposalAtMs: maybeUndefined(row.latestProposalAtMs),
		latestDecisionAtMs: maybeUndefined(row.latestDecisionAtMs)
	}
}

function activityMs(row: ExperimentalAdminQueueItem): number {
	if (row.latestDecisionAtMs !== undefined) return row.latestDecisionAtMs
	if (row.latestProposalAtMs !== undefined) return row.latestProposalAtMs
	if (row.latestAuditAtMs !== undefined) return row.latestAuditAtMs
	return row.updatedAtMs
}

function sortQueueRows(rows: ReadonlyArray<ExperimentalAdminQueueItem>): ReadonlyArray<ExperimentalAdminQueueItem> {
	return [...rows].sort(function compare(a, b) {
		const activityDelta = activityMs(b) - activityMs(a)
		if (activityDelta !== 0) return activityDelta
		return b.createdAtMs - a.createdAtMs
	})
}

async function loadExperimentalAdminQueueData(): Promise<ExperimentalAdminQueueData> {
	await connection()
	const queryResult = await errors.try(
		db
			.select({
				id: experimentalItems.id,
				subTypeId: experimentalItems.subTypeId,
				difficulty: experimentalItems.difficulty,
				auditStatus: experimentalItems.auditStatus,
				hiddenAtMs: experimentalItems.hiddenAtMs,
				sourceVersion: experimentalItems.sourceVersion,
				parentExperimentalItemId: experimentalItems.parentExperimentalItemId,
				promotedItemId: experimentalItems.promotedItemId,
				createdAtMs: experimentalItems.createdAtMs,
				updatedAtMs: experimentalItems.updatedAtMs,
				body: experimentalItems.body,
				auditCount:
					sql<number>`(select count(*)::int from ${itemAudits} where ${itemAudits.experimentalItemId} = ${experimentalItems.id})`,
				proposalCount:
					sql<number>`(select count(*)::int from ${itemEditProposals} where ${itemEditProposals.experimentalItemId} = ${experimentalItems.id})`,
				decisionCount:
					sql<number>`(select count(*)::int from ${itemRevisionDecisions} where ${itemRevisionDecisions.experimentalItemId} = ${experimentalItems.id})`,
				latestAuditAtMs:
					sql<number | null>`(select max(${itemAudits.submittedAtMs}) from ${itemAudits} where ${itemAudits.experimentalItemId} = ${experimentalItems.id})`,
				latestProposalAtMs:
					sql<number | null>`(select max(${itemEditProposals.submittedAtMs}) from ${itemEditProposals} where ${itemEditProposals.experimentalItemId} = ${experimentalItems.id})`,
				latestDecisionAtMs:
					sql<number | null>`(select max(${itemRevisionDecisions.actedAtMs}) from ${itemRevisionDecisions} where ${itemRevisionDecisions.experimentalItemId} = ${experimentalItems.id})`
			})
			.from(experimentalItems)
			.orderBy(desc(experimentalItems.updatedAtMs), desc(experimentalItems.createdAtMs))
	)
	if (queryResult.error) {
		logger.error({ error: queryResult.error }, "loadExperimentalAdminQueueData: query failed")
		throw errors.wrap(queryResult.error, "loadExperimentalAdminQueueData")
	}

	const pending: ExperimentalAdminQueueItem[] = []
	const approved: ExperimentalAdminQueueItem[] = []
	const rejected: ExperimentalAdminQueueItem[] = []
	const hidden: ExperimentalAdminQueueItem[] = []

	for (const row of queryResult.data) {
		const mapped = mapQueueRow(row)
		if (mapped.hiddenAtMs !== undefined) {
			hidden.push(mapped)
			continue
		}
		if (mapped.auditStatus === "approved") {
			approved.push(mapped)
			continue
		}
		if (mapped.auditStatus === "rejected") {
			rejected.push(mapped)
			continue
		}
		pending.push(mapped)
	}

	return {
		sections: [
			{
				key: "pending",
				title: "Pending moderation",
				description:
					"Experimental items still awaiting an admin decision, including brand-new items and items sent back for revision.",
				items: sortQueueRows(pending)
			},
			{
				key: "approved",
				title: "Approved experimental items",
				description:
					"Items approved within Experimental. This slice does not promote them into canonical live usage.",
				items: sortQueueRows(approved)
			},
			{
				key: "rejected",
				title: "Rejected experimental items",
				description: "Items admins have explicitly rejected from the Experimental pool.",
				items: sortQueueRows(rejected)
			},
			{
				key: "hidden",
				title: "Hidden from circulation",
				description:
					"Items removed from Experimental circulation without changing their underlying audit outcome.",
				items: sortQueueRows(hidden)
			}
		],
		totals: {
			pending: pending.length,
			approved: approved.length,
			rejected: rejected.length,
			hidden: hidden.length
		}
	}
}

async function loadExperimentalAdminItemDetail(
	itemId: string
): Promise<ExperimentalAdminItemDetail | null> {
	await connection()
	if (!UUID_V4_OR_V7.test(itemId)) return null

	const itemResult = await errors.try(
		db
			.select({
				id: experimentalItems.id,
				subTypeId: experimentalItems.subTypeId,
				difficulty: experimentalItems.difficulty,
				auditStatus: experimentalItems.auditStatus,
				hiddenAtMs: experimentalItems.hiddenAtMs,
				sourceVersion: experimentalItems.sourceVersion,
				parentExperimentalItemId: experimentalItems.parentExperimentalItemId,
				promotedItemId: experimentalItems.promotedItemId,
				createdByUserId: experimentalItems.createdByUserId,
				createdAtMs: experimentalItems.createdAtMs,
				updatedAtMs: experimentalItems.updatedAtMs,
				body: experimentalItems.body,
				optionsJson: experimentalItems.optionsJson,
				correctAnswer: experimentalItems.correctAnswer,
				explanation: experimentalItems.explanation
			})
			.from(experimentalItems)
			.where(eq(experimentalItems.id, itemId))
			.limit(1)
	)
	if (itemResult.error) {
		logger.error({ error: itemResult.error, itemId }, "loadExperimentalAdminItemDetail: item query failed")
		throw errors.wrap(itemResult.error, "loadExperimentalAdminItemDetail item")
	}
	const row = itemResult.data[0]
	if (row === undefined) return null

	const prompt = parsePrompt(row.body, {
		itemId: row.id,
		source: "loadExperimentalAdminItemDetail"
	})
	const options = parseOptions(row.optionsJson, {
		itemId: row.id,
		source: "loadExperimentalAdminItemDetail"
	})
	const item: ExperimentalAdminItemSummary = {
		id: row.id,
		subTypeId: row.subTypeId,
		difficulty: row.difficulty,
		auditStatus: row.auditStatus,
		hiddenAtMs: maybeUndefined(row.hiddenAtMs),
		sourceVersion: row.sourceVersion,
		parentExperimentalItemId: maybeUndefined(row.parentExperimentalItemId),
		promotedItemId: maybeUndefined(row.promotedItemId),
		createdByUserId: maybeUndefined(row.createdByUserId),
		createdAtMs: row.createdAtMs,
		updatedAtMs: row.updatedAtMs,
		prompt,
		options,
		correctAnswer: row.correctAnswer,
		correctAnswerText: resolveOptionText(options, row.correctAnswer),
		explanation: maybeUndefined(row.explanation)
	}

	const [parentResult, auditsResult, proposalsResult, decisionsResult] = await Promise.all([
		row.parentExperimentalItemId === null
			? Promise.resolve<{ data: Array<{ id: string; body: unknown }> }>({ data: [] })
			: errors.try(
					db
						.select({ id: experimentalItems.id, body: experimentalItems.body })
						.from(experimentalItems)
						.where(eq(experimentalItems.id, row.parentExperimentalItemId))
						.limit(1)
				),
		errors.try(
			db
				.select({
					id: itemAudits.id,
					userEmail: users.email,
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
				.innerJoin(users, eq(itemAudits.userId, users.id))
				.where(eq(itemAudits.experimentalItemId, itemId))
				.orderBy(desc(itemAudits.submittedAtMs), desc(itemAudits.id))
		),
		errors.try(
			db
				.select({
					id: itemEditProposals.id,
					userEmail: users.email,
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
				.innerJoin(users, eq(itemEditProposals.userId, users.id))
				.where(eq(itemEditProposals.experimentalItemId, itemId))
				.orderBy(desc(itemEditProposals.submittedAtMs), desc(itemEditProposals.id))
		),
		errors.try(
			db
				.select({
					id: itemRevisionDecisions.id,
					decision: itemRevisionDecisions.decision,
					adminEmail: users.email,
					proposalId: itemRevisionDecisions.proposalId,
					decisionNotes: itemRevisionDecisions.decisionNotes,
					promotedItemId: itemRevisionDecisions.promotedItemId,
					actedAtMs: itemRevisionDecisions.actedAtMs
				})
				.from(itemRevisionDecisions)
				.innerJoin(users, eq(itemRevisionDecisions.actedByUserId, users.id))
				.where(eq(itemRevisionDecisions.experimentalItemId, itemId))
				.orderBy(desc(itemRevisionDecisions.actedAtMs), desc(itemRevisionDecisions.id))
		)
	])

	if ("error" in parentResult && parentResult.error) {
		logger.error(
			{ error: parentResult.error, itemId },
			"loadExperimentalAdminItemDetail: parent query failed"
		)
		throw errors.wrap(parentResult.error, "loadExperimentalAdminItemDetail parent")
	}
	if (auditsResult.error) {
		logger.error(
			{ error: auditsResult.error, itemId },
			"loadExperimentalAdminItemDetail: audits query failed"
		)
		throw errors.wrap(auditsResult.error, "loadExperimentalAdminItemDetail audits")
	}
	if (proposalsResult.error) {
		logger.error(
			{ error: proposalsResult.error, itemId },
			"loadExperimentalAdminItemDetail: proposals query failed"
		)
		throw errors.wrap(proposalsResult.error, "loadExperimentalAdminItemDetail proposals")
	}
	if (decisionsResult.error) {
		logger.error(
			{ error: decisionsResult.error, itemId },
			"loadExperimentalAdminItemDetail: decisions query failed"
		)
		throw errors.wrap(decisionsResult.error, "loadExperimentalAdminItemDetail decisions")
	}

	let parentItem: ExperimentalAdminParentSummary | undefined
	const parentRow = parentResult.data[0]
	if (parentRow !== undefined) {
		parentItem = {
			id: parentRow.id,
			prompt: parsePrompt(parentRow.body, {
				itemId: parentRow.id,
				source: "loadExperimentalAdminItemDetail parent"
			})
		}
	}

	const notes = auditsResult.data.flatMap(function mapNote(row): ExperimentalAdminAuditNote[] {
		if (row.notes === null || row.notes.trim().length === 0) return []
		return [
			{
				id: row.id,
				userEmail: row.userEmail,
				notes: row.notes,
				submittedAtMs: row.submittedAtMs
			}
		]
	})
	const suggestedSubjects = frequencyEntries(
		auditsResult.data.flatMap(function collectSubject(row) {
			return row.suggestedSubject === null ? [] : [row.suggestedSubject]
		})
	).map(function mapSubject(entry) {
		return { subTypeId: entry.value, count: entry.count }
	})
	const suggestedDifficulties = frequencyEntries(
		auditsResult.data.flatMap(function collectDifficulty(row) {
			return row.suggestedDifficulty === null ? [] : [row.suggestedDifficulty]
		})
	).map(function mapDifficulty(entry) {
		return { difficulty: entry.value, count: entry.count }
	})

	const auditAggregate: ExperimentalAdminAuditAggregate = {
		totalAudits: auditsResult.data.length,
		notesCount: notes.length,
		makesSense: summarizeBoolean(auditsResult.data, function pick(row) {
			return row.makesSense
		}),
		correctAnswerIsRight: summarizeBoolean(auditsResult.data, function pick(row) {
			return row.correctAnswerIsRight
		}),
		subjectTagIsRight: summarizeBoolean(auditsResult.data, function pick(row) {
			return row.subjectTagIsRight
		}),
		difficultyIsRight: summarizeBoolean(auditsResult.data, function pick(row) {
			return row.difficultyIsRight
		}),
		suggestedSubjects,
		suggestedDifficulties,
		notes
	}

	const proposals = proposalsResult.data.map(function mapProposal(row): ExperimentalAdminProposal {
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
			id: row.id,
			userEmail: row.userEmail,
			proposedStem,
			proposedOptions,
			proposedCorrectAnswer: maybeUndefined(row.proposedCorrectAnswer),
			proposedExplanation: maybeUndefined(row.proposedExplanation),
			suggestedSubject: maybeUndefined(row.suggestedSubject),
			suggestedDifficulty: maybeUndefined(row.suggestedDifficulty),
			rationale: maybeUndefined(row.rationale),
			submittedAtMs: row.submittedAtMs
		}
	})

	const decisions = decisionsResult.data.map(function mapDecision(
		row
	): ExperimentalAdminDecisionHistoryEntry {
		return {
			id: row.id,
			decision: row.decision,
			adminEmail: row.adminEmail,
			proposalId: maybeUndefined(row.proposalId),
			decisionNotes: maybeUndefined(row.decisionNotes),
			promotedItemId: maybeUndefined(row.promotedItemId),
			actedAtMs: row.actedAtMs
		}
	})

	return { item, parentItem, auditAggregate, proposals, decisions }
}

const subTypeLabelById: ReadonlyMap<string, string> = new Map(
	subTypes.map(function mapSubType(subType) {
		return [subType.id, subType.displayName] as const
	})
)

function displaySubTypeLabel(subTypeId: string): string {
	const label = subTypeLabelById.get(subTypeId)
	if (label === undefined) return subTypeId
	return label
}

export type {
	ExperimentalAdminAuditAggregate,
	ExperimentalAdminDecisionHistoryEntry,
	ExperimentalAdminItemDetail,
	ExperimentalAdminProposal,
	ExperimentalAdminQueueData,
	ExperimentalAdminQueueItem
}
export {
	displaySubTypeLabel,
	loadExperimentalAdminItemDetail,
	loadExperimentalAdminQueueData
}
