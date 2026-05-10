// Validator engine type contracts (Phase 4 sub-phase b §1.2 commit 0).
//
// These interfaces are the architectural skeleton for the six auto-detectable
// criteria in plan-doc §0.6.1 (schema-shape, tier-distribution, embedding-
// distance, per-sub-type-structural, sub-phase-a-failure-modes, provenance-
// batch-reject). §1.2 commit-1 implements the criteria against these contracts;
// §1.3 wires the engine into a Vercel Workflow batch runner.
//
// Logger is a global singleton imported via `@/logger` per project convention
// (see `src/server/items/queries.ts`); NOT passed through ValidationContext.

import type { Difficulty, SubTypeId } from "@/config/sub-types"

// Verdict returned by a single criterion.
//   - PASS: criterion did not flag this candidate.
//   - FLAG: criterion flagged the candidate; reason is human-readable and is
//     persisted alongside the verdict for admin queue display.
//   - ERROR: criterion could not evaluate (missing data, transient failure);
//     the candidate is treated as flagged for admin attention.
//
// Stub criteria in this commit return `error` verdicts so §1.3 batch runs do
// not silently succeed before §1.2 commit-1 implementations land.
type ValidatorVerdict =
	| { readonly kind: "pass" }
	| { readonly kind: "flag"; readonly reason: string; readonly metadata: Readonly<Record<string, unknown>> }
	| { readonly kind: "error"; readonly reason: string }

// Eager-loaded candidate shape suitable for criterion evaluation. The engine
// fetches this once per candidate before iterating criteria; each criterion
// is a pure function of (candidate, context).
interface CandidateForValidation {
	readonly id: string
	readonly subTypeId: SubTypeId
	readonly difficulty: Difficulty
	readonly source: "real" | "generated"
	readonly status: "live" | "candidate" | "retired" | "rejected"
	readonly body: Readonly<Record<string, unknown>>
	readonly optionsJson: Readonly<Record<string, unknown>>
	readonly correctAnswer: string
	readonly explanation: string | null
	readonly embedding: ReadonlyArray<number> | null
	readonly metadataJson: Readonly<Record<string, unknown>>
	readonly sourceFolder: string | null
	readonly sourceFilename: string | null
}

// Shared context passed to every criterion. Contains expensive lookups that
// would be redundant to recompute per-candidate (cohort failure rates for
// provenance-batch-reject; pressure-cell membership set for Q2 conservative
// flag policy).
//
// pressureCells keys are `${subTypeId}:${difficulty}` (e.g.,
// "numerical.fractions:hard"). The §1.3 batch runner builds this set from
// the §1.0 empirical pressure-cell finding plus runtime live-bank state.
//
// cohortFailureRates keys are generator-run cohort identifiers (the precise
// shape — templateVersion alone, generatorModel+templateVersion, or
// promptHash when populated — is finalized at §1.2 commit-1 implementation
// per audit step 12 finding that promptHash is NULL across the working set).
interface ValidationContext {
	readonly cohortFailureRates: ReadonlyMap<string, number>
	readonly pressureCells: ReadonlySet<string>
}

// A single validator criterion. Each of the six auto-detectable criteria
// (plan-doc §0.6.1) implements this interface. The criterion's `name` aligns
// byte-for-byte with the plan-doc list and is the durable key for calibration
// summaries and per-candidate validator-flag persistence.
interface ValidatorCriterion {
	readonly name: string
	readonly check: (candidate: CandidateForValidation, ctx: ValidationContext) => Promise<ValidatorVerdict>
}

// Aggregated per-candidate result across all criteria. Persisted to the
// candidate's metadata_json.validatorResult after engine evaluation.
//
// hasAnyFlag is true if any criterion produced a flag or error verdict OR
// if the candidate sits in a pressure cell (Q2 conservative-first flag policy:
// pressure-cell membership flags regardless of criterion outcome, surfacing
// the candidate at the top of the admin queue).
interface CandidateValidationResult {
	readonly itemId: string
	readonly flagsByName: ReadonlyMap<string, ValidatorVerdict>
	readonly hasAnyFlag: boolean
	readonly isPressureCell: boolean
	readonly evaluatedAtMs: number
}

export type {
	CandidateForValidation,
	CandidateValidationResult,
	ValidationContext,
	ValidatorCriterion,
	ValidatorVerdict
}
