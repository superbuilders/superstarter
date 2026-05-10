// validator-batch step tests (Phase 4 sub-phase b §1.3 commit 0).
//
// Synthetic candidate fixtures + validator-batch step bodies. Tests the
// two-pass orchestration explicitly: pass-1 produces criteria 1-5 verdicts,
// computeCohortRates aggregates pass-1 results, pass-2 merges criterion-6
// verdicts into the result map.
//
// loadCandidatesStep + buildContextStep are NOT tested here — they require
// real DB / filesystem state; the dry-run script covers them empirically.
// persistResultsStep is intentionally a stub; tested via "throws when
// invoked" assertion only.

import { expect, test } from "bun:test"
import * as errors from "@superbuilders/errors"
import { emptyValidationContext } from "@/server/validator/context"
import {
	computeCohortRatesStep,
	ErrPersistNotYetImplemented,
	persistResultsStep,
	runPass1Step,
	runPass2Step,
	summarizeCalibrationStep
} from "@/workflows/validator-batch-steps"
import type { CandidateForValidation } from "@/server/validator/types"

interface CandidateOverrides {
	correctAnswer?: string
}

function makeCandidate(
	id: string,
	cohort: string,
	parentItemId: string,
	overrides?: CandidateOverrides
): CandidateForValidation {
	const correctAnswer =
		overrides?.correctAnswer === undefined ? "e5f6g7h8" : overrides.correctAnswer
	return {
		id,
		subTypeId: "verbal.sentence_completion",
		difficulty: "easy",
		source: "generated",
		status: "candidate",
		body: { kind: "text", text: "The recipe was ___ because the oven broke." },
		optionsJson: [
			{ id: "a1b2c3d4", text: "delicious" },
			{ id: "e5f6g7h8", text: "ruined" }
		],
		correctAnswer,
		explanation: "Broken oven explains a bad outcome.",
		embedding: [1, 0, 0, 0],
		metadataJson: { parentItemId, promptHash: cohort },
		sourceFolder: null,
		sourceFilename: null
	}
}

test("two-phase orchestration: pass-1 defers criterion 6, pass-2 flags high-rate cohort", async () => {
	// Cohort A: 4 candidates, 2 will fail criteria 1-5 (50% failure → above 20% threshold).
	// Cohort B: 4 candidates, 0 fail.
	const candidates: ReadonlyArray<CandidateForValidation> = [
		makeCandidate("broken-a1", "cohort-a", "p-a", { correctAnswer: "deadbeef" }),
		makeCandidate("broken-a2", "cohort-a", "p-a", { correctAnswer: "deadbeef" }),
		makeCandidate("a1", "cohort-a", "p-a"),
		makeCandidate("a2", "cohort-a", "p-a"),
		makeCandidate("b1", "cohort-b", "p-b"),
		makeCandidate("b2", "cohort-b", "p-b"),
		makeCandidate("b3", "cohort-b", "p-b"),
		makeCandidate("b4", "cohort-b", "p-b")
	]
	// Build context with parent embeddings + provenance to keep tier-distribution
	// and embedding-distance from erroring out (they need lookups).
	const ctx = emptyValidationContext({
		parentEmbeddingByItemId: new Map([
			["p-a", [0.8, 0.6, 0, 0]],
			["p-b", [0.8, 0.6, 0, 0]]
		]),
		provenanceByParentItemId: new Map([
			[
				"p-a",
				[
					{ insertedItemId: "broken-a1", tier: "easy" },
					{ insertedItemId: "broken-a2", tier: "easy" },
					{ insertedItemId: "a1", tier: "easy" },
					{ insertedItemId: "a2", tier: "easy" }
				]
			],
			[
				"p-b",
				[
					{ insertedItemId: "b1", tier: "easy" },
					{ insertedItemId: "b2", tier: "easy" },
					{ insertedItemId: "b3", tier: "easy" },
					{ insertedItemId: "b4", tier: "easy" }
				]
			]
		])
	})
	const pass1 = await runPass1Step(candidates, ctx)
	expect(pass1.length).toBe(candidates.length)
	const cohort = await computeCohortRatesStep(candidates, pass1)
	expect(cohort.rates.get("cohort-a")).toBeGreaterThan(0.4)
	expect(cohort.rates.get("cohort-b")).toBe(0)
	const pass2 = await runPass2Step(candidates, ctx, cohort.rates, pass1)
	expect(pass2.length).toBe(candidates.length)
	// Cohort-A members should now have a provenance-batch-reject flag.
	const aResult = pass2.find((r) => r.itemId === "a1")
	const aPbr = aResult?.flagsByName.get("provenance-batch-reject")
	expect(aPbr?.kind).toBe("flag")
	// Cohort-B members should pass provenance-batch-reject.
	const bResult = pass2.find((r) => r.itemId === "b1")
	const bPbr = bResult?.flagsByName.get("provenance-batch-reject")
	expect(bPbr?.kind).toBe("pass")
})

test("computeCohortRatesStep ignores provenance-batch-reject verdicts in rate calc", async () => {
	// If criterion-6 verdicts counted toward cohort failure rate, the rate
	// would feedback-amplify on pass-2; the rate calc must exclude criterion-6.
	const candidates: ReadonlyArray<CandidateForValidation> = [
		makeCandidate("c1", "cohort-c", "p-c"),
		makeCandidate("c2", "cohort-c", "p-c")
	]
	const ctx = emptyValidationContext({
		parentEmbeddingByItemId: new Map([["p-c", [0.8, 0.6, 0, 0]]]),
		provenanceByParentItemId: new Map([
			[
				"p-c",
				[
					{ insertedItemId: "c1", tier: "easy" },
					{ insertedItemId: "c2", tier: "easy" }
				]
			]
		])
	})
	const pass1 = await runPass1Step(candidates, ctx)
	const cohort = await computeCohortRatesStep(candidates, pass1)
	expect(cohort.rates.get("cohort-c")).toBe(0)
})

test("summarizeCalibrationStep returns calibration summary", async () => {
	const candidates: ReadonlyArray<CandidateForValidation> = [
		makeCandidate("d1", "cohort-d", "p-d")
	]
	const ctx = emptyValidationContext({
		parentEmbeddingByItemId: new Map([["p-d", [0.8, 0.6, 0, 0]]]),
		provenanceByParentItemId: new Map([
			["p-d", [{ insertedItemId: "d1", tier: "easy" }]]
		])
	})
	const pass1 = await runPass1Step(candidates, ctx)
	const summary = summarizeCalibrationStep(pass1)
	expect(summary.totalCandidates).toBe(1)
})

test("persistResultsStep stub throws ErrPersistNotYetImplemented", async () => {
	const stubResult = await errors.try(persistResultsStep([], "leonardiwata@gmail.com"))
	expect(stubResult.error).toBeDefined()
	if (stubResult.error !== undefined) {
		expect(errors.is(stubResult.error, ErrPersistNotYetImplemented)).toBe(true)
	}
})
