// Dashboard mistakes-tile counter. STUB: returns 0 until the Mistakes
// PRD lands. See Dashboard PRD §6.7 + `docs/plans/dashboard.md` §5
// commit 5 + §9 stub-removal table.
//
// This helper is intentionally NOT spaced-review-aware: spaced review
// was cut from v1 (`064a386`; see `docs/plans/dashboard.md` §2.8 for
// the audit). The Mistakes PRD will count wrong attempts the user
// hasn't yet reviewed in the post-session shell — the simplest
// interpretation that preserves the tile's value without resurrecting
// cut scope. The Dashboard PRD §10.8 framing ("wrong answers to
// review") is the v1-correct user-facing copy.

import { logger } from "@/logger"

// TODO(stub): wire to real data in the Mistakes PRD
// (`docs/plans/dashboard.md` §9). When real: count of wrong attempts
// (attempts.correct = false) joined through practice_sessions.user_id,
// optionally filtered to "not yet reviewed" once a review-
// acknowledgment surface exists. Spaced review is explicitly OUT of
// scope.
async function countMistakes(userId: string): Promise<number> {
	logger.debug({ userId }, "countMistakes stub: returning 0")
	return 0
}

export { countMistakes }
