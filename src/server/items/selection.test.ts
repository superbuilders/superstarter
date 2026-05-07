// DB-driven tests for the diagnostic selection engine — plan
// docs/plans/phase3-diagnostic-flow.md §3 (sampling determinism).
//
// These tests exercise:
//
//   - Within-cell determinism: pickItemRow called twice with the same
//     (subTypeId, tier, excludedIds, sessionIdSalt) returns the same
//     item id. The selection's md5(items.id::text || salt) ORDER BY
//     gives a deterministic permutation per (cell, salt) pair.
//
//   - Within-cell variation across sessions: pickItemRow with different
//     salts produces varied first-served items. Statistical: with 20
//     distinct salts, at least 2 distinct items must surface (under a
//     uniform hash, the probability of all 20 collapsing to one item
//     is vanishingly small for any cell with ≥2 live items).
//
//   - No-re-serve within a session: drive the diagnostic to quota
//     completion (mix-derived per phase5-data-wipe plan Q1: the
//     diagnostic's target question count IS diagnosticMix.length);
//     assert all attempt.item_id values are distinct. The selection
//     engine's session-attempted-ids exclusion is what guarantees this.
//
// Tests assume the local docker postgres is up + seeded (db:seed +
// db:seed:items). Each test creates its own user and isolates state to
// that user.

import "@/env"
import { expect, test } from "bun:test"
import * as errors from "@superbuilders/errors"
import { and, count, eq } from "drizzle-orm"
import { diagnosticMix } from "@/config/diagnostic-mix"
import {
	generateFullLengthSlots,
	roundDecile,
	standardCurve
} from "@/config/difficulty-curves"
import { type Difficulty, type SubTypeId, subTypeIds } from "@/config/sub-types"
import { createAdminDb } from "@/db/admin"
import { attempts } from "@/db/schemas/practice/attempts"
import { items } from "@/db/schemas/catalog/items"
import { masteryState } from "@/db/schemas/practice/mastery-state"
import { users } from "@/db/schemas/auth/users"
import { logger } from "@/logger"
import type { ItemForRender } from "@/components/focus-shell/types"
import { pickItemRow } from "@/server/items/queries"
import { startSession } from "@/server/sessions/start"
import { submitAttempt } from "@/server/sessions/submit"

const ErrUserInsertEmpty = errors.new("selection-test: user insert returned no rows")
const ErrCellEmpty = errors.new("selection-test: dev DB has no live items in target cell")
const ErrCellTooSmall = errors.new("selection-test: dev DB has <2 live items in target cell")
const ErrPickReturnedNull = errors.new("selection-test: pickItemRow returned null unexpectedly")
const ErrUnexpectedNextItemAbsence = errors.new("selection-test: nextItem undefined before quota")

async function createTestUser(suffix: string): Promise<string> {
	await using adminDb = await createAdminDb()
	const email = `selection-test-${suffix}-${Date.now()}@local.dev`
	const result = await errors.try(
		adminDb.db
			.insert(users)
			.values({ email, name: "Selection Test" })
			.returning({ id: users.id })
	)
	if (result.error) {
		logger.error({ error: result.error, email }, "selection-test: user insert failed")
		throw errors.wrap(result.error, "user insert")
	}
	const u = result.data[0]
	if (!u) {
		logger.error({ email }, "selection-test: user insert returned no rows")
		throw ErrUserInsertEmpty
	}
	return u.id
}

async function liveCellItemCount(subTypeId: string): Promise<number> {
	await using adminDb = await createAdminDb()
	const result = await errors.try(
		adminDb.db
			.select({ n: count() })
			.from(items)
			.where(and(eq(items.subTypeId, subTypeId), eq(items.status, "live")))
	)
	if (result.error) {
		logger.error({ error: result.error, subTypeId }, "selection-test: live cell count failed")
		throw errors.wrap(result.error, "live cell count")
	}
	const row = result.data[0]
	if (!row) {
		logger.error({ subTypeId }, "selection-test: live cell count returned no rows (impossible)")
		throw errors.new("count returned no rows")
	}
	return row.n
}

test("pickItemRow: within-cell determinism — same (cell, salt) returns same item", async function withinCellDeterminism() {
	// Sentinel UUID; reused across the two pickItemRow calls so the md5
	// ORDER BY produces the same permutation both times.
	const salt = "11111111-1111-1111-1111-111111111111"
	const subTypeId = "verbal.antonyms"
	const tier = "medium"

	const liveCount = await liveCellItemCount(subTypeId)
	if (liveCount < 1) {
		logger.error({ subTypeId, tier }, "selection-test: cell empty, can't run determinism check")
		throw ErrCellEmpty
	}

	const first = await pickItemRow({ subTypeId, tier, excludedIds: [], sessionIdSalt: salt })
	const second = await pickItemRow({ subTypeId, tier, excludedIds: [], sessionIdSalt: salt })
	if (!first || !second) {
		logger.error({ first, second, subTypeId, tier }, "selection-test: pickItemRow returned null")
		throw ErrPickReturnedNull
	}
	expect(first.id).toBe(second.id)
})

test("pickItemRow: within-cell variation across sessions — different salts surface different items", async function withinCellVariationAcrossSessions() {
	const subTypeId = "verbal.antonyms"
	const tier = "medium"
	const liveCount = await liveCellItemCount(subTypeId)
	if (liveCount < 2) {
		// If the dev DB has only one live item in this cell, salt variation
		// is trivially monotone; skip with an explicit error rather than
		// silently passing.
		logger.error(
			{ subTypeId, tier, liveCount },
			"selection-test: cell <2 items, can't test salt variation"
		)
		throw ErrCellTooSmall
	}

	const seenIds = new Set<string>()
	// 20 distinct salts. With ≥2 live items and a uniform-hash ORDER BY,
	// the probability of all 20 collapsing to one item is at most
	// (1/2)^19 ≈ 2e-6. The set should have ≥2 entries with overwhelming
	// probability.
	for (let i = 0; i < 20; i += 1) {
		const salt = `aaaaaaaa-bbbb-cccc-dddd-${i.toString(16).padStart(12, "0")}`
		const row = await pickItemRow({ subTypeId, tier, excludedIds: [], sessionIdSalt: salt })
		if (row) seenIds.add(row.id)
	}
	expect(seenIds.size).toBeGreaterThanOrEqual(2)
})

test("getNextItem: no re-serve within a session — diagnostic completion produces all distinct item_ids", async function noReServeInSession() {
	// Mix is canonical (phase5-data-wipe plan Q1, Reading B). The
	// diagnostic's target_question_count derives from diagnosticMix.length
	// in start.ts:targetQuestionCountFor, so the loop bound here MUST also
	// derive from diagnosticMix.length — that's what keeps this test in
	// lockstep with the engine when the mix grows back to 50 in the
	// testbank-re-extraction round.
	const N = diagnosticMix.length
	const userId = await createTestUser("no-reserve")
	const start = await startSession({ userId, type: "diagnostic" })
	const sessionId = start.sessionId

	let next: ItemForRender = start.firstItem
	for (let i = 1; i < N; i += 1) {
		const r = await errors.try(
			submitAttempt({
				sessionId,
				itemId: next.id,
				selectedAnswer: next.options[0]?.id,
				latencyMs: 5000,
				triagePromptFired: false,
				triageTaken: false,
				selection: next.selection
			})
		)
		if (r.error) {
			logger.error({ error: r.error, sessionId, i }, "selection-test: submit failed")
			throw errors.wrap(r.error, "submit")
		}
		const data = r.data
		if (data.nextItem === undefined) {
			logger.error(
				{ sessionId, i },
				"selection-test: nextItem undefined before quota; mix exhausted early"
			)
			throw ErrUnexpectedNextItemAbsence
		}
		next = data.nextItem
	}

	// Final Nth submit — at the mix-exhausted boundary, getNextItem
	// returns undefined cleanly (because target_question_count = N =
	// diagnosticMix.length). The defensive ErrDiagnosticMixOutOfRange in
	// selection.ts:294-303 is unreachable from this path post-fix.
	const finalResult = await errors.try(
		submitAttempt({
			sessionId,
			itemId: next.id,
			selectedAnswer: next.options[0]?.id,
			latencyMs: 5000,
			triagePromptFired: false,
			triageTaken: false,
			selection: next.selection
		})
	)
	if (finalResult.error) {
		logger.error(
			{ error: finalResult.error, sessionId, attemptIndex: N },
			"selection-test: final submit failed"
		)
		throw errors.wrap(finalResult.error, "final submit")
	}
	expect(finalResult.data.nextItem).toBeUndefined()

	// Read all attempts back. Assert N rows, all distinct item_ids.
	await using adminDb = await createAdminDb()
	const rowsResult = await errors.try(
		adminDb.db
			.select({ itemId: attempts.itemId })
			.from(attempts)
			.where(eq(attempts.sessionId, sessionId))
	)
	if (rowsResult.error) {
		logger.error({ error: rowsResult.error, sessionId }, "selection-test: attempts read failed")
		throw errors.wrap(rowsResult.error, "read attempts")
	}
	const itemIds = rowsResult.data.map(function pickItemId(r) {
		return r.itemId
	})
	expect(itemIds.length).toBe(N)
	const distinct = new Set(itemIds)
	expect(distinct.size).toBe(N)
}, 60_000)

// Phase 5 sub-phase 2 commit 2 — adaptive walker integration tests
// (plan §5.2). Drive real drills via startSession + submitAttempt; seed
// mastery_state to control the initial tier; assert the walker holds
// across the 10-attempt floor and steps up after high-performance
// windows. Uses verbal.antonyms (latencyThresholdMs = 12_000; bank
// depth easy=11 medium=12 hard=12 — full coverage for step-up paths).

const ErrItemAnswerMissing = errors.new("selection-test: item correctAnswer not found")
const ADAPTIVE_TEST_SUB_TYPE = "verbal.antonyms"
const ADAPTIVE_TEST_LATENCY_THRESHOLD_MS = 12_000

async function readItemCorrectAnswer(itemId: string): Promise<string> {
	await using adminDb = await createAdminDb()
	const result = await errors.try(
		adminDb.db
			.select({ correctAnswer: items.correctAnswer })
			.from(items)
			.where(eq(items.id, itemId))
			.limit(1)
	)
	if (result.error) {
		logger.error({ error: result.error, itemId }, "selection-test: item answer read failed")
		throw errors.wrap(result.error, "read item answer")
	}
	const row = result.data[0]
	if (!row) {
		logger.error({ itemId }, "selection-test: item correctAnswer row missing")
		throw ErrItemAnswerMissing
	}
	return row.correctAnswer
}

function requestedTierForItem(item: ItemForRender): string {
	// SPEC §9.2 — the walker decides REQUESTED tier; pickWithFallback may
	// degrade. fallbackFromTier records the original request; absent →
	// fresh/recency-soft/session-soft at the served tier.
	if (item.selection.fallbackFromTier) {
		return item.selection.fallbackFromTier
	}
	return item.selection.servedAtTier
}

async function seedMasteryState(input: {
	userId: string
	subTypeId: string
	currentState: "learning" | "fluent" | "mastered" | "decayed"
	wasMastered: boolean
}): Promise<void> {
	await using adminDb = await createAdminDb()
	const result = await errors.try(
		adminDb.db.insert(masteryState).values({
			userId: input.userId,
			subTypeId: input.subTypeId,
			currentState: input.currentState,
			wasMastered: input.wasMastered,
			updatedAtMs: Date.now()
		})
	)
	if (result.error) {
		logger.error(
			{ error: result.error, userId: input.userId, subTypeId: input.subTypeId },
			"selection-test: mastery_state seed failed"
		)
		throw errors.wrap(result.error, "mastery_state seed")
	}
}

test("getNextAdaptive: initial tier from mastery_state — fluent + ¬wasMastered → medium", async function adaptiveInitialTierFromMasteryState() {
	const userId = await createTestUser("adaptive-initial")
	await seedMasteryState({
		userId,
		subTypeId: ADAPTIVE_TEST_SUB_TYPE,
		currentState: "fluent",
		wasMastered: false
	})
	const start = await startSession({
		userId,
		type: "drill",
		subTypeId: ADAPTIVE_TEST_SUB_TYPE,
		drillLength: 5
	})
	// initialTierFor maps fluent → 'medium'. The first served item's
	// requested tier is the initial tier (window is empty at session
	// start). Assert against requestedTierForItem (which prefers
	// fallbackFromTier when set) per SPEC §9.2 — the no-walking contract
	// is on REQUESTED tier.
	expect(requestedTierForItem(start.firstItem)).toBe("medium")
}, 30_000)

test("getNextAdaptive: walker holds across first 10 attempts — initial 'medium' through floor", async function adaptiveHoldsAcrossFloor() {
	const userId = await createTestUser("adaptive-hold")
	await seedMasteryState({
		userId,
		subTypeId: ADAPTIVE_TEST_SUB_TYPE,
		currentState: "fluent",
		wasMastered: false
	})
	const start = await startSession({
		userId,
		type: "drill",
		subTypeId: ADAPTIVE_TEST_SUB_TYPE,
		drillLength: 20
	})
	const sessionId = start.sessionId

	// Drive 10 attempts at high accuracy + low latency. The walker holds
	// the initial tier (medium) across the floor: items 1..10 should all
	// be requested at 'medium'. Bank depth (12 medium items) is enough to
	// avoid session-soft re-serve on 10 attempts.
	const requestedTiers: string[] = []
	requestedTiers.push(requestedTierForItem(start.firstItem))
	let next: ItemForRender = start.firstItem
	for (let i = 1; i < 10; i += 1) {
		const correctAnswer = await readItemCorrectAnswer(next.id)
		const r = await errors.try(
			submitAttempt({
				sessionId,
				itemId: next.id,
				selectedAnswer: correctAnswer,
				latencyMs: 5_000,
				triagePromptFired: false,
				triageTaken: false,
				selection: next.selection
			})
		)
		if (r.error) {
			logger.error({ error: r.error, sessionId, i }, "selection-test: submit failed")
			throw errors.wrap(r.error, "submit")
		}
		const data = r.data
		if (data.nextItem === undefined) {
			logger.error({ sessionId, i }, "selection-test: nextItem undefined before quota")
			throw ErrUnexpectedNextItemAbsence
		}
		next = data.nextItem
		requestedTiers.push(requestedTierForItem(next))
	}
	// 10 captured requested tiers (item 1 .. item 10), all 'medium' (the
	// initial tier from mastery_state).
	expect(requestedTiers.length).toBe(10)
	for (const tier of requestedTiers) {
		expect(tier).toBe("medium")
	}
}, 60_000)

test("getNextAdaptive: walker steps up after 10 attempts at high performance — easy → medium", async function adaptiveStepsUpAfterFloor() {
	const userId = await createTestUser("adaptive-stepup")
	await seedMasteryState({
		userId,
		subTypeId: ADAPTIVE_TEST_SUB_TYPE,
		currentState: "learning",
		wasMastered: false
	})
	const start = await startSession({
		userId,
		type: "drill",
		subTypeId: ADAPTIVE_TEST_SUB_TYPE,
		drillLength: 20
	})
	const sessionId = start.sessionId

	// Initial tier is 'easy' (learning + ¬wasMastered). Drive 10 attempts
	// at 9/10 correct + median latency 5_000ms (< 0.8 × 12_000ms = 9_600).
	// Last attempt (i=9) is deliberately wrong (passes a non-matching
	// answer string) so accuracy is 9/10 = 0.9 — exactly the SPEC §9.1
	// step-up threshold (>= 0.9 AND < 0.8× latency). The 11th item
	// (returned from the 10th submit) should request 'medium'.
	const wrongAnswer = "__deliberately_wrong_answer__"
	let next: ItemForRender = start.firstItem
	let lastSubmitResult: { nextItem?: ItemForRender } | undefined
	for (let i = 0; i < 10; i += 1) {
		const correctAnswer = await readItemCorrectAnswer(next.id)
		const isLast = i === 9
		const selectedAnswer = isLast ? wrongAnswer : correctAnswer
		const r = await errors.try(
			submitAttempt({
				sessionId,
				itemId: next.id,
				selectedAnswer,
				latencyMs: 5_000,
				triagePromptFired: false,
				triageTaken: false,
				selection: next.selection
			})
		)
		if (r.error) {
			logger.error({ error: r.error, sessionId, i }, "selection-test: submit failed")
			throw errors.wrap(r.error, "submit")
		}
		lastSubmitResult = r.data
		const data = r.data
		if (data.nextItem === undefined) {
			logger.error({ sessionId, i }, "selection-test: nextItem undefined before quota")
			throw ErrUnexpectedNextItemAbsence
		}
		next = data.nextItem
	}

	if (!lastSubmitResult?.nextItem) {
		logger.error(
			{ sessionId, latencyThresholdMs: ADAPTIVE_TEST_LATENCY_THRESHOLD_MS },
			"selection-test: 11th item missing"
		)
		throw ErrUnexpectedNextItemAbsence
	}
	const eleventh = lastSubmitResult.nextItem
	expect(requestedTierForItem(eleventh)).toBe("medium")
}, 60_000)

// Phase 5 sub-phase 3 commit 3 — full-length engine integration tests
// (plan §3 verification scenarios 6-8). Drive a 50-attempt full-length
// session via startSession + submitAttempt; verify the per-decile
// requested-tier distribution matches roundDecile(standardCurve[k], 10);
// verify slot-by-slot integrity (sub-type matches generator, served
// tier matches request OR is recorded as tier-degraded with the right
// shape); verify all 50 served item ids are distinct.
//
// Bank state at write-time: 439 live items / 14 sub-types. Twelve
// (subTypeId, difficulty) cells have 0 live items: 11 brutal-tier cells
// (subtypes without any brutal items) + 1 hard-tier cell
// (numerical.ratios.hard = 0 per commit 1's audit-surfaced finding).
// The slot generator's deciles 3-5 request hard + brutal heavily, so
// most 50-slot sessions will hit at least one zero cell and tier-
// degrade. Test 2 asserts ≥ 1 tier-degraded attempt across the
// session — relies on the bank's current zero-cell distribution; if a
// future round populates every cell, the assertion would need to be
// downgraded to "no tier-degraded attempts is acceptable" or to drive
// multiple sessions to produce a hit.

const ErrFullLengthRowMissing = errors.new("full-length-test: attempt row missing for slot")
const ErrFullLengthSubTypeMismatch = errors.new("full-length-test: attempt sub_type_id != predicted")
const ErrFullLengthRequestedTierMismatch = errors.new(
	"full-length-test: attempt requested-tier != predicted"
)

interface FullLengthAttemptRow {
	itemId: string
	subTypeId: SubTypeId
	itemDifficulty: Difficulty
	servedAtTier: Difficulty
	fallbackFromTier: Difficulty | null
}

const subTypeIdSet: ReadonlySet<string> = new Set<string>(subTypeIds)
function asSubTypeIdForTest(s: string): SubTypeId {
	if (!subTypeIdSet.has(s)) {
		logger.error({ subTypeId: s }, "full-length-test: unknown sub_type_id")
		throw errors.new("unknown sub_type_id")
	}
	const matched = subTypeIds.find(function eq(known) {
		return known === s
	})
	if (!matched) {
		logger.error({ subTypeId: s }, "full-length-test: post-guard miss (impossible)")
		throw errors.new("sub_type_id post-guard miss")
	}
	return matched
}

async function readFullLengthAttempts(sessionId: string): Promise<FullLengthAttemptRow[]> {
	await using adminDb = await createAdminDb()
	const result = await errors.try(
		adminDb.db
			.select({
				itemId: attempts.itemId,
				subTypeId: items.subTypeId,
				itemDifficulty: items.difficulty,
				servedAtTier: attempts.servedAtTier,
				fallbackFromTier: attempts.fallbackFromTier
			})
			.from(attempts)
			.innerJoin(items, eq(attempts.itemId, items.id))
			.where(eq(attempts.sessionId, sessionId))
			.orderBy(attempts.id)
	)
	if (result.error) {
		logger.error(
			{ error: result.error, sessionId },
			"full-length-test: attempts read failed"
		)
		throw errors.wrap(result.error, "read attempts")
	}
	return result.data.map(function narrowRow(r): FullLengthAttemptRow {
		return {
			itemId: r.itemId,
			subTypeId: asSubTypeIdForTest(r.subTypeId),
			itemDifficulty: r.itemDifficulty,
			servedAtTier: r.servedAtTier,
			fallbackFromTier: r.fallbackFromTier
		}
	})
}

async function runFullLengthSession(suffix: string): Promise<{
	userId: string
	sessionId: string
	rows: FullLengthAttemptRow[]
}> {
	const userId = await createTestUser(suffix)
	const start = await startSession({ userId, type: "full_length" })
	const sessionId = start.sessionId

	let next: ItemForRender = start.firstItem
	for (let i = 1; i < 50; i += 1) {
		const r = await errors.try(
			submitAttempt({
				sessionId,
				itemId: next.id,
				selectedAnswer: next.options[0]?.id,
				latencyMs: 5_000,
				triagePromptFired: false,
				triageTaken: false,
				selection: next.selection
			})
		)
		if (r.error) {
			logger.error({ error: r.error, sessionId, i }, "full-length-test: submit failed")
			throw errors.wrap(r.error, "submit")
		}
		const data = r.data
		if (data.nextItem === undefined) {
			logger.error(
				{ sessionId, i },
				"full-length-test: nextItem undefined before quota; full-length exhausted early"
			)
			throw ErrUnexpectedNextItemAbsence
		}
		next = data.nextItem
	}
	// 50th submit — engine returns nextItem: undefined cleanly because
	// target_question_count = 50 (per start.ts targetQuestionCountFor).
	const finalResult = await errors.try(
		submitAttempt({
			sessionId,
			itemId: next.id,
			selectedAnswer: next.options[0]?.id,
			latencyMs: 5_000,
			triagePromptFired: false,
			triageTaken: false,
			selection: next.selection
		})
	)
	if (finalResult.error) {
		logger.error(
			{ error: finalResult.error, sessionId },
			"full-length-test: final submit failed"
		)
		throw errors.wrap(finalResult.error, "final submit")
	}
	expect(finalResult.data.nextItem).toBeUndefined()

	const rows = await readFullLengthAttempts(sessionId)
	expect(rows.length).toBe(50)
	return { userId, sessionId, rows }
}

test("full_length: engine completes 50 attempts; per-decile requested-tier distribution matches roundDecile", async function fullLengthCompletes50AndMatchesPerDecileDistribution() {
	const { sessionId, rows } = await runFullLengthSession("fl-complete")
	const predicted = generateFullLengthSlots(sessionId)
	expect(predicted.length).toBe(50)

	for (const [k, distribution] of standardCurve.entries()) {
		const expected: Record<Difficulty, number> = roundDecile(distribution, 10)
		const actual: Record<Difficulty, number> = { easy: 0, medium: 0, hard: 0, brutal: 0 }
		for (let i = k * 10; i < (k + 1) * 10; i += 1) {
			const row = rows[i]
			if (!row) {
				logger.error({ sessionId, k, i }, "full-length-test: attempt row missing")
				throw errors.wrap(ErrFullLengthRowMissing, `slot ${i}`)
			}
			// REQUESTED tier per SPEC §9.2 verification clarification:
			// fallback_from_tier when degraded; otherwise
			// served_at_tier. Same shape as requestedTierForRow below.
			const requested = requestedTierForRow(row)
			actual[requested] += 1
		}
		expect(actual).toEqual(expected)
	}
}, 120_000)

function tierRank(tier: Difficulty): number {
	if (tier === "easy") return 0
	if (tier === "medium") return 1
	if (tier === "hard") return 2
	return 3
}

function requestedTierForRow(row: FullLengthAttemptRow): Difficulty {
	if (row.fallbackFromTier !== null) {
		return row.fallbackFromTier
	}
	return row.servedAtTier
}

test("full_length: slot-by-slot integrity — predicted slot matches attempt sub_type_id + requested tier; tier-degraded attempts record correct shape", async function fullLengthSlotByIntegrity() {
	const { sessionId, rows } = await runFullLengthSession("fl-integrity")
	const predicted = generateFullLengthSlots(sessionId)
	let degradedSeen = 0
	for (let i = 0; i < 50; i += 1) {
		const row = rows[i]
		const slot = predicted[i]
		if (!row || !slot) {
			logger.error({ sessionId, i }, "full-length-test: row or slot missing")
			throw errors.wrap(ErrFullLengthRowMissing, `slot ${i}`)
		}
		// Sub-type always matches the slot generator's request —
		// pickWithFallback only varies tier, not sub-type.
		if (row.subTypeId !== slot.subTypeId) {
			logger.error(
				{ sessionId, i, expected: slot.subTypeId, actual: row.subTypeId },
				"full-length-test: sub_type_id mismatch"
			)
			throw errors.wrap(ErrFullLengthSubTypeMismatch, `slot ${i}`)
		}
		expect(row.subTypeId).toBe(slot.subTypeId)

		// Requested tier (fallback_from_tier when degraded; otherwise
		// served_at_tier) always matches slot.difficulty per SPEC §9.2.
		const requested = requestedTierForRow(row)
		if (requested !== slot.difficulty) {
			logger.error(
				{ sessionId, i, expected: slot.difficulty, actual: requested },
				"full-length-test: requested-tier mismatch"
			)
			throw errors.wrap(ErrFullLengthRequestedTierMismatch, `slot ${i}`)
		}
		expect(requested).toBe(slot.difficulty)

		// Served-tier matches the actual item's difficulty (DB-truth).
		expect(row.servedAtTier).toBe(row.itemDifficulty)

		if (row.fallbackFromTier !== null) {
			degradedSeen += 1
			// Tier-degraded must record a STRICTLY lower served tier
			// than the requested tier (per pickWithFallback's
			// tiersDownFrom walk).
			expect(tierRank(row.servedAtTier)).toBeLessThan(tierRank(slot.difficulty))
		}
	}
	// Bank has 12 zero cells (11 brutal + 1 hard); deciles 3-5 request
	// hard + brutal heavily; near-certain (~99% per session) that at
	// least one slot tier-degrades. If this assertion ever flakes, the
	// bank's zero-cell distribution likely changed — adjust to drive
	// multiple sessions or scope to specific zero cells.
	expect(degradedSeen).toBeGreaterThanOrEqual(1)
}, 120_000)

test("full_length: no re-serve within session — 50 served item.id values are all distinct", async function fullLengthNoReServe() {
	const { rows } = await runFullLengthSession("fl-no-reserve")
	const itemIds = rows.map(function pickItemId(r) {
		return r.itemId
	})
	expect(itemIds.length).toBe(50)
	const distinct = new Set(itemIds)
	expect(distinct.size).toBe(50)
}, 120_000)
