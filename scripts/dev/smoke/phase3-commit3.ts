// scripts/dev/smoke/phase3-commit3.ts
//
// Phase 3 commit-3 smoke. Exercises the heartbeat route and the
// abandon-sweep cron end-to-end against the dev DB and the running
// dev server (default http://localhost:3000).
//
// Per the project ruleset, scripts/ is exempt from no-try / no-console
// / no-relative-imports etc. The pattern matches phase3-commit1.ts.
//
// Pre-conditions:
//   - bun dev is running on http://localhost:3000.
//   - Local docker postgres is reachable (uses createAdminDb).
//
// What it does:
//   1. Inserts a fresh test user.
//   2. Inserts a STALE session for that user: last_heartbeat_ms = now - 600s.
//   3. Inserts an IN-FLIGHT session for that user: last_heartbeat_ms = now - 100s.
//   4. Negative test: cron without bearer → expect 401.
//   5. Negative test: cron with wrong bearer → expect 401.
//   6. Positive test: cron with valid bearer → expect 204.
//      Then asserts:
//        - stale session row: ended_at_ms = stale_heartbeat_ms + 30000,
//          completion_reason = 'abandoned'.
//        - in-flight session row: unchanged.
//   7. Heartbeat test: POST /api/sessions/<in-flight>/heartbeat → 204,
//      last_heartbeat_ms bumped within ~1s of the call.
//   8. Heartbeat-on-ended test: POST heartbeat against the now-finalized
//      stale session → 204 (no-op), last_heartbeat_ms unchanged.
//
// Usage: bun run scripts/dev/smoke/phase3-commit3.ts

import "@/env"
import * as errors from "@superbuilders/errors"
import { eq } from "drizzle-orm"
import { createAdminDb } from "@/db/admin"
import { practiceSessions } from "@/db/schemas/practice/practice-sessions"
import { users } from "@/db/schemas/auth/users"
import { env } from "@/env"
import { logger } from "@/logger"

// Hardcoded — no `process.env` (biome `noProcessEnv` ban) and no `??`
// fallback (project rule banning nullish coalescing). Cron + heartbeat
// always run against the local dev server; if you need a different host,
// edit this constant.
const APP_BASE = "http://localhost:3000"
const STALE_AGO_MS = 600_000
const INFLIGHT_AGO_MS = 100_000
const HEARTBEAT_GRACE_MS = 30_000

interface SmokeContext {
	userId: string
	staleSessionId: string
	inflightSessionId: string
	staleHeartbeatMs: number
	inflightHeartbeatMs: number
}

async function setup(): Promise<SmokeContext> {
	await using adminDb = await createAdminDb()
	const email = `phase3-c3-smoke-${Date.now()}@local.dev`
	const userResult = await errors.try(
		adminDb.db.insert(users).values({ email, name: "Phase 3 C3 Smoke" }).returning({ id: users.id })
	)
	if (userResult.error) {
		logger.error({ error: userResult.error, email }, "smoke: user insert failed")
		throw errors.wrap(userResult.error, "user insert")
	}
	const u = userResult.data[0]
	if (!u) {
		logger.error({ email }, "smoke: user insert returned no rows")
		throw errors.new("smoke: user insert returned no rows")
	}

	const nowMs = Date.now()
	const staleHb = nowMs - STALE_AGO_MS
	const inflightHb = nowMs - INFLIGHT_AGO_MS

	const staleResult = await errors.try(
		adminDb.db
			.insert(practiceSessions)
			.values({
				userId: u.id,
				type: "diagnostic",
				targetQuestionCount: 50,
				startedAtMs: staleHb,
				lastHeartbeatMs: staleHb
			})
			.returning({ id: practiceSessions.id })
	)
	if (staleResult.error) {
		logger.error({ error: staleResult.error }, "smoke: stale insert failed")
		throw errors.wrap(staleResult.error, "stale insert")
	}
	const stale = staleResult.data[0]
	if (!stale) {
		logger.error({ userId: u.id }, "smoke: stale insert returned no rows")
		throw errors.new("smoke: stale insert returned no rows")
	}

	const infResult = await errors.try(
		adminDb.db
			.insert(practiceSessions)
			.values({
				userId: u.id,
				type: "diagnostic",
				targetQuestionCount: 50,
				startedAtMs: inflightHb,
				lastHeartbeatMs: inflightHb
			})
			.returning({ id: practiceSessions.id })
	)
	if (infResult.error) {
		logger.error({ error: infResult.error }, "smoke: inflight insert failed")
		throw errors.wrap(infResult.error, "inflight insert")
	}
	const inf = infResult.data[0]
	if (!inf) {
		logger.error({ userId: u.id }, "smoke: inflight insert returned no rows")
		throw errors.new("smoke: inflight insert returned no rows")
	}

	logger.info(
		{
			userId: u.id,
			staleSessionId: stale.id,
			inflightSessionId: inf.id,
			staleHeartbeatMs: staleHb,
			inflightHeartbeatMs: inflightHb
		},
		"smoke: setup complete"
	)
	return {
		userId: u.id,
		staleSessionId: stale.id,
		inflightSessionId: inf.id,
		staleHeartbeatMs: staleHb,
		inflightHeartbeatMs: inflightHb
	}
}

interface CheckResult {
	step: string
	ok: boolean
	detail: Record<string, unknown>
}

async function readSession(id: string): Promise<{
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
			.where(eq(practiceSessions.id, id))
			.limit(1)
	)
	if (result.error) {
		logger.error({ error: result.error, sessionId: id }, "readSession: query failed")
		throw errors.wrap(result.error, "readSession")
	}
	const row = result.data[0]
	if (!row) {
		logger.error({ sessionId: id }, "readSession: session not found")
		throw errors.new(`session ${id} not found`)
	}
	return row
}

async function runChecks(ctx: SmokeContext): Promise<CheckResult[]> {
	const checks: CheckResult[] = []

	// (4) negative: no bearer.
	const noAuth = await fetch(`${APP_BASE}/api/cron/abandon-sweep`, { method: "POST" })
	checks.push({ step: "cron: no auth → 401", ok: noAuth.status === 401, detail: { status: noAuth.status } })

	// (5) negative: wrong bearer.
	const wrongAuth = await fetch(`${APP_BASE}/api/cron/abandon-sweep`, {
		method: "POST",
		headers: { Authorization: "Bearer wrong-token" }
	})
	checks.push({ step: "cron: wrong auth → 401", ok: wrongAuth.status === 401, detail: { status: wrongAuth.status } })

	// (6) positive: valid bearer.
	const cronRes = await fetch(`${APP_BASE}/api/cron/abandon-sweep`, {
		method: "POST",
		headers: { Authorization: `Bearer ${env.CRON_SECRET}` }
	})
	checks.push({ step: "cron: valid auth → 204", ok: cronRes.status === 204, detail: { status: cronRes.status } })

	// Verify stale session was finalized as abandoned.
	const stale = await readSession(ctx.staleSessionId)
	const expectedEnd = ctx.staleHeartbeatMs + HEARTBEAT_GRACE_MS
	const staleOk =
		stale.endedAtMs === expectedEnd &&
		stale.completionReason === "abandoned" &&
		stale.lastHeartbeatMs === ctx.staleHeartbeatMs
	checks.push({
		step: "cron: stale session finalized",
		ok: staleOk,
		detail: {
			endedAtMs: stale.endedAtMs,
			expectedEndedAtMs: expectedEnd,
			completionReason: stale.completionReason,
			lastHeartbeatMs: stale.lastHeartbeatMs
		}
	})

	// Verify in-flight session is unchanged.
	const inf = await readSession(ctx.inflightSessionId)
	const infOk =
		inf.endedAtMs === null &&
		inf.completionReason === null &&
		inf.lastHeartbeatMs === ctx.inflightHeartbeatMs
	checks.push({
		step: "cron: in-flight session untouched",
		ok: infOk,
		detail: {
			endedAtMs: inf.endedAtMs,
			completionReason: inf.completionReason,
			lastHeartbeatMs: inf.lastHeartbeatMs
		}
	})

	// (7) heartbeat happy-path: bump in-flight session.
	const hbBefore = inf.lastHeartbeatMs
	const hbCallStartMs = Date.now()
	const hbRes = await fetch(`${APP_BASE}/api/sessions/${ctx.inflightSessionId}/heartbeat`, {
		method: "POST"
	})
	const infAfter = await readSession(ctx.inflightSessionId)
	const hbDelta = infAfter.lastHeartbeatMs - hbCallStartMs
	const hbOk =
		hbRes.status === 204 &&
		infAfter.lastHeartbeatMs > hbBefore &&
		hbDelta >= -1000 && // server clock skew tolerance
		hbDelta <= 5000 // bumped within ~5s of call
	checks.push({
		step: "heartbeat: bumps in-flight row",
		ok: hbOk,
		detail: {
			status: hbRes.status,
			before: hbBefore,
			after: infAfter.lastHeartbeatMs,
			deltaMsFromCall: hbDelta
		}
	})

	// (8) heartbeat against ended row: should 204 no-op.
	const staleHbBefore = stale.lastHeartbeatMs
	const noOpRes = await fetch(`${APP_BASE}/api/sessions/${ctx.staleSessionId}/heartbeat`, {
		method: "POST"
	})
	const staleAfterHb = await readSession(ctx.staleSessionId)
	const noOpOk =
		noOpRes.status === 204 &&
		staleAfterHb.lastHeartbeatMs === staleHbBefore &&
		staleAfterHb.endedAtMs === expectedEnd &&
		staleAfterHb.completionReason === "abandoned"
	checks.push({
		step: "heartbeat: no-op on ended row",
		ok: noOpOk,
		detail: {
			status: noOpRes.status,
			lastHeartbeatMs: staleAfterHb.lastHeartbeatMs,
			endedAtMs: staleAfterHb.endedAtMs,
			completionReason: staleAfterHb.completionReason
		}
	})

	// Heartbeat against unknown UUID: should 204 (no leakage).
	const unknownId = "00000000-0000-7000-8000-000000000000"
	const unknownRes = await fetch(`${APP_BASE}/api/sessions/${unknownId}/heartbeat`, {
		method: "POST"
	})
	checks.push({
		step: "heartbeat: 204 on unknown sessionId",
		ok: unknownRes.status === 204,
		detail: { status: unknownRes.status }
	})

	return checks
}

async function main(): Promise<void> {
	const ctx = await setup()
	const result = await errors.try(runChecks(ctx))
	if (result.error) {
		logger.error({ error: result.error }, "smoke: runChecks threw")
		process.exit(1)
	}
	let allOk = true
	for (const c of result.data) {
		if (!c.ok) allOk = false
		logger.info({ step: c.step, ok: c.ok, detail: c.detail }, "phase3-commit3: check")
	}
	if (!allOk) {
		logger.error("phase3-commit3 smoke: one or more checks failed")
		process.exit(1)
	}
	logger.info("phase3-commit3 smoke: all checks passed")
}

await main()
