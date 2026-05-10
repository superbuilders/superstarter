// per-sub-type-structural criterion (Phase 4 sub-phase b §1.2 commit 0 stub).
//
// Per plan-doc §0.6.1 #4: per-sub-type structural rules. E.g., letter_series
// has the expected letter-pattern shape; numerical sub-types have numeric
// correctAnswer values; verbal antonyms options should not duplicate the stem
// word. Implementation: per-sub-type validator function selected via dispatch
// keyed on candidate.subTypeId.
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

const ErrPerSubTypeStructuralNotImplemented = errors.new(
	"per-sub-type-structural criterion not yet implemented"
)

async function checkPerSubTypeStructural(
	candidate: CandidateForValidation,
	_ctx: ValidationContext
): Promise<ValidatorVerdict> {
	logger.warn(
		{ itemId: candidate.id, subTypeId: candidate.subTypeId },
		"per-sub-type-structural criterion invoked before implementation"
	)
	return { kind: "error", reason: "criterion not yet implemented (commit-1)" }
}

const perSubTypeStructuralCriterion: ValidatorCriterion = {
	name: "per-sub-type-structural",
	check: checkPerSubTypeStructural
}

export { ErrPerSubTypeStructuralNotImplemented, perSubTypeStructuralCriterion }
