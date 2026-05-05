// scripts/dev/smoke/phase3-polish-commit1.ts
//
// Phase 3 polish commit-1 smoke. Exercises three changes from
// docs/plans/phase-3-polish-practice-surface-features.md commit 1:
//
//   1. The diagnostic shuffle (`shuffledDiagnosticOrder` driving the
//      `'fixed_curve'` strategy) — confirms the served sequence is no
//      longer in `diagnosticMix` array order.
//   2. The 15-minute hard cutoff in `submitAttempt` — confirms a
//      diagnostic session past the threshold returns
//      `{ nextItem: undefined }` regardless of remaining attempt count.
//   3. The pre-cutoff path stays unchanged — the first few submits
//      return real `nextItem` values when the session is fresh.
//
// Why direct imports (mirrors phase3-commit1.ts):
//   - The (app)/actions.ts wrappers call auth() which requires Next.js
//     request context.
//   - endSession's mastery workflow trigger requires Next.js context
//     (Phase 2 Appendix D item 4); pass `{ skipWorkflowTrigger: true }`
//     against the underlying function.
//
// Usage:
//   bun run scripts/dev/smoke/phase3-polish-commit1.ts
//
// Cleanup: leaves the test row in place for post-hoc inspection.
//   Re-runs use a Date.now()-suffixed email so reruns are isolated.

import "@/env"
import * as errors from "@superbuilders/errors"
import { eq, sql } from "drizzle-orm"
import { diagnosticMix } from "@/config/diagnostic-mix"
import { createAdminDb } from "@/db/admin"
import { attempts } from "@/db/schemas/practice/attempts"
import { practiceSessions } from "@/db/schemas/practice/practice-sessions"
import { users } from "@/db/schemas/auth/users"
import { items } from "@/db/schemas/catalog/items"
import { logger } from "@/logger"
import { endSession } from "@/server/sessions/end"
import { startSession } from "@/server/sessions/start"
import { submitAttempt, type SubmitAttemptResult } from "@/server/sessions/submit"

interface SmokeContext {
	userId: string
}

async function createTestUser(): Promise<SmokeContext> {
	await using adminDb = await createAdminDb()
	const email = `phase3-polish-smoke-${Date.now()}@local.dev`
	const insertResult = await errors.try(
		adminDb.db
			.insert(users)
			.values({
				email,
				name: "Phase 3 Polish Smoke User"
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

interface SubmitOutcome {
	result: SubmitAttemptResult
	nextItemId?: string
	nextSubTypeId?: string
}

async function submitOnce(
	sessionId: string,
	itemId: string,
	selectedAnswer: string | undefined,
	selection: { servedAtTier: "easy" | "medium" | "hard" | "brutal"; fallbackFromTier?: "easy" | "medium" | "hard" | "brutal"; fallbackLevel: "fresh" | "session-soft" | "recency-soft" | "tier-degraded" }
): Promise<SubmitOutcome> {
	const r = await errors.try(
		submitAttempt({
			sessionId,
			itemId,
			selectedAnswer,
			latencyMs: 5000,
			triagePromptFired: false,
			triageTaken: false,
			selection
		})
	)
	if (r.error) {
		logger.error({ error: r.error, sessionId, itemId }, "smoke: submitAttempt failed")
		throw errors.wrap(r.error, "smoke: submitAttempt")
	}
	const data = r.data
	if (data.nextItem === undefined) return { result: data }
	// Look up the served sub-type for the served-order observability.
	await using adminDb = await createAdminDb()
	const itemRow = await errors.try(
		adminDb.db
			.select({ subTypeId: items.subTypeId })
			.from(items)
			.where(eq(items.id, data.nextItem.id))
			.limit(1)
	)
	if (itemRow.error) {
		logger.error({ error: itemRow.error, itemId: data.nextItem.id }, "smoke: item lookup failed")
		throw errors.wrap(itemRow.error, "smoke: item lookup")
	}
	return {
		result: data,
		nextItemId: data.nextItem.id,
		nextSubTypeId: itemRow.data[0]?.subTypeId
	}
}

async function runSmoke(): Promise<PhaseResult[]> {
	const ctx = await createTestUser()
	const phases: PhaseResult[] = []

	logger.info({ userId: ctx.userId }, "smoke: startSession({ type: 'diagnostic' })")
	const startResult = await errors.try(startSession({ userId: ctx.userId, type: "diagnostic" }))
	if (startResult.error) {
		logger.error({ error: startResult.error }, "smoke: startSession failed")
		throw errors.wrap(startResult.error, "smoke: startSession")
	}
	const start = startResult.data
	phases.push({
		step: "startSession",
		ok: start.firstItem.options.length >= 4,
		detail: {
			sessionId: start.sessionId,
			firstItemId: start.firstItem.id,
			optionsCount: start.firstItem.options.length
		}
	})

	// Pre-cutoff path: submit attempts 1 + 2, both should return a real
	// nextItem (we are at minute 0 of the diagnostic).
	const preCutoffServedSubTypes: Array<string | undefined> = []

	// Submit 1
	const submit1 = await submitOnce(
		start.sessionId,
		start.firstItem.id,
		start.firstItem.options[0]?.id,
		start.firstItem.selection
	)
	preCutoffServedSubTypes.push(submit1.nextSubTypeId)
	phases.push({
		step: "submit 1 (pre-cutoff)",
		ok: submit1.result.nextItem !== undefined,
		detail: {
			nextItemId: submit1.nextItemId,
			nextSubTypeId: submit1.nextSubTypeId
		}
	})

	// Submit 2
	if (submit1.result.nextItem === undefined) {
		logger.error({ sessionId: start.sessionId }, "smoke: submit 1 returned undefined nextItem (pre-cutoff)")
		throw errors.new("smoke: submit 1 returned undefined nextItem (pre-cutoff)")
	}
	const item2 = submit1.result.nextItem
	const submit2 = await submitOnce(
		start.sessionId,
		item2.id,
		item2.options[0]?.id,
		item2.selection
	)
	preCutoffServedSubTypes.push(submit2.nextSubTypeId)
	phases.push({
		step: "submit 2 (pre-cutoff)",
		ok: submit2.result.nextItem !== undefined,
		detail: {
			nextItemId: submit2.nextItemId,
			nextSubTypeId: submit2.nextSubTypeId
		}
	})

	// Cutoff path: hand-edit started_at_ms to (now - 16 minutes) so the
	// next submit lands past the 15-minute threshold.
	if (submit2.result.nextItem === undefined) {
		logger.error({ sessionId: start.sessionId }, "smoke: submit 2 returned undefined nextItem (pre-cutoff)")
		throw errors.new("smoke: submit 2 returned undefined nextItem (pre-cutoff)")
	}
	const item3 = submit2.result.nextItem

	{
		await using adminDb = await createAdminDb()
		const updateResult = await errors.try(
			adminDb.db
				.update(practiceSessions)
				.set({ startedAtMs: sql`(extract(epoch from now()) * 1000)::bigint - (16 * 60 * 1000)` })
				.where(eq(practiceSessions.id, start.sessionId))
				.returning({ id: practiceSessions.id })
		)
		if (updateResult.error) {
			logger.error(
				{ error: updateResult.error, sessionId: start.sessionId },
				"smoke: started_at_ms hand-edit failed"
			)
			throw errors.wrap(updateResult.error, "smoke: hand-edit started_at_ms")
		}
		logger.info(
			{ sessionId: start.sessionId },
			"smoke: hand-edited started_at_ms to (now - 16 minutes)"
		)
	}

	const submit3 = await submitOnce(
		start.sessionId,
		item3.id,
		item3.options[0]?.id,
		item3.selection
	)
	phases.push({
		step: "submit 3 (post-cutoff) — expect nextItem === undefined",
		ok: submit3.result.nextItem === undefined,
		detail: {
			nextItemDefined: submit3.result.nextItem !== undefined
		}
	})

	// Trigger endSession via the underlying function (skipWorkflowTrigger).
	// The FocusShell's onEndSession callback would fire after seeing
	// nextItem === undefined; the underlying function is what writes the
	// session-end columns.
	const endResult = await errors.try(
		endSession(start.sessionId, { skipWorkflowTrigger: true })
	)
	if (endResult.error) {
		logger.error({ error: endResult.error }, "smoke: endSession failed")
		throw errors.wrap(endResult.error, "smoke: endSession")
	}

	// Spot-checks: completion_reason = 'completed', attempts count = 3.
	{
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
		const row = sessionRowResult.data[0]
		phases.push({
			step: "endSession post-conditions (completed + ended_at_ms set)",
			ok: row !== undefined && row.endedAtMs !== null && row.completionReason === "completed",
			detail: {
				endedAtMs: row?.endedAtMs,
				completionReason: row?.completionReason
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
			step: "attempts count = 3 (3 submits, last one counts even though cutoff fired)",
			ok: attemptCount === 3,
			detail: { attemptCount }
		})
	}

	// Observability: confirm the served order is no longer the unshuffled
	// `diagnosticMix` array order. The first three diagnosticMix slots
	// are all `verbal.antonyms`. Under the shuffle, the first three
	// served sub-types should NOT all be `verbal.antonyms` (with
	// overwhelming probability — collision is one in ~3^50).
	{
		await using adminDb = await createAdminDb()
		const firstItemRow = await errors.try(
			adminDb.db
				.select({ subTypeId: items.subTypeId })
				.from(items)
				.where(eq(items.id, start.firstItem.id))
				.limit(1)
		)
		if (firstItemRow.error) {
			logger.error({ error: firstItemRow.error }, "smoke: first-item subType read failed")
			throw errors.wrap(firstItemRow.error, "smoke: first-item subType")
		}
		const firstSub = firstItemRow.data[0]?.subTypeId
		const allSubs: Array<string | undefined> = [firstSub, ...preCutoffServedSubTypes]
		const allSynonyms = allSubs.every(function isSynonyms(s) {
			return s === "verbal.antonyms"
		})
		const unshuffledFirstThree = [
			diagnosticMix[0]?.subTypeId,
			diagnosticMix[1]?.subTypeId,
			diagnosticMix[2]?.subTypeId
		]
		phases.push({
			step: "served-order is shuffled (first 3 sub-types are NOT all verbal.antonyms)",
			ok: !allSynonyms,
			detail: {
				servedSubTypes: allSubs,
				unshuffledFirstThree
			}
		})
	}

	return phases
}

const main = await errors.try(runSmoke())
if (main.error) {
	logger.error({ error: main.error }, "phase3-polish-commit1 smoke: failed")
	process.exit(1)
}
const phases = main.data
let allOk = true
for (const p of phases) {
	if (!p.ok) allOk = false
	logger.info({ step: p.step, ok: p.ok, detail: p.detail }, "phase3-polish-commit1 smoke: phase result")
}
if (!allOk) {
	logger.error("phase3-polish-commit1 smoke: one or more phases failed")
	process.exit(1)
}
logger.info("phase3-polish-commit1 smoke: all phases passed")
