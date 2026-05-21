// Abandon-sweep cron — Plan §1.9 / §7.3.
//
// Schedule: `0 4 * * *` (daily 4 AM UTC) — see vercel.json. Daily is the
// maximum cron frequency on Vercel Hobby plan; sub-daily requires Pro
// ($20/month). For preview deployments this means abandoned sessions
// linger up to ~24h before being finalized — acceptable as long as the
// deploy stays on Hobby.
//
// Method: GET. Vercel Cron sends HTTP GET requests by design (not
// configurable as of 2026-05). Bearer-auth via env.CRON_SECRET, matching
// the other /api/cron/* and /api/admin/* routes' guard convention. The
// proxy already exempts /api/cron from the redirect-to-login path
// (PUBLIC_PREFIXES in src/proxy.ts), so the auth check here is the only
// gate.
//
// What it does:
//   - Atomically finalize any session whose last_heartbeat_ms is older
//     than 5 minutes (300_000 ms — see plan §7.3 for the threshold
//     rationale; the SPEC's older `120000` figure was corrected by the
//     plan to mitigate false-abandons on flaky networks).
//   - Sets ended_at_ms = last_heartbeat_ms + 30000 (heartbeat cadence,
//     so the recorded end is the last "alive" mark + one missed beat).
//   - Sets completion_reason = 'abandoned'.
//   - Fires masteryRecomputeWorkflow per finalized session so partial
//     diagnostics still produce mastery signal (capped per the
//     diagnostic-source rules in src/server/mastery/compute.ts).
//
// The race with endSession is handled by both writers' `ended_at_ms IS
// NULL` guard: whichever commits first wins, the loser's UPDATE no-ops.
// See plan §9.3.
import * as errors from "@superbuilders/errors"
import { and, isNull, lt, sql } from "drizzle-orm"
import { start } from "workflow/api"
import { db } from "@/db"
import { practiceSessions } from "@/db/schemas/practice/practice-sessions"
import { env } from "@/env"
import { logger } from "@/logger"
import {
	ABANDON_THRESHOLD_MS,
	HEARTBEAT_GRACE_MS
} from "@/server/sessions/abandon-threshold"
import { masteryRecomputeWorkflow } from "@/workflows/mastery-recompute"

async function GET(req: Request): Promise<Response> {
	const auth = req.headers.get("authorization")
	const expected = `Bearer ${env.CRON_SECRET}`
	if (auth !== expected) {
		logger.warn(
			{ hasHeader: Boolean(auth) },
			"abandon-sweep: unauthorized — missing or wrong bearer"
		)
		return Response.json({ error: "unauthorized" }, { status: 401 })
	}

	const nowMs = Date.now()
	const cutoffMs = nowMs - ABANDON_THRESHOLD_MS

	const result = await errors.try(
		db
			.update(practiceSessions)
			.set({
				endedAtMs: sql`${practiceSessions.lastHeartbeatMs} + ${HEARTBEAT_GRACE_MS}`,
				completionReason: "abandoned"
			})
			.where(
				and(
					lt(practiceSessions.lastHeartbeatMs, cutoffMs),
					isNull(practiceSessions.endedAtMs)
				)
			)
			.returning({ id: practiceSessions.id, userId: practiceSessions.userId })
	)

	if (result.error) {
		logger.error({ error: result.error }, "abandon-sweep: update failed")
		return Response.json({ error: "internal error" }, { status: 500 })
	}

	const finalized = result.data

	logger.info(
		{ count: finalized.length, cutoffMs, thresholdMs: ABANDON_THRESHOLD_MS },
		"abandon-sweep: finalized"
	)

	// Fire-and-forget: enqueue masteryRecomputeWorkflow per finalized
	// session. Each start() is its own request to the workflow runtime;
	// failure of one shouldn't block the others. Errors are logged, not
	// propagated, so the cron's 204 reflects "sweep done," not "every
	// downstream workflow accepted."
	for (const row of finalized) {
		const startResult = await errors.try(
			start(masteryRecomputeWorkflow, [{ sessionId: row.id }])
		)
		if (startResult.error) {
			logger.error(
				{ error: startResult.error, sessionId: row.id, userId: row.userId },
				"abandon-sweep: masteryRecomputeWorkflow start failed"
			)
			continue
		}
		logger.info(
			{ sessionId: row.id, userId: row.userId },
			"abandon-sweep: masteryRecomputeWorkflow enqueued"
		)
	}

	return new Response(null, { status: 204 })
}

export { GET }
