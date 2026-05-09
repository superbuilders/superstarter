// End-of-session adaptive-walker tier read for the post-session belt
// indicator (sub-phase 5).
//
// Plan: docs/plans/phase5-dojo-belt-indicator.md §5.4 + §5.5.
//
// Reads the most-recent attempt's REQUESTED tier (fallback_from_tier ??
// served_at_tier per SPEC §9.2's "verification reads requested tier")
// for a drill session. Returns null when:
//   - The session does not exist (defensive; the calling page already
//     gates by ownership + existence).
//   - The session's type is not 'drill' (defensive; the indicator is
//     drill-mode only per plan §5.3 / §11.3).
//   - The session has zero attempts (component renders nothing per
//     plan §5.5 — "render nothing rather than an empty container").
//
// Otherwise returns { tier, attemptCount, isPreFloor }, where
// isPreFloor reflects whether the walker's running window has reached
// ADAPTIVE_FLOOR_ATTEMPTS. The belt indicator surfaces a "(calibrating)"
// suffix in the pre-floor branch so the user knows the walker hasn't
// stepped yet.
//
// One DB round-trip: a single SELECT joining practice_sessions to
// attempts (LEFT JOIN so the zero-attempt branch surfaces) plus a
// correlated subquery to read the most-recent attempt's requested tier.
// Covered by the existing attempts_session_id_idx index on
// (session_id) — see commit 2's EXPLAIN ANALYZE.
//
// Sibling-module placement (rather than colocation in page.tsx) per
// the audit-against-actual-artifact finding: sub-phase 1's pure
// aggregations colocate as prepared statements (PerSubTypePerformance
// etc.), but query-with-logic functions live as sibling modules
// (triageScoreForSession at @/server/triage/score). This function
// carries logic (null-on-non-drill, null-on-empty, isPreFloor calc),
// so it follows the triage precedent. Plan §5.4's "colocated in
// page.tsx" framing is superseded by the audit; flagged in commit
// message.

import * as errors from "@superbuilders/errors"
import { eq, sql } from "drizzle-orm"
import type { Difficulty } from "@/config/sub-types"
import { db } from "@/db"
import { attempts } from "@/db/schemas/practice/attempts"
import { practiceSessions } from "@/db/schemas/practice/practice-sessions"
import { logger } from "@/logger"
import { ADAPTIVE_FLOOR_ATTEMPTS } from "@/server/items/selection"

interface TierForDrillSession {
	tier: Difficulty
	attemptCount: number
	isPreFloor: boolean
}

async function getEndSessionTierForDrill(
	sessionId: string
): Promise<TierForDrillSession | null> {
	const result = await errors.try(
		db
			.select({
				sessionType: practiceSessions.type,
				attemptCount: sql<number>`COUNT(${attempts.id})::int`,
				mostRecentTier: sql<Difficulty | null>`(
					SELECT COALESCE(a2.fallback_from_tier, a2.served_at_tier)
					FROM ${attempts} a2
					WHERE a2.session_id = ${practiceSessions.id}
					ORDER BY a2.id DESC
					LIMIT 1
				)`
			})
			.from(practiceSessions)
			.leftJoin(attempts, eq(attempts.sessionId, practiceSessions.id))
			.where(eq(practiceSessions.id, sessionId))
			.groupBy(practiceSessions.id, practiceSessions.type)
	)
	if (result.error) {
		logger.error(
			{ error: result.error, sessionId },
			"getEndSessionTierForDrill: query failed"
		)
		throw errors.wrap(result.error, "getEndSessionTierForDrill")
	}
	const row = result.data[0]
	if (!row) {
		logger.debug({ sessionId }, "getEndSessionTierForDrill: session not found")
		return null
	}
	if (row.sessionType !== "drill") {
		logger.debug(
			{ sessionId, sessionType: row.sessionType },
			"getEndSessionTierForDrill: non-drill session, returning null"
		)
		return null
	}
	if (row.attemptCount === 0 || row.mostRecentTier === null) {
		logger.debug(
			{ sessionId, attemptCount: row.attemptCount },
			"getEndSessionTierForDrill: zero-attempt session, returning null"
		)
		return null
	}
	return {
		tier: row.mostRecentTier,
		attemptCount: row.attemptCount,
		isPreFloor: row.attemptCount < ADAPTIVE_FLOOR_ATTEMPTS
	}
}

export type { TierForDrillSession }
export { getEndSessionTierForDrill }
