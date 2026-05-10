// Zod schema, error sentinels, and type definitions for admin item-edit
// (Phase 4 sub-phase b §2.3 commit 0). Lives in a separate module from
// `edit-actions.ts` because Next.js's "use server" files are restricted
// to exporting async functions — types, constants, and Zod schemas must
// be reachable from a non-"use server" module.
//
// Pre-flight invariants enforced here (independent of server-action
// invocation):
//   1. editedFields strict shape; reuses canonical primitives — `itemBody`
//      from body-schema, `optionSchema` + `structuredExplanation` from
//      ingest.ts (same 8-char-lowercase option-id regex; same recognition/
//      elimination/tie-breaker structured-explanation contract).
//   2. At least one field must be edited.
//   3. `bucketChangeAcknowledged` must be true when sub-type or difficulty
//      is included in editedFields (Q5 ratification — bucket-change UX
//      requires explicit admin confirmation before submit).

import * as errors from "@superbuilders/errors"
import { z } from "zod"
import type { Difficulty, SubTypeId } from "@/config/sub-types"
import { subTypeIds } from "@/config/sub-types"
import { itemBody } from "@/server/items/body-schema"
import { optionSchema, structuredExplanation } from "@/server/items/ingest"

const ErrEditNotYetImplemented = errors.new(
	"submitEditAction not yet implemented (§2.3 commit-1)"
)
const ErrEditInputInvalid = errors.new("submitEditAction input validation failed")

const DIFFICULTY_VALUES = ["easy", "medium", "hard", "brutal"] as const

const editedFieldsSchema = z
	.object({
		body: itemBody.optional(),
		options: z.array(optionSchema).min(2).max(5).optional(),
		correctAnswer: z
			.string()
			.regex(/^[0-9a-z]{8}$/)
			.optional(),
		explanation: z.string().min(1).optional(),
		structuredExplanation: structuredExplanation.optional(),
		subTypeId: z.enum(subTypeIds).optional(),
		difficulty: z.enum(DIFFICULTY_VALUES).optional()
	})
	.strict()
	.refine(
		function hasAtLeastOneEdit(value) {
			return Object.values(value).length > 0
		},
		{ message: "editedFields must include at least one changed field" }
	)

const submitEditInputSchema = z
	.object({
		itemId: z.string().uuid(),
		editedFields: editedFieldsSchema,
		reasonNote: z.string().min(1).max(500).optional(),
		bucketChangeAcknowledged: z.boolean()
	})
	.refine(
		function bucketChangeGated(value) {
			if (
				value.editedFields.subTypeId !== undefined ||
				value.editedFields.difficulty !== undefined
			) {
				return value.bucketChangeAcknowledged
			}
			return true
		},
		{
			message:
				"bucketChangeAcknowledged must be true when sub-type or difficulty is edited (Q5 ratification)"
		}
	)

type SubmitEditInput = z.infer<typeof submitEditInputSchema>

interface SubmitEditOutput {
	readonly itemId: string
}

export type { Difficulty, SubmitEditInput, SubmitEditOutput, SubTypeId }
export {
	ErrEditInputInvalid,
	ErrEditNotYetImplemented,
	submitEditInputSchema
}
