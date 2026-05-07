// Selection-engine dispatch — Phase 3 + v1-code-cleanup (2026-05-04) +
// Phase 5 sub-phase 2 (adaptive walker, 2026-05-06).
//
// Plan §4.1–§4.4. `getNextItem(sessionId)` resolves the session's
// strategy from `practice_sessions.type`, then dispatches over a switch.
//
// v1 ships 'fixed_curve' (diagnostic / full_length / simulation) and
// 'adaptive' (drill). The 'review_queue' strategy and 'review' session
// type were cut from v1 2026-05-04 (PRD §4.3 + SPEC §3.5 markers); the
// transitional 'uniform_band' strategy was removed by Phase 5 sub-phase
// 2 commit 3 once the adaptive walker (SPEC §9.1) shipped.
//
// All strategies obey the SAME serverless-state-derivation rule: no
// in-memory state survives across calls. The recency-excluded set is
// materialized at session start (§3.2); within-session attempted items
// are read from the `attempts` table on every call.

import * as errors from "@superbuilders/errors"
import { and, desc, eq } from "drizzle-orm"
import { z } from "zod"
import { type Difficulty, type SubTypeId, subTypeIds, subTypes } from "@/config/sub-types"
import { shuffledDiagnosticOrder } from "@/config/diagnostic-mix"
import { generateFullLengthSlots } from "@/config/difficulty-curves"
import { db } from "@/db"
import { attempts } from "@/db/schemas/practice/attempts"
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
import { median } from "@/server/mastery/compute"

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

type SelectionStrategy = "fixed_curve" | "adaptive"
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

// Resolve the strategy from session.type. Drill uses the adaptive
// walker (SPEC §9.1); diagnostic / full_length / simulation use the
// pre-set per-slot tier from diagnostic-mix.ts / difficulty-curves.ts.
function selectionStrategyForSession(type: SessionType): SelectionStrategy {
	if (type === "diagnostic") return "fixed_curve"
	if (type === "drill") return "adaptive"
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

interface AdaptiveContext {
	last10Correct: ReadonlyArray<boolean>
	last10LatencyMs: ReadonlyArray<number>
	currentTier: Difficulty
	latencyThresholdMs: number
}

function stepUp(tier: Difficulty): Difficulty {
	const idx = TIER_ORDER_DESCENDING.indexOf(tier)
	if (idx < 0) {
		logger.error({ tier }, "stepUp: tier not in known order")
		throw errors.new("stepUp: unknown tier")
	}
	if (idx === 0) {
		// Already at brutal (top of TIER_ORDER_DESCENDING) — clamp.
		return tier
	}
	const next = TIER_ORDER_DESCENDING[idx - 1]
	if (next === undefined) {
		logger.error({ tier, idx }, "stepUp: next-tier index unreachable")
		throw errors.new("stepUp: next-tier unreachable")
	}
	return next
}

function stepDown(tier: Difficulty): Difficulty {
	const idx = TIER_ORDER_DESCENDING.indexOf(tier)
	if (idx < 0) {
		logger.error({ tier }, "stepDown: tier not in known order")
		throw errors.new("stepDown: unknown tier")
	}
	if (idx === TIER_ORDER_DESCENDING.length - 1) {
		// Already at easy (bottom of TIER_ORDER_DESCENDING) — clamp.
		return tier
	}
	const next = TIER_ORDER_DESCENDING[idx + 1]
	if (next === undefined) {
		logger.error({ tier, idx }, "stepDown: next-tier index unreachable")
		throw errors.new("stepDown: next-tier unreachable")
	}
	return next
}

// PRD §4.2 + SPEC §9.1 last-10-attempts running-window floor. The
// walker holds at the initial tier until this many in-session attempts
// accumulate, then begins stepping. Exported so consumers outside the
// walker can reference the same threshold — sub-phase 5's belt-
// indicator labels its pre-floor branch ("calibrating") off this
// constant.
const ADAPTIVE_FLOOR_ATTEMPTS = 10

// SPEC §9.1 adaptive difficulty stepper. Pure function over the last
// 10 in-session attempts: holds before the 10-attempt floor; steps up
// on (accuracy ≥ 0.9 AND median latency < 0.8× threshold); steps down
// on (accuracy ≤ 0.6 OR median latency > 1.2× threshold); holds
// otherwise. The 0.8×/1.2× zone widths match PRD §4.2's "comfortably
// under"/"well above" framing. Sub-phase 2 commit 1 lands the function
// dormant; commit 2 wires it into the drill arm of getNextItem.
function nextDifficultyTier(ctx: AdaptiveContext): Difficulty {
	if (ctx.last10Correct.length < ADAPTIVE_FLOOR_ATTEMPTS) {
		return ctx.currentTier
	}
	const correctCount = ctx.last10Correct.filter(function isTrue(b) {
		return b
	}).length
	const accuracy = correctCount / ctx.last10Correct.length
	const medianLatency = median(ctx.last10LatencyMs)
	if (accuracy >= 0.9 && medianLatency < ctx.latencyThresholdMs * 0.8) {
		return stepUp(ctx.currentTier)
	}
	if (accuracy <= 0.6 || medianLatency > ctx.latencyThresholdMs * 1.2) {
		return stepDown(ctx.currentTier)
	}
	return ctx.currentTier
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
	// Per-session deterministic slot resolution by session type:
	//   - diagnostic  → shuffledDiagnosticOrder (50-entry curated mix from
	//                   src/config/diagnostic-mix.ts; same sessionId →
	//                   same permutation per phase-3-polish §3.3 / §4.1).
	//   - full_length → generateFullLengthSlots (50-slot per-decile
	//                   cross-sub-type-interleaved generator from
	//                   src/config/difficulty-curves.ts; phase5-full-
	//                   length-test plan §3 / Q12.1; sub-types repeat
	//                   across slots, item-ids never repeat per the
	//                   downstream pickWithFallback's sessionAttemptedIds
	//                   exclusion).
	//   - simulation  → not yet supported (phase 6); throws.
	//   - drill       → unreachable here; getNextItem dispatches drill to
	//                   getNextAdaptive (selectionStrategyForSession returns
	//                   'adaptive' for drill). Throws defensively.
	let slot: { subTypeId: SubTypeId; difficulty: Difficulty } | undefined
	let mixSize: number
	if (ctx.type === "diagnostic") {
		const order = shuffledDiagnosticOrder(ctx.id)
		mixSize = order.length
		slot = order[attemptIndex]
	} else if (ctx.type === "full_length") {
		const order = generateFullLengthSlots(ctx.id)
		mixSize = order.length
		slot = order[attemptIndex]
	} else {
		logger.error(
			{ sessionId: ctx.id, type: ctx.type },
			"getNextFixedCurve: type not yet supported on fixed_curve path"
		)
		throw errors.new("fixed_curve does not support session type")
	}
	if (!slot) {
		logger.error(
			{ sessionId: ctx.id, attemptIndex, mixSize },
			"getNextFixedCurve: mix index out of range"
		)
		throw errors.wrap(ErrDiagnosticMixOutOfRange, `attemptIndex ${attemptIndex} >= ${mixSize}`)
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

// SPEC §9.1 initial-tier table — the adaptive walker uses this for the
// drill's starting tier (empty in-session window) and then walks via
// nextDifficultyTier from attempt 11 onward.
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

const ErrSubTypeConfigMissing = errors.new("sub type config missing")

function latencyThresholdFor(subTypeId: SubTypeId): number {
	const cfg = subTypes.find(function bySubTypeId(s) {
		return s.id === subTypeId
	})
	if (!cfg) {
		logger.error({ subTypeId }, "latencyThresholdFor: sub type config missing")
		throw errors.wrap(ErrSubTypeConfigMissing, `sub type id '${subTypeId}'`)
	}
	return cfg.latencyThresholdMs
}

interface InSessionWindowRow {
	correct: boolean
	latencyMs: number
	servedAtTier: Difficulty
}

// Reads the most recent 10 in-session attempts (rev-chronological by
// `attempts.id`, the UUIDv7 PK whose 48-bit prefix is unix-ms). Drill is
// sub-type-locked per the route param, so all in-session attempts are on
// `ctx.subTypeId` by construction — no sub_type_id filter is needed
// (plan §9.6). The `attempts_session_id_idx` index covers the WHERE.
async function readInSessionAttemptWindow(sessionId: string): Promise<InSessionWindowRow[]> {
	const result = await errors.try(
		db
			.select({
				correct: attempts.correct,
				latencyMs: attempts.latencyMs,
				servedAtTier: attempts.servedAtTier
			})
			.from(attempts)
			.where(eq(attempts.sessionId, sessionId))
			.orderBy(desc(attempts.id))
			.limit(ADAPTIVE_FLOOR_ATTEMPTS)
	)
	if (result.error) {
		logger.error(
			{ error: result.error, sessionId },
			"readInSessionAttemptWindow: query failed"
		)
		throw errors.wrap(result.error, "readInSessionAttemptWindow")
	}
	return result.data
}

// SPEC §9.1 adaptive-walker drill arm. Reads the in-session attempt
// window, derives `currentTier` from the most-recent attempt's
// `served_at_tier` (per SPEC §9.1 last paragraph: fallback-served items
// affect the walk based on what the user actually experienced) — or
// `initialTierFor(masteryState)` when the window is empty (session
// start). nextDifficultyTier holds across the first 10 attempts (the
// floor) and steps thereafter; the existing pickWithFallback chain
// handles tier-exhaustion (recency-soft → tier-degraded → session-soft).
async function getNextAdaptive(ctx: SessionContext): Promise<ItemForRender | undefined> {
	if (ctx.subTypeId === null) {
		logger.error({ sessionId: ctx.id }, "getNextAdaptive: session has no sub_type_id")
		throw errors.wrap(ErrUnsupportedStrategyForSubType, `session id '${ctx.id}'`)
	}
	const subTypeId = ctx.subTypeId

	const window = await readInSessionAttemptWindow(ctx.id)
	const last10Correct = window.map(function pickCorrect(r) {
		return r.correct
	})
	const last10LatencyMs = window.map(function pickLatency(r) {
		return r.latencyMs
	})

	let currentTier: Difficulty
	if (window.length === 0) {
		const state = await readMasteryStateFor(ctx.userId, subTypeId)
		currentTier = initialTierFor(state)
	} else {
		const mostRecent = window[0]
		if (!mostRecent) {
			logger.error(
				{ sessionId: ctx.id, windowLength: window.length },
				"getNextAdaptive: window non-empty but row[0] undefined (impossible)"
			)
			throw errors.new("getNextAdaptive: window row[0] undefined")
		}
		currentTier = mostRecent.servedAtTier
	}

	const latencyThresholdMs = latencyThresholdFor(subTypeId)
	const requestedTier = nextDifficultyTier({
		last10Correct,
		last10LatencyMs,
		currentTier,
		latencyThresholdMs
	})

	const sessionAttemptedIds = await readSessionAttemptedItemIds(ctx.id)
	const picked = await pickWithFallback({
		subTypeId,
		requestedTier,
		recencyExcludedIds: ctx.recencyExcludedItemIds,
		sessionAttemptedIds,
		sessionIdSalt: ctx.id
	})
	if (!picked) {
		logger.warn(
			{ sessionId: ctx.id, subTypeId, requestedTier },
			"getNextAdaptive: no item available even after full fallback chain"
		)
		return undefined
	}

	logger.debug(
		{
			sessionId: ctx.id,
			subTypeId,
			windowSize: window.length,
			currentTier,
			requestedTier,
			servedAtTier: picked.servedAtTier,
			fallbackLevel: picked.fallbackLevel,
			itemId: picked.row.id
		},
		"getNextAdaptive: served"
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
	if (strategy === "adaptive") return getNextAdaptive(ctx)
	const _exhaustive: never = strategy
	return _exhaustive
}

export type {
	AdaptiveContext,
	FallbackLevel,
	ItemForRender,
	ItemSelection,
	SelectionStrategy,
	SessionType
}
export {
	ADAPTIVE_FLOOR_ATTEMPTS,
	ErrDiagnosticMixOutOfRange,
	ErrInvalidItemBody,
	ErrInvalidOptions,
	ErrSessionNotFound,
	ErrUnsupportedStrategyForSubType,
	getNextItem,
	initialTierFor,
	nextDifficultyTier,
	selectionStrategyForSession
}
