// Dashboard streak-chip helper. STUB: returns 0 until the Streaks
// PRD lands. See Dashboard PRD §6.5 + `docs/plans/dashboard.md`
// §5 commit 5 + §9 stub-removal table.
//
// The Streaks PRD decides what counts as a "practice day" (any
// completed attempt? any non-abandoned session? a minimum-attempt
// threshold?). Until then, the chip renders the neutral "Start your
// streak" copy via <StreakChip>'s zero-day branch.

import { logger } from "@/logger"

// TODO(stub): wire to real data in the Streaks PRD
// (`docs/plans/dashboard.md` §9). When real: count of consecutive
// UTC days with at least one attempt joined through
// practice_sessions.user_id = userId.
async function computeStreak(userId: string): Promise<number> {
	logger.debug({ userId }, "computeStreak stub: returning 0")
	return 0
}

export { computeStreak }
