import * as errors from "@superbuilders/errors"
import { and, desc, eq, isNotNull, isNull, notInArray, sql } from "drizzle-orm"
import { z } from "zod"
import type { ItemForRender } from "@/components/focus-shell/types"
import { db } from "@/db"
import { experimentalAttempts } from "@/db/schemas/experimental/experimental-attempts"
import { experimentalItems } from "@/db/schemas/experimental/experimental-items"
import { experimentalSessions } from "@/db/schemas/experimental/experimental-sessions"
import { logger } from "@/logger"
import { itemBody } from "@/server/items/body-schema"
import {
	EXPERIMENTAL_PRACTICE_TEST_QUESTIONS,
	EXPERIMENTAL_PRACTICE_TEST_SUBTYPE_MINIMUM
} from "@/server/experimental/practice-test-data"

const ErrExperimentalPracticeTestPoolTooSmall = errors.new(
	"experimental practice-test pool too small"
)
const ErrExperimentalPracticeTestItemBodyInvalid = errors.new(
	"experimental practice-test item body invalid"
)
const ErrExperimentalPracticeTestItemOptionsInvalid = errors.new(
	"experimental practice-test item options invalid"
)
const ErrExperimentalPracticeTestInsertFailed = errors.new(
	"experimental practice-test insert returned no rows"
)

const optionsJsonSchema = z
	.array(
		z.object({
			id: z.string().min(1),
			text: z.string().min(1)
		})
	)
	.min(2)
	.max(5)

type ExperimentalPracticeTestDifficulty = "easy" | "medium" | "hard" | "brutal"

type ExperimentalMixedItemRow = {
	id: string
	subTypeId: string
	body: unknown
	optionsJson: unknown
	difficulty: ExperimentalPracticeTestDifficulty
	correctAnswer: string
}

interface StartExperimentalPracticeTestSessionInput {
	userId: string
	targetQuestionCount?: number
}

interface ExperimentalPracticeTestRunInit {
	sessionId: string
	firstItem: ItemForRender
	targetQuestionCount: number
}

async function loadRecentExperimentalPracticeTestItemIds(
	userId: string,
	limit: number
): Promise<ReadonlyArray<string>> {
	const result = await errors.try(
		db
			.select({ experimentalItemId: experimentalAttempts.experimentalItemId })
			.from(experimentalAttempts)
			.innerJoin(experimentalSessions, eq(experimentalSessions.id, experimentalAttempts.sessionId))
			.where(
				and(
					eq(experimentalSessions.userId, userId),
					eq(experimentalSessions.type, "practice_test"),
					isNotNull(experimentalSessions.endedAtMs)
				)
			)
			.orderBy(desc(experimentalAttempts.id))
			.limit(limit)
	)
	if (result.error) {
		logger.error(
			{ error: result.error, userId },
			"loadRecentExperimentalPracticeTestItemIds: query failed"
		)
		throw errors.wrap(result.error, "loadRecentExperimentalPracticeTestItemIds")
	}
	const seen = new Set<string>()
	const ordered: string[] = []
	for (const row of result.data) {
		if (seen.has(row.experimentalItemId)) continue
		seen.add(row.experimentalItemId)
		ordered.push(row.experimentalItemId)
	}
	return ordered
}

async function selectRandomExperimentalMixedItems(input: {
	limit: number
	excludeIds?: ReadonlyArray<string>
}): Promise<ReadonlyArray<ExperimentalMixedItemRow>> {
	const conditions = [
		eq(experimentalItems.auditStatus, "unaudited"),
		isNull(experimentalItems.hiddenAtMs)
	]
	if (input.excludeIds !== undefined && input.excludeIds.length > 0) {
		conditions.push(notInArray(experimentalItems.id, [...input.excludeIds]))
	}
	const result = await errors.try(
		db
			.select({
				id: experimentalItems.id,
				subTypeId: experimentalItems.subTypeId,
				body: experimentalItems.body,
				optionsJson: experimentalItems.optionsJson,
				difficulty: experimentalItems.difficulty,
				correctAnswer: experimentalItems.correctAnswer
			})
			.from(experimentalItems)
			.where(and(...conditions))
			.orderBy(sql`random()`)
			.limit(input.limit)
	)
	if (result.error) {
		logger.error(
			{ error: result.error, limit: input.limit },
			"selectRandomExperimentalMixedItems: query failed"
		)
		throw errors.wrap(result.error, "selectRandomExperimentalMixedItems")
	}
	return result.data
}

async function loadEligibleExperimentalSubTypeIds(): Promise<ReadonlyArray<string>> {
	const result = await errors.try(
		db
			.select({ subTypeId: experimentalItems.subTypeId })
			.from(experimentalItems)
			.where(
				and(
					eq(experimentalItems.auditStatus, "unaudited"),
					isNull(experimentalItems.hiddenAtMs)
				)
			)
			.groupBy(experimentalItems.subTypeId)
	)
	if (result.error) {
		logger.error({ error: result.error }, "loadEligibleExperimentalSubTypeIds: query failed")
		throw errors.wrap(result.error, "loadEligibleExperimentalSubTypeIds")
	}
	return result.data.map(function mapRow(row) {
		return row.subTypeId
	})
}

function mapExperimentalPracticeTestItemForRender(row: ExperimentalMixedItemRow): ItemForRender {
	const parsedBody = itemBody.safeParse(row.body)
	if (!parsedBody.success) {
		logger.error(
			{ itemId: row.id, issues: parsedBody.error.issues },
			"mapExperimentalPracticeTestItemForRender: invalid body"
		)
		throw errors.wrap(ErrExperimentalPracticeTestItemBodyInvalid, row.id)
	}
	const parsedOptions = optionsJsonSchema.safeParse(row.optionsJson)
	if (!parsedOptions.success) {
		logger.error(
			{ itemId: row.id, issues: parsedOptions.error.issues },
			"mapExperimentalPracticeTestItemForRender: invalid options"
		)
		throw errors.wrap(ErrExperimentalPracticeTestItemOptionsInvalid, row.id)
	}
	return {
		id: row.id,
		body: parsedBody.data,
		options: parsedOptions.data,
		selection: {
			servedAtTier: row.difficulty,
			fallbackLevel: "fresh"
		}
	}
}

function groupPracticeTestRowsBySubType(
	rows: ReadonlyArray<ExperimentalMixedItemRow>
): Map<string, ExperimentalMixedItemRow[]> {
	const grouped = new Map<string, ExperimentalMixedItemRow[]>()
	for (const row of rows) {
		const existing = grouped.get(row.subTypeId)
		if (existing === undefined) {
			grouped.set(row.subTypeId, [row])
			continue
		}
		existing.push(row)
	}
	return grouped
}

function takePracticeTestRoundRobinQueue(input: {
	grouped: Map<string, ExperimentalMixedItemRow[]>
	targetQuestionCount: number
}): ReadonlyArray<ExperimentalMixedItemRow> {
	const subTypeIds = [...input.grouped.keys()]
	const queue: ExperimentalMixedItemRow[] = []
	while (queue.length < input.targetQuestionCount) {
		let insertedThisRound = false
		for (const subTypeId of subTypeIds) {
			const bucket = input.grouped.get(subTypeId)
			const next = bucket?.shift()
			if (next === undefined) continue
			queue.push(next)
			insertedThisRound = true
			if (queue.length >= input.targetQuestionCount) break
		}
		if (!insertedThisRound) break
	}
	return queue
}

function buildPracticeTestQueue(input: {
	baseRows: ReadonlyArray<ExperimentalMixedItemRow>
	fallbackRows: ReadonlyArray<ExperimentalMixedItemRow>
	targetQuestionCount: number
}): ReadonlyArray<ExperimentalMixedItemRow> {
	const grouped = groupPracticeTestRowsBySubType([
		...input.baseRows,
		...input.fallbackRows
	])
	return takePracticeTestRoundRobinQueue({
		grouped,
		targetQuestionCount: input.targetQuestionCount
	})
}

async function startExperimentalPracticeTestSession(
	input: StartExperimentalPracticeTestSessionInput
): Promise<ExperimentalPracticeTestRunInit> {
	const targetQuestionCount =
		input.targetQuestionCount === undefined
			? EXPERIMENTAL_PRACTICE_TEST_QUESTIONS
			: input.targetQuestionCount
	const recencyExcludedItemIds = await loadRecentExperimentalPracticeTestItemIds(
		input.userId,
		targetQuestionCount * 3
	)
	const eligibleSubTypeIds = await loadEligibleExperimentalSubTypeIds()
	if (eligibleSubTypeIds.length < EXPERIMENTAL_PRACTICE_TEST_SUBTYPE_MINIMUM) {
		logger.warn(
			{ userId: input.userId, eligibleSubTypeCount: eligibleSubTypeIds.length },
			"startExperimentalPracticeTestSession: not enough experimental subtypes"
		)
		throw errors.wrap(
			ErrExperimentalPracticeTestPoolTooSmall,
			"eligible experimental subtype count"
		)
	}
	const baseRows = await selectRandomExperimentalMixedItems({
		limit: targetQuestionCount,
		excludeIds: recencyExcludedItemIds
	})
	const selectedIds = new Set(
		baseRows.map(function mapRow(row) {
			return row.id
		})
	)
	const fallbackRows =
		baseRows.length >= targetQuestionCount
			? []
			: await selectRandomExperimentalMixedItems({
					limit: targetQuestionCount,
					excludeIds: [...selectedIds]
				})
	const queueRows = buildPracticeTestQueue({
		baseRows,
		fallbackRows,
		targetQuestionCount
	})
	if (queueRows.length < targetQuestionCount) {
		logger.warn(
			{
				userId: input.userId,
				targetQuestionCount,
				selectedCount: queueRows.length
			},
			"startExperimentalPracticeTestSession: experimental pool too small"
		)
		throw errors.wrap(ErrExperimentalPracticeTestPoolTooSmall, "experimental item count")
	}
	const queueSubTypeIds = new Set(
		queueRows.map(function mapRow(row) {
			return row.subTypeId
		})
	)
	if (queueSubTypeIds.size < EXPERIMENTAL_PRACTICE_TEST_SUBTYPE_MINIMUM) {
		logger.warn(
			{ userId: input.userId, queueSubTypeCount: queueSubTypeIds.size },
			"startExperimentalPracticeTestSession: queue not mixed enough"
		)
		throw errors.wrap(ErrExperimentalPracticeTestPoolTooSmall, "mixed subtype queue")
	}
	const firstRow = queueRows[0]
	if (firstRow === undefined) {
		logger.error({ userId: input.userId }, "startExperimentalPracticeTestSession: first row missing")
		throw errors.wrap(ErrExperimentalPracticeTestPoolTooSmall, "first queue item missing")
	}
	const nowMs = Date.now()
	const insertResult = await errors.try(
		db
			.insert(experimentalSessions)
			.values({
				userId: input.userId,
				type: "practice_test",
				targetQuestionCount,
				startedAtMs: nowMs,
				lastHeartbeatMs: nowMs,
				recencyExcludedItemIds: [...recencyExcludedItemIds],
				metadataJson: {
					queueItemIds: queueRows.map(function mapRow(row) {
						return row.id
					}),
					selectionStrategy: "preselected_random_v1"
				}
			})
			.returning({ id: experimentalSessions.id })
	)
	if (insertResult.error) {
		logger.error(
			{ error: insertResult.error, userId: input.userId },
			"startExperimentalPracticeTestSession: insert failed"
		)
		throw errors.wrap(insertResult.error, "startExperimentalPracticeTestSession")
	}
	const sessionRow = insertResult.data[0]
	if (sessionRow === undefined) {
		logger.error(
			{ userId: input.userId },
			"startExperimentalPracticeTestSession: insert returned no rows"
		)
		throw errors.wrap(ErrExperimentalPracticeTestInsertFailed, input.userId)
	}
	return {
		sessionId: sessionRow.id,
		firstItem: mapExperimentalPracticeTestItemForRender(firstRow),
		targetQuestionCount
	}
}

export type {
	ExperimentalPracticeTestRunInit,
	StartExperimentalPracticeTestSessionInput
}
export { startExperimentalPracticeTestSession }
