// Dashboard pace-strip helper. STUB: returns a zero-week shape
// until the Pace-Strip PRD lands. See Dashboard PRD §6.6 +
// `docs/plans/dashboard.md` §5 commit 5 + §9 stub-removal table.
//
// PaceWeek is internal to this module; the orchestrator at data.ts
// converts ms → seconds and computes per-day "isToday" flags before
// surfacing as DashboardData["pace"].

import { logger } from "@/logger"

interface PaceWeek {
	medianMs: number
	/** Length 7, oldest first; today is the last entry */
	perDayMs: ReadonlyArray<number>
}

// TODO(stub): wire to real data in the Pace-Strip PRD
// (`docs/plans/dashboard.md` §9). When real: median(latency_ms) over
// the last 7 days of attempts joined to practice_sessions.user_id =
// userId, bucketed by floor((now - id-time) / 86_400_000). Use
// uuidv7LowerBound from @/db/lib/uuid-time for the range filter so
// the predicate hits the PK index (per SPEC §6.14.6's UUIDv7-text-max
// pattern).
async function computePaceWeek(userId: string): Promise<PaceWeek> {
	logger.debug({ userId }, "computePaceWeek stub: returning zero-week")
	return { medianMs: 0, perDayMs: [0, 0, 0, 0, 0, 0, 0] }
}

export { computePaceWeek }
