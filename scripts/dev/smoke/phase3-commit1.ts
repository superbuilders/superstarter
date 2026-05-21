// scripts/dev/smoke/phase3-commit1.ts
//
// Phase 3 commit-1 smoke. Exercises the underlying server functions
// (NOT the (app)/actions.ts wrappers) directly against the dev DB.
//
// Why direct imports:
//   - The server actions in src/app/(app)/actions.ts call auth(), which
//     requires Next.js request context and is not reachable from raw Bun.
//   - The masteryRecomputeWorkflow's start() call also requires Next.js
//     context (Phase 2 Appendix D item 4) — so we pass
//     `{ skipWorkflowTrigger: true }` to endSession, the dev/test escape
//     hatch documented in plan §10 commit 1.
//
// Per the project ruleset, scripts/ uses src/-style idioms (errors.try +
// logger). The pattern matches scripts/backfill-missing-embeddings.ts.
//
// Usage:
//   bun run scripts/dev/smoke/phase3-commit1.ts
//
// Cleanup:
//   The script leaves the test user, session, and one attempt row in
//   place so the smoke can be inspected post-hoc. Re-running creates a
//   new test user (deterministic email by run timestamp) so reruns are
//   isolated.

import "@/env"
import * as errors from "@superbuilders/errors"
import { eq } from "drizzle-orm"
import { createAdminDb } from "@/db/admin"
import { users } from "@/db/schemas/auth/users"
import { items } from "@/db/schemas/catalog/items"
import { attempts } from "@/db/schemas/practice/attempts"
import { practiceSessions } from "@/db/schemas/practice/practice-sessions"
import { logger } from "@/logger"
import { endSession } from "@/server/sessions/end"
import { startSession } from "@/server/sessions/start"
import { submitAttempt } from "@/server/sessions/submit"

interface SmokeContext {
	userId: string
}

async function createTestUser(): Promise<SmokeContext> {
	await using adminDb = await createAdminDb()
	const email = `phase3-smoke-${Date.now()}@local.dev`
	const insertResult = await errors.try(
		adminDb.db
			.insert(users)
			.values({
				email,
				name: "Phase 3 Smoke User"
			})
			.returning({ id: users.id })
	)
	if (insertResult.error) {
		logger.error({ error: insertResult.error, email }, "smoke: user insert failed")
		throw errors.wrap(insertResult.error, "smoke: insert user")
	}
	const inserted = insertResult.data[0]
	if (!inserted) {
		logger.error({ email }, "smoke: user insert returning empty")
		throw errors.new("smoke: user insert returned no rows")
	}
	logger.info({ userId: inserted.id, email }, "smoke: test user created")
	return { userId: inserted.id }
}

interface PhaseResult {
	step: string
	ok: boolean
	detail: Record<string, unknown>
}

async function runSmoke(): Promise<PhaseResult[]> {
	const ctx = await createTestUser()
	const phases: PhaseResult[] = []

	logger.info({ userId: ctx.userId }, "smoke: calling startSession({ type: 'diagnostic' })")
	const startResult = await errors.try(startSession({ userId: ctx.userId, type: "diagnostic" }))
	if (startResult.error) {
		logger.error({ error: startResult.error }, "smoke: startSession failed")
		throw errors.wrap(startResult.error, "smoke: startSession")
	}
	const start = startResult.data
	const optionsCount = start.firstItem.options.length
	const optionsOk = optionsCount >= 4
	phases.push({
		step: "startSession",
		ok: optionsOk,
		detail: {
			sessionId: start.sessionId,
			firstItemId: start.firstItem.id,
			optionsCount,
			servedAtTier: start.firstItem.selection.servedAtTier,
			fallbackLevel: start.firstItem.selection.fallbackLevel
		}
	})

	logger.info(
		{ sessionId: start.sessionId, itemId: start.firstItem.id },
		"smoke: calling submitAttempt"
	)
	const submitResult = await errors.try(
		submitAttempt({
			sessionId: start.sessionId,
			itemId: start.firstItem.id,
			selectedAnswer: start.firstItem.options[0]?.id,
			latencyMs: 1234,
			selection: start.firstItem.selection
		})
	)
	if (submitResult.error) {
		logger.error({ error: submitResult.error }, "smoke: submitAttempt failed")
		throw errors.wrap(submitResult.error, "smoke: submitAttempt")
	}
	const submit = submitResult.data
	const nextItemPresent = submit.nextItem !== undefined
	phases.push({
		step: "submitAttempt",
		ok: nextItemPresent,
		detail: {
			nextItemId: submit.nextItem?.id,
			nextServedAtTier: submit.nextItem?.selection.servedAtTier,
			nextFallbackLevel: submit.nextItem?.selection.fallbackLevel
		}
	})

	logger.info(
		{ sessionId: start.sessionId, skipWorkflowTrigger: true },
		"smoke: calling underlying endSession with skipWorkflowTrigger=true"
	)
	const endResult = await errors.try(endSession(start.sessionId, { skipWorkflowTrigger: true }))
	if (endResult.error) {
		logger.error({ error: endResult.error }, "smoke: endSession failed")
		throw errors.wrap(endResult.error, "smoke: endSession")
	}

	await using adminDb = await createAdminDb()
	const sessionRowResult = await errors.try(
		adminDb.db
			.select({
				endedAtMs: practiceSessions.endedAtMs,
				completionReason: practiceSessions.completionReason
			})
			.from(practiceSessions)
			.where(eq(practiceSessions.id, start.sessionId))
			.limit(1)
	)
	if (sessionRowResult.error) {
		logger.error({ error: sessionRowResult.error }, "smoke: session row read failed")
		throw errors.wrap(sessionRowResult.error, "smoke: read session row")
	}
	const sessionRow = sessionRowResult.data[0]
	const endedAtSet = sessionRow !== undefined && sessionRow.endedAtMs !== null
	const completedSet = sessionRow !== undefined && sessionRow.completionReason === "completed"
	phases.push({
		step: "endSession (post-conditions)",
		ok: endedAtSet && completedSet,
		detail: {
			endedAtMs: sessionRow?.endedAtMs,
			completionReason: sessionRow?.completionReason
		}
	})

	const attemptCountResult = await errors.try(
		adminDb.db
			.select({ id: attempts.id })
			.from(attempts)
			.where(eq(attempts.sessionId, start.sessionId))
	)
	if (attemptCountResult.error) {
		logger.error({ error: attemptCountResult.error }, "smoke: attempts count failed")
		throw errors.wrap(attemptCountResult.error, "smoke: count attempts")
	}
	const attemptCount = attemptCountResult.data.length
	phases.push({
		step: "attempts row count",
		ok: attemptCount === 1,
		detail: { attemptCount }
	})

	// Bonus: confirm the first item came from the seed bank.
	const itemRowResult = await errors.try(
		adminDb.db
			.select({ subTypeId: items.subTypeId, source: items.source, status: items.status })
			.from(items)
			.where(eq(items.id, start.firstItem.id))
			.limit(1)
	)
	if (itemRowResult.error) {
		logger.error({ error: itemRowResult.error }, "smoke: item read failed")
		throw errors.wrap(itemRowResult.error, "smoke: read first item")
	}
	const itemRow = itemRowResult.data[0]
	phases.push({
		step: "first-item provenance",
		ok: itemRow !== undefined && itemRow.status === "live",
		detail: {
			itemSubTypeId: itemRow?.subTypeId,
			itemSource: itemRow?.source,
			itemStatus: itemRow?.status
		}
	})

	return phases
}

const main = await errors.try(runSmoke())
if (main.error) {
	logger.error({ error: main.error }, "phase3-commit1 smoke: failed")
	process.exit(1)
}
const phases = main.data
let allOk = true
for (const p of phases) {
	if (!p.ok) allOk = false
	logger.info({ step: p.step, ok: p.ok, detail: p.detail }, "phase3-commit1 smoke: phase result")
}
if (!allOk) {
	logger.error("phase3-commit1 smoke: one or more phases failed")
	process.exit(1)
}
logger.info("phase3-commit1 smoke: all phases passed")
