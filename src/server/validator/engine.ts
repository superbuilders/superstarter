// Validator engine orchestration (Phase 4 sub-phase b §1.2 commit 0).
//
// Iterates the six auto-detectable criteria per candidate; aggregates verdicts;
// applies Q2 conservative-first flag policy (pressure-cell membership flags
// regardless of criterion outcome).
//
// Per plan-doc §0.6.8 Q10, this engine is invoked by §1.3's Vercel Workflow
// batch runner (validator-batch.ts + validator-batch-steps.ts pattern,
// mirroring sibling-generation). Continuous-pipeline extension chains
// validateCandidate after siblingGenerationWorkflow without refactor.

import * as errors from "@superbuilders/errors"
import { logger } from "@/logger"
import { allCriteria } from "@/server/validator/criteria"
import type {
	CandidateForValidation,
	CandidateValidationResult,
	ValidationContext,
	ValidatorVerdict
} from "@/server/validator/types"

const ErrValidatorEngineFailed = errors.new("validator engine failed for candidate")

// Compose the pressure-cell key from sub-type + difficulty. The §1.3 batch
// runner builds ValidationContext.pressureCells from runtime live-bank state
// (cells with 0–1 live items at hard or brutal tier per §1.0 empirical
// finding plus the brutal-tier-of-zero cells across 11 sub-types).
function pressureCellKey(candidate: CandidateForValidation): string {
	return `${candidate.subTypeId}:${candidate.difficulty}`
}

// Evaluate one candidate against all criteria. Returns the aggregated result.
// Each criterion runs sequentially; criterion errors do not abort the run —
// the full flag map is returned regardless of individual criterion outcomes.
//
// Q2 conservative-first flag policy: hasAnyFlag is true if ANY criterion
// produced a flag or error verdict OR if the candidate is in a pressure cell.
async function validateCandidate(
	candidate: CandidateForValidation,
	ctx: ValidationContext
): Promise<CandidateValidationResult> {
	const flagsByName = new Map<string, ValidatorVerdict>()
	let criterionFlagged = false

	for (const criterion of allCriteria) {
		const verdictResult = await errors.try(criterion.check(candidate, ctx))
		if (verdictResult.error) {
			logger.error(
				{
					itemId: candidate.id,
					criterion: criterion.name,
					error: verdictResult.error
				},
				"validator criterion threw unexpected error"
			)
			flagsByName.set(criterion.name, {
				kind: "error",
				reason: "criterion threw — see server logs"
			})
			criterionFlagged = true
			continue
		}
		const verdict = verdictResult.data
		flagsByName.set(criterion.name, verdict)
		if (verdict.kind === "flag" || verdict.kind === "error") {
			criterionFlagged = true
		}
	}

	const isPressureCell = ctx.pressureCells.has(pressureCellKey(candidate))
	const hasAnyFlag = criterionFlagged ? true : isPressureCell
	return {
		itemId: candidate.id,
		flagsByName,
		hasAnyFlag,
		isPressureCell,
		evaluatedAtMs: Date.now()
	}
}

export { ErrValidatorEngineFailed, validateCandidate }
