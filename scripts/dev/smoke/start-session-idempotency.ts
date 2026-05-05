// scripts/dev/smoke/start-session-idempotency.ts
//
// Sign-off smoke for the "fix(server): make startSession idempotent on
// in-progress drills" commit. Verifies four scenarios:
//
//   1. Two startSession({type:'drill', subTypeId:'verbal.antonyms'}) calls
//      in quick succession return the SAME sessionId. The first creates
//      the session; the second hits the fresh-resume path (no second
//      practice_sessions row inserted).
//
//   2. After artificially aging the session's last_heartbeat_ms past the
//      5-minute abandon threshold, the next startSession call returns a
//      NEW sessionId AND finalizes the stale row as 'abandoned' with the
//      same UPDATE shape the abandon-sweep cron uses (last_heartbeat_ms
//      + 30s, completion_reason = 'abandoned').
//
//   3. A startSession({type:'drill', subTypeId:'numerical.fractions'}) call
//      with a DIFFERENT subTypeId does NOT collide with an in-progress
//      verbal.antonyms drill — the (user_id, type, sub_type_id) match
//      partitions cleanly.
//
//   4. A startSession({type:'diagnostic'}) call with an existing
//      in-progress diagnostic returns the same sessionId — verifies the
//      `subTypeId IS NULL` matching path.
//
// Per project rules: scripts/ exempt from no-try / no-console / etc.
// Mirrors the lint-clean shape of phase3-commit1.ts (no ??, no
// process.env, logger before throw, all errors.try captured).
//
// Pre-conditions:
//   - Local docker postgres reachable (createAdminDb works).
//   - Sub-types and items seeded (db:seed + db:seed:items).
//
// Usage: bun run scripts/dev/smoke/start-session-idempotency.ts

import "@/env"
import * as errors from "@superbuilders/errors"
import { eq } from "drizzle-orm"
import { createAdminDb } from "@/db/admin"
import { practiceSessions } from "@/db/schemas/practice/practice-sessions"
import { users } from "@/db/schemas/auth/users"
import { logger } from "@/logger"
import { startSession } from "@/server/sessions/start"

interface CheckResult {
	step: string
	ok: boolean
	detail: Record<string, unknown>
}

const HEARTBEAT_GRACE_MS = 30_000
// Six minutes ago — past the 5-minute ABANDON_THRESHOLD_MS in start.ts.
const STALE_AGE_MS = 6 * 60_000

async function createTestUser(): Promise<string> {
	await using adminDb = await createAdminDb()
	const email = `start-session-idempotency-${Date.now()}@local.dev`
	const result = await errors.try(
		adminDb.db
			.insert(users)
			.values({ email, name: "Start Session Idempotency Smoke" })
			.returning({ id: users.id })
	)
	if (result.error) {
		logger.error({ error: result.error, email }, "smoke: user insert failed")
		throw errors.wrap(result.error, "user insert")
	}
	const u = result.data[0]
	if (!u) {
		logger.error({ email }, "smoke: user insert returned no rows")
		throw errors.new("smoke: user insert returned no rows")
	}
	logger.info({ userId: u.id, email }, "smoke: test user created")
	return u.id
}

async function ageSession(sessionId: string, agedMs: number): Promise<void> {
	await using adminDb = await createAdminDb()
	const newHeartbeat = Date.now() - agedMs
	const result = await errors.try(
		adminDb.db
			.update(practiceSessions)
			.set({ lastHeartbeatMs: newHeartbeat })
			.where(eq(practiceSessions.id, sessionId))
	)
	if (result.error) {
		logger.error({ error: result.error, sessionId, agedMs }, "smoke: age session failed")
		throw errors.wrap(result.error, "age session")
	}
	logger.info({ sessionId, newHeartbeatMs: newHeartbeat }, "smoke: aged session heartbeat")
}

async function readSessionRow(sessionId: string): Promise<{
	endedAtMs: number | null
	completionReason: string | null
	lastHeartbeatMs: number
}> {
	await using adminDb = await createAdminDb()
	const result = await errors.try(
		adminDb.db
			.select({
				endedAtMs: practiceSessions.endedAtMs,
				completionReason: practiceSessions.completionReason,
				lastHeartbeatMs: practiceSessions.lastHeartbeatMs
			})
			.from(practiceSessions)
			.where(eq(practiceSessions.id, sessionId))
			.limit(1)
	)
	if (result.error) {
		logger.error({ error: result.error, sessionId }, "smoke: read session failed")
		throw errors.wrap(result.error, "read session")
	}
	const row = result.data[0]
	if (!row) {
		logger.error({ sessionId }, "smoke: session row not found")
		throw errors.new(`session ${sessionId} not found`)
	}
	return row
}

async function check1FreshResume(userId: string): Promise<CheckResult & { firstSessionId: string }> {
	const first = await startSession({
		userId,
		type: "drill",
		subTypeId: "verbal.antonyms",
		timerMode: "standard",
		drillLength: 5
	})
	const second = await startSession({
		userId,
		type: "drill",
		subTypeId: "verbal.antonyms",
		timerMode: "standard",
		drillLength: 5
	})
	const sameId = first.sessionId === second.sessionId
	const result = {
		step: "two rapid drill startSession calls return same sessionId",
		ok: sameId,
		detail: {
			firstSessionId: first.sessionId,
			secondSessionId: second.sessionId,
			firstItemSame: first.firstItem.id === second.firstItem.id
		},
		firstSessionId: first.sessionId
	}
	logger.info(result, "smoke: check 1 result")
	return result
}

async function check2StaleAbandon(
	userId: string,
	staleSessionId: string
): Promise<CheckResult & { newSessionId: string }> {
	await ageSession(staleSessionId, STALE_AGE_MS)
	const staleHeartbeatBefore = (await readSessionRow(staleSessionId)).lastHeartbeatMs

	const fresh = await startSession({
		userId,
		type: "drill",
		subTypeId: "verbal.antonyms",
		timerMode: "standard",
		drillLength: 5
	})

	const newIsDifferent = fresh.sessionId !== staleSessionId
	const staleAfter = await readSessionRow(staleSessionId)
	const expectedEnded = staleHeartbeatBefore + HEARTBEAT_GRACE_MS
	const staleFinalizedCorrectly =
		staleAfter.endedAtMs === expectedEnded &&
		staleAfter.completionReason === "abandoned" &&
		staleAfter.lastHeartbeatMs === staleHeartbeatBefore

	const result = {
		step: "stale in-progress session is finalized 'abandoned' AND fresh insert proceeds",
		ok: newIsDifferent && staleFinalizedCorrectly,
		detail: {
			staleSessionId,
			newSessionId: fresh.sessionId,
			newIsDifferent,
			staleEndedAtMs: staleAfter.endedAtMs,
			expectedEndedAtMs: expectedEnded,
			staleCompletionReason: staleAfter.completionReason,
			staleLastHeartbeatPreserved: staleAfter.lastHeartbeatMs === staleHeartbeatBefore
		},
		newSessionId: fresh.sessionId
	}
	logger.info(result, "smoke: check 2 result")
	return result
}

async function check3DifferentSubTypePartitions(
	userId: string,
	verbalSessionId: string
): Promise<CheckResult & { numericalSessionId: string }> {
	const numerical = await startSession({
		userId,
		type: "drill",
		subTypeId: "numerical.fractions",
		timerMode: "standard",
		drillLength: 5
	})
	const isDistinct = numerical.sessionId !== verbalSessionId

	// Verify the verbal session is still in-progress (not touched by the
	// numerical-subType startSession).
	const verbalAfter = await readSessionRow(verbalSessionId)
	const verbalUntouched = verbalAfter.endedAtMs === null && verbalAfter.completionReason === null

	const result = {
		step: "different subTypeId produces a distinct session and leaves prior in-progress untouched",
		ok: isDistinct && verbalUntouched,
		detail: {
			verbalSessionId,
			numericalSessionId: numerical.sessionId,
			isDistinct,
			verbalEndedAtMs: verbalAfter.endedAtMs,
			verbalCompletionReason: verbalAfter.completionReason
		},
		numericalSessionId: numerical.sessionId
	}
	logger.info(result, "smoke: check 3 result")
	return result
}

async function check4DiagnosticIdempotent(userId: string): Promise<CheckResult> {
	const first = await startSession({ userId, type: "diagnostic" })
	const second = await startSession({ userId, type: "diagnostic" })
	const sameId = first.sessionId === second.sessionId
	const result = {
		step: "diagnostic startSession is idempotent on the (userId, type='diagnostic') match",
		ok: sameId,
		detail: {
			firstSessionId: first.sessionId,
			secondSessionId: second.sessionId
		}
	}
	logger.info(result, "smoke: check 4 result")
	return result
}

async function main(): Promise<void> {
	const userId = await createTestUser()

	const checks: CheckResult[] = []

	const c1 = await check1FreshResume(userId)
	checks.push(c1)

	const c2 = await check2StaleAbandon(userId, c1.firstSessionId)
	checks.push(c2)

	const c3 = await check3DifferentSubTypePartitions(userId, c2.newSessionId)
	checks.push(c3)
	void c3.numericalSessionId

	const c4 = await check4DiagnosticIdempotent(userId)
	checks.push(c4)

	logger.info({ checkCount: checks.length }, "smoke: all checks executed")

	const failed = checks.filter(function pickFailed(c) { return !c.ok })
	if (failed.length > 0) {
		for (const f of failed) {
			logger.error({ step: f.step, detail: f.detail }, "smoke: check failed")
		}
		logger.error({ failedCount: failed.length, totalCount: checks.length }, "smoke FAILED")
		process.exit(1)
	}
	logger.info({ totalCount: checks.length }, "smoke PASSED — all checks green")
}

const result = await errors.try(main())
if (result.error) {
	logger.error({ error: result.error }, "smoke run failed")
	process.exit(1)
}
