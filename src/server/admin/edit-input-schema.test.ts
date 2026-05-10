// Pure-function tests for submitEditInputSchema (Phase 4 sub-phase b §2.3
// commit 0). Covers shape, at-least-one-edit refinement, and the Q5
// bucket-change-acknowledged refinement. The server action itself
// (edit-actions.ts) requires a request context (auth, logger) and is not
// unit-tested here; its sole job is requireAdminEmail() + safeParse() +
// throw, which is exercised by the schema tests for the validation path.

import { expect, test } from "bun:test"
import {
	ErrEditInputInvalid,
	ErrEditNotYetImplemented,
	submitEditInputSchema
} from "@/server/admin/edit-input-schema"

const VALID_ITEM_ID = "019e0967-62a7-73c3-8126-4fabe217a8c1"

test("submitEditInputSchema: accepts minimal valid input (single explanation edit)", function minValid() {
	const result = submitEditInputSchema.safeParse({
		itemId: VALID_ITEM_ID,
		editedFields: { explanation: "Updated explanation." },
		bucketChangeAcknowledged: false
	})
	expect(result.success).toBe(true)
})

test("submitEditInputSchema: rejects when editedFields is empty", function emptyEdits() {
	const result = submitEditInputSchema.safeParse({
		itemId: VALID_ITEM_ID,
		editedFields: {},
		bucketChangeAcknowledged: false
	})
	expect(result.success).toBe(false)
})

test("submitEditInputSchema: rejects invalid uuid itemId", function badItemId() {
	const result = submitEditInputSchema.safeParse({
		itemId: "not-a-uuid",
		editedFields: { explanation: "x" },
		bucketChangeAcknowledged: false
	})
	expect(result.success).toBe(false)
})

test("submitEditInputSchema: rejects subTypeId change with bucketChangeAcknowledged=false", function bucketGuardSubType() {
	const result = submitEditInputSchema.safeParse({
		itemId: VALID_ITEM_ID,
		editedFields: { subTypeId: "verbal.antonyms" },
		bucketChangeAcknowledged: false
	})
	expect(result.success).toBe(false)
})

test("submitEditInputSchema: accepts subTypeId change with bucketChangeAcknowledged=true", function bucketGuardSubTypeOk() {
	const result = submitEditInputSchema.safeParse({
		itemId: VALID_ITEM_ID,
		editedFields: { subTypeId: "verbal.antonyms" },
		bucketChangeAcknowledged: true
	})
	expect(result.success).toBe(true)
})

test("submitEditInputSchema: rejects difficulty change with bucketChangeAcknowledged=false", function bucketGuardDifficulty() {
	const result = submitEditInputSchema.safeParse({
		itemId: VALID_ITEM_ID,
		editedFields: { difficulty: "hard" },
		bucketChangeAcknowledged: false
	})
	expect(result.success).toBe(false)
})

test("submitEditInputSchema: accepts difficulty change with bucketChangeAcknowledged=true", function bucketGuardDifficultyOk() {
	const result = submitEditInputSchema.safeParse({
		itemId: VALID_ITEM_ID,
		editedFields: { difficulty: "hard" },
		bucketChangeAcknowledged: true
	})
	expect(result.success).toBe(true)
})

test("submitEditInputSchema: rejects combined sub-type+difficulty change without acknowledgement", function combinedBucket() {
	const result = submitEditInputSchema.safeParse({
		itemId: VALID_ITEM_ID,
		editedFields: { subTypeId: "verbal.antonyms", difficulty: "hard" },
		bucketChangeAcknowledged: false
	})
	expect(result.success).toBe(false)
})

test("submitEditInputSchema: accepts body edit with bucketChangeAcknowledged=false", function nonBucketEditOk() {
	const result = submitEditInputSchema.safeParse({
		itemId: VALID_ITEM_ID,
		editedFields: { body: { kind: "text", text: "Updated stem." } },
		bucketChangeAcknowledged: false
	})
	expect(result.success).toBe(true)
})

test("submitEditInputSchema: rejects options array with id not matching 8-char regex", function badOptionId() {
	const result = submitEditInputSchema.safeParse({
		itemId: VALID_ITEM_ID,
		editedFields: {
			options: [
				{ id: "A", text: "alpha" },
				{ id: "B", text: "beta" }
			]
		},
		bucketChangeAcknowledged: false
	})
	expect(result.success).toBe(false)
})

test("submitEditInputSchema: accepts options array with 8-char lowercase alphanumeric ids", function goodOptionIds() {
	const result = submitEditInputSchema.safeParse({
		itemId: VALID_ITEM_ID,
		editedFields: {
			options: [
				{ id: "vxvpda6w", text: "alpha" },
				{ id: "8kfkapee", text: "beta" }
			]
		},
		bucketChangeAcknowledged: false
	})
	expect(result.success).toBe(true)
})

test("submitEditInputSchema: rejects correctAnswer not matching 8-char regex", function badCorrectAnswer() {
	const result = submitEditInputSchema.safeParse({
		itemId: VALID_ITEM_ID,
		editedFields: { correctAnswer: "A" },
		bucketChangeAcknowledged: false
	})
	expect(result.success).toBe(false)
})

test("submitEditInputSchema: rejects unknown extra field via .strict()", function strictReject() {
	const result = submitEditInputSchema.safeParse({
		itemId: VALID_ITEM_ID,
		editedFields: { explanation: "x", unknownField: "should-not-pass" },
		bucketChangeAcknowledged: false
	})
	expect(result.success).toBe(false)
})

test("submitEditInputSchema: accepts structuredExplanation with valid 3-part shape", function structuredEx() {
	const result = submitEditInputSchema.safeParse({
		itemId: VALID_ITEM_ID,
		editedFields: {
			structuredExplanation: {
				parts: [
					{ kind: "recognition", text: "Pattern recognition.", referencedOptions: [] },
					{
						kind: "elimination",
						text: "Eliminate these.",
						referencedOptions: ["vxvpda6w"]
					},
					{ kind: "tie-breaker", text: "Tie-break here.", referencedOptions: [] }
				]
			}
		},
		bucketChangeAcknowledged: false
	})
	expect(result.success).toBe(true)
})

test("submitEditInputSchema: rejects reasonNote longer than 500 chars", function longReason() {
	const result = submitEditInputSchema.safeParse({
		itemId: VALID_ITEM_ID,
		editedFields: { explanation: "x" },
		reasonNote: "x".repeat(501),
		bucketChangeAcknowledged: false
	})
	expect(result.success).toBe(false)
})

test("ErrEditNotYetImplemented + ErrEditInputInvalid are distinct sentinels", function sentinelsDistinct() {
	expect(ErrEditNotYetImplemented).not.toBe(ErrEditInputInvalid)
	expect(ErrEditNotYetImplemented.message).toContain("not yet implemented")
	expect(ErrEditInputInvalid.message).toContain("input validation failed")
})
