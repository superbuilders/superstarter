// Zod schemas, error sentinels, and types for admin candidate disposition
// (Phase 4 sub-phase b §2.4 commit 0). Lives in a separate module from
// `disposition-actions.ts` because Next.js's "use server" files are
// restricted to exporting async functions — types, constants, and Zod
// schemas must be reachable from a non-"use server" module.
//
// Two actions, two schemas:
//   - approveCandidateAction: items.status: candidate → live. reasonNote
//     OPTIONAL. acknowledgeStaleVerdict REQUIRED (UI submits false when
//     the validator verdict is fresh; true when admin has acknowledged a
//     stale verdict via the ApproveStaleConfirm modal).
//   - rejectCandidateAction: items.status: candidate → rejected.
//     reasonNote REQUIRED per Q6 ratification (admin's terminal "no, this
//     isn't a quality item" judgment must include free-text justification
//     for the audit trail). No staleness gating — rejection doesn't
//     depend on validator state.
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

const ErrApproveInputInvalid = errors.new("approveCandidateAction input validation failed")
const ErrRejectInputInvalid = errors.new("rejectCandidateAction input validation failed")
const ErrItemNotFound = errors.new("disposition action: item not found")
const ErrItemNotCandidate = errors.new(
	"disposition action: item is not in candidate status; cannot dispose"
)
const ErrStaleVerdictNotAcknowledged = errors.new(
	"approveCandidateAction blocked: validator verdict is stale; explicit acknowledgement required"
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
	ErrItemNotCandidate,
	ErrItemNotFound,
	ErrRejectInputInvalid,
	ErrStaleVerdictNotAcknowledged,
	rejectInputSchema
}
