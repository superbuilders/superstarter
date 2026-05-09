"use server"

// Phase 3 server actions. Thin wrappers over the underlying functions
// in src/server/sessions/* and src/server/mastery/*. Each action:
//   1. Resolves the user via auth() (or throws ErrUnauthorized).
//   2. Validates the input shape via Zod.
//   3. Calls the underlying function.
//   4. revalidatePath after writes (the per-action policy is described
//      below action-by-action).
//
// This wrapper always invokes the underlying endSession with default
// options — the workflow-trigger always fires. The dev/test escape hatch
// (see src/server/sessions/end.ts) is reachable only by direct import
// from a script, never from this surface. See plan §10 commit 1.
//
// Practice round commit 4 added two dashboard-mutation actions:
// updateGoal + updateTargetDate. Both clone the saveOnboardingTargets
// pattern (Zod-parsed input, requireUserId, errors.try around DB
// write, revalidatePath("/")) and write to users.target_score and
// users.target_date_ms respectively. Per
// `docs/plans/practice-round.md` §3 decision 3: two narrow actions
// rather than extending saveOnboardingTargets — the diagnostic-
// completion onboarding form (saveOnboardingTargets) and the
// dashboard editors (updateGoal + updateTargetDate) are different
// surfaces with different copy and different write semantics.

import * as errors from "@superbuilders/errors"
import { revalidatePath } from "next/cache"
import { eq } from "drizzle-orm"
import { z } from "zod"
import { auth, signOut } from "@/auth"
import { subTypeIds } from "@/config/sub-types"
import { db } from "@/db"
import { users } from "@/db/schemas/auth/users"
import { practiceSessions } from "@/db/schemas/practice/practice-sessions"
import { logger } from "@/logger"
import * as sessionEnd from "@/server/sessions/end"
import * as sessionStart from "@/server/sessions/start"
import type { StartSessionInput, StartSessionResult } from "@/server/sessions/start"
import * as sessionSubmit from "@/server/sessions/submit"
import type { SubmitAttemptInput, SubmitAttemptResult } from "@/server/sessions/submit"

const ErrUnauthorized = errors.new("unauthorized")
const ErrInvalidActionInput = errors.new("invalid action input")

const startSessionInputSchema = z.object({
	type: z.enum(["diagnostic", "drill", "full_length", "simulation"]),
	subTypeId: z.enum(subTypeIds).optional(),
	timerMode: z.literal("standard").optional(),
	drillLength: z.union([z.literal(5), z.literal(10), z.literal(20)]).optional()
})

type StartSessionActionInput = Omit<StartSessionInput, "userId">

async function requireUserId(): Promise<string> {
	const session = await auth()
	if (!session?.user?.id) {
		logger.warn("action: no auth session")
		throw errors.wrap(ErrUnauthorized, "no session")
	}
	return session.user.id
}

async function startSession(input: StartSessionActionInput): Promise<StartSessionResult> {
	const parsed = startSessionInputSchema.safeParse(input)
	if (!parsed.success) {
		logger.error({ issues: parsed.error.issues }, "startSession action: input invalid")
		throw errors.wrap(ErrInvalidActionInput, "startSession input")
	}
	const userId = await requireUserId()
	return sessionStart.startSession({ userId, ...parsed.data })
}

const submitAttemptInputSchema = z.object({
	sessionId: z.string().uuid(),
	itemId: z.string().uuid(),
	selectedAnswer: z.string().min(1).optional(),
	latencyMs: z.number().int().nonnegative(),
	triagePromptFired: z.boolean(),
	triageTaken: z.boolean(),
	selection: z.object({
		servedAtTier: z.enum(["easy", "medium", "hard", "brutal"]),
		fallbackFromTier: z.enum(["easy", "medium", "hard", "brutal"]).optional(),
		fallbackLevel: z.enum(["fresh", "session-soft", "recency-soft", "tier-degraded"])
	})
})

async function assertSessionOwnedBy(sessionId: string, userId: string): Promise<void> {
	const result = await errors.try(
		db
			.select({ userId: practiceSessions.userId })
			.from(practiceSessions)
			.where(eq(practiceSessions.id, sessionId))
			.limit(1)
	)
	if (result.error) {
		logger.error(
			{ error: result.error, sessionId, userId },
			"assertSessionOwnedBy: read failed"
		)
		throw errors.wrap(result.error, "assertSessionOwnedBy")
	}
	const row = result.data[0]
	if (!row || row.userId !== userId) {
		logger.warn(
			{ sessionId, userId, ownerUserId: row?.userId },
			"assertSessionOwnedBy: session not owned by user"
		)
		throw errors.wrap(ErrUnauthorized, `session id '${sessionId}'`)
	}
}

async function submitAttempt(input: SubmitAttemptInput): Promise<SubmitAttemptResult> {
	const parsed = submitAttemptInputSchema.safeParse(input)
	if (!parsed.success) {
		logger.error({ issues: parsed.error.issues }, "submitAttempt action: input invalid")
		throw errors.wrap(ErrInvalidActionInput, "submitAttempt input")
	}
	const userId = await requireUserId()
	await assertSessionOwnedBy(parsed.data.sessionId, userId)
	return sessionSubmit.submitAttempt(parsed.data)
}

async function endSession(sessionId: string): Promise<void> {
	const userId = await requireUserId()
	await assertSessionOwnedBy(sessionId, userId)
	// awaitCompletion=true → wait for masteryRecomputeWorkflow's body to
	// finish (recomputeStep writes the new mastery_state rows) BEFORE we
	// invalidate the dashboard route below. Otherwise revalidatePath('/')
	// fires while the workflow is still in flight and the next dashboard
	// render serves stale belts. Round 1 §5.7 + §0.4.
	await sessionEnd.endSession(sessionId, { awaitCompletion: true })
	revalidatePath(`/post-session/${sessionId}`)
	// Round 1 §5.7 + §0.4 — invalidate the dashboard so the user sees
	// post-drill belts/mastery on next visit. Path-based per audit (c):
	// the dashboard read path doesn't use cacheTag, so revalidateTag is
	// not the right tool here.
	revalidatePath("/")
}

// `recordDiagnosticOvertimeNote` was the polish-round in-flow overlay
// trigger; both it and the underlying overlay are deleted. The diagnostic
// is untimed at the session level under the capacity-measurement framing
// (PRD §4.1, plan docs/plans/phase3-diagnostic-flow.md §4). The
// `practice_sessions.diagnostic_overtime_note_shown_at_ms` DB column is
// left in place as vestigial-and-unread for sub-phase 1 — see plan §10.

// Score range matches users.target_score (1-50; the project's exams are
// always 50 questions). Mirror of <GoalEditor>'s 1-50 validation + the
// updateGoal action's range gate (per `goal-editor.tsx` + below).
// Sidecar §1 replaced the prior targetPercentile field per
// `docs/plans/score-based-target-goals-sidecar.md` §0.13 + §5.1.
const onboardingTargetsSchema = z.object({
	targetScore: z.number().int().min(1).max(50).optional(),
	targetDateMs: z.number().int().positive().optional()
})

async function saveOnboardingTargets(input: {
	targetScore?: number
	targetDateMs?: number
}): Promise<void> {
	const parsed = onboardingTargetsSchema.safeParse(input)
	if (!parsed.success) {
		logger.error({ issues: parsed.error.issues }, "saveOnboardingTargets: input invalid")
		throw errors.wrap(ErrInvalidActionInput, "saveOnboardingTargets input")
	}
	const userId = await requireUserId()
	const updateValues: { targetScore?: number; targetDateMs?: number } = {}
	if (parsed.data.targetScore !== undefined) {
		updateValues.targetScore = parsed.data.targetScore
	}
	if (parsed.data.targetDateMs !== undefined) {
		updateValues.targetDateMs = parsed.data.targetDateMs
	}
	if (Object.keys(updateValues).length === 0) {
		// Skip-for-now path. Nothing to write; just log.
		logger.info({ userId }, "saveOnboardingTargets: no fields supplied (skip-for-now)")
		revalidatePath("/")
		return
	}
	const result = await errors.try(
		db.update(users).set(updateValues).where(eq(users.id, userId))
	)
	if (result.error) {
		logger.error({ error: result.error, userId }, "saveOnboardingTargets: update failed")
		throw errors.wrap(result.error, "saveOnboardingTargets")
	}
	logger.info(
		{
			userId,
			targetScore: parsed.data.targetScore,
			targetDateMs: parsed.data.targetDateMs
		},
		"saveOnboardingTargets: targets persisted"
	)
	revalidatePath("/")
}

// updateGoal — dashboard editor for users.target_score. Practice round
// commit 4 (`docs/plans/practice-round.md` §5 commit 4 + ask 3).
// Range 1..50 per redline 5: target_score is a raw correct count out
// of 50 questions on a full sim; values outside that range are
// nonsensical and Zod rejects pre-DB. Past-test-review use cases that
// might want lower targets are still inside the range (1 minimum).
const updateGoalInputSchema = z.object({
	goal: z.number().int().min(1).max(50)
})

async function updateGoal(input: { goal: number }): Promise<{ success: true }> {
	const parsed = updateGoalInputSchema.safeParse(input)
	if (!parsed.success) {
		logger.error({ issues: parsed.error.issues }, "updateGoal: input invalid")
		throw errors.wrap(ErrInvalidActionInput, "updateGoal input")
	}
	const userId = await requireUserId()
	const result = await errors.try(
		db.update(users).set({ targetScore: parsed.data.goal }).where(eq(users.id, userId))
	)
	if (result.error) {
		logger.error(
			{ error: result.error, userId, goal: parsed.data.goal },
			"updateGoal: update failed"
		)
		throw errors.wrap(result.error, "updateGoal")
	}
	logger.info({ userId, goal: parsed.data.goal }, "updateGoal: target_score persisted")
	revalidatePath("/")
	return { success: true }
}

// updateTargetDate — dashboard editor for users.target_date_ms.
// Practice round commit 4 (`docs/plans/practice-round.md` §5 commit 4
// + ask 3). Validates as integer epoch ms. Past dates are NOT
// rejected — the user might be reviewing post-test (target date in
// the past is valid); the past-date path logs a warn so it surfaces
// in observability without blocking the write.
const updateTargetDateInputSchema = z.object({
	targetDateMs: z.number().int()
})

async function updateTargetDate(input: { targetDateMs: number }): Promise<{ success: true }> {
	const parsed = updateTargetDateInputSchema.safeParse(input)
	if (!parsed.success) {
		logger.error({ issues: parsed.error.issues }, "updateTargetDate: input invalid")
		throw errors.wrap(ErrInvalidActionInput, "updateTargetDate input")
	}
	const userId = await requireUserId()
	const nowMs = Date.now()
	if (parsed.data.targetDateMs < nowMs) {
		logger.warn(
			{ userId, targetDateMs: parsed.data.targetDateMs, nowMs },
			"updateTargetDate: target date set in past (post-test review use case)"
		)
	}
	const result = await errors.try(
		db
			.update(users)
			.set({ targetDateMs: parsed.data.targetDateMs })
			.where(eq(users.id, userId))
	)
	if (result.error) {
		logger.error(
			{ error: result.error, userId, targetDateMs: parsed.data.targetDateMs },
			"updateTargetDate: update failed"
		)
		throw errors.wrap(result.error, "updateTargetDate")
	}
	logger.info(
		{ userId, targetDateMs: parsed.data.targetDateMs },
		"updateTargetDate: target_date_ms persisted"
	)
	revalidatePath("/")
	return { success: true }
}

// signOutAction — clears the NextAuth session and redirects to /login.
// Wired to the Mastery Map header's <SignOutButton>. Plan:
// docs/plans/phase3-drill-mode.md §7.
//
// NextAuth v5's signOut() handles cookie clearing and redirect
// internally; passing { redirectTo: "/login" } drives the post-logout
// landing route. The Auth.js session row in `auth_sessions` is cleared
// by NextAuth's adapter; the client-side cookie clear happens via the
// Set-Cookie header on the redirect response.
async function signOutAction(): Promise<void> {
	await signOut({ redirectTo: "/login" })
}

export {
	endSession,
	saveOnboardingTargets,
	signOutAction,
	startSession,
	submitAttempt,
	updateGoal,
	updateTargetDate
}
