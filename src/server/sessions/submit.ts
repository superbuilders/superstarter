// submitAttempt — underlying function. Writes one row to `attempts`,
// then asks the selection engine for the next item. SPEC §7.2 / Plan §4.4
// (selection echo-back).
//
// The `selection` payload is opaque from the FocusShell's perspective: it
// receives an ItemSelection on the previous getNextItem call and echoes
// it back unchanged here. We trust the echo — the values came from us
// one request earlier.
//
// Latency tripwire (Plan §9.1): a `latencyMs` value above 5 minutes is
// almost certainly evidence that the <ItemSlot>-keyed mount effect was
// refactored away. Throw rather than write a bogus row.

import * as errors from "@superbuilders/errors"
import { z } from "zod"
import type { Difficulty } from "@/config/sub-types"
import { db } from "@/db"
import { attempts } from "@/db/schemas/practice/attempts"
import { logger } from "@/logger"
import {
	type FallbackLevel,
	getNextItem,
	type ItemForRender,
	type ItemSelection
} from "@/server/items/selection"
import {
	ErrSessionAlreadyEnded,
	readItemAnswerAndDifficulty,
	readSession
} from "@/server/sessions/queries"

const ErrLatencyAnchorBroken = errors.new("latency anchor produced an out-of-band value")
const ErrInvalidSubmitInput = errors.new("invalid submitAttempt input")
const ErrInsertFailed = errors.new("attempts insert returned no rows")

const FIVE_MINUTES_MS = 5 * 60_000

const tierSchema = z.enum(["easy", "medium", "hard", "brutal"])
const fallbackLevelSchema = z.enum(["fresh", "session-soft", "recency-soft", "tier-degraded"])

const selectionSchema = z.object({
	servedAtTier: tierSchema,
	fallbackFromTier: tierSchema.optional(),
	fallbackLevel: fallbackLevelSchema
})

const submitInputSchema = z.object({
	sessionId: z.string().uuid(),
	itemId: z.string().uuid(),
	selectedAnswer: z.string().min(1).optional(),
	latencyMs: z.number().int().nonnegative(),
	selection: selectionSchema
})

interface SubmitAttemptInput {
	sessionId: string
	itemId: string
	selectedAnswer?: string
	latencyMs: number
	selection: ItemSelection
}

interface SubmitAttemptResult {
	nextItem?: ItemForRender
}

async function submitAttempt(input: SubmitAttemptInput): Promise<SubmitAttemptResult> {
	const parsed = submitInputSchema.safeParse(input)
	if (!parsed.success) {
		logger.error({ issues: parsed.error.issues }, "submitAttempt: input failed schema validation")
		throw errors.wrap(ErrInvalidSubmitInput, "input schema")
	}
	const data = parsed.data

	if (data.latencyMs > FIVE_MINUTES_MS) {
		// Tripwire per plan §9.1. No legitimate item should ever produce a
		// >5-minute latency — if we see one, the <ItemSlot>-keyed mount
		// effect is almost certainly broken and the value is "time since
		// session start" instead of "time since item paint."
		logger.error(
			{ sessionId: data.sessionId, itemId: data.itemId, latencyMs: data.latencyMs },
			"submitAttempt: latency anchor tripwire fired (>5 minutes)"
		)
		throw errors.wrap(ErrLatencyAnchorBroken, `latencyMs ${data.latencyMs} exceeds 5 minutes`)
	}

	const sessionRow = await readSession(data.sessionId)
	if (sessionRow.endedAtMs !== null) {
		logger.warn(
			{ sessionId: data.sessionId, endedAtMs: sessionRow.endedAtMs },
			"submitAttempt: session already ended"
		)
		throw errors.wrap(ErrSessionAlreadyEnded, `session id '${data.sessionId}'`)
	}

	const item = await readItemAnswerAndDifficulty(data.itemId)
	const correct = data.selectedAnswer !== undefined && data.selectedAnswer === item.correctAnswer

	const servedAtTier: Difficulty = data.selection.servedAtTier
	const fallbackFromTier: Difficulty | undefined = data.selection.fallbackFromTier
	const fallbackLevel: FallbackLevel = data.selection.fallbackLevel

	const insertResult = await errors.try(
		db
			.insert(attempts)
			.values({
				sessionId: data.sessionId,
				itemId: data.itemId,
				selectedAnswer: data.selectedAnswer,
				correct,
				latencyMs: Math.floor(data.latencyMs),
				servedAtTier,
				fallbackFromTier,
				metadataJson: { fallback_level: fallbackLevel }
			})
			.returning({ id: attempts.id })
	)
	if (insertResult.error) {
		logger.error(
			{ error: insertResult.error, sessionId: data.sessionId, itemId: data.itemId },
			"submitAttempt: insert failed"
		)
		throw errors.wrap(insertResult.error, "submitAttempt insert")
	}
	const inserted = insertResult.data[0]
	if (!inserted) {
		logger.error(
			{ sessionId: data.sessionId, itemId: data.itemId },
			"submitAttempt: insert returning empty"
		)
		throw errors.wrap(ErrInsertFailed, `session '${data.sessionId}' item '${data.itemId}'`)
	}

	logger.info(
		{
			sessionId: data.sessionId,
			itemId: data.itemId,
			correct,
			latencyMs: data.latencyMs,
			servedAtTier,
			fallbackFromTier,
			fallbackLevel,
			attemptId: inserted.id
		},
		"submitAttempt: attempt inserted"
	)

	const nextItem = await getNextItem(data.sessionId)
	if (nextItem === undefined) {
		return {}
	}
	return { nextItem }
}

export type { SubmitAttemptInput, SubmitAttemptResult }
export { ErrInsertFailed, ErrInvalidSubmitInput, ErrLatencyAnchorBroken, submitAttempt }
