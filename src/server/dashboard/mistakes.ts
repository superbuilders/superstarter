// Dashboard mistakes-tile counter. Real read against attempts joined
// to practice_sessions. Practice round commit 8
// (`docs/plans/practice-round.md` §5 commit 8 + decision 6 +
// audit checkpoint J).
//
// Returns the count of DISTINCT items where the user has at least one
// wrong attempt. The Mistakes Review surface (the /review page itself)
// stays a stub this round; the count is real so the top-panel
// "Mistakes to review" stat reflects actual user state instead of
// "0" for everyone.
//
// Spaced review is intentionally NOT modeled (cut from v1 — see
// `docs/plans/dashboard.md` §2.8). The future Mistakes PRD may add
// a "still wrong on last attempt" filter; this round's framing is
// the simplest correct version: "any wrong attempt counts."
//
// **Query shape:**
//   SELECT COUNT(DISTINCT a.item_id)
//   FROM attempts a
//   INNER JOIN practice_sessions ps ON ps.id = a.session_id
//   WHERE ps.user_id = $1 AND a.correct = false
//
// `attempts` has no standalone userId column (audit checkpoint K
// from dashboard round); the join through practice_sessions.user_id
// is the canonical pattern for "this user's attempts." Index path:
// practice_sessions_user_id_idx → attempts_session_id_idx → filter
// on attempts.correct.
//
// **Helper signature unchanged.** Returns `Promise<number>` (just the
// count). The orchestrator at src/server/dashboard/data.ts wraps it
// into DashboardData["mistakesQueue"] with estimatedMinutes
// (Math.max(1, Math.round(count * 0.35))) + href ("/review"). Per
// the existing dashboard-round contract.

import * as errors from "@superbuilders/errors"
import { and, countDistinct, eq } from "drizzle-orm"
import { db } from "@/db"
import { attempts } from "@/db/schemas/practice/attempts"
import { practiceSessions } from "@/db/schemas/practice/practice-sessions"
import { logger } from "@/logger"

async function countMistakes(userId: string): Promise<number> {
	const result = await errors.try(
		db
			.select({ count: countDistinct(attempts.itemId) })
			.from(attempts)
			.innerJoin(practiceSessions, eq(attempts.sessionId, practiceSessions.id))
			.where(and(eq(practiceSessions.userId, userId), eq(attempts.correct, false)))
	)
	if (result.error) {
		logger.error({ error: result.error, userId }, "countMistakes: query failed")
		throw errors.wrap(result.error, "countMistakes")
	}
	const row = result.data[0]
	if (row === undefined) {
		// COUNT always returns one row; this branch is defensive only.
		logger.error(
			{ userId },
			"countMistakes: COUNT query returned no rows (impossible)"
		)
		throw errors.new("countMistakes: empty result")
	}
	logger.debug({ userId, count: row.count }, "countMistakes: query returned")
	return row.count
}

export { countMistakes }
