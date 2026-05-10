// Validator criteria barrel — exports the six auto-detectable criteria in
// plan-doc §0.6.1's order. The engine iterates `allCriteria` per candidate.
//
// Criterion names align byte-for-byte with the plan-doc list:
//   1. schema-shape
//   2. tier-distribution
//   3. embedding-distance
//   4. per-sub-type-structural
//   5. sub-phase-a-failure-modes
//   6. provenance-batch-reject

import type { ValidatorCriterion } from "@/server/validator/types"
import { embeddingDistanceCriterion } from "@/server/validator/criteria/embedding-distance"
import { perSubTypeStructuralCriterion } from "@/server/validator/criteria/per-sub-type-structural"
import { provenanceBatchRejectCriterion } from "@/server/validator/criteria/provenance-batch-reject"
import { schemaShapeCriterion } from "@/server/validator/criteria/schema-shape"
import { subPhaseAFailureModesCriterion } from "@/server/validator/criteria/sub-phase-a-failure-modes"
import { tierDistributionCriterion } from "@/server/validator/criteria/tier-distribution"

const allCriteria: ReadonlyArray<ValidatorCriterion> = [
	schemaShapeCriterion,
	tierDistributionCriterion,
	embeddingDistanceCriterion,
	perSubTypeStructuralCriterion,
	subPhaseAFailureModesCriterion,
	provenanceBatchRejectCriterion
]

export { allCriteria }
