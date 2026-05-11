// Zod schema, error sentinels, and types for the user-submitted item-
// report server action (User Question Reports round §1.2 per
// docs/plans/user-question-reports.md). Lives in a separate module from
// `report-actions.ts` because Next.js's "use server" files are
// restricted to exporting async functions — types, constants, and Zod
// schemas must be reachable from a non-"use server" module.
//
// Style precedent: src/server/admin/disposition-input-schema.ts.
//
// Reason taxonomy per plan-doc §0.8:
//   formatting     — rendering / layout / typography
//   wrong_answer   — the marked-correct option is not actually correct
//   mislabeled     — sub-type / difficulty / status label is wrong
//   other          — free-text required (refinement below)
//
// reasonNote length: 1000 chars (matches disposition-input-schema's
// reasonNote bound). Required when reason === "other"; optional
// otherwise. Cross-field validation lives in the .refine block on the
// final schema, mirroring the bucketChangeGated refinement at
// edit-input-schema.ts:60-76. The error message lands at the schema
// root path — field-precise paths require .superRefine; the project
// uses .refine with root-path messages and the §2 UI work can surface
// the message as a top-level form error.

import * as errors from "@superbuilders/errors"
import { z } from "zod"

const REPORT_REASONS = ["formatting", "wrong_answer", "mislabeled", "other"] as const

const submitItemReportInputSchema = z
	.object({
		itemId: z.string().uuid(),
		reason: z.enum(REPORT_REASONS),
		reasonNote: z.string().min(1).max(1000).optional()
	})
	.refine(
		function reasonNoteRequiredWhenOther(value) {
			if (value.reason === "other") {
				return value.reasonNote !== undefined
			}
			return true
		},
		{ message: "reasonNote is required when reason is 'other'" }
	)

const ErrSubmitReportInputInvalid = errors.new(
	"submitItemReportAction input validation failed"
)
const ErrUnauthorized = errors.new("submitItemReportAction: unauthorized (no session)")
const ErrItemNotFound = errors.new("submitItemReportAction: item not found")
const ErrReportPersistFailed = errors.new("submitItemReportAction: persistence failed")

type SubmitItemReportInput = z.infer<typeof submitItemReportInputSchema>
type ReportReason = (typeof REPORT_REASONS)[number]

interface SubmitItemReportOutput {
	readonly outcome: "ok"
	readonly itemId: string
}

export type { ReportReason, SubmitItemReportInput, SubmitItemReportOutput }
export {
	ErrItemNotFound,
	ErrReportPersistFailed,
	ErrSubmitReportInputInvalid,
	ErrUnauthorized,
	REPORT_REASONS,
	submitItemReportInputSchema
}
