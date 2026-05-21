// Stable threshold-set fingerprint (Phase 4 sub-phase b §1.3 commit 2).
//
// Computes a deterministic sha256 over the validator's threshold registry so
// each persisted validatorResult records WHICH threshold set produced its
// verdict. Future re-runs with different thresholds get a different hash;
// the dev DB carries a mix of hashes; auditing identifies which verdicts
// came from which threshold set.
//
// Stable serialization: Map entries are sorted by key before JSON
// stringification so insertion-order doesn't affect the hash. Number
// representation matches JavaScript's default JSON.stringify (no leading
// zeros, no trailing zeros after decimal beyond what's needed) — sufficient
// for v1 since the threshold registry's values are all small floats with
// short decimal expansions.

import { createHash } from "node:crypto"
import type { ValidatorThresholds } from "@/server/validator/thresholds"

function sortedEntries(m: ReadonlyMap<string, number>): ReadonlyArray<readonly [string, number]> {
	return [...m.entries()].sort(function byKey(a, b) {
		return a[0].localeCompare(b[0])
	})
}

function computeThresholdsHash(thresholds: ValidatorThresholds): string {
	const stable = {
		embeddingDistance: {
			minBySubType: sortedEntries(thresholds.embeddingDistance.minBySubType),
			maxBySubType: sortedEntries(thresholds.embeddingDistance.maxBySubType),
			defaultMin: thresholds.embeddingDistance.defaultMin,
			defaultMax: thresholds.embeddingDistance.defaultMax
		},
		subPhaseAFailureModes: {
			antonymsConvergenceCosine: thresholds.subPhaseAFailureModes.antonymsConvergenceCosine
		},
		provenanceBatchReject: {
			cohortFailureRateThreshold: thresholds.provenanceBatchReject.cohortFailureRateThreshold
		}
	}
	const json = JSON.stringify(stable)
	const hex = createHash("sha256").update(json).digest("hex")
	return `sha256:${hex}`
}

export { computeThresholdsHash }
