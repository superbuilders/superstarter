// endSession — underlying function. Idempotent at the row level via the
// `WHERE ended_at_ms IS NULL` guard, so a race with the abandon-sweep cron
// (plan §9.3) cannot double-write. The cron's UPDATE with the same guard
// will no-op if endSession committed first, and vice versa.
//
// The `skipWorkflowTrigger` flag is the dev/test-only escape hatch
// documented in the plan §10 commit-1 entry. The Vercel Workflow
// runtime's start() requires Next.js request context (Phase 2 Appendix D
// item 4) and throws from raw Bun, which would block any direct test of
// the action's DB writes. The flag is reachable ONLY by direct import of
// this function from a script — the (app)/actions.ts wrapper always
// passes false.

import * as errors from "@superbuilders/errors"
import { start } from "workflow/api"
import { and, eq, isNull, sql } from "drizzle-orm"
import { db } from "@/db"
import { practiceSessions } from "@/db/schemas/practice/practice-sessions"
import { logger } from "@/logger"
import { masteryRecomputeWorkflow } from "@/workflows/mastery-recompute"

interface EndSessionOptions {
	// dev/test only — see file header. NOT exposed via the (app)/actions.ts
	// server action; only the commit-1 smoke script ever sets this true.
	skipWorkflowTrigger?: boolean
	// When true, await the masteryRecomputeWorkflow's body completion (via
	// the Run handle's `returnValue` getter, which polls until completion)
	// before returning. Default false → fire-and-forget; the workflow's
	// `recomputeStep` writes may still be in flight when this function
	// returns. Set true from the (app)/actions.ts user-facing endSession
	// action so the dashboard's `revalidatePath('/')` can fire AFTER the
	// new mastery_state rows land — see Round 1 §5.7 + §0.4. The cron
	// caller at app/api/cron/abandon-sweep/route.ts keeps the default
	// (fire-and-forget) — cron throughput matters more than the post-write
	// invalidation timing in that path.
	awaitCompletion?: boolean
}

async function endSession(sessionId: string, options?: EndSessionOptions): Promise<void> {
	const tFnStart = Date.now()
	const awaitCompletionFlag = options?.awaitCompletion === true
	logger.info(
		{ sessionId, awaitCompletion: awaitCompletionFlag },
		"endSession:fn:start"
	)
	const skipWorkflow = options?.skipWorkflowTrigger === true

	const tUpdateStart = Date.now()
	const updateResult = await errors.try(
		db
			.update(practiceSessions)
			.set({
				endedAtMs: sql`(extract(epoch from now()) * 1000)::bigint`,
				completionReason: "completed"
			})
			.where(
				and(eq(practiceSessions.id, sessionId), isNull(practiceSessions.endedAtMs))
			)
			.returning({ id: practiceSessions.id })
	)
	logger.info(
		{ sessionId, updateMs: Date.now() - tUpdateStart },
		"endSession:fn:update"
	)
	if (updateResult.error) {
		logger.error(
			{ error: updateResult.error, sessionId },
			"endSession: update failed"
		)
		throw errors.wrap(updateResult.error, "endSession update")
	}
	const finalized = updateResult.data[0]
	if (!finalized) {
		// Either the session does not exist OR it was already ended (by the
		// cron sweep, or by a duplicate endSession call). Both are recoverable
		// — log a warning and return; the caller's flow is allowed to continue
		// regardless. This makes the call idempotent.
		logger.warn({ sessionId }, "endSession: session row not finalized (already ended or missing)")
		logger.info(
			{ sessionId, totalMs: Date.now() - tFnStart, earlyReturn: "already-ended" },
			"endSession:fn:complete"
		)
		return
	}

	logger.info({ sessionId }, "endSession: session finalized as completed")

	if (skipWorkflow) {
		logger.info(
			{ sessionId },
			"endSession: skipWorkflowTrigger=true, skipping masteryRecomputeWorkflow"
		)
		logger.info(
			{ sessionId, totalMs: Date.now() - tFnStart, earlyReturn: "skip-workflow" },
			"endSession:fn:complete"
		)
		return
	}

	const tWorkflowStartStart = Date.now()
	const startResult = await errors.try(
		start(masteryRecomputeWorkflow, [{ sessionId }])
	)
	logger.info(
		{ sessionId, workflowStartMs: Date.now() - tWorkflowStartStart },
		"endSession:fn:workflowStart"
	)
	if (startResult.error) {
		logger.error(
			{ error: startResult.error, sessionId },
			"endSession: masteryRecomputeWorkflow start failed"
		)
		throw errors.wrap(startResult.error, "endSession: masteryRecomputeWorkflow start")
	}
	const run = startResult.data

	if (options?.awaitCompletion === true) {
		const tAwaitStart = Date.now()
		const completionResult = await errors.try(run.returnValue)
		logger.info(
			{ sessionId, runId: run.runId, awaitMs: Date.now() - tAwaitStart },
			"endSession:fn:awaitComplete"
		)
		if (completionResult.error) {
			logger.error(
				{ error: completionResult.error, sessionId, runId: run.runId },
				"endSession: masteryRecomputeWorkflow body failed"
			)
			throw errors.wrap(completionResult.error, "endSession: masteryRecomputeWorkflow body")
		}
		logger.info(
			{ sessionId, runId: run.runId },
			"endSession: masteryRecomputeWorkflow body completed (awaited)"
		)
	}
	logger.info(
		{ sessionId, totalMs: Date.now() - tFnStart },
		"endSession:fn:complete"
	)
}

export type { EndSessionOptions }
export { endSession }
