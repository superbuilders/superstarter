// Minimal ValidationContext constructor (Phase 4 sub-phase b §1.2 commit 2).
//
// Only `emptyValidationContext` lands this commit — used by tests to
// construct contexts with explicit overrides. The DB-backed
// `buildValidationContext(candidates)` that loads parent embeddings,
// provenance JSON, cohort peers, pressure cells, and cohort failure rates
// from the working set lands at §1.3 alongside the batch runner.

import type { ValidationContext } from "@/server/validator/types"

interface ValidationContextOverrides {
	readonly cohortFailureRates?: ReadonlyMap<string, number>
	readonly pressureCells?: ReadonlySet<string>
	readonly parentEmbeddingByItemId?: ReadonlyMap<string, ReadonlyArray<number>>
	readonly provenanceByParentItemId?: ValidationContext["provenanceByParentItemId"]
	readonly cohortPeersByCohortKey?: ValidationContext["cohortPeersByCohortKey"]
}

function emptyValidationContext(overrides?: ValidationContextOverrides): ValidationContext {
	const o = overrides
	if (o === undefined) {
		return {
			cohortFailureRates: new Map(),
			pressureCells: new Set(),
			parentEmbeddingByItemId: new Map(),
			provenanceByParentItemId: new Map(),
			cohortPeersByCohortKey: new Map()
		}
	}
	const cohortFailureRates =
		o.cohortFailureRates === undefined ? new Map<string, number>() : o.cohortFailureRates
	const pressureCells =
		o.pressureCells === undefined ? new Set<string>() : o.pressureCells
	const parentEmbeddingByItemId =
		o.parentEmbeddingByItemId === undefined
			? new Map<string, ReadonlyArray<number>>()
			: o.parentEmbeddingByItemId
	const provenanceByParentItemId =
		o.provenanceByParentItemId === undefined
			? new Map() satisfies ValidationContext["provenanceByParentItemId"]
			: o.provenanceByParentItemId
	const cohortPeersByCohortKey =
		o.cohortPeersByCohortKey === undefined
			? new Map() satisfies ValidationContext["cohortPeersByCohortKey"]
			: o.cohortPeersByCohortKey
	return {
		cohortFailureRates,
		pressureCells,
		parentEmbeddingByItemId,
		provenanceByParentItemId,
		cohortPeersByCohortKey
	}
}

export { emptyValidationContext }
