// Heartbeat route — Plan §1.8 / §7.1 / phase3-heartbeats-and-cron §7.
//
// The <Heartbeat> client component fires `navigator.sendBeacon` here every
// 30 seconds plus once on `pagehide`. The handler bumps
// `practice_sessions.last_heartbeat_ms` and returns 204.
//
// Ownership scope (sub-phase 4 commit 1). The UPDATE's WHERE clause
// includes a subquery against `auth_sessions` that resolves the
// requesting user_id from the session-token cookie inline. Only when
// `(practice_sessions.id, practice_sessions.user_id)` matches the
// resolved cookie owner does the UPDATE write a row. A wrong-cookie
// request silently no-ops (zero rows in the UPDATE's RETURNING) — same
// idempotency contract as the prior version, but ownership-scoped.
//
// Cookie name is environment-aware per Auth.js v5: `authjs.session-token`
// in HTTP (dev), `__Secure-authjs.session-token` in HTTPS (prod). The
// route reads both and prefers the secure-prefix one when both are
// present. Hardcoding the dev name would silently drop ownership
// enforcement in production — the Cookie header read below is the
// route's only auth surface.
//
// Idempotency on the row: the WHERE clause includes `ended_at_ms IS
// NULL` so a heartbeat that races with `endSession` (the action
// committing completion) or with the abandon-sweep cron (committing
// abandonment) silently no-ops on the already-ended row. Returns 204
// either way to avoid leaking session existence to a curl-with-known-id
// probe.
//
// No `auth()` call — the route is on the public side of the proxy
// (matcher carve-out in src/proxy.ts). The auth-sessions read happens
// inline in the UPDATE's subquery, so the route still pays one
// auth_sessions read per heartbeat (database session strategy means
// the read can't be avoided), but in a single PG round-trip rather
// than two. See docs/plans/phase3-heartbeats-and-cron.md §7 for the
// Shape A rationale + the rejected Shape B (call auth(), then
// UPDATE — two round-trips).

import * as errors from "@superbuilders/errors"
import { and, eq, isNull, sql } from "drizzle-orm"
import { db } from "@/db"
import { authSessions } from "@/db/schemas/auth/sessions"
import { practiceSessions } from "@/db/schemas/practice/practice-sessions"
import { logger } from "@/logger"

interface RouteContext {
	params: Promise<{ sessionId: string }>
}

const NO_OP_RESPONSE = new Response(null, { status: 204 })

function readSessionTokenFromCookies(req: Request): string | undefined {
	const header = req.headers.get("cookie")
	if (header === null) return undefined
	// Cookie header shape: "name1=value1; name2=value2". Auth.js v5 uses
	// `__Secure-authjs.session-token` in HTTPS and `authjs.session-token`
	// in HTTP. Prefer the secure name when both are present (production
	// semantics).
	const pairs = header.split(";")
	let secureValue: string | undefined
	let insecureValue: string | undefined
	for (const raw of pairs) {
		const trimmed = raw.trim()
		const eqIdx = trimmed.indexOf("=")
		if (eqIdx === -1) continue
		const name = trimmed.slice(0, eqIdx)
		const value = trimmed.slice(eqIdx + 1)
		if (name === "__Secure-authjs.session-token") secureValue = value
		else if (name === "authjs.session-token") insecureValue = value
	}
	if (secureValue !== undefined) return secureValue
	return insecureValue
}

async function POST(req: Request, ctx: RouteContext): Promise<Response> {
	const params = await ctx.params
	const sessionId = params.sessionId

	const sessionToken = readSessionTokenFromCookies(req)
	if (sessionToken === undefined) {
		// No cookie → no ownership claim. 204 idempotently; do not write.
		logger.debug({ sessionId }, "heartbeat: no session-token cookie, no-op")
		return NO_OP_RESPONSE
	}

	// Shape A (sub-phase 4 commit 1): inline subquery resolves the
	// cookie owner's user_id from auth_sessions, with the expires_ms
	// guard inside the subquery's WHERE so an expired token matches
	// zero rows. The outer UPDATE only writes when sessionId is owned
	// by that user AND not already ended. One PG round-trip; two
	// indexed lookups (auth_sessions PK on session_token, then
	// practice_sessions PK on id).
	const result = await errors.try(
		db
			.update(practiceSessions)
			.set({ lastHeartbeatMs: sql`(extract(epoch from now()) * 1000)::bigint` })
			.where(
				and(
					eq(practiceSessions.id, sessionId),
					isNull(practiceSessions.endedAtMs),
					sql`${practiceSessions.userId} = (
						SELECT ${authSessions.userId} FROM ${authSessions}
						WHERE ${authSessions.sessionToken} = ${sessionToken}
						  AND ${authSessions.expiresMs} > (extract(epoch from now()) * 1000)::bigint
					)`
				)
			)
			.returning({ id: practiceSessions.id })
	)
	if (result.error) {
		// Log but still return 204 — the beacon is fire-and-forget from the
		// client; surfacing a 5xx here doesn't help anyone and risks
		// retry storms on a flaky DB.
		logger.error({ error: result.error, sessionId }, "heartbeat: update failed")
		return NO_OP_RESPONSE
	}
	if (result.data.length === 0) {
		// One of: session does not exist; session is already ended; the
		// cookie's user does not own the session; the cookie is expired
		// or unknown. All cases recoverable; log at debug and 204
		// silently to avoid leaking which case fired.
		logger.debug({ sessionId }, "heartbeat: zero rows updated (missing/ended/owner-mismatch)")
		return NO_OP_RESPONSE
	}
	logger.debug({ sessionId }, "heartbeat: bumped")
	return NO_OP_RESPONSE
}

export { POST }
