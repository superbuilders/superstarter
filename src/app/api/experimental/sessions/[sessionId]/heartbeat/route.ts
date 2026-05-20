import * as errors from "@superbuilders/errors"
import { and, eq, isNull, sql } from "drizzle-orm"
import { db } from "@/db"
import { authSessions } from "@/db/schemas/auth/sessions"
import { experimentalSessions } from "@/db/schemas/experimental/experimental-sessions"
import { logger } from "@/logger"

interface RouteContext {
	params: Promise<{ sessionId: string }>
}

const NO_OP_RESPONSE = new Response(null, { status: 204 })

function readSessionTokenFromCookies(req: Request): string | undefined {
	const header = req.headers.get("cookie")
	if (header === null) return undefined
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
		logger.debug({ sessionId }, "experimental heartbeat: no session-token cookie, no-op")
		return NO_OP_RESPONSE
	}
	const result = await errors.try(
		db
			.update(experimentalSessions)
			.set({ lastHeartbeatMs: sql`(extract(epoch from now()) * 1000)::bigint` })
			.where(
				and(
					eq(experimentalSessions.id, sessionId),
					isNull(experimentalSessions.endedAtMs),
					sql`${experimentalSessions.userId} = (
						SELECT ${authSessions.userId} FROM ${authSessions}
						WHERE ${authSessions.sessionToken} = ${sessionToken}
						  AND ${authSessions.expiresMs} > (extract(epoch from now()) * 1000)::bigint
					)`
				)
			)
	)
	if (result.error) {
		logger.error(
			{ error: result.error, sessionId },
			"experimental heartbeat: update failed"
		)
		return NO_OP_RESPONSE
	}
	return NO_OP_RESPONSE
}

export { POST }
