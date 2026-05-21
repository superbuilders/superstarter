// tier-distribution criterion (Phase 4 sub-phase b §1.2 commit 2 — implementation).
//
// Per plan-doc §0.6.1 #2: candidate's claimed tier matches sub-phase a
// generator's claim per provenance file at scripts/_siblings/<parentItemId>.json.
//
// At v1, items.difficulty IS the LLM-emitted tier (the sibling-generation
// workflow inserts each sibling with difficulty=<tier-key> per the
// LLM-payload's keyed-by-tier shape — see sibling-schema.ts lines 70-73).
// So this criterion verifies the ingest pipeline preserved the LLM's tier:
// the candidate's id must appear in the provenance file's siblings array
// with a matching `tier` field. Mismatch → flag (ingest drift).
//
// Provenance lookup is pre-loaded into ValidationContext.provenanceByParentItemId
// at engine setup time; this criterion is a pure Map lookup.

import * as errors from "@superbuilders/errors"
import { logger } from "@/logger"
import type {
	CandidateForValidation,
	ValidationContext,
	ValidatorCriterion,
	ValidatorVerdict
} from "@/server/validator/types"

async function checkTierDistribution(
	candidate: CandidateForValidation,
	ctx: ValidationContext
): Promise<ValidatorVerdict> {
	const parentItemId = candidate.metadataJson.parentItemId
	if (typeof parentItemId !== "string" || parentItemId.length === 0) {
		return {
			kind: "error",
			reason: "candidate metadata_json.parentItemId missing or non-string"
		}
	}
	const siblings = ctx.provenanceByParentItemId.get(parentItemId)
	if (siblings === undefined) {
		logger.debug(
			{ itemId: candidate.id, parentItemId },
			"tier-distribution: no provenance loaded for parent"
		)
		return {
			kind: "error",
			reason: "no provenance entry for candidate's parentItemId"
		}
	}
	const matching = siblings.find(function bySiblingId(s) {
		return s.insertedItemId === candidate.id
	})
	if (matching === undefined) {
		return {
			kind: "flag",
			reason: "candidate id not present in provenance siblings list",
			metadata: { check: "sibling-membership", parentItemId }
		}
	}
	if (matching.tier !== candidate.difficulty) {
		return {
			kind: "flag",
			reason: "tier mismatch between provenance and candidate row",
			metadata: {
				check: "tier-roundtrip",
				provenanceTier: matching.tier,
				candidateDifficulty: candidate.difficulty
			}
		}
	}
	return { kind: "pass" }
}

const ErrTierDistributionUnreachable = errors.new("tier-distribution criterion unreachable error")

const tierDistributionCriterion: ValidatorCriterion = {
	name: "tier-distribution",
	check: checkTierDistribution
}

export { ErrTierDistributionUnreachable, tierDistributionCriterion }
