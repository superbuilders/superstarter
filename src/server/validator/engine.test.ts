// Validator engine tests (Phase 4 sub-phase b §1.2 commit 2).
//
// Synthetic candidate fixtures cover pass / flag / error cases per criterion.
// Tests do NOT touch the dev DB; ValidationContext is constructed inline via
// emptyValidationContext() with focused overrides.

import { expect, test } from "bun:test"
import type { Difficulty, SubTypeId } from "@/config/sub-types"
import { embeddingDistanceCriterion } from "@/server/validator/criteria/embedding-distance"
import { perSubTypeStructuralCriterion } from "@/server/validator/criteria/per-sub-type-structural"
import {
	COHORT_FAILURE_THRESHOLD,
	provenanceBatchRejectCriterion
} from "@/server/validator/criteria/provenance-batch-reject"
import { schemaShapeCriterion } from "@/server/validator/criteria/schema-shape"
import { subPhaseAFailureModesCriterion } from "@/server/validator/criteria/sub-phase-a-failure-modes"
import { tierDistributionCriterion } from "@/server/validator/criteria/tier-distribution"
import { emptyValidationContext } from "@/server/validator/context"
import { validateCandidate } from "@/server/validator/engine"
import { summarizeForCalibration } from "@/server/validator/calibration"
import type { CandidateForValidation, ValidationContext } from "@/server/validator/types"

// Override fields use single-state optional (?: T) to satisfy
// rules/no-null-undefined-union — the field's null state is reachable via
// the helper's default. Tests that need explicit null pass undefined or
// rely on the default.
interface CandidateOverrides {
	id?: string
	subTypeId?: SubTypeId
	difficulty?: Difficulty
	source?: "real" | "generated"
	body?: unknown
	optionsJson?: unknown
	correctAnswer?: string
	explanation?: string
	embedding?: ReadonlyArray<number>
	metadataJson?: Readonly<Record<string, unknown>>
}

function makeCandidate(overrides?: CandidateOverrides): CandidateForValidation {
	return {
		id: overrides?.id === undefined ? "019e0000-0000-7000-8000-000000000001" : overrides.id,
		subTypeId:
			overrides?.subTypeId === undefined ? "verbal.antonyms" : overrides.subTypeId,
		difficulty: overrides?.difficulty === undefined ? "easy" : overrides.difficulty,
		source: overrides?.source === undefined ? "generated" : overrides.source,
		status: "candidate",
		body:
			overrides?.body === undefined
				? { kind: "text", text: "Which of the following is the opposite of 'frugal'?" }
				: overrides.body,
		optionsJson:
			overrides?.optionsJson === undefined
				? [
						{ id: "a1b2c3d4", text: "thrifty" },
						{ id: "e5f6g7h8", text: "lavish" },
						{ id: "i9j0k1l2", text: "careful" },
						{ id: "m3n4o5p6", text: "modest" }
					]
				: overrides.optionsJson,
		correctAnswer:
			overrides?.correctAnswer === undefined ? "e5f6g7h8" : overrides.correctAnswer,
		explanation:
			overrides?.explanation === undefined
				? "Lavish means extravagant — the opposite of frugal (sparing)."
				: overrides.explanation,
		embedding: overrides?.embedding === undefined ? null : overrides.embedding,
		metadataJson:
			overrides?.metadataJson === undefined
				? {
						parentItemId: "019dfbc8-0000-7000-8000-000000000001",
						promptHash: "sha256:cohort1"
					}
				: overrides.metadataJson,
		sourceFolder: null,
		sourceFilename: null
	}
}

// ---- schema-shape ----

test("schema-shape passes a well-formed candidate", async () => {
	const verdict = await schemaShapeCriterion.check(makeCandidate(), emptyValidationContext())
	expect(verdict.kind).toBe("pass")
})

test("schema-shape flags when correctAnswer not in options", async () => {
	const candidate = makeCandidate({ correctAnswer: "deadbeef" })
	const verdict = await schemaShapeCriterion.check(candidate, emptyValidationContext())
	expect(verdict.kind).toBe("flag")
	if (verdict.kind === "flag") {
		expect(verdict.metadata.check).toBe("correctAnswer-in-options")
	}
})

test("schema-shape flags when explanation is empty", async () => {
	const candidate = makeCandidate({ explanation: "" })
	const verdict = await schemaShapeCriterion.check(candidate, emptyValidationContext())
	expect(verdict.kind).toBe("flag")
})

test("schema-shape flags when body fails itemBody schema", async () => {
	const candidate = makeCandidate({ body: { kind: "image" } })
	const verdict = await schemaShapeCriterion.check(candidate, emptyValidationContext())
	expect(verdict.kind).toBe("flag")
})

// ---- tier-distribution ----

test("tier-distribution passes when provenance matches candidate", async () => {
	const candidate = makeCandidate({
		id: "019e0000-0000-7000-8000-000000000001",
		difficulty: "easy",
		metadataJson: { parentItemId: "p1", promptHash: "sha256:cohort1" }
	})
	const ctx = emptyValidationContext({
		provenanceByParentItemId: new Map([
			[
				"p1",
				[
					{ insertedItemId: "019e0000-0000-7000-8000-000000000001", tier: "easy" as const },
					{ insertedItemId: "other", tier: "medium" as const }
				]
			]
		])
	})
	const verdict = await tierDistributionCriterion.check(candidate, ctx)
	expect(verdict.kind).toBe("pass")
})

test("tier-distribution flags on tier mismatch", async () => {
	const candidate = makeCandidate({
		id: "x1",
		difficulty: "hard",
		metadataJson: { parentItemId: "p1", promptHash: "sha256:cohort1" }
	})
	const ctx = emptyValidationContext({
		provenanceByParentItemId: new Map([
			["p1", [{ insertedItemId: "x1", tier: "medium" as const }]]
		])
	})
	const verdict = await tierDistributionCriterion.check(candidate, ctx)
	expect(verdict.kind).toBe("flag")
})

test("tier-distribution errors when provenance missing", async () => {
	const candidate = makeCandidate({
		metadataJson: { parentItemId: "missing-parent", promptHash: "sha256:cohort1" }
	})
	const verdict = await tierDistributionCriterion.check(candidate, emptyValidationContext())
	expect(verdict.kind).toBe("error")
})

// ---- embedding-distance ----

test("embedding-distance passes when similarity in default range", async () => {
	const candidate = makeCandidate({
		embedding: [1, 0, 0, 0],
		metadataJson: { parentItemId: "p1", promptHash: "sha256:cohort1" }
	})
	const ctx = emptyValidationContext({
		parentEmbeddingByItemId: new Map([["p1", [0.8, 0.6, 0, 0]]])
	})
	const verdict = await embeddingDistanceCriterion.check(candidate, ctx)
	expect(verdict.kind).toBe("pass")
})

test("embedding-distance flags off-topic when similarity below min", async () => {
	const candidate = makeCandidate({
		embedding: [1, 0, 0, 0],
		metadataJson: { parentItemId: "p1", promptHash: "sha256:cohort1" }
	})
	const ctx = emptyValidationContext({
		parentEmbeddingByItemId: new Map([["p1", [0, 1, 0, 0]]])
	})
	const verdict = await embeddingDistanceCriterion.check(candidate, ctx)
	expect(verdict.kind).toBe("flag")
	if (verdict.kind === "flag") {
		expect(verdict.metadata.check).toBe("off-topic")
	}
})

test("embedding-distance flags near-duplicate when similarity above max", async () => {
	const candidate = makeCandidate({
		embedding: [1, 0, 0, 0],
		metadataJson: { parentItemId: "p1", promptHash: "sha256:cohort1" }
	})
	const ctx = emptyValidationContext({
		parentEmbeddingByItemId: new Map([["p1", [1, 0, 0, 0]]])
	})
	const verdict = await embeddingDistanceCriterion.check(candidate, ctx)
	expect(verdict.kind).toBe("flag")
	if (verdict.kind === "flag") {
		expect(verdict.metadata.check).toBe("near-duplicate")
	}
})

test("embedding-distance errors when candidate embedding null", async () => {
	// Default helper sets embedding=null; explicit null override unnecessary.
	const candidate = makeCandidate()
	const verdict = await embeddingDistanceCriterion.check(candidate, emptyValidationContext())
	expect(verdict.kind).toBe("error")
})

// ---- per-sub-type-structural ----

test("per-sub-type-structural passes a numerical fractions candidate with numeric correct option", async () => {
	const candidate = makeCandidate({
		subTypeId: "numerical.fractions",
		body: { kind: "text", text: "What is 1/2 + 1/4?" },
		optionsJson: [
			{ id: "a1b2c3d4", text: "1/2" },
			{ id: "e5f6g7h8", text: "3/4" },
			{ id: "i9j0k1l2", text: "1" },
			{ id: "m3n4o5p6", text: "2" }
		],
		correctAnswer: "e5f6g7h8"
	})
	const verdict = await perSubTypeStructuralCriterion.check(candidate, emptyValidationContext())
	expect(verdict.kind).toBe("pass")
})

test("per-sub-type-structural flags numerical sub-type with non-numeric correct option", async () => {
	const candidate = makeCandidate({
		subTypeId: "numerical.fractions",
		body: { kind: "text", text: "What is one-half plus one-quarter?" },
		optionsJson: [
			{ id: "a1b2c3d4", text: "one-half" },
			{ id: "e5f6g7h8", text: "three-quarters" },
			{ id: "i9j0k1l2", text: "one" },
			{ id: "m3n4o5p6", text: "two" }
		],
		correctAnswer: "e5f6g7h8"
	})
	const verdict = await perSubTypeStructuralCriterion.check(candidate, emptyValidationContext())
	expect(verdict.kind).toBe("flag")
})

test("per-sub-type-structural flags antonyms with duplicate option text", async () => {
	const candidate = makeCandidate({
		subTypeId: "verbal.antonyms",
		optionsJson: [
			{ id: "a1b2c3d4", text: "thrifty" },
			{ id: "e5f6g7h8", text: "lavish" },
			{ id: "i9j0k1l2", text: "Lavish" },
			{ id: "m3n4o5p6", text: "modest" }
		],
		correctAnswer: "e5f6g7h8"
	})
	const verdict = await perSubTypeStructuralCriterion.check(candidate, emptyValidationContext())
	expect(verdict.kind).toBe("flag")
})

test("per-sub-type-structural flags letter_series stem missing placeholder", async () => {
	const candidate = makeCandidate({
		subTypeId: "verbal.letter_series",
		body: { kind: "text", text: "A B C D E F" },
		optionsJson: [
			{ id: "a1b2c3d4", text: "G" },
			{ id: "e5f6g7h8", text: "H" }
		],
		correctAnswer: "a1b2c3d4"
	})
	const verdict = await perSubTypeStructuralCriterion.check(candidate, emptyValidationContext())
	expect(verdict.kind).toBe("flag")
})

test("per-sub-type-structural passes letter_series with placeholder", async () => {
	const candidate = makeCandidate({
		subTypeId: "verbal.letter_series",
		body: { kind: "text", text: "A B C D E ?" },
		optionsJson: [
			{ id: "a1b2c3d4", text: "F" },
			{ id: "e5f6g7h8", text: "G" }
		],
		correctAnswer: "a1b2c3d4"
	})
	const verdict = await perSubTypeStructuralCriterion.check(candidate, emptyValidationContext())
	expect(verdict.kind).toBe("pass")
})

test("per-sub-type-structural passes a sub-type without rules (sentence_completion)", async () => {
	const candidate = makeCandidate({
		subTypeId: "verbal.sentence_completion",
		body: { kind: "text", text: "The recipe was ___ because the oven broke." }
	})
	const verdict = await perSubTypeStructuralCriterion.check(candidate, emptyValidationContext())
	expect(verdict.kind).toBe("pass")
})

// ---- sub-phase-a-failure-modes ----

test("failure-modes whitelists numerical.lowest_values (templating-by-design)", async () => {
	const candidate = makeCandidate({
		subTypeId: "numerical.lowest_values",
		body: { kind: "text", text: "Which number has the lowest value?" }
	})
	const verdict = await subPhaseAFailureModesCriterion.check(
		candidate,
		emptyValidationContext()
	)
	expect(verdict.kind).toBe("pass")
})

test("failure-modes flags antonyms convergence cluster", async () => {
	const candidate = makeCandidate({
		id: "c1",
		subTypeId: "verbal.antonyms",
		embedding: [1, 0, 0, 0],
		metadataJson: { parentItemId: "p1", promptHash: "sha256:cohort-antonyms" }
	})
	const ctx = emptyValidationContext({
		cohortPeersByCohortKey: new Map([
			[
				"sha256:cohort-antonyms",
				[
					{ id: "c1", embedding: [1, 0, 0, 0], bodyText: "Which is the opposite of frugal?" },
					{
						id: "c2",
						embedding: [0.99, 0.01, 0, 0],
						bodyText: "Which is the opposite of frugal (case 2)?"
					}
				]
			]
		])
	})
	const verdict = await subPhaseAFailureModesCriterion.check(candidate, ctx)
	expect(verdict.kind).toBe("flag")
})

test("failure-modes flags number_series exact-body duplicate", async () => {
	const candidate = makeCandidate({
		id: "c1",
		subTypeId: "numerical.number_series",
		body: { kind: "text", text: "2 4 6 8 ?" },
		embedding: [1, 0, 0, 0],
		metadataJson: { parentItemId: "p1", promptHash: "sha256:cohort-series" }
	})
	const ctx = emptyValidationContext({
		cohortPeersByCohortKey: new Map([
			[
				"sha256:cohort-series",
				[
					{ id: "c1", embedding: [1, 0, 0, 0], bodyText: "2 4 6 8 ?" },
					{ id: "c2", embedding: [0, 1, 0, 0], bodyText: "2 4 6 8 ?" }
				]
			]
		])
	})
	const verdict = await subPhaseAFailureModesCriterion.check(candidate, ctx)
	expect(verdict.kind).toBe("flag")
})

// ---- provenance-batch-reject ----

test("provenance-batch-reject passes when cohort rates empty (pass-1 deferral)", async () => {
	const candidate = makeCandidate()
	const verdict = await provenanceBatchRejectCriterion.check(
		candidate,
		emptyValidationContext()
	)
	expect(verdict.kind).toBe("pass")
})

test("provenance-batch-reject flags cohort with rate above threshold", async () => {
	const candidate = makeCandidate({
		metadataJson: { parentItemId: "p1", promptHash: "sha256:bad-cohort" }
	})
	const ctx = emptyValidationContext({
		cohortFailureRates: new Map([["sha256:bad-cohort", COHORT_FAILURE_THRESHOLD + 0.1]])
	})
	const verdict = await provenanceBatchRejectCriterion.check(candidate, ctx)
	expect(verdict.kind).toBe("flag")
})

test("provenance-batch-reject passes cohort with rate below threshold", async () => {
	const candidate = makeCandidate({
		metadataJson: { parentItemId: "p1", promptHash: "sha256:good-cohort" }
	})
	const ctx = emptyValidationContext({
		cohortFailureRates: new Map([["sha256:good-cohort", 0.05]])
	})
	const verdict = await provenanceBatchRejectCriterion.check(candidate, ctx)
	expect(verdict.kind).toBe("pass")
})

// ---- engine orchestration ----

test("engine aggregates verdicts across criteria; pressure-cell membership flags", async () => {
	const candidate = makeCandidate({
		subTypeId: "numerical.fractions",
		difficulty: "hard"
	})
	const ctx: ValidationContext = emptyValidationContext({
		pressureCells: new Set(["numerical.fractions:hard"])
	})
	const result = await validateCandidate(candidate, ctx)
	expect(result.isPressureCell).toBe(true)
	expect(result.hasAnyFlag).toBe(true)
	expect(result.flagsByName.size).toBe(6)
})

test("engine: clean candidate outside pressure cell with no flags has hasAnyFlag=false", async () => {
	const candidate = makeCandidate({
		id: "x1",
		subTypeId: "verbal.sentence_completion",
		difficulty: "easy",
		body: { kind: "text", text: "The recipe was ___ because the oven broke." },
		embedding: [0.7, 0.7, 0, 0],
		metadataJson: {
			parentItemId: "p1",
			promptHash: "sha256:cohort-sc"
		}
	})
	const ctx = emptyValidationContext({
		parentEmbeddingByItemId: new Map([["p1", [1, 0, 0, 0]]]),
		provenanceByParentItemId: new Map([
			["p1", [{ insertedItemId: "x1", tier: "easy" as const }]]
		])
	})
	const result = await validateCandidate(candidate, ctx)
	const verdicts = [...result.flagsByName.values()]
	expect(verdicts.every((v) => v.kind === "pass")).toBe(true)
	expect(result.hasAnyFlag).toBe(false)
	expect(result.isPressureCell).toBe(false)
})

// ---- calibration ----

test("calibration summary computes per-criterion flag rates", async () => {
	const candidate = makeCandidate({
		correctAnswer: "deadbeef" // forces schema-shape flag
	})
	const result = await validateCandidate(candidate, emptyValidationContext())
	const summary = summarizeForCalibration([result])
	expect(summary.totalCandidates).toBe(1)
	expect(summary.flagRatesByCriterion.get("schema-shape")).toBe(1)
})
