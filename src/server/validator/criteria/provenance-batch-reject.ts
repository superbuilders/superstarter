// provenance-batch-reject criterion (Phase 4 sub-phase b §1.2 commit 2 — implementation).
//
// Per plan-doc §0.6.1 #6: cohort-failure-rate threshold. Cohort key =
// metadata_json.promptHash (per §1.2 commit-1 backfill at b792f45). At v1
// sub-type↔cohort is 1:1 (each sub-type has exactly one promptHash); the
// criterion's value is in *prompt-iteration debugging* — when a generator
// prompt produces systematically-bad output, the cohort-failure-rate signal
// flags the entire cohort. Forward-extensible to multi-prompt-per-sub-type
// generator runs without changing the criterion's logic.
//
// Two-pass orchestration: ValidationContext.cohortFailureRates is populated
// by the §1.3 batch runner after pass-1 (criteria 1-5) runs across the
// working set. Pass-1 invocations see an empty Map and the criterion returns
// pass (defer); pass-2 sees populated rates and flags cohorts above
// threshold. The engine's per-candidate single-pass loop is unchanged; the
// runner does the two-pass orchestration.
//
// First-cut threshold: 20% per plan-doc §0.6.1 reasoning ("if a generator-run
// with a specific promptHash or templateVersion produces candidates that
// systematically fail one of the above criteria at high rate (e.g., > 20%)").
// Calibration directive: §1.3 runner queries actual cohort-failure-rates and
// tunes before production batch.

import * as errors from "@superbuilders/errors"
import { logger } from "@/logger"
import type {
	CandidateForValidation,
	ValidationContext,
	ValidatorCriterion,
	ValidatorVerdict
} from "@/server/validator/types"

const COHORT_FAILURE_THRESHOLD = 0.2

async function checkProvenanceBatchReject(
	candidate: CandidateForValidation,
	ctx: ValidationContext
): Promise<ValidatorVerdict> {
	const promptHash = candidate.metadataJson.promptHash
	if (typeof promptHash !== "string" || promptHash.length === 0) {
		return {
			kind: "error",
			reason: "candidate metadata_json.promptHash missing or non-string"
		}
	}
	if (ctx.cohortFailureRates.size === 0) {
		// Pass-1 deferral: rates not yet computed; runner re-invokes in pass-2.
		logger.debug(
			{ itemId: candidate.id },
			"provenance-batch-reject: cohort rates empty (pass-1 deferral)"
		)
		return { kind: "pass" }
	}
	const rate = ctx.cohortFailureRates.get(promptHash)
	if (rate === undefined) {
		// Cohort not represented in rate map — treat as pass (no signal).
		return { kind: "pass" }
	}
	if (rate >= COHORT_FAILURE_THRESHOLD) {
		return {
			kind: "flag",
			reason: "cohort failure rate at or above batch-reject threshold",
			metadata: {
				check: "cohort-batch-reject",
				cohortKey: promptHash,
				cohortFailureRate: rate,
				threshold: COHORT_FAILURE_THRESHOLD
			}
		}
	}
	return { kind: "pass" }
}

const ErrProvenanceBatchRejectUnreachable = errors.new(
	"provenance-batch-reject criterion unreachable error"
)

const provenanceBatchRejectCriterion: ValidatorCriterion = {
	name: "provenance-batch-reject",
	check: checkProvenanceBatchReject
}

export {
	COHORT_FAILURE_THRESHOLD,
	ErrProvenanceBatchRejectUnreachable,
	provenanceBatchRejectCriterion
}
