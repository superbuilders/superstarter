// embedding-distance criterion (Phase 4 sub-phase b §1.2 commit 2 — implementation).
//
// Per plan-doc §0.6.1 #3: cosine distance to the parent source item must be
// in a per-sub-type-tuned range. Sibling-to-parent similarity is by-design
// high (siblings are generated from the parent), so:
//   - Too-close (similarity > MAX_SIMILARITY) → near-duplicate flag
//     (sibling didn't surface-vary enough from parent).
//   - Too-far (similarity < MIN_SIMILARITY) → off-topic flag (sibling
//     drifted from the parent's structural shape).
//
// First-cut thresholds — calibration directive at plan-doc §0.6.1 says
// thresholds are empirical-not-design; the §1.3 batch runner queries flag-
// rate per criterion against working set and tunes before production.
//
// Sibling exemption: comparison is candidate↔parent only; not candidate↔
// other-siblings-of-same-parent. The parentEmbeddingByItemId map is loaded
// once at engine setup; criterion is pure (no DB calls at check time).
//
// Templating-by-design sub-types (numerical.lowest_values per convergence-
// audit.md §39 — 97.5% high-cosine convergence) get a wider range so the
// criterion does not flag the templating; the sub-phase-a-failure-modes
// criterion has the canonical templating whitelist.

import * as errors from "@superbuilders/errors"
import { logger } from "@/logger"
import type { SubTypeId } from "@/config/sub-types"
import type {
	CandidateForValidation,
	ValidationContext,
	ValidatorCriterion,
	ValidatorVerdict
} from "@/server/validator/types"

interface SimilarityRange {
	readonly min: number
	readonly max: number
}

function rangeFor(subTypeId: SubTypeId, ctx: ValidationContext): SimilarityRange {
	const t = ctx.thresholds.embeddingDistance
	const explicitMin = t.minBySubType.get(subTypeId)
	const explicitMax = t.maxBySubType.get(subTypeId)
	const min = explicitMin === undefined ? t.defaultMin : explicitMin
	const max = explicitMax === undefined ? t.defaultMax : explicitMax
	return { min, max }
}

function cosineSimilarity(a: ReadonlyArray<number>, b: ReadonlyArray<number>): number {
	if (a.length !== b.length) {
		logger.error(
			{ aLen: a.length, bLen: b.length },
			"embedding-distance: vector length mismatch"
		)
		throw errors.new("embedding-distance: vector length mismatch")
	}
	let dot = 0
	let aNormSq = 0
	let bNormSq = 0
	for (let i = 0; i < a.length; i += 1) {
		const ai = a[i]
		const bi = b[i]
		if (ai === undefined || bi === undefined) continue
		dot += ai * bi
		aNormSq += ai * ai
		bNormSq += bi * bi
	}
	if (aNormSq === 0 || bNormSq === 0) return 0
	return dot / (Math.sqrt(aNormSq) * Math.sqrt(bNormSq))
}

async function checkEmbeddingDistance(
	candidate: CandidateForValidation,
	ctx: ValidationContext
): Promise<ValidatorVerdict> {
	if (candidate.embedding === null) {
		return { kind: "error", reason: "candidate embedding is null" }
	}
	const parentItemId = candidate.metadataJson.parentItemId
	if (typeof parentItemId !== "string" || parentItemId.length === 0) {
		return {
			kind: "error",
			reason: "candidate metadata_json.parentItemId missing or non-string"
		}
	}
	const parentEmbedding = ctx.parentEmbeddingByItemId.get(parentItemId)
	if (parentEmbedding === undefined) {
		return {
			kind: "error",
			reason: "no parent embedding loaded for candidate's parentItemId"
		}
	}
	const similarity = cosineSimilarity(candidate.embedding, parentEmbedding)
	const range = rangeFor(candidate.subTypeId, ctx)
	if (similarity > range.max) {
		return {
			kind: "flag",
			reason: "embedding similarity above per-sub-type max (near-duplicate of parent)",
			metadata: {
				check: "near-duplicate",
				similarity,
				maxThreshold: range.max,
				subTypeId: candidate.subTypeId
			}
		}
	}
	if (similarity < range.min) {
		return {
			kind: "flag",
			reason: "embedding similarity below per-sub-type min (off-topic from parent)",
			metadata: {
				check: "off-topic",
				similarity,
				minThreshold: range.min,
				subTypeId: candidate.subTypeId
			}
		}
	}
	return { kind: "pass" }
}

const ErrEmbeddingDistanceUnreachable = errors.new(
	"embedding-distance criterion unreachable error"
)

const embeddingDistanceCriterion: ValidatorCriterion = {
	name: "embedding-distance",
	check: checkEmbeddingDistance
}

export {
	cosineSimilarity,
	embeddingDistanceCriterion,
	ErrEmbeddingDistanceUnreachable
}
