// Integration tests for getEndSessionTierForDrill (sub-phase 5
// commit 2). Plan: docs/plans/phase5-dojo-belt-indicator.md §7.1.
//
// Five scenarios from the plan + user brief:
//   1. Zero-attempt drill session → null.
//   2. Drill with N<10 attempts → isPreFloor=true, tier from
//      most-recent attempt's (fallback_from_tier ?? served_at_tier).
//   3. Drill with N>=10 attempts → isPreFloor=false.
//   4. Tier-degraded fallback served → tier reads fallback_from_tier
//      (the REQUESTED tier per SPEC §9.2), NOT served_at_tier.
//   5. Non-drill session type → null (defensive).
//
// Tests assume the local docker postgres is up + seeded. Each test
// creates its own user + session; cascade-delete on user FK cleans up.

import "@/env"
import { expect, test } from "bun:test"
import * as errors from "@superbuilders/errors"
import { eq } from "drizzle-orm"
import type { Difficulty } from "@/config/sub-types"
import { createAdminDb } from "@/db/admin"
import { users } from "@/db/schemas/auth/users"
import { items } from "@/db/schemas/catalog/items"
import { attempts } from "@/db/schemas/practice/attempts"
import { practiceSessions } from "@/db/schemas/practice/practice-sessions"
import { logger } from "@/logger"
import { getEndSessionTierForDrill } from "@/server/post-session/end-session-tier"

const ErrUserInsertEmpty = errors.new("end-session-tier-test: user insert returned no rows")
const ErrSessionInsertEmpty = errors.new("end-session-tier-test: session insert returned no rows")
const ErrItemNotFound = errors.new("end-session-tier-test: no live item available for fixture")

type SessionType = "diagnostic" | "drill" | "full_length" | "simulation"

interface AttemptFixture {
	servedAtTier: Difficulty
	fallbackFromTier?: Difficulty
	correct: boolean
}

async function createTestUser(suffix: string): Promise<string> {
	await using adminDb = await createAdminDb()
	const email = `end-session-tier-test-${suffix}-${Date.now()}@local.dev`
	const result = await errors.try(
		adminDb.db
			.insert(users)
			.values({ email, name: "End-Session-Tier Test" })
			.returning({ id: users.id })
	)
	if (result.error) {
		logger.error({ error: result.error, email }, "end-session-tier-test: user insert failed")
		throw errors.wrap(result.error, "user insert")
	}
	const u = result.data[0]
	if (!u) {
		logger.error({ email }, "end-session-tier-test: user insert returned no rows")
		throw ErrUserInsertEmpty
	}
	return u.id
}

async function createSession(
	userId: string,
	type: SessionType,
	subTypeId: string | null
): Promise<string> {
	await using adminDb = await createAdminDb()
	const nowMs = Date.now()
	const result = await errors.try(
		adminDb.db
			.insert(practiceSessions)
			.values({
				userId,
				type,
				subTypeId,
				timerMode: "standard",
				targetQuestionCount: 10,
				startedAtMs: nowMs,
				lastHeartbeatMs: nowMs
			})
			.returning({ id: practiceSessions.id })
	)
	if (result.error) {
		logger.error(
			{ error: result.error, userId, type },
			"end-session-tier-test: session insert failed"
		)
		throw errors.wrap(result.error, "session insert")
	}
	const s = result.data[0]
	if (!s) {
		logger.error({ userId, type }, "end-session-tier-test: session insert returned no rows")
		throw ErrSessionInsertEmpty
	}
	return s.id
}

async function pickLiveItem(subTypeId: string): Promise<string> {
	await using adminDb = await createAdminDb()
	const result = await errors.try(
		adminDb.db.select({ id: items.id }).from(items).where(eq(items.subTypeId, subTypeId)).limit(1)
	)
	if (result.error) {
		logger.error(
			{ error: result.error, subTypeId },
			"end-session-tier-test: live item query failed"
		)
		throw errors.wrap(result.error, "live item query")
	}
	const row = result.data[0]
	if (!row) {
		logger.error({ subTypeId }, "end-session-tier-test: no live item available")
		throw ErrItemNotFound
	}
	return row.id
}

async function insertAttempts(
	sessionId: string,
	itemId: string,
	fixtures: ReadonlyArray<AttemptFixture>
): Promise<void> {
	await using adminDb = await createAdminDb()
	for (const f of fixtures) {
		const result = await errors.try(
			adminDb.db.insert(attempts).values({
				sessionId,
				itemId,
				selectedAnswer: "A",
				correct: f.correct,
				latencyMs: 5_000,
				servedAtTier: f.servedAtTier,
				fallbackFromTier: f.fallbackFromTier
			})
		)
		if (result.error) {
			logger.error(
				{ error: result.error, sessionId },
				"end-session-tier-test: attempt insert failed"
			)
			throw errors.wrap(result.error, "attempt insert")
		}
	}
}

test("getEndSessionTierForDrill: zero-attempt drill session → null", async function zeroAttemptDrill() {
	const userId = await createTestUser("zero")
	const sessionId = await createSession(userId, "drill", "verbal.antonyms")
	const result = await getEndSessionTierForDrill(sessionId)
	expect(result).toBeNull()
})

test("getEndSessionTierForDrill: drill with N<10 attempts → isPreFloor=true, tier from most-recent", async function preFloorDrill() {
	const userId = await createTestUser("prefloor")
	const sessionId = await createSession(userId, "drill", "verbal.antonyms")
	const itemId = await pickLiveItem("verbal.antonyms")
	await insertAttempts(sessionId, itemId, [
		{ servedAtTier: "easy", correct: true },
		{ servedAtTier: "easy", correct: true },
		{ servedAtTier: "medium", correct: true }
	])
	const result = await getEndSessionTierForDrill(sessionId)
	expect(result).toMatchObject({
		tier: "medium",
		attemptCount: 3,
		isPreFloor: true
	})
})

test("getEndSessionTierForDrill: drill with N≥10 attempts → isPreFloor=false", async function postFloorDrill() {
	const userId = await createTestUser("postfloor")
	const sessionId = await createSession(userId, "drill", "verbal.antonyms")
	const itemId = await pickLiveItem("verbal.antonyms")
	const fixtures: AttemptFixture[] = []
	for (let i = 0; i < 10; i++) {
		let tier: Difficulty = "medium"
		if (i === 9) {
			tier = "hard"
		}
		fixtures.push({ servedAtTier: tier, correct: true })
	}
	await insertAttempts(sessionId, itemId, fixtures)
	const result = await getEndSessionTierForDrill(sessionId)
	expect(result).toMatchObject({
		tier: "hard",
		attemptCount: 10,
		isPreFloor: false
	})
})

test("getEndSessionTierForDrill: tier-degraded fallback → reads fallbackFromTier (requested), NOT servedAtTier", async function fallbackReadsRequested() {
	const userId = await createTestUser("fallback")
	const sessionId = await createSession(userId, "drill", "verbal.antonyms")
	const itemId = await pickLiveItem("verbal.antonyms")
	// Most-recent attempt: walker REQUESTED 'brutal', bank DEGRADED to
	// 'hard' (e.g., recency-soft → tier-degraded fallback chain).
	// Per SPEC §9.2 the indicator surfaces what the walker requested,
	// not what was served.
	await insertAttempts(sessionId, itemId, [
		{ servedAtTier: "medium", correct: true },
		{ servedAtTier: "hard", fallbackFromTier: "brutal", correct: true }
	])
	const result = await getEndSessionTierForDrill(sessionId)
	expect(result).toMatchObject({
		tier: "brutal",
		attemptCount: 2,
		isPreFloor: true
	})
})

test("getEndSessionTierForDrill: non-drill session type → null (defensive)", async function nonDrillReturnsNull() {
	const userId = await createTestUser("nondrill")
	const sessionId = await createSession(userId, "diagnostic", null)
	const itemId = await pickLiveItem("verbal.antonyms")
	await insertAttempts(sessionId, itemId, [{ servedAtTier: "easy", correct: true }])
	const result = await getEndSessionTierForDrill(sessionId)
	expect(result).toBeNull()
})
