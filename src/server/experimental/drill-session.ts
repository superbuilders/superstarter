import * as errors from "@superbuilders/errors"
import { and, desc, eq, isNotNull, isNull, notInArray, sql } from "drizzle-orm"
import { z } from "zod"
import type {
	ItemForRender,
	ItemSelection,
	SubmitAttemptInput,
	SubmitAttemptResult
} from "@/components/focus-shell/types"
import { DEFAULT_DRILL_QUESTIONS, type SubTypeId } from "@/config/sub-types"
import { db } from "@/db"
import { experimentalAttempts } from "@/db/schemas/experimental/experimental-attempts"
import { experimentalItems } from "@/db/schemas/experimental/experimental-items"
import { experimentalSessions } from "@/db/schemas/experimental/experimental-sessions"
import { logger } from "@/logger"
import { itemBody } from "@/server/items/body-schema"

const FIVE_MINUTES_MS = 5 * 60_000
const ErrExperimentalSessionNotFound = errors.new("experimental session not found")
const ErrExperimentalSessionEnded = errors.new("experimental session already ended")
const ErrExperimentalSessionMetadataInvalid = errors.new("experimental session metadata invalid")
const ErrExperimentalItemMissing = errors.new("experimental item missing")
const ErrExperimentalItemBodyInvalid = errors.new("experimental item body invalid")
const ErrExperimentalItemOptionsInvalid = errors.new("experimental item options invalid")
const ErrExperimentalPoolTooSmall = errors.new("experimental pool too small")
const ErrExperimentalSubmitInputInvalid = errors.new("experimental submit input invalid")
const ErrExperimentalLatencyAnchorBroken = errors.new(
	"experimental latency anchor produced an out-of-band value"
)
const ErrExperimentalItemNotInSessionQueue = errors.new("experimental item not in session queue")

const optionsJsonSchema = z
	.array(
		z.object({
			id: z.string().min(1),
			text: z.string().min(1)
		})
	)
	.min(2)
	.max(5)

const tierSchema = z.enum(["easy", "medium", "hard", "brutal"])
const fallbackLevelSchema = z.enum(["fresh", "session-soft", "recency-soft", "tier-degraded"])
const submitAttemptInputSchema = z.object({
	sessionId: z.string().uuid(),
	itemId: z.string().uuid(),
	selectedAnswer: z.string().min(1).optional(),
	latencyMs: z.number().int().nonnegative(),
	selection: z.object({
		servedAtTier: tierSchema,
		fallbackFromTier: tierSchema.optional(),
		fallbackLevel: fallbackLevelSchema
	})
})
const sessionMetadataSchema = z.object({
	queueItemIds: z.array(z.string().uuid()).min(1),
	selectionStrategy: z.literal("preselected_random_v1")
})

type ExperimentalSessionQueue = z.infer<typeof sessionMetadataSchema>

type ExperimentalItemRow = {
	id: string
	body: unknown
	optionsJson: unknown
	difficulty: "easy" | "medium" | "hard" | "brutal"
	correctAnswer: string
}

interface StartExperimentalDrillSessionInput {
	userId: string
	subTypeId: SubTypeId
	targetQuestionCount?: number
}

interface ExperimentalDrillRunInit {
	sessionId: string
	firstItem: ItemForRender
	drillLength: number
	subTypeId: SubTypeId
}

function mapExperimentalItemForRender(row: ExperimentalItemRow): ItemForRender {
	const parsedBody = itemBody.safeParse(row.body)
	if (!parsedBody.success) {
		logger.error(
			{ itemId: row.id, issues: parsedBody.error.issues },
			"mapExperimentalItemForRender: invalid body"
		)
		throw errors.wrap(ErrExperimentalItemBodyInvalid, row.id)
	}
	const parsedOptions = optionsJsonSchema.safeParse(row.optionsJson)
	if (!parsedOptions.success) {
		logger.error(
			{ itemId: row.id, issues: parsedOptions.error.issues },
			"mapExperimentalItemForRender: invalid options"
		)
		throw errors.wrap(ErrExperimentalItemOptionsInvalid, row.id)
	}
	return {
		id: row.id,
		body: parsedBody.data,
		options: parsedOptions.data,
		selection: {
			servedAtTier: row.difficulty,
			fallbackLevel: "fresh"
		} satisfies ItemSelection
	}
}

async function loadRecentExperimentalItemIds(
	userId: string,
	subTypeId: SubTypeId,
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
					eq(experimentalSessions.type, "drill"),
					eq(experimentalSessions.subTypeId, subTypeId),
					isNotNull(experimentalSessions.endedAtMs)
				)
			)
			.orderBy(desc(experimentalAttempts.id))
			.limit(limit)
	)
	if (result.error) {
		logger.error(
			{ error: result.error, userId, subTypeId },
			"loadRecentExperimentalItemIds: query failed"
		)
		throw errors.wrap(result.error, "loadRecentExperimentalItemIds")
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

async function selectRandomExperimentalItems(input: {
	subTypeId: SubTypeId
	limit: number
	excludeIds?: ReadonlyArray<string>
}): Promise<ReadonlyArray<ExperimentalItemRow>> {
	const conditions = [
		eq(experimentalItems.subTypeId, input.subTypeId),
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
			{ error: result.error, subTypeId: input.subTypeId },
			"selectRandomExperimentalItems: query failed"
		)
		throw errors.wrap(result.error, "selectRandomExperimentalItems")
	}
	return result.data
}

async function loadSessionQueue(sessionId: string): Promise<{
	endedAtMs: number | null
	queue: ExperimentalSessionQueue
}> {
	const result = await errors.try(
		db
			.select({
				endedAtMs: experimentalSessions.endedAtMs,
				metadataJson: experimentalSessions.metadataJson
			})
			.from(experimentalSessions)
			.where(eq(experimentalSessions.id, sessionId))
			.limit(1)
	)
	if (result.error) {
		logger.error({ error: result.error, sessionId }, "loadSessionQueue: query failed")
		throw errors.wrap(result.error, "loadSessionQueue")
	}
	const row = result.data[0]
	if (!row) {
		logger.warn({ sessionId }, "loadSessionQueue: session missing")
		throw errors.wrap(ErrExperimentalSessionNotFound, sessionId)
	}
	const parsed = sessionMetadataSchema.safeParse(row.metadataJson)
	if (!parsed.success) {
		logger.error({ sessionId, issues: parsed.error.issues }, "loadSessionQueue: metadata invalid")
		throw errors.wrap(ErrExperimentalSessionMetadataInvalid, sessionId)
	}
	return { endedAtMs: row.endedAtMs, queue: parsed.data }
}

async function loadExperimentalItemById(itemId: string): Promise<ExperimentalItemRow> {
	const result = await errors.try(
		db
			.select({
				id: experimentalItems.id,
				body: experimentalItems.body,
				optionsJson: experimentalItems.optionsJson,
				difficulty: experimentalItems.difficulty,
				correctAnswer: experimentalItems.correctAnswer
			})
			.from(experimentalItems)
			.where(eq(experimentalItems.id, itemId))
			.limit(1)
	)
	if (result.error) {
		logger.error({ error: result.error, itemId }, "loadExperimentalItemById: query failed")
		throw errors.wrap(result.error, "loadExperimentalItemById")
	}
	const row = result.data[0]
	if (!row) {
		logger.warn({ itemId }, "loadExperimentalItemById: item missing")
		throw errors.wrap(ErrExperimentalItemMissing, itemId)
	}
	return row
}

async function loadAttemptedExperimentalItemIds(sessionId: string): Promise<ReadonlyArray<string>> {
	const result = await errors.try(
		db
			.select({ experimentalItemId: experimentalAttempts.experimentalItemId })
			.from(experimentalAttempts)
			.where(eq(experimentalAttempts.sessionId, sessionId))
			.orderBy(experimentalAttempts.id)
	)
	if (result.error) {
		logger.error(
			{ error: result.error, sessionId },
			"loadAttemptedExperimentalItemIds: query failed"
		)
		throw errors.wrap(result.error, "loadAttemptedExperimentalItemIds")
	}
	return result.data.map(function mapRow(row) {
		return row.experimentalItemId
	})
}

async function readNextExperimentalItem(sessionId: string): Promise<ItemForRender | undefined> {
	const session = await loadSessionQueue(sessionId)
	const attemptedItemIds = new Set(await loadAttemptedExperimentalItemIds(sessionId))
	const nextItemId = session.queue.queueItemIds.find(function findFirst(itemId) {
		return !attemptedItemIds.has(itemId)
	})
	if (nextItemId === undefined) return undefined
	const row = await loadExperimentalItemById(nextItemId)
	return mapExperimentalItemForRender(row)
}

async function startExperimentalDrillSession(
	input: StartExperimentalDrillSessionInput
): Promise<ExperimentalDrillRunInit> {
	const drillLength =
		input.targetQuestionCount === undefined
			? DEFAULT_DRILL_QUESTIONS
			: input.targetQuestionCount
	const recencyExcludedItemIds = await loadRecentExperimentalItemIds(
		input.userId,
		input.subTypeId,
		drillLength * 3
	)
	const freshRows = await selectRandomExperimentalItems({
		subTypeId: input.subTypeId,
		limit: drillLength,
		excludeIds: recencyExcludedItemIds
	})
	const selectedById = new Map<string, ExperimentalItemRow>()
	for (const row of freshRows) {
		selectedById.set(row.id, row)
	}
	if (selectedById.size < drillLength) {
		const fallbackRows = await selectRandomExperimentalItems({
			subTypeId: input.subTypeId,
			limit: drillLength,
			excludeIds: [...selectedById.keys()]
		})
		for (const row of fallbackRows) {
			if (!selectedById.has(row.id)) {
				selectedById.set(row.id, row)
			}
			if (selectedById.size >= drillLength) break
		}
	}
	const selectedRows = [...selectedById.values()].slice(0, drillLength)
	if (selectedRows.length < drillLength) {
		logger.warn(
			{
				userId: input.userId,
				subTypeId: input.subTypeId,
				drillLength,
				selectedCount: selectedRows.length
			},
			"startExperimentalDrillSession: experimental pool too small"
		)
		throw errors.wrap(ErrExperimentalPoolTooSmall, input.subTypeId)
	}
	const firstRow = selectedRows[0]
	if (firstRow === undefined) {
		logger.error(
			{ userId: input.userId, subTypeId: input.subTypeId, drillLength },
			"startExperimentalDrillSession: selected rows unexpectedly empty"
		)
		throw errors.wrap(ErrExperimentalPoolTooSmall, input.subTypeId)
	}
	const nowMs = Date.now()
	const insertResult = await errors.try(
		db
			.insert(experimentalSessions)
			.values({
				userId: input.userId,
				type: "drill",
				subTypeId: input.subTypeId,
				targetQuestionCount: drillLength,
				startedAtMs: nowMs,
				lastHeartbeatMs: nowMs,
				recencyExcludedItemIds: [...recencyExcludedItemIds],
				metadataJson: {
					queueItemIds: selectedRows.map(function mapRow(row) {
						return row.id
					}),
					selectionStrategy: "preselected_random_v1"
				}
			})
			.returning({ id: experimentalSessions.id })
	)
	if (insertResult.error) {
		logger.error(
			{ error: insertResult.error, userId: input.userId, subTypeId: input.subTypeId },
			"startExperimentalDrillSession: insert failed"
		)
		throw errors.wrap(insertResult.error, "startExperimentalDrillSession")
	}
	const sessionRow = insertResult.data[0]
	if (!sessionRow) {
		logger.error(
			{ userId: input.userId, subTypeId: input.subTypeId },
			"startExperimentalDrillSession: insert returned no rows"
		)
		throw errors.new("startExperimentalDrillSession: insert returned no rows")
	}
	return {
		sessionId: sessionRow.id,
		firstItem: mapExperimentalItemForRender(firstRow),
		drillLength,
		subTypeId: input.subTypeId
	}
}

async function submitExperimentalAttempt(
	input: SubmitAttemptInput
): Promise<SubmitAttemptResult> {
	const parsed = submitAttemptInputSchema.safeParse(input)
	if (!parsed.success) {
		logger.error({ issues: parsed.error.issues }, "submitExperimentalAttempt: input invalid")
		throw errors.wrap(ErrExperimentalSubmitInputInvalid, "submitExperimentalAttempt")
	}
	const data = parsed.data
	if (data.latencyMs > FIVE_MINUTES_MS) {
		logger.error(
			{ sessionId: data.sessionId, itemId: data.itemId, latencyMs: data.latencyMs },
			"submitExperimentalAttempt: latency anchor tripwire fired (>5 minutes)"
		)
		throw errors.wrap(ErrExperimentalLatencyAnchorBroken, `latencyMs ${data.latencyMs}`)
	}
	const session = await loadSessionQueue(data.sessionId)
	if (session.endedAtMs !== null) {
		logger.warn(
			{ sessionId: data.sessionId, endedAtMs: session.endedAtMs },
			"submitExperimentalAttempt: session already ended"
		)
		throw errors.wrap(ErrExperimentalSessionEnded, data.sessionId)
	}
	if (!session.queue.queueItemIds.includes(data.itemId)) {
		logger.warn(
			{ sessionId: data.sessionId, itemId: data.itemId },
			"submitExperimentalAttempt: item not in session queue"
		)
		throw errors.wrap(ErrExperimentalItemNotInSessionQueue, data.itemId)
	}
	const item = await loadExperimentalItemById(data.itemId)
	const correct = data.selectedAnswer !== undefined && data.selectedAnswer === item.correctAnswer
	const insertResult = await errors.try(
		db.insert(experimentalAttempts).values({
			sessionId: data.sessionId,
			experimentalItemId: data.itemId,
			selectedAnswer: data.selectedAnswer,
			correct,
			latencyMs: Math.floor(data.latencyMs),
			metadataJson: { selection: data.selection }
		})
	)
	if (insertResult.error) {
		logger.error(
			{ error: insertResult.error, sessionId: data.sessionId, itemId: data.itemId },
			"submitExperimentalAttempt: insert failed"
		)
		throw errors.wrap(insertResult.error, "submitExperimentalAttempt insert")
	}
	const nextItem = await readNextExperimentalItem(data.sessionId)
	if (nextItem === undefined) return {}
	return { nextItem }
}

async function endExperimentalSession(sessionId: string): Promise<void> {
	const result = await errors.try(
		db
			.update(experimentalSessions)
			.set({
				endedAtMs: sql`(extract(epoch from now()) * 1000)::bigint`,
				completionReason: "completed"
			})
			.where(and(eq(experimentalSessions.id, sessionId), isNull(experimentalSessions.endedAtMs)))
	)
	if (result.error) {
		logger.error({ error: result.error, sessionId }, "endExperimentalSession: update failed")
		throw errors.wrap(result.error, "endExperimentalSession")
	}
}

async function assertExperimentalSessionOwnedBy(sessionId: string, userId: string): Promise<void> {
	const result = await errors.try(
		db
			.select({ userId: experimentalSessions.userId })
			.from(experimentalSessions)
			.where(eq(experimentalSessions.id, sessionId))
			.limit(1)
	)
	if (result.error) {
		logger.error(
			{ error: result.error, sessionId, userId },
			"assertExperimentalSessionOwnedBy: read failed"
		)
		throw errors.wrap(result.error, "assertExperimentalSessionOwnedBy")
	}
	const row = result.data[0]
	if (!row || row.userId !== userId) {
		logger.warn(
			{ sessionId, userId, ownerUserId: row?.userId },
			"assertExperimentalSessionOwnedBy: session missing or not owned"
		)
		throw errors.wrap(ErrExperimentalSessionNotFound, sessionId)
	}
}

export type { ExperimentalDrillRunInit, StartExperimentalDrillSessionInput }
export {
	assertExperimentalSessionOwnedBy,
	endExperimentalSession,
	readNextExperimentalItem,
	startExperimentalDrillSession,
	submitExperimentalAttempt
}
