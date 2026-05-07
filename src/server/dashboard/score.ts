// Dashboard score-strip + last-sim helpers. STUB: both return empty
// values until the Sim Scoring PRD lands. See Dashboard PRD §6.4 +
// `docs/plans/dashboard.md` §5 commit 5 + §9 stub-removal table.
//
// The codebase does not yet persist a per-sim score column on
// practice_sessions; the score is an aggregate over `attempts.correct`
// against a 50-question full-sim. The Sim Scoring PRD decides whether
// the score lives as a denormalized column, a derived view, or a
// separate `sim_results` table.

import { logger } from "@/logger"
import type { DashboardData } from "@/server/dashboard/types"

interface ScoreEstimate {
	current?: number
	delta?: number
}

// TODO(stub): wire to real data in the Sim Scoring PRD
// (`docs/plans/dashboard.md` §9). When real: median of last N
// simulation sessions' computed scores.
async function computeScoreEstimate(userId: string): Promise<ScoreEstimate> {
	logger.debug({ userId }, "computeScoreEstimate stub: returning empty")
	return { current: undefined, delta: undefined }
}

// TODO(stub): wire to real data in the Sim Scoring PRD
// (`docs/plans/dashboard.md` §9). When real: most recent
// practice_sessions row where type IN ('full_length', 'simulation')
// AND ended_at_ms IS NOT NULL.
//
// Decision E (`docs/plans/dashboard.md` §3, resolved 2026-05-07):
// the 'simulation' enum value is reserved for a future test-day-
// simulation surface and is never written by v1 code; full sims today
// are stored as type='full_length'. The IN-clause covers both so the
// helper is not re-litigated when the Sim Scoring PRD lands. If the
// follow-up PRD wants to distinguish the two, the dashboard's
// "last-sim" tile is type-agnostic — it just shows the most recent
// score-bearing session.
async function getLastFullSim(userId: string): Promise<DashboardData["lastSim"]> {
	logger.debug({ userId }, "getLastFullSim stub: returning undefined")
	return undefined
}

export { computeScoreEstimate, getLastFullSim }
