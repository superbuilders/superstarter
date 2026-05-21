// scripts/dev/smoke/heartbeat-route-ownership.ts
//
// Sub-phase 4 commit 2. Route-level live-fire smoke for the heartbeat
// ownership-scope contract from commit 1 (9ce8325). Formalizes commit
// 1's four-scenario manual curl-and-DB-readback verification as a
// runnable .ts script.
//
// Scope is route-level ONLY. No playwright, no client-tick observation,
// no cron-finalize chain. The plan's §3 "client → route → cron-finalize"
// chain is broader scope; the user narrowed it for commit 2 to "same
// fetch + DB read-back shape as commit 1's manual verification,
// formalized as a runnable .ts script."
//
// Four scenarios (the plan locked "two" as the floor; commit 1's manual
// verification added two more — anonymous and garbage-sessionId — which
// lock in the uniform-204 contract; commit 2 keeps all four):
//
//   1. Happy           — A's cookie + A's session → 204 + DB advances
//   2. Negative cross  — B's cookie + A's session → 204 + DB unchanged
//   3. Negative anon   — no cookie + A's session  → 204 + DB unchanged
//   4. Negative garbage— A's cookie + garbage id  → 204 + A's session DB unchanged
//
// All four assert HTTP/204 (exact). Negatives assert
// `practice_sessions.last_heartbeat_ms` exact-equals the BEFORE value
// (no epsilon — the route either writes or it doesn't). Happy asserts
// the same field is strictly greater than BEFORE. The contract being
// locked: all four request shapes return uniform 204 (no leakage of
// which case fired); DB-state is the only signal.
//
// Hermetic + re-runnable. Per-run uniqueness via Date.now() suffixed
// user emails and session tokens. Cleanup at script end deletes the
// auth_sessions + practice_sessions rows it inserted; users are left
// in place (one per smoke run, ~24 bytes each — orphan accumulation
// is rounding-error and avoids the FK cascade complexity of deleting
// users during cleanup).
//
// Pre-conditions:
//   - Local docker postgres reachable (createAdminDb works).
//   - `bun dev` running on http://localhost:3000.
//
// Usage: bun run scripts/dev/smoke/heartbeat-route-ownership.ts

import "@/env"
import * as errors from "@superbuilders/errors"
import { eq, sql } from "drizzle-orm"
import { createAdminDb } from "@/db/admin"
import { authSessions } from "@/db/schemas/auth/sessions"
import { practiceSessions } from "@/db/schemas/practice/practice-sessions"
import { users } from "@/db/schemas/auth/users"
import { logger } from "@/logger"

const APP_BASE = "http://localhost:3000"
const GARBAGE_SESSION_ID = "00000000-0000-0000-0000-000000000000"

const ErrUserInsertEmpty = errors.new("smoke: user insert returned no rows")
const ErrSessionInsertEmpty = errors.new("smoke: session insert returned no rows")
const ErrSessionRowMissing = errors.new("smoke: session row missing on read-back")

interface UserCtx {
	userId: string
	token: string
}

interface SetupResult {
	A: UserCtx
	B: UserCtx
	sessionId: string
	initialLastHeartbeatMs: number
}

async function newUser(label: string, runStamp: number): Promise<UserCtx> {
	await using adminDb = await createAdminDb()
	const u = await errors.try(
		adminDb.db
			.insert(users)
			.values({
				email: `heartbeat-smoke-${label}-${runStamp}@local.dev`,
				name: `Heartbeat Smoke ${label}`
			})
			.returning({ id: users.id })
	)
	if (u.error) {
		logger.error({ error: u.error, label }, "smoke: user insert failed")
		throw errors.wrap(u.error, "user insert")
	}
	const userRow = u.data[0]
	if (!userRow) {
		logger.error({ label }, "smoke: user insert empty")
		throw ErrUserInsertEmpty
	}
	const token = `heartbeat-smoke-${label}-${runStamp}-token`
	const expiresMs = Date.now() + 7 * 86_400_000
	const a = await errors.try(
		adminDb.db.insert(authSessions).values({
			sessionToken: token,
			userId: userRow.id,
			expiresMs
		})
	)
	if (a.error) {
		logger.error({ error: a.error, userId: userRow.id }, "smoke: auth_sessions insert failed")
		throw errors.wrap(a.error, "auth_sessions insert")
	}
	return { userId: userRow.id, token }
}

async function setup(): Promise<SetupResult> {
	const runStamp = Date.now()
	const A = await newUser("userA", runStamp)
	const B = await newUser("userB", runStamp + 1)

	await using adminDb = await createAdminDb()
	const sess = await errors.try(
		adminDb.db
			.insert(practiceSessions)
			.values({
				userId: A.userId,
				type: "diagnostic",
				targetQuestionCount: 50,
				// startedAtMs in the past so the session looks "in progress for a minute"
				startedAtMs: sql`(extract(epoch from now()) * 1000)::bigint - 60000`,
				// last_heartbeat_ms set to a known past value so we can detect
				// any write — happy MUST advance it; negatives MUST leave it.
				lastHeartbeatMs: sql`(extract(epoch from now()) * 1000)::bigint - 60000`,
				recencyExcludedItemIds: []
			})
			.returning({ id: practiceSessions.id, lastHeartbeatMs: practiceSessions.lastHeartbeatMs })
	)
	if (sess.error) {
		logger.error({ error: sess.error, userA: A.userId }, "smoke: session insert failed")
		throw errors.wrap(sess.error, "session insert")
	}
	const sessRow = sess.data[0]
	if (!sessRow) {
		logger.error({ userA: A.userId }, "smoke: session insert empty")
		throw ErrSessionInsertEmpty
	}
	logger.info(
		{
			A: { userId: A.userId, token: A.token },
			B: { userId: B.userId, token: B.token },
			sessionId: sessRow.id,
			initialLastHeartbeatMs: sessRow.lastHeartbeatMs
		},
		"smoke: setup complete"
	)
	return {
		A,
		B,
		sessionId: sessRow.id,
		initialLastHeartbeatMs: sessRow.lastHeartbeatMs
	}
}

async function readLastHeartbeatMs(sessionId: string): Promise<number> {
	await using adminDb = await createAdminDb()
	const r = await errors.try(
		adminDb.db
			.select({ lastHeartbeatMs: practiceSessions.lastHeartbeatMs })
			.from(practiceSessions)
			.where(eq(practiceSessions.id, sessionId))
	)
	if (r.error) {
		logger.error({ error: r.error, sessionId }, "smoke: read-back failed")
		throw errors.wrap(r.error, "read-back")
	}
	const row = r.data[0]
	if (!row) {
		logger.error({ sessionId }, "smoke: session row missing on read-back")
		throw ErrSessionRowMissing
	}
	return row.lastHeartbeatMs
}

async function postHeartbeat(sessionId: string, cookieToken?: string): Promise<number> {
	const headers: Record<string, string> = {}
	if (cookieToken !== undefined) {
		headers.cookie = `authjs.session-token=${cookieToken}`
	}
	const res = await errors.try(
		fetch(`${APP_BASE}/api/sessions/${sessionId}/heartbeat`, {
			method: "POST",
			headers
		})
	)
	if (res.error) {
		logger.error({ error: res.error, sessionId }, "smoke: heartbeat POST failed")
		throw errors.wrap(res.error, "heartbeat POST")
	}
	return res.data.status
}

interface CheckResult {
	step: string
	ok: boolean
	detail: Record<string, unknown>
}

async function teardown(setupResult: SetupResult): Promise<void> {
	await using adminDb = await createAdminDb()
	// Order matters: practice_sessions has FK on users via cascade, so
	// delete the session row first; auth_sessions cascades on users on
	// delete (per src/db/schemas/auth/sessions.ts) but we delete auth
	// rows explicitly to avoid leaving stray cookies.
	const r1 = await errors.try(
		adminDb.db.delete(practiceSessions).where(eq(practiceSessions.id, setupResult.sessionId))
	)
	if (r1.error) logger.warn({ error: r1.error }, "smoke teardown: practice_sessions delete failed")
	const r2 = await errors.try(
		adminDb.db.delete(authSessions).where(eq(authSessions.sessionToken, setupResult.A.token))
	)
	if (r2.error) logger.warn({ error: r2.error }, "smoke teardown: auth_sessions A delete failed")
	const r3 = await errors.try(
		adminDb.db.delete(authSessions).where(eq(authSessions.sessionToken, setupResult.B.token))
	)
	if (r3.error) logger.warn({ error: r3.error }, "smoke teardown: auth_sessions B delete failed")
	logger.info({ sessionId: setupResult.sessionId }, "smoke: teardown complete")
}

async function main(): Promise<void> {
	const setupResult = await setup()
	const checks: CheckResult[] = []
	const runStartMs = Date.now()

	// Run order: negatives first (each compares to the same BEFORE
	// snapshot), happy last (it's the only one that should advance the
	// row, so running it first would invalidate subsequent BEFORE
	// snapshots). Same order as commit 1's manual verification.
	const before = setupResult.initialLastHeartbeatMs

	// Scenario 2 — negative cross-user (B's cookie → A's session)
	{
		const status = await postHeartbeat(setupResult.sessionId, setupResult.B.token)
		const after = await readLastHeartbeatMs(setupResult.sessionId)
		const ok = status === 204 && after === before
		checks.push({
			step: "scenario 2: B's cookie → A's session — uniform 204 + DB unchanged",
			ok,
			detail: { status, before, after }
		})
		logger.info(
			{ step: checks[checks.length - 1]?.step, ok, status, before, after },
			"smoke: scenario 2 result"
		)
	}

	// Scenario 3 — negative anonymous (no cookie)
	{
		const status = await postHeartbeat(setupResult.sessionId, undefined)
		const after = await readLastHeartbeatMs(setupResult.sessionId)
		const ok = status === 204 && after === before
		checks.push({
			step: "scenario 3: no cookie — uniform 204 + DB unchanged",
			ok,
			detail: { status, before, after }
		})
		logger.info(
			{ step: checks[checks.length - 1]?.step, ok, status, before, after },
			"smoke: scenario 3 result"
		)
	}

	// Scenario 4 — negative garbage sessionId (A's cookie + bogus UUID)
	// We verify A's actual session is unchanged — the garbage UUID's row
	// doesn't exist, so reading it back would fail; the contract here is
	// "A's real session must not be touched as a side effect."
	{
		const status = await postHeartbeat(GARBAGE_SESSION_ID, setupResult.A.token)
		const after = await readLastHeartbeatMs(setupResult.sessionId)
		const ok = status === 204 && after === before
		checks.push({
			step: "scenario 4: A's cookie + garbage sessionId — uniform 204 + A's session DB unchanged",
			ok,
			detail: { status, before, after }
		})
		logger.info(
			{ step: checks[checks.length - 1]?.step, ok, status, before, after },
			"smoke: scenario 4 result"
		)
	}

	// Scenario 1 — happy (A's cookie → A's session). Last because it
	// advances the row.
	{
		const status = await postHeartbeat(setupResult.sessionId, setupResult.A.token)
		const after = await readLastHeartbeatMs(setupResult.sessionId)
		const ok = status === 204 && after > before
		checks.push({
			step: "scenario 1: A's cookie → A's session — 204 + DB advances",
			ok,
			detail: { status, before, after, deltaMs: after - before }
		})
		logger.info(
			{ step: checks[checks.length - 1]?.step, ok, status, before, after, deltaMs: after - before },
			"smoke: scenario 1 result"
		)
	}

	const wallClockMs = Date.now() - runStartMs
	logger.info({ wallClockMs, checkCount: checks.length }, "smoke: scenarios complete")

	await teardown(setupResult)

	const failed = checks.filter(function pickFailed(c) { return !c.ok })
	if (failed.length > 0) {
		for (const f of failed) {
			logger.error({ step: f.step, detail: f.detail }, "smoke: check failed")
		}
		logger.error({ failedCount: failed.length, totalCount: checks.length }, "smoke FAILED")
		process.exit(1)
	}
	logger.info({ totalCount: checks.length, wallClockMs }, "smoke PASSED — all scenarios green")
}

const result = await errors.try(main())
if (result.error) {
	logger.error({ error: result.error }, "smoke run failed")
	process.exit(1)
}
