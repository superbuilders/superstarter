// tier-distribution criterion (Phase 4 sub-phase b §1.2 commit 0 stub).
//
// Per plan-doc §0.6.1 #2: candidate's claimed tier matches sub-phase a
// generator's claim per provenance file at scripts/_siblings/<parentItemId>.json.
// Mismatch → flag.
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

const ErrTierDistributionNotImplemented = errors.new("tier-distribution criterion not yet implemented")

async function checkTierDistribution(
	candidate: CandidateForValidation,
	_ctx: ValidationContext
): Promise<ValidatorVerdict> {
	logger.warn({ itemId: candidate.id }, "tier-distribution criterion invoked before implementation")
	return { kind: "error", reason: "criterion not yet implemented (commit-1)" }
}

const tierDistributionCriterion: ValidatorCriterion = {
	name: "tier-distribution",
	check: checkTierDistribution
}

export { ErrTierDistributionNotImplemented, tierDistributionCriterion }
