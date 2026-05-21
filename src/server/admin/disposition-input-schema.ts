// Zod schemas, error sentinels, and types for admin item disposition.
// Lives in a separate module from `disposition-actions.ts` because Next.js's
// "use server" files are restricted to exporting async functions — types,
// constants, and Zod schemas must be reachable from a non-"use server"
// module.
//
// Two actions, two schemas (originally Phase 4 sub-phase b §2.4 commit-0 as
// candidate-only disposition; generalized to reversible disposition so
// admins can demote live → rejected and revive rejected → live from the
// row-level queue affordance):
//   - approveItemAction: items.status: candidate → live OR rejected → live.
//     reasonNote OPTIONAL. acknowledgeStaleVerdict REQUIRED for the
//     candidate→live path (UI submits false when the validator verdict is
//     fresh; true when admin has acknowledged a stale verdict via the
//     ApproveStaleConfirm modal). The rejected→live revival path skips the
//     staleness gate entirely because the source verdict was already
//     superseded when the item first went to "rejected"; re-running the
//     validator at revive time is not required.
//   - rejectItemAction: items.status: candidate → rejected OR live →
//     rejected. reasonNote REQUIRED (admin's "no, this isn't a quality
//     item" judgment must include free-text justification for the audit
//     trail). No staleness gating — rejection doesn't depend on validator
//     state.
//
// Reason length: 1000 chars (longer than edit-input-schema's 500 because
// rejection reasoning can require more context than a casual edit note).

import * as errors from "@superbuilders/errors"
import { z } from "zod"

const approveInputSchema = z.object({
	itemId: z.string().uuid(),
	reasonNote: z.string().min(1).max(1000).optional(),
	acknowledgeStaleVerdict: z.boolean()
})

const rejectInputSchema = z.object({
	itemId: z.string().uuid(),
	reasonNote: z.string().min(1).max(1000)
})

const ErrApproveInputInvalid = errors.new("approveItemAction input validation failed")
const ErrRejectInputInvalid = errors.new("rejectItemAction input validation failed")
const ErrItemNotFound = errors.new("disposition action: item not found")
const ErrItemNotApprovable = errors.new(
	"disposition action: item status is not approvable (must be candidate or rejected)"
)
const ErrItemNotRejectable = errors.new(
	"disposition action: item status is not rejectable (must be candidate or live)"
)
const ErrStaleVerdictNotAcknowledged = errors.new(
	"approveItemAction blocked: validator verdict is stale; explicit acknowledgement required"
)

type ApproveInput = z.infer<typeof approveInputSchema>
type RejectInput = z.infer<typeof rejectInputSchema>

interface DispositionOutput {
	readonly outcome: "ok"
	readonly itemId: string
	readonly newStatus: "live" | "rejected"
}

export type { ApproveInput, DispositionOutput, RejectInput }
export {
	approveInputSchema,
	ErrApproveInputInvalid,
	ErrItemNotApprovable,
	ErrItemNotFound,
	ErrItemNotRejectable,
	ErrRejectInputInvalid,
	ErrStaleVerdictNotAcknowledged,
	rejectInputSchema
}
