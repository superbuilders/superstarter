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
	// Default options — workflow trigger always fires. See file header.
	await sessionEnd.endSession(sessionId)
	revalidatePath(`/post-session/${sessionId}`)
}

// `recordDiagnosticOvertimeNote` was the polish-round in-flow overlay
// trigger; both it and the underlying overlay are deleted. The diagnostic
// is untimed at the session level under the capacity-measurement framing
// (PRD §4.1, plan docs/plans/phase3-diagnostic-flow.md §4). The
// `practice_sessions.diagnostic_overtime_note_shown_at_ms` DB column is
// left in place as vestigial-and-unread for sub-phase 1 — see plan §10.

const allowedPercentiles = [50, 30, 20, 10, 5] as const
const onboardingTargetsSchema = z.object({
	targetPercentile: z
		.union([
			z.literal(50),
			z.literal(30),
			z.literal(20),
			z.literal(10),
			z.literal(5)
		])
		.optional(),
	targetDateMs: z.number().int().positive().optional()
})

async function saveOnboardingTargets(input: {
	targetPercentile?: (typeof allowedPercentiles)[number]
	targetDateMs?: number
}): Promise<void> {
	const parsed = onboardingTargetsSchema.safeParse(input)
	if (!parsed.success) {
		logger.error({ issues: parsed.error.issues }, "saveOnboardingTargets: input invalid")
		throw errors.wrap(ErrInvalidActionInput, "saveOnboardingTargets input")
	}
	const userId = await requireUserId()
	const updateValues: { targetPercentile?: number; targetDateMs?: number } = {}
	if (parsed.data.targetPercentile !== undefined) {
		updateValues.targetPercentile = parsed.data.targetPercentile
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
			targetPercentile: parsed.data.targetPercentile,
			targetDateMs: parsed.data.targetDateMs
		},
		"saveOnboardingTargets: targets persisted"
	)
	revalidatePath("/")
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
	submitAttempt
}
