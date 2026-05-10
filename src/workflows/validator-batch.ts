// validatorBatchWorkflow — Phase 4 sub-phase b §1.3's batch validator.
//
// All step bodies live in `./validator-batch-steps`. This file contains only
// the workflow orchestration so the `@workflow/next` plugin's node-module
// guard sees no pino-reachable edge in the workflow file's import graph.
// See validator-batch-steps.ts for the rationale + the actual logic + logger
// calls (precedent: `sibling-generation.ts` + `embedding-backfill.ts`).
//
// Two-pass orchestration:
//   1. Pass-1: validateCandidate with empty cohortFailureRates Map; criteria
//      1-5 produce verdicts; criterion 6 (provenance-batch-reject) returns
//      pass-1 deferral (kind: "pass").
//   2. Compute per-cohort failure rate from pass-1 verdicts (criteria 1-5
//      flag/error count divided by cohort size).
//   3. Pass-2: validateCandidate with populated cohortFailureRates; merge
//      criterion-6 verdict from pass-2 into pass-1 verdicts; recompute
//      hasAnyFlag.
//
// Persistence is conditional: production mode invokes persistResultsStep
// (stubbed at §1.3 commit-0; throws ErrPersistNotYetImplemented). Dry-run
// mode skips persistence entirely.

import {
	buildContextStep,
	computeCohortRatesStep,
	loadCandidatesStep,
	persistResultsStep,
	runPass1Step,
	runPass2Step,
	summarizeCalibrationStep
} from "@/workflows/validator-batch-steps"
import type { CalibrationSummary } from "@/server/validator/calibration"
import type { CohortPass1Stats } from "@/workflows/validator-batch-steps"

interface ValidatorBatchInput {
	readonly mode: "dry-run" | "production"
	readonly invokedByAdminEmail: string
}

interface ValidatorBatchOutput {
	readonly mode: "dry-run" | "production"
	readonly candidateCount: number
	readonly calibrationSummary: CalibrationSummary
	readonly cohortStats: ReadonlyArray<CohortPass1Stats>
	readonly persistedCount: number
}

async function validatorBatchWorkflow(input: ValidatorBatchInput): Promise<ValidatorBatchOutput> {
	"use workflow"
	const candidates = await loadCandidatesStep()
	const ctx = await buildContextStep(candidates)
	const pass1 = await runPass1Step(candidates, ctx)
	const cohort = await computeCohortRatesStep(candidates, pass1)
	const pass2 = await runPass2Step(candidates, ctx, cohort.rates, pass1)
	const calibrationSummary = summarizeCalibrationStep(pass2)
	let persistedCount = 0
	if (input.mode === "production") {
		persistedCount = await persistResultsStep(pass2, input.invokedByAdminEmail)
	}
	return {
		mode: input.mode,
		candidateCount: candidates.length,
		calibrationSummary,
		cohortStats: cohort.stats,
		persistedCount
	}
}

export type { ValidatorBatchInput, ValidatorBatchOutput }
export { validatorBatchWorkflow }
