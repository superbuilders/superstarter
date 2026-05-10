// sub-phase-a-failure-modes criterion (Phase 4 sub-phase b §1.2 commit 2 — implementation).
//
// Per plan-doc §0.6.1 #5 + scripts/_logs/convergence-audit.md:
//
//   - numerical.lowest_values: TEMPLATING ARTIFACT (97.5% high-cosine
//     convergence is by-design; "Which number/expression has the lowest/highest
//     value?" template repeats with different numbers). Whitelist — pass.
//
//   - verbal.antonyms: real convergence at 37.9% (53/140 in clusters≥2 at
//     similarity threshold 0.95 per convergence-audit row #5). Detector
//     flags candidates whose nearest cohort-peer similarity exceeds the
//     threshold — admin decides which member of the cluster to keep.
//
//   - numerical.number_series: minor convergence at 5.6% (11/196 per
//     convergence-audit row #9). Detector flags exact-body-text duplicates
//     within cohort (stricter than antonyms cosine check; series cohorts
//     have higher legitimate similarity from shared problem structure, so
//     only exact-text-duplicates are mechanically distinguishable).
//
// Cohort peers are pre-loaded into ValidationContext.cohortPeersByCohortKey
// (cohort key = promptHash; v1 sub-type↔cohort 1:1 per b792f45 backfill).

import * as errors from "@superbuilders/errors"
import { z } from "zod"
import { logger } from "@/logger"
import { cosineSimilarity } from "@/server/validator/criteria/embedding-distance"
import type {
	CandidateForValidation,
	ValidationContext,
	ValidatorCriterion,
	ValidatorVerdict
} from "@/server/validator/types"

const bodyTextSchema = z.object({ kind: z.literal("text"), text: z.string() })

function getBodyText(candidate: CandidateForValidation): string | null {
	const parsed = bodyTextSchema.safeParse(candidate.body)
	if (!parsed.success) return null
	return parsed.data.text
}

function getCohortKey(candidate: CandidateForValidation): string | null {
	const promptHash = candidate.metadataJson.promptHash
	if (typeof promptHash !== "string" || promptHash.length === 0) return null
	return promptHash
}

function detectAntonymsConvergence(
	candidate: CandidateForValidation,
	ctx: ValidationContext
): ValidatorVerdict {
	if (candidate.embedding === null) {
		return { kind: "error", reason: "candidate embedding null for antonyms convergence detector" }
	}
	const cohortKey = getCohortKey(candidate)
	if (cohortKey === null) {
		return { kind: "error", reason: "candidate promptHash missing for cohort lookup" }
	}
	const peers = ctx.cohortPeersByCohortKey.get(cohortKey)
	if (peers === undefined) {
		logger.debug(
			{ itemId: candidate.id, cohortKey },
			"sub-phase-a-failure-modes: cohort peers not loaded; treating as pass"
		)
		return { kind: "pass" }
	}
	const threshold = ctx.thresholds.subPhaseAFailureModes.antonymsConvergenceCosine
	let bestSimilarity = 0
	let bestPeerId: string | null = null
	for (const peer of peers) {
		if (peer.id === candidate.id) continue
		const similarity = cosineSimilarity(candidate.embedding, peer.embedding)
		if (similarity > bestSimilarity) {
			bestSimilarity = similarity
			bestPeerId = peer.id
		}
	}
	if (bestPeerId !== null && bestSimilarity >= threshold) {
		return {
			kind: "flag",
			reason: "verbal.antonyms cohort convergence — near-duplicate peer detected",
			metadata: {
				check: "antonyms-convergence",
				peerItemId: bestPeerId,
				similarity: bestSimilarity,
				threshold
			}
		}
	}
	return { kind: "pass" }
}

function detectNumberSeriesDuplicate(
	candidate: CandidateForValidation,
	ctx: ValidationContext
): ValidatorVerdict {
	const bodyText = getBodyText(candidate)
	if (bodyText === null) {
		return { kind: "pass" }
	}
	const cohortKey = getCohortKey(candidate)
	if (cohortKey === null) {
		return { kind: "error", reason: "candidate promptHash missing for cohort lookup" }
	}
	const peers = ctx.cohortPeersByCohortKey.get(cohortKey)
	if (peers === undefined) return { kind: "pass" }
	const normalized = bodyText.trim().toLowerCase()
	for (const peer of peers) {
		if (peer.id === candidate.id) continue
		if (peer.bodyText.trim().toLowerCase() === normalized) {
			return {
				kind: "flag",
				reason: "numerical.number_series exact-body-text duplicate detected",
				metadata: {
					check: "number-series-duplicate",
					peerItemId: peer.id
				}
			}
		}
	}
	return { kind: "pass" }
}

async function checkSubPhaseAFailureModes(
	candidate: CandidateForValidation,
	ctx: ValidationContext
): Promise<ValidatorVerdict> {
	if (candidate.subTypeId === "numerical.lowest_values") {
		// Templating-by-design whitelist per convergence-audit.md §39.
		return { kind: "pass" }
	}
	if (candidate.subTypeId === "verbal.antonyms") {
		return detectAntonymsConvergence(candidate, ctx)
	}
	if (candidate.subTypeId === "numerical.number_series") {
		return detectNumberSeriesDuplicate(candidate, ctx)
	}
	return { kind: "pass" }
}

const ErrSubPhaseAFailureModesUnreachable = errors.new(
	"sub-phase-a-failure-modes criterion unreachable error"
)

const subPhaseAFailureModesCriterion: ValidatorCriterion = {
	name: "sub-phase-a-failure-modes",
	check: checkSubPhaseAFailureModes
}

export { ErrSubPhaseAFailureModesUnreachable, subPhaseAFailureModesCriterion }
