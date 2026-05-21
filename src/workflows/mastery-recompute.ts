// masteryRecomputeWorkflow — fired by endSession (and by the
// abandon-sweep cron). Walks the distinct sub-types touched in the
// session and calls recomputeForUser per sub-type.
//
// C2 of end-session-perf round (2026-05-12). Previously this workflow
// invoked 4 separate "use step" functions (loadSessionMetadataStep,
// listDistinctSubTypesStep, logRecomputeLoopStartingStep, and N×
// recomputeStep). C1 measurement showed ~700ms of Vercel Workflow
// transition overhead per step boundary; with 14 sub-types on a full-
// length, that was 15 transitions × ~700ms ≈ 10 seconds of pure
// transition overhead inside a ~13.6s endSession total. Collapsing to
// one combined step (recomputeAllForSession) eliminates 14 of those
// 15 transitions while preserving the same DB ops, the same order, and
// the same instrumentation (per-phase phase:complete + per-sub-type
// recompute:user:* logs live inside the combined step).
//
// SPEC §9.4 historically said "sequential, not parallelized — the few
// hundred milliseconds saved by parallelism aren't worth the partial-
// failure complexity." That rationale assumed cheap step boundaries.
// C1 refuted the "few hundred ms" magnitude; this commit responds by
// reducing the boundary count rather than changing the within-step
// ordering. The recompute loop inside the combined step is still
// serial.
//
// All step bodies live in `./mastery-recompute-steps`. This file
// contains only the workflow orchestration so the `@workflow/next`
// plugin's node-module guard sees no pino-reachable edge in the
// workflow file's import graph. See mastery-recompute-steps.ts for the
// rationale + the actual logic + logger calls. The 4 pre-C2 step
// functions remain exported from the steps file (unused by this
// workflow but kept for a one-line revert path).

import { recomputeAllForSession } from "@/workflows/mastery-recompute-steps"

async function masteryRecomputeWorkflow(input: { sessionId: string }): Promise<void> {
	"use workflow"
	await recomputeAllForSession({ sessionId: input.sessionId })
}

export { masteryRecomputeWorkflow }
