// Selection-engine dispatch — Phase 3 + v1-code-cleanup (2026-05-04).
//
// Plan §4.1–§4.4. `getNextItem(sessionId)` resolves the session's
// strategy from `practice_sessions.type`, then dispatches over a switch.
//
// Phase 3 ships 'fixed_curve' (diagnostic) and 'uniform_band'
// (drill) fully. 'adaptive' is a throwing stub — unreachable from any
// v1 call site, but present in the switch so the type-checker enforces
// exhaustiveness against SelectionStrategy. Phase 5 sub-phase 2 closes
// the adaptive deferral. The 'review_queue' strategy and 'review'
// session type were cut from v1 2026-05-04 (PRD §4.3 + SPEC §3.5
// markers) and dropped here in the same round.
//
// All strategies obey the SAME serverless-state-derivation rule: no
// in-memory state survives across calls. The recency-excluded set is
// materialized at session start (§3.2); within-session attempted items
// are read from the `attempts` table on every call.

import * as errors from "@superbuilders/errors"
import { and, eq } from "drizzle-orm"
import { z } from "zod"
import { type Difficulty, type SubTypeId, subTypeIds } from "@/config/sub-types"
import { shuffledDiagnosticOrder } from "@/config/diagnostic-mix"
import { db } from "@/db"
import { masteryState } from "@/db/schemas/practice/mastery-state"
import { practiceSessions } from "@/db/schemas/practice/practice-sessions"
import { logger } from "@/logger"
import { itemBody, type ItemBody } from "@/server/items/body-schema"
import {
	countAttemptsInSession,
	pickItemRow,
	readSessionAttemptedItemIds,
	type SelectedRow
} from "@/server/items/queries"

const optionsJsonSchema = z
	.array(
		z.object({
			id: z.string().min(1),
			text: z.string().min(1)
		})
	)
	.min(2)
	.max(5)

const ErrSessionNotFound = errors.new("session not found")
const ErrInvalidItemBody = errors.new("invalid item body")
const ErrInvalidOptions = errors.new("invalid options shape")
const ErrAdaptiveDeferred = errors.new("adaptive strategy deferred to phase 5")
const ErrDiagnosticMixOutOfRange = errors.new("diagnostic mix index out of range")
const ErrUnsupportedStrategyForSubType = errors.new(
	"strategy requires a sub_type_id but the session has none"
)
const ErrUnknownSubTypeId = errors.new("sub_type_id is not in the v1 SubTypeId union")

const subTypeIdSet: ReadonlySet<string> = new Set<string>(subTypeIds)
function asSubTypeId(s: string): SubTypeId {
	if (!subTypeIdSet.has(s)) {
		logger.error({ subTypeId: s }, "asSubTypeId: value not in v1 SubTypeId union")
		throw errors.wrap(ErrUnknownSubTypeId, `value '${s}'`)
	}
	// subTypeIds is `as const`, so membership is sufficient narrowing.
	const matched = subTypeIds.find(function eq(known) {
		return known === s
	})
	if (!matched) {
		logger.error({ subTypeId: s }, "asSubTypeId: post-guard miss (impossible)")
		throw errors.wrap(ErrUnknownSubTypeId, `post-guard miss for '${s}'`)
	}
	return matched
}

type SelectionStrategy = "fixed_curve" | "uniform_band" | "adaptive"
type SessionType = "diagnostic" | "drill" | "full_length" | "simulation"
type FallbackLevel = "fresh" | "session-soft" | "recency-soft" | "tier-degraded"

interface ItemSelection {
	servedAtTier: Difficulty
	fallbackFromTier?: Difficulty
	fallbackLevel: FallbackLevel
}

interface ItemForRender {
	id: string
	body: ItemBody
	options: { id: string; text: string }[]
	selection: ItemSelection
}

interface SessionContext {
	id: string
	userId: string
	type: SessionType
	subTypeId: SubTypeId | null
	targetQuestionCount: number
	recencyExcludedItemIds: ReadonlyArray<string>
}

// Resolve the strategy from session.type. Phase 5 sub-phase 2 changes
// the `drill → uniform_band` line to `drill → adaptive` and fills in
// the `'adaptive'` branch in dispatch — no other call site moves.
function selectionStrategyForSession(type: SessionType): SelectionStrategy {
	if (type === "diagnostic") return "fixed_curve"
	if (type === "drill") return "uniform_band"
	if (type === "full_length") return "fixed_curve"
	if (type === "simulation") return "fixed_curve"
	const _exhaustive: never = type
	return _exhaustive
}

async function loadSessionContext(sessionId: string): Promise<SessionContext> {
	const result = await errors.try(
		db
			.select({
				id: practiceSessions.id,
				userId: practiceSessions.userId,
				type: practiceSessions.type,
				subTypeId: practiceSessions.subTypeId,
				targetQuestionCount: practiceSessions.targetQuestionCount,
				recencyExcludedItemIds: practiceSessions.recencyExcludedItemIds
			})
			.from(practiceSessions)
			.where(eq(practiceSessions.id, sessionId))
			.limit(1)
	)
	if (result.error) {
		logger.error({ error: result.error, sessionId }, "loadSessionContext: query failed")
		throw errors.wrap(result.error, "loadSessionContext")
	}
	const row = result.data[0]
	if (!row) {
		logger.warn({ sessionId }, "loadSessionContext: session row missing")
		throw errors.wrap(ErrSessionNotFound, `session id '${sessionId}'`)
	}
	if (row.type === "review") {
		logger.error({ sessionId, type: row.type }, "loadSessionContext: 'review' session type cut from v1")
		throw errors.wrap(ErrSessionNotFound, `session '${sessionId}' has cut session_type 'review'`)
	}
	return {
		id: row.id,
		userId: row.userId,
		type: row.type,
		subTypeId: row.subTypeId === null ? null : asSubTypeId(row.subTypeId),
		targetQuestionCount: row.targetQuestionCount,
		recencyExcludedItemIds: row.recencyExcludedItemIds
	}
}

const TIER_ORDER_DESCENDING: ReadonlyArray<Difficulty> = ["brutal", "hard", "medium", "easy"]

function tiersDownFrom(start: Difficulty): ReadonlyArray<Difficulty> {
	const idx = TIER_ORDER_DESCENDING.indexOf(start)
	if (idx < 0) {
		// Shouldn't happen given Difficulty's literal type; defensive.
		logger.error({ start }, "tiersDownFrom: tier not in known order")
		return [start]
	}
	return TIER_ORDER_DESCENDING.slice(idx)
}

function decodeRow(row: SelectedRow): { body: ItemBody; options: { id: string; text: string }[] } {
	const bodyParse = itemBody.safeParse(row.body)
	if (!bodyParse.success) {
		logger.error(
			{ itemId: row.id, issues: bodyParse.error.issues },
			"decodeRow: item body schema invalid"
		)
		throw errors.wrap(ErrInvalidItemBody, `item id '${row.id}'`)
	}
	const optionsParse = optionsJsonSchema.safeParse(row.optionsJson)
	if (!optionsParse.success) {
		logger.error(
			{ itemId: row.id, issues: optionsParse.error.issues },
			"decodeRow: options_json schema invalid"
		)
		throw errors.wrap(ErrInvalidOptions, `item id '${row.id}'`)
	}
	return { body: bodyParse.data, options: optionsParse.data }
}

interface PickWithFallbackArgs {
	subTypeId: SubTypeId
	requestedTier: Difficulty
	recencyExcludedIds: ReadonlyArray<string>
	sessionAttemptedIds: ReadonlyArray<string>
	sessionIdSalt: string
}

interface PickWithFallbackResult {
	row: SelectedRow
	servedAtTier: Difficulty
	fallbackFromTier?: Difficulty
	fallbackLevel: FallbackLevel
}

// Fallback chain (plan §4.2 + SPEC §9.2):
//   1. fresh         — exclude (recency ∪ session) at requested tier.
//   2. recency-soft  — drop recency; still exclude session, at requested tier.
//   3. tier-degraded — drop one tier (and recurse 1→2 there). Repeats until
//                      `easy` is exhausted.
//   4. session-soft  — last resort; drop session-uniqueness at requested
//                      tier and pick the oldest. Only fires if every tier
//                      including easy ran out under session-uniqueness; with
//                      the 55-item seed bank this is unreachable, but the
//                      branch keeps `getNextItem` total per SPEC §9.2.
async function pickWithFallback(args: PickWithFallbackArgs): Promise<PickWithFallbackResult | null> {
	const sessionExcl = args.sessionAttemptedIds
	const allExcl = [...args.recencyExcludedIds, ...args.sessionAttemptedIds]

	const tiers = tiersDownFrom(args.requestedTier)
	for (const tier of tiers) {
		// Pass 1: fresh (recency ∪ session)
		const fresh = await pickItemRow({
			subTypeId: args.subTypeId,
			tier,
			excludedIds: allExcl,
			sessionIdSalt: args.sessionIdSalt
		})
		if (fresh) {
			if (tier === args.requestedTier) {
				return { row: fresh, servedAtTier: tier, fallbackLevel: "fresh" }
			}
			return {
				row: fresh,
				servedAtTier: tier,
				fallbackFromTier: args.requestedTier,
				fallbackLevel: "tier-degraded"
			}
		}
		// Pass 2: recency-soft (session-only excluded)
		const recencySoft = await pickItemRow({
			subTypeId: args.subTypeId,
			tier,
			excludedIds: sessionExcl,
			sessionIdSalt: args.sessionIdSalt
		})
		if (recencySoft) {
			if (tier === args.requestedTier) {
				return { row: recencySoft, servedAtTier: tier, fallbackLevel: "recency-soft" }
			}
			return {
				row: recencySoft,
				servedAtTier: tier,
				fallbackFromTier: args.requestedTier,
				fallbackLevel: "tier-degraded"
			}
		}
	}

	// Pass 4: last resort — session-soft at requested tier (allow repeat).
	const sessionSoft = await pickItemRow({
		subTypeId: args.subTypeId,
		tier: args.requestedTier,
		excludedIds: [],
		sessionIdSalt: args.sessionIdSalt
	})
	if (sessionSoft) {
		return {
			row: sessionSoft,
			servedAtTier: args.requestedTier,
			fallbackLevel: "session-soft"
		}
	}
	return null
}

function buildItemForRender(row: SelectedRow, selection: ItemSelection): ItemForRender {
	const decoded = decodeRow(row)
	return {
		id: row.id,
		body: decoded.body,
		options: decoded.options,
		selection
	}
}

async function getNextFixedCurve(
	ctx: SessionContext,
	attemptIndex: number
): Promise<ItemForRender | undefined> {
	if (ctx.type !== "diagnostic") {
		// Phase 3 only ships diagnostic on the fixed_curve path — full_length
		// and simulation reuse this branch in Phase 5 against
		// difficulty-curves.ts. Throwing here is deliberate.
		logger.error(
			{ sessionId: ctx.id, type: ctx.type },
			"getNextFixedCurve: only diagnostic supported in phase 3"
		)
		throw errors.new("fixed_curve only supports diagnostic in phase 3")
	}

	// Per-session deterministic shuffle: same sessionId always returns the
	// same permutation; different sessionIds produce different orders. The
	// `(subTypeId, difficulty)` multiset is identical to `diagnosticMix` —
	// only the order changes. Reversal of the implicit Phase 3 array-order
	// contract per docs/plans/phase-3-polish-practice-surface-features.md
	// §3.3 / §4.1.
	const order = shuffledDiagnosticOrder(ctx.id)
	const slot = order[attemptIndex]
	if (!slot) {
		logger.error(
			{ sessionId: ctx.id, attemptIndex, mixSize: order.length },
			"getNextFixedCurve: mix index out of range"
		)
		throw errors.wrap(
			ErrDiagnosticMixOutOfRange,
			`attemptIndex ${attemptIndex} >= ${order.length}`
		)
	}

	const sessionAttemptedIds = await readSessionAttemptedItemIds(ctx.id)
	const picked = await pickWithFallback({
		subTypeId: slot.subTypeId,
		requestedTier: slot.difficulty,
		recencyExcludedIds: ctx.recencyExcludedItemIds,
		sessionAttemptedIds,
		sessionIdSalt: ctx.id
	})

	if (!picked) {
		logger.warn(
			{ sessionId: ctx.id, slot, attemptIndex },
			"getNextFixedCurve: no item available even after full fallback chain"
		)
		return undefined
	}

	logger.debug(
		{
			sessionId: ctx.id,
			attemptIndex,
			subTypeId: slot.subTypeId,
			requestedTier: slot.difficulty,
			servedAtTier: picked.servedAtTier,
			fallbackLevel: picked.fallbackLevel,
			itemId: picked.row.id
		},
		"getNextFixedCurve: served"
	)

	return buildItemForRender(picked.row, {
		servedAtTier: picked.servedAtTier,
		fallbackFromTier: picked.fallbackFromTier,
		fallbackLevel: picked.fallbackLevel
	})
}

async function readMasteryStateFor(
	userId: string,
	subTypeId: SubTypeId
): Promise<{ currentState: "learning" | "fluent" | "mastered" | "decayed"; wasMastered: boolean } | undefined> {
	const result = await errors.try(
		db
			.select({
				currentState: masteryState.currentState,
				wasMastered: masteryState.wasMastered
			})
			.from(masteryState)
			.where(
				and(eq(masteryState.userId, userId), eq(masteryState.subTypeId, subTypeId))
			)
			.limit(1)
	)
	if (result.error) {
		logger.error(
			{ error: result.error, userId, subTypeId },
			"readMasteryStateFor: query failed"
		)
		throw errors.wrap(result.error, "readMasteryStateFor")
	}
	return result.data[0]
}

// SPEC §9.1 initial-tier table — used by Phase 3's uniform_band as a
// constant band for the whole drill (no walking). Phase 5 sub-phase 2's
// adaptive walker uses the same table for the drill's starting tier and
// then walks via nextDifficultyTier.
//
// Brutal-mode early-return + speed-ramp shift-down branches were dropped
// in v1-code-cleanup 2026-05-04 (PRD §4.4 + SPEC §3.4 markers). Brutal
// difficulty *tier* still exists as an `item_difficulty` value; the
// adaptive walker can serve Brutal-tier items inside Standard drills via
// the next-harder-tier step.
function initialTierFor(
	state: { currentState: "learning" | "fluent" | "mastered" | "decayed"; wasMastered: boolean } | undefined
): Difficulty {
	if (state === undefined) return "medium"
	const cs = state.currentState
	const wm = state.wasMastered
	if (cs === "learning") {
		if (wm) return "medium"
		return "easy"
	}
	if (cs === "fluent") return "medium"
	if (cs === "mastered") return "hard"
	if (cs === "decayed") return "medium"
	const _exhaustive: never = cs
	return _exhaustive
}

async function getNextUniformBand(ctx: SessionContext): Promise<ItemForRender | undefined> {
	if (ctx.subTypeId === null) {
		logger.error({ sessionId: ctx.id }, "getNextUniformBand: session has no sub_type_id")
		throw errors.wrap(ErrUnsupportedStrategyForSubType, `session id '${ctx.id}'`)
	}
	const subTypeId = ctx.subTypeId

	const state = await readMasteryStateFor(ctx.userId, subTypeId)
	const tier = initialTierFor(state)

	const sessionAttemptedIds = await readSessionAttemptedItemIds(ctx.id)
	const picked = await pickWithFallback({
		subTypeId,
		requestedTier: tier,
		recencyExcludedIds: ctx.recencyExcludedItemIds,
		sessionAttemptedIds,
		sessionIdSalt: ctx.id
	})
	if (!picked) {
		logger.warn(
			{ sessionId: ctx.id, subTypeId, tier },
			"getNextUniformBand: no item available even after full fallback chain"
		)
		return undefined
	}

	logger.debug(
		{
			sessionId: ctx.id,
			subTypeId,
			requestedTier: tier,
			servedAtTier: picked.servedAtTier,
			fallbackLevel: picked.fallbackLevel,
			itemId: picked.row.id
		},
		"getNextUniformBand: served"
	)

	return buildItemForRender(picked.row, {
		servedAtTier: picked.servedAtTier,
		fallbackFromTier: picked.fallbackFromTier,
		fallbackLevel: picked.fallbackLevel
	})
}

async function getNextItem(sessionId: string): Promise<ItemForRender | undefined> {
	const ctx = await loadSessionContext(sessionId)
	const attemptCount = await countAttemptsInSession(sessionId)
	if (attemptCount >= ctx.targetQuestionCount) {
		logger.debug(
			{ sessionId, attemptCount, targetQuestionCount: ctx.targetQuestionCount },
			"getNextItem: session quota reached"
		)
		return undefined
	}

	const strategy = selectionStrategyForSession(ctx.type)
	if (strategy === "fixed_curve") return getNextFixedCurve(ctx, attemptCount)
	if (strategy === "uniform_band") return getNextUniformBand(ctx)
	if (strategy === "adaptive") {
		logger.error(
			{ sessionId, strategy },
			"getNextItem: adaptive strategy invoked in phase 3"
		)
		throw ErrAdaptiveDeferred
	}
	const _exhaustive: never = strategy
	return _exhaustive
}

export type {
	FallbackLevel,
	ItemForRender,
	ItemSelection,
	SelectionStrategy,
	SessionType
}
export {
	ErrAdaptiveDeferred,
	ErrDiagnosticMixOutOfRange,
	ErrInvalidItemBody,
	ErrInvalidOptions,
	ErrSessionNotFound,
	ErrUnsupportedStrategyForSubType,
	getNextItem,
	initialTierFor,
	selectionStrategyForSession
}
