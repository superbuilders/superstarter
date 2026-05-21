import * as errors from "@superbuilders/errors"
import { and, eq, inArray, isNotNull, sql } from "drizzle-orm"
import { z } from "zod"
import type {
	ItemDifficulty,
	PerSubTypePerformance,
	SessionInfo,
	SurfacedStrategy,
	WrongItem
} from "@/app/(app)/post-session/[sessionId]/page"
import type { SessionTypeForShell } from "@/components/post-session/post-session-shell"
import type { SubTypeId } from "@/config/sub-types"
import { db } from "@/db"
import { strategies } from "@/db/schemas/catalog/strategies"
import { experimentalAttempts } from "@/db/schemas/experimental/experimental-attempts"
import { experimentalItems } from "@/db/schemas/experimental/experimental-items"
import { experimentalSessions } from "@/db/schemas/experimental/experimental-sessions"
import { logger } from "@/logger"
import { itemBody } from "@/server/items/body-schema"
import { deriveStruggledSubTypes, selectStrategiesForStruggledSubTypes } from "@/server/post-session/strategy-selection"

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

type ExperimentalReviewShellSessionType = "practice_test" | "drill" | "review"

type ExperimentalReviewShellSessionRow = {
	id: string
	type: ExperimentalReviewShellSessionType
}

type ExperimentalReviewShellWrongItemRow = {
	attemptId: string
	itemId: string
	subTypeId: SubTypeId
	difficulty: ItemDifficulty
	latencyMs: number
	body: unknown
	optionsJson: unknown
	correctAnswer: string
	selectedAnswer: string | null
	correct: boolean
	explanation: string | null
}

function mapExperimentalSessionTypeToShell(
	type: ExperimentalReviewShellSessionType
): SessionTypeForShell {
	if (type === "practice_test") return "full_length"
	if (type === "drill") return "drill"
	return "full_length"
}

function mapExperimentalWrongItemRow(
	row: ExperimentalReviewShellWrongItemRow,
	sessionId: string
): WrongItem {
	const parsedBody = itemBody.safeParse(row.body)
	if (!parsedBody.success) {
		logger.error(
			{ sessionId, itemId: row.itemId, issues: parsedBody.error.issues },
			"loadExperimentalPostSessionInfo: invalid item body"
		)
		throw errors.wrap(parsedBody.error, "loadExperimentalPostSessionInfo item body")
	}
	const parsedOptions = optionsJsonSchema.safeParse(row.optionsJson)
	if (!parsedOptions.success) {
		logger.error(
			{ sessionId, itemId: row.itemId, issues: parsedOptions.error.issues },
			"loadExperimentalPostSessionInfo: invalid item options"
		)
		throw errors.wrap(parsedOptions.error, "loadExperimentalPostSessionInfo item options")
	}
	return {
		attemptId: row.attemptId,
		itemId: row.itemId,
		subTypeId: row.subTypeId,
		difficulty: row.difficulty,
		latencyMs: row.latencyMs,
		body: parsedBody.data,
		optionsJson: parsedOptions.data,
		correctAnswer: row.correctAnswer,
		selectedAnswer: row.selectedAnswer === null ? undefined : row.selectedAnswer,
		correct: row.correct,
		explanation: row.explanation === null ? undefined : row.explanation,
		structuredExplanation: undefined
	}
}

async function loadExperimentalReviewShellSessionRow(
	userId: string,
	sessionId: string
): Promise<ExperimentalReviewShellSessionRow | null> {
	const result = await errors.try(
		db
			.select({
				id: experimentalSessions.id,
				type: experimentalSessions.type
			})
			.from(experimentalSessions)
			.where(
				and(
					eq(experimentalSessions.id, sessionId),
					eq(experimentalSessions.userId, userId),
					isNotNull(experimentalSessions.endedAtMs),
					eq(experimentalSessions.completionReason, "completed")
				)
			)
			.limit(1)
	)
	if (result.error) {
		logger.error(
			{ error: result.error, userId, sessionId },
			"loadExperimentalPostSessionInfo: session query failed"
		)
		throw errors.wrap(result.error, "loadExperimentalPostSessionInfo session")
	}
	const row = result.data[0]
	if (row === undefined) return null
	return row
}

async function loadExperimentalPerformance(
	sessionId: string,
	userId: string
): Promise<PerSubTypePerformance[]> {
	const result = await errors.try(
		db
			.select({
				subTypeId: sql<SubTypeId>`${experimentalItems.subTypeId}`,
				correct: sql<number>`COUNT(*) FILTER (WHERE ${experimentalAttempts.correct})::int`,
				total: sql<number>`COUNT(*)::int`,
				medianLatencyMs: sql<number>`percentile_cont(0.5) WITHIN GROUP (ORDER BY ${experimentalAttempts.latencyMs})::int`
			})
			.from(experimentalAttempts)
			.innerJoin(experimentalItems, eq(experimentalAttempts.experimentalItemId, experimentalItems.id))
			.where(eq(experimentalAttempts.sessionId, sessionId))
			.groupBy(experimentalItems.subTypeId)
	)
	if (result.error) {
		logger.error(
			{ error: result.error, userId, sessionId },
			"loadExperimentalPostSessionInfo: performance query failed"
		)
		throw errors.wrap(result.error, "loadExperimentalPostSessionInfo performance")
	}
	return result.data
}

async function loadExperimentalWrongItems(
	sessionId: string,
	userId: string
): Promise<WrongItem[]> {
	const result = await errors.try(
		db
			.select({
				attemptId: experimentalAttempts.id,
				itemId: experimentalItems.id,
				subTypeId: sql<SubTypeId>`${experimentalItems.subTypeId}`,
				difficulty: sql<ItemDifficulty>`${experimentalItems.difficulty}`,
				latencyMs: experimentalAttempts.latencyMs,
				body: experimentalItems.body,
				optionsJson: experimentalItems.optionsJson,
				correctAnswer: experimentalItems.correctAnswer,
				selectedAnswer: experimentalAttempts.selectedAnswer,
				correct: experimentalAttempts.correct,
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
			"loadExperimentalPostSessionInfo: wrong-items query failed"
		)
		throw errors.wrap(result.error, "loadExperimentalPostSessionInfo wrong items")
	}
	return result.data.map(function mapRow(row) {
		return mapExperimentalWrongItemRow(row, sessionId)
	})
}

async function loadExperimentalSurfacedStrategies(
	performance: ReadonlyArray<PerSubTypePerformance>,
	userId: string,
	sessionId: string
): Promise<SurfacedStrategy[]> {
	const struggledIds = deriveStruggledSubTypes(performance)
	if (struggledIds.length === 0) {
		return []
	}
	const result = await errors.try(
		db
			.select({
				id: strategies.id,
				subTypeId: sql<SubTypeId>`${strategies.subTypeId}`,
				kind: strategies.kind,
				text: strategies.text
			})
			.from(strategies)
			.where(inArray(strategies.subTypeId, [...struggledIds]))
	)
	if (result.error) {
		logger.error(
			{ error: result.error, userId, sessionId, struggledIds },
			"loadExperimentalPostSessionInfo: strategies query failed"
		)
		throw errors.wrap(result.error, "loadExperimentalPostSessionInfo strategies")
	}
	return selectStrategiesForStruggledSubTypes(performance, result.data)
}

async function loadExperimentalPostSessionInfo(
	userId: string,
	sessionId: string
): Promise<SessionInfo | null> {
	if (!UUID_V4_OR_V7.test(sessionId)) {
		return null
	}
	const row = await loadExperimentalReviewShellSessionRow(userId, sessionId)
	if (row === null) {
		return null
	}
	const [performance, wrongItems] = await Promise.all([
		loadExperimentalPerformance(sessionId, userId),
		loadExperimentalWrongItems(sessionId, userId)
	])
	const surfacedStrategies = await loadExperimentalSurfacedStrategies(
		performance,
		userId,
		sessionId
	)
	return {
		sessionId: row.id,
		sessionType: mapExperimentalSessionTypeToShell(row.type),
		pacingMinutes: undefined,
		performance,
		wrongItems,
		surfacedStrategies,
		endSessionTier: null
	}
}

export { loadExperimentalPostSessionInfo, mapExperimentalSessionTypeToShell }
