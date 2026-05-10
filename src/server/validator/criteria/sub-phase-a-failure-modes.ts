// sub-phase-a-failure-modes criterion (Phase 4 sub-phase b §1.2 commit 0 stub).
//
// Per plan-doc §0.6.1 #5: heuristic detectors for known sub-phase a failure
// modes per scripts/_logs/convergence-audit.md:
//   - numerical.lowest_values:* cells: TEMPLATING ARTIFACT (97.5% convergence
//     by design — repeated phrasing). Whitelist: do NOT flag as near-duplicate.
//   - verbal.antonyms: real convergence at 37.9%. Flag as candidate-set
//     redundancy (admin decides keep-one-or-several).
//   - numerical.number_series: 5.6% real convergence; minor.
//
// Implementation lands at §1.2 commit-1.

import * as errors from "@superbuilders/errors"
import { logger } from "@/logger"
import type {
	CandidateForValidation,
	ValidationContext,
	ValidatorCriterion,
	ValidatorVerdict
} from "@/server/validator/types"

const ErrSubPhaseAFailureModesNotImplemented = errors.new(
	"sub-phase-a-failure-modes criterion not yet implemented"
)

async function checkSubPhaseAFailureModes(
	candidate: CandidateForValidation,
	_ctx: ValidationContext
): Promise<ValidatorVerdict> {
	logger.warn(
		{ itemId: candidate.id, subTypeId: candidate.subTypeId },
		"sub-phase-a-failure-modes criterion invoked before implementation"
	)
	return { kind: "error", reason: "criterion not yet implemented (commit-1)" }
}

const subPhaseAFailureModesCriterion: ValidatorCriterion = {
	name: "sub-phase-a-failure-modes",
	check: checkSubPhaseAFailureModes
}

export { ErrSubPhaseAFailureModesNotImplemented, subPhaseAFailureModesCriterion }
