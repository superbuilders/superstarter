// /post-session/[sessionId] — session-type-aware post-session review surface.
//
// Plan: docs/plans/phase5-post-session-review.md §3 + §12 commit 1.
//
// Server component:
//   1. Resolves params to a sessionId promise.
//   2. Loads the session row + auth check.
//   3. Redirects unauthorized access (no session, not the owner, missing
//      row) to / per the existing security shape.
//   4. **No longer redirects non-diagnostic session types** — drill,
//      full-length, and simulation sessions all render the review
//      surface here. Phase 5 sub-phase 1 commit 1 lifts the prior
//      diagnostic-only gate; the SPEC §10.2 line-5 marker that said
//      "drills land on the Mastery Map directly, NOT through
//      /post-session/[sessionId]" rewrites past-tense in commit 7.
//   5. Derives a `pacingMinutes` value from `MAX(attempts.id)`'s
//      UUIDv7 timestamp prefix minus `practice_sessions.started_at_ms`.
//      The value is undefined when the session ran ≤ 15 minutes (no
//      pacing line surfaces); when ≥ 15 minutes, the rounded minute
//      count drives the neutral pacing-line sentence rendered by
//      <PostSessionShell>. The pacing line itself is diagnostic-only
//      at the render layer; the value flows through universally to
//      keep the data shape consistent.
//   6. Passes the promise to <PostSessionContent> (a client component)
//      which consumes it via React.use() and renders the shell.

import { eq, sql } from "drizzle-orm"
import { redirect } from "next/navigation"
import * as React from "react"
import { auth } from "@/auth"
import { db } from "@/db"
import { attempts } from "@/db/schemas/practice/attempts"
import { practiceSessions } from "@/db/schemas/practice/practice-sessions"
import { timestampFromUuidv7 } from "@/db/lib/uuid-time"
import { logger } from "@/logger"
import { PostSessionContent } from "@/app/(diagnostic-flow)/post-session/[sessionId]/content"
import type { SessionTypeForShell } from "@/components/post-session/post-session-shell"

interface PageProps {
	params: Promise<{ sessionId: string }>
}

interface SessionInfo {
	sessionId: string
	sessionType: SessionTypeForShell
	pacingMinutes?: number
}

// Threshold: the real CCAT is 15 minutes for 50 questions. Sessions at
// or under this duration are on-pace and surface no pacing line. Above
// it, the pacing line surfaces with the rounded minute count (rendered
// only on diagnostic sessions per <PostSessionShell>'s gate).
const PACING_THRESHOLD_MS = 15 * 60_000

async function loadSession(sessionIdPromise: Promise<string>): Promise<SessionInfo> {
	const sessionId = await sessionIdPromise
	const session = await auth()
	if (!session?.user?.id) {
		logger.debug({ sessionId }, "/post-session: no auth session, redirect /login")
		redirect("/login")
	}
	const userId = session.user.id

	const rows = await db
		.select({
			id: practiceSessions.id,
			userId: practiceSessions.userId,
			type: practiceSessions.type,
			startedAtMs: practiceSessions.startedAtMs,
			endedAtMs: practiceSessions.endedAtMs
		})
		.from(practiceSessions)
		.where(eq(practiceSessions.id, sessionId))
		.limit(1)

	const row = rows[0]
	if (!row) {
		logger.warn({ sessionId, userId }, "/post-session: session not found, redirect /")
		redirect("/")
	}
	if (row.userId !== userId) {
		logger.warn(
			{ sessionId, userId, ownerUserId: row.userId },
			"/post-session: not owner, redirect /"
		)
		redirect("/")
	}

	// Derive the pacing-line input from attempts. We want the
	// chronologically-latest attempt's creation time minus
	// started_at_ms. Two notes on the SQL shape:
	//
	//   - The attempts table has no created_at_ms column (project rule
	//     no-timestamp-columns). Every PK is a UUIDv7 whose first 48
	//     bits encode unix-millisecond time, so MAX(id) = latest attempt.
	//   - PG has no built-in max(uuid). Casting id to text and taking
	//     max(text) works because UUIDv7's hex-text lex order matches its
	//     byte/time order. The plan executes via attempts_session_id_idx
	//     and aggregates over the session's at-most-50 rows (verified
	//     with EXPLAIN ANALYZE during Phase 3 sub-phase 1 commit 3).
	const lastAttemptRows = await db
		.select({
			lastAttemptId: sql<string | null>`max(${attempts.id}::text)::uuid`
		})
		.from(attempts)
		.where(eq(attempts.sessionId, row.id))

	const lastAttemptRow = lastAttemptRows[0]
	let pacingMinutes: number | undefined
	if (lastAttemptRow?.lastAttemptId) {
		const lastAttemptMs = timestampFromUuidv7(lastAttemptRow.lastAttemptId).getTime()
		const elapsedMs = lastAttemptMs - row.startedAtMs
		if (elapsedMs > PACING_THRESHOLD_MS) {
			pacingMinutes = Math.round(elapsedMs / 60_000)
		}
	}

	return {
		sessionId: row.id,
		sessionType: row.type,
		pacingMinutes
	}
}

function Page(props: PageProps) {
	const sessionIdPromise = props.params.then(function pickId(p) {
		return p.sessionId
	})
	const sessionPromise = loadSession(sessionIdPromise)
	return (
		<React.Suspense fallback={<PostSessionSkeleton />}>
			<PostSessionContent sessionPromise={sessionPromise} />
		</React.Suspense>
	)
}

function PostSessionSkeleton() {
	return (
		<main className="mx-auto flex min-h-dvh max-w-xl items-center justify-center px-6">
			<p className="text-muted-foreground text-sm">Loading session…</p>
		</main>
	)
}

export type { SessionInfo }
export default Page
