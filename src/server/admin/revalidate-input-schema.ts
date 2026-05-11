// Zod schemas, error sentinels, and types for admin candidate re-validation
// (Phase 4 sub-phase b §2.4 commit 1). Lives in a separate module from
// `revalidate-actions.ts` because Next.js's "use server" files are
// restricted to exporting async functions — types, constants, and Zod
// schemas must be reachable from a non-"use server" module. Mirrors
// disposition-input-schema.ts in shape (the §2.4 commit-0 precedent).
//
// Two actions, two schemas:
//   - revalidateCandidateAction: itemId only. Loads the single candidate,
//     re-runs the validator engine against a minimal ValidationContext
//     built for that one candidate (Option A per redirector-default), and
//     overwrites metadata_json.validatorResult with the fresh verdicts.
//     staleAfterMs is naturally absent in the new payload — the schema
//     marks the field optional, so omission means fresh.
//   - revalidateStaleCandidatesAction: no input. Queries every candidate
//     whose validatorResult.staleAfterMs > evaluatedAtMs; iterates in a
//     single transaction; reports counts.
//
// Re-validation is candidates-only (live + rejected items are out of scope
// per redirector ratification — once disposed, the validator verdict is
// frozen). A non-candidate item that somehow reaches the action body is
// rejected via ErrItemNotCandidateForRevalidate.
//
// NO item_admin_actions rows are written — re-validation is a refresh
// operation, not an admin disposition decision. If audit-of-re-validation
// becomes a need, surface for §2 round-close consideration.

import * as errors from "@superbuilders/errors"
import { z } from "zod"

const revalidateSingleInputSchema = z.object({
	itemId: z.string().uuid()
})

const ErrRevalidateSingleInputInvalid = errors.new(
	"revalidateCandidateAction input validation failed"
)
const ErrItemNotFoundForRevalidate = errors.new(
	"revalidate action: item not found"
)
const ErrItemNotCandidateForRevalidate = errors.new(
	"revalidate action: item is not in candidate status; cannot re-validate"
)

type RevalidateSingleInput = z.infer<typeof revalidateSingleInputSchema>

interface RevalidateSingleOutput {
	readonly outcome: "ok"
	readonly itemId: string
	readonly newHasAnyFlag: boolean
}

interface RevalidateBulkOutput {
	readonly outcome: "ok"
	readonly attemptedCount: number
	readonly revalidatedCount: number
	readonly nowFlaggedCount: number
	readonly nowClearedCount: number
	readonly skippedCount: number
}

export type {
	RevalidateBulkOutput,
	RevalidateSingleInput,
	RevalidateSingleOutput
}
export {
	ErrItemNotCandidateForRevalidate,
	ErrItemNotFoundForRevalidate,
	ErrRevalidateSingleInputInvalid,
	revalidateSingleInputSchema
}
