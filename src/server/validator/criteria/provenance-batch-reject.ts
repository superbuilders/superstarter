// provenance-batch-reject criterion (Phase 4 sub-phase b §1.2 commit 0 stub).
//
// Per plan-doc §0.6.1 #6: if a generator-run cohort with a specific promptHash
// or templateVersion produces candidates that systematically fail one of the
// other criteria at high rate (e.g., > 20%), flag the entire cohort for admin
// batch-reject review. Cohort failure rates are pre-computed in
// ValidationContext.cohortFailureRates so this criterion is a pure lookup.
//
// Audit step 12 finding: promptHash is NULL across the working-set candidates
// (only generatorModel + templateVersion populated). §1.2 commit-1 finalizes
// the cohort key shape — likely templateVersion alone for v1; generatorModel+
// templateVersion if multiple models contribute; promptHash for future
// generator runs that populate it.
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

const ErrProvenanceBatchRejectNotImplemented = errors.new(
	"provenance-batch-reject criterion not yet implemented"
)

async function checkProvenanceBatchReject(
	candidate: CandidateForValidation,
	_ctx: ValidationContext
): Promise<ValidatorVerdict> {
	logger.warn(
		{ itemId: candidate.id },
		"provenance-batch-reject criterion invoked before implementation"
	)
	return { kind: "error", reason: "criterion not yet implemented (commit-1)" }
}

const provenanceBatchRejectCriterion: ValidatorCriterion = {
	name: "provenance-batch-reject",
	check: checkProvenanceBatchReject
}

export { ErrProvenanceBatchRejectNotImplemented, provenanceBatchRejectCriterion }
