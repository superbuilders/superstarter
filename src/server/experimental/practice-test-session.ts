import * as errors from "@superbuilders/errors"
import { and, desc, eq, isNotNull, isNull } from "drizzle-orm"
import { z } from "zod"
import type { ItemForRender } from "@/components/focus-shell/types"
import { db } from "@/db"
import { experimentalAttempts } from "@/db/schemas/experimental/experimental-attempts"
import { experimentalItems } from "@/db/schemas/experimental/experimental-items"
import { experimentalSessions } from "@/db/schemas/experimental/experimental-sessions"
import { logger } from "@/logger"
import { itemBody } from "@/server/items/body-schema"
import {
	allocateExperimentalPracticeTestQueue,
	type ExperimentalPracticeTestPoolRow
} from "@/server/experimental/practice-test-mix"
import {
	EXPERIMENTAL_PRACTICE_TEST_SUBTYPE_MINIMUM,
	loadExperimentalPracticeTestPrimerData,
	parseExperimentalPracticeTestConfig
} from "@/server/experimental/practice-test-data"

const ErrExperimentalPracticeTestPoolTooSmall = errors.new(
	"experimental practice-test pool too small"
)
const ErrExperimentalPracticeTestConfigInvalid = errors.new(
	"experimental practice-test config invalid"
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

type ExperimentalMixedItemRow = ExperimentalPracticeTestPoolRow & {
	body: unknown
	optionsJson: unknown
	correctAnswer: string
}

interface StartExperimentalPracticeTestSessionInput {
	userId: string
	targetQuestionCount?: number
	durationMinutes?: number
}

interface ExperimentalPracticeTestRunInit {
	sessionId: string
	firstItem: ItemForRender
	targetQuestionCount: number
	durationMinutes: number
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

async function loadEligibleExperimentalPracticeTestRows(): Promise<ReadonlyArray<ExperimentalMixedItemRow>> {
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
			.where(
				and(
					eq(experimentalItems.auditStatus, "unaudited"),
					isNull(experimentalItems.hiddenAtMs)
				)
			)
	)
	if (result.error) {
		logger.error(
			{ error: result.error },
			"loadEligibleExperimentalPracticeTestRows: query failed"
		)
		throw errors.wrap(result.error, "loadEligibleExperimentalPracticeTestRows")
	}
	return result.data
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

function countDistinctSubTypes(rows: ReadonlyArray<{ subTypeId: string }>): number {
	return new Set(
		rows.map(function mapRow(row) {
			return row.subTypeId
		})
	).size
}

async function startExperimentalPracticeTestSession(
	input: StartExperimentalPracticeTestSessionInput
): Promise<ExperimentalPracticeTestRunInit> {
	const primer = await loadExperimentalPracticeTestPrimerData()
	const configResult = parseExperimentalPracticeTestConfig({
		questionCount: input.targetQuestionCount,
		durationMinutes: input.durationMinutes,
		primer
	})
	if (!configResult.ok) {
		logger.warn(
			{ userId: input.userId, reason: configResult.reason },
			"startExperimentalPracticeTestSession: invalid config"
		)
		throw errors.wrap(ErrExperimentalPracticeTestConfigInvalid, configResult.reason)
	}
	const targetQuestionCount = configResult.config.questionCount
	const durationMinutes = configResult.config.durationMinutes
	const recencyExcludedItemIds = await loadRecentExperimentalPracticeTestItemIds(
		input.userId,
		targetQuestionCount * 3
	)
	const eligibleRows = await loadEligibleExperimentalPracticeTestRows()
	const eligibleSubTypeCount = countDistinctSubTypes(eligibleRows)
	if (eligibleSubTypeCount < EXPERIMENTAL_PRACTICE_TEST_SUBTYPE_MINIMUM) {
		logger.warn(
			{ userId: input.userId, eligibleSubTypeCount },
			"startExperimentalPracticeTestSession: not enough experimental subtypes"
		)
		throw errors.wrap(
			ErrExperimentalPracticeTestPoolTooSmall,
			"eligible experimental subtype count"
		)
	}
	const nowMs = Date.now()
	const allocation = allocateExperimentalPracticeTestQueue({
		sessionId: `experimental-practice-test:${input.userId}:${nowMs}`,
		questionCount: targetQuestionCount,
		rows: eligibleRows,
		recencyExcludedIds: recencyExcludedItemIds
	})
	const queueRows = allocation.queue
	if (queueRows.length < targetQuestionCount) {
		logger.warn(
			{
				userId: input.userId,
				targetQuestionCount,
				selectedCount: queueRows.length,
				remainingEligibleCount: eligibleRows.length,
				diagnostics: allocation.diagnostics
			},
			"startExperimentalPracticeTestSession: experimental pool too small"
		)
		throw errors.wrap(ErrExperimentalPracticeTestPoolTooSmall, "experimental item count")
	}
	const queueSubTypeCount = countDistinctSubTypes(queueRows)
	if (queueSubTypeCount < EXPERIMENTAL_PRACTICE_TEST_SUBTYPE_MINIMUM) {
		logger.warn(
			{ userId: input.userId, queueSubTypeCount, diagnostics: allocation.diagnostics },
			"startExperimentalPracticeTestSession: queue not mixed enough"
		)
		throw errors.wrap(ErrExperimentalPracticeTestPoolTooSmall, "mixed subtype queue")
	}
	logger.info(
		{
			userId: input.userId,
			requestedQuestionCount: targetQuestionCount,
			targetSubTypeDistribution: allocation.diagnostics.targetDistribution.subType,
			targetDifficultyDistribution: allocation.diagnostics.targetDistribution.difficulty,
			actualSubTypeDistribution: allocation.diagnostics.actualDistribution.subType,
			actualDifficultyDistribution: allocation.diagnostics.actualDistribution.difficulty,
			fallbackRedistributionUsed: allocation.diagnostics.fallbackRedistributionUsed,
			recencyFallbackUsed: allocation.diagnostics.recencyFallbackUsed
		},
		"startExperimentalPracticeTestSession: queue composition"
	)
	const firstRow = queueRows[0]
	if (firstRow === undefined) {
		logger.error({ userId: input.userId }, "startExperimentalPracticeTestSession: first row missing")
		throw errors.wrap(ErrExperimentalPracticeTestPoolTooSmall, "first queue item missing")
	}
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
					selectionStrategy: "preselected_random_v1",
					durationMinutes
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
		targetQuestionCount,
		durationMinutes
	}
}

export type {
	ExperimentalPracticeTestRunInit,
	StartExperimentalPracticeTestSessionInput,
	ExperimentalPracticeTestDifficulty,
	ExperimentalMixedItemRow
}
export { startExperimentalPracticeTestSession }
