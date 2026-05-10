// embedding-distance criterion (Phase 4 sub-phase b §1.2 commit 0 stub).
//
// Per plan-doc §0.6.1 #3: cosine distance to the parent source item must be
// in a per-sub-type-tuned range. Too-close (similarity > 0.97 or 0.95 per
// sub-type templating tolerance) → near-duplicate flag; too-far → off-topic
// flag. Per sub-phase-a forward-pin (§4.13 of similar-item-generator plan),
// siblings are EXEMPT from source↔sibling similarity; the validator runs
// sibling↔non-source-non-sibling comparison normally via
// nearestNeighborInBank(subTypeId, embedding, { excludeParentItemId,
// excludeSiblingItemIds }).
//
// Implementation lands at §1.2 commit-1. Performance note: items.embedding
// has no HNSW/IVFFlat index (per items.ts design decision); pairwise cost is
// O(n²) — acceptable at v1 ~1,700-candidate scale, forward-pinned for future
// scale.

import * as errors from "@superbuilders/errors"
import { logger } from "@/logger"
import type {
	CandidateForValidation,
	ValidationContext,
	ValidatorCriterion,
	ValidatorVerdict
} from "@/server/validator/types"

const ErrEmbeddingDistanceNotImplemented = errors.new("embedding-distance criterion not yet implemented")

async function checkEmbeddingDistance(
	candidate: CandidateForValidation,
	_ctx: ValidationContext
): Promise<ValidatorVerdict> {
	logger.warn({ itemId: candidate.id }, "embedding-distance criterion invoked before implementation")
	return { kind: "error", reason: "criterion not yet implemented (commit-1)" }
}

const embeddingDistanceCriterion: ValidatorCriterion = {
	name: "embedding-distance",
	check: checkEmbeddingDistance
}

export { embeddingDistanceCriterion, ErrEmbeddingDistanceNotImplemented }
