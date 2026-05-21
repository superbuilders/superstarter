// Validator threshold registry (Phase 4 sub-phase b §1.3 commit 0).
//
// Canonical tuning surface for the three threshold-tunable criteria:
//   - embedding-distance: per-sub-type cosine similarity range.
//   - sub-phase-a-failure-modes: antonyms convergence cosine threshold.
//   - provenance-batch-reject: cohort failure rate threshold.
//
// The other three criteria (schema-shape, tier-distribution,
// per-sub-type-structural) are structural — no tunable surface — so they
// don't appear here.
//
// First-cut values lifted from §1.2 commit-2's hardcoded ranges. The §1.3
// dry-run script surfaces per-criterion flag rates against the working set;
// the redirector tunes these values per plan-doc §0.6.1 calibration directive
// (>40% loosen; <2% tighten) before §1.3 commit-1 production batch.

import type { SubTypeId } from "@/config/sub-types"

interface EmbeddingDistanceThresholds {
	readonly minBySubType: ReadonlyMap<SubTypeId, number>
	readonly maxBySubType: ReadonlyMap<SubTypeId, number>
	readonly defaultMin: number
	readonly defaultMax: number
}

interface SubPhaseAFailureModeThresholds {
	readonly antonymsConvergenceCosine: number
}

interface ProvenanceBatchRejectThresholds {
	readonly cohortFailureRateThreshold: number
}

interface ValidatorThresholds {
	readonly embeddingDistance: EmbeddingDistanceThresholds
	readonly subPhaseAFailureModes: SubPhaseAFailureModeThresholds
	readonly provenanceBatchReject: ProvenanceBatchRejectThresholds
}

const defaultThresholds: ValidatorThresholds = {
	embeddingDistance: {
		minBySubType: new Map<SubTypeId, number>([
			["numerical.lowest_values", 0.5],
			["verbal.antonyms", 0.5]
		]),
		maxBySubType: new Map<SubTypeId, number>([
			["numerical.lowest_values", 0.999],
			["verbal.antonyms", 0.92]
		]),
		defaultMin: 0.3,
		defaultMax: 0.99
	},
	subPhaseAFailureModes: {
		antonymsConvergenceCosine: 0.95
	},
	provenanceBatchReject: {
		cohortFailureRateThreshold: 0.2
	}
}

export type {
	EmbeddingDistanceThresholds,
	ProvenanceBatchRejectThresholds,
	SubPhaseAFailureModeThresholds,
	ValidatorThresholds
}
export { defaultThresholds }
