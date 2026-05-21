// Dashboard mistakes-tile counter. Real read against attempts joined
// to practice_sessions.
//
// Returns the count of DISTINCT items where the user has at least one
// wrong attempt AND no correct attempt anywhere. This semantic powers
// the /mistakes redrill flow: getting an item correct (anywhere) takes
// it off the mistakes list.
//
// **Query shape:**
//   SELECT COUNT(DISTINCT a.item_id)
//   FROM attempts a
//   INNER JOIN practice_sessions ps ON ps.id = a.session_id
//   WHERE ps.user_id = $1 AND a.correct = false
//     AND NOT EXISTS (
//       SELECT 1 FROM attempts a2
//       INNER JOIN practice_sessions ps2 ON ps2.id = a2.session_id
//       WHERE ps2.user_id = $1 AND a2.item_id = a.item_id
//         AND a2.correct = true
//     )

import * as errors from "@superbuilders/errors"
import { and, countDistinct, eq, sql } from "drizzle-orm"
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
			.where(
				and(
					eq(practiceSessions.userId, userId),
					eq(attempts.correct, false),
					sql`NOT EXISTS (
						SELECT 1
						FROM attempts a2
						INNER JOIN practice_sessions ps2 ON ps2.id = a2.session_id
						WHERE ps2.user_id = ${userId}
							AND a2.item_id = ${attempts.itemId}
							AND a2.correct = true
					)`
				)
			)
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
