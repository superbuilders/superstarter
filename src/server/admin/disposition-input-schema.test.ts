// Pure-function tests for the approve / reject input schemas (Phase 4
// sub-phase b §2.4 commit 0). Mirrors edit-input-schema.test.ts in shape.
// The DB-touching server actions are NOT tested here (no DB harness in
// bun:test); this file exercises only the Zod refinements that gate
// approve/reject inputs before they reach the action body.

import { expect, test } from "bun:test"
import {
	approveInputSchema,
	rejectInputSchema
} from "@/server/admin/disposition-input-schema"
import { isMetadataValidatorStale } from "@/server/admin/staleness"

const VALID_UUID = "01956a4d-1234-7000-8000-abcdef012345"

test("approveInputSchema: accepts minimal valid input (no reason)", function approveMinimal() {
	const result = approveInputSchema.safeParse({
		itemId: VALID_UUID,
		acknowledgeStaleVerdict: false
	})
	expect(result.success).toBe(true)
})

test("approveInputSchema: accepts valid input with reasonNote", function approveWithReason() {
	const result = approveInputSchema.safeParse({
		itemId: VALID_UUID,
		acknowledgeStaleVerdict: true,
		reasonNote: "looks good after manual sanity check"
	})
	expect(result.success).toBe(true)
})

test("approveInputSchema: rejects non-uuid itemId", function approveBadId() {
	const result = approveInputSchema.safeParse({
		itemId: "not-a-uuid",
		acknowledgeStaleVerdict: false
	})
	expect(result.success).toBe(false)
})

test("approveInputSchema: rejects when acknowledgeStaleVerdict missing", function approveMissingAck() {
	const result = approveInputSchema.safeParse({
		itemId: VALID_UUID
	})
	expect(result.success).toBe(false)
})

test("approveInputSchema: rejects empty reasonNote (min(1) violation)", function approveEmptyReason() {
	const result = approveInputSchema.safeParse({
		itemId: VALID_UUID,
		acknowledgeStaleVerdict: false,
		reasonNote: ""
	})
	expect(result.success).toBe(false)
})

test("approveInputSchema: rejects reasonNote > 1000 chars", function approveLongReason() {
	const result = approveInputSchema.safeParse({
		itemId: VALID_UUID,
		acknowledgeStaleVerdict: false,
		reasonNote: "x".repeat(1001)
	})
	expect(result.success).toBe(false)
})

test("rejectInputSchema: accepts valid input with reasonNote", function rejectWithReason() {
	const result = rejectInputSchema.safeParse({
		itemId: VALID_UUID,
		reasonNote: "duplicate of item 0193abcd"
	})
	expect(result.success).toBe(true)
})

test("rejectInputSchema: rejects missing reasonNote (Q6 — required)", function rejectMissingReason() {
	const result = rejectInputSchema.safeParse({
		itemId: VALID_UUID
	})
	expect(result.success).toBe(false)
})

test("rejectInputSchema: rejects empty reasonNote", function rejectEmptyReason() {
	const result = rejectInputSchema.safeParse({
		itemId: VALID_UUID,
		reasonNote: ""
	})
	expect(result.success).toBe(false)
})

test("rejectInputSchema: rejects reasonNote > 1000 chars", function rejectLongReason() {
	const result = rejectInputSchema.safeParse({
		itemId: VALID_UUID,
		reasonNote: "x".repeat(1001)
	})
	expect(result.success).toBe(false)
})

test("rejectInputSchema: rejects non-uuid itemId", function rejectBadId() {
	const result = rejectInputSchema.safeParse({
		itemId: "not-a-uuid",
		reasonNote: "valid reason"
	})
	expect(result.success).toBe(false)
})

test("isMetadataValidatorStale: false when metadata absent", function staleAbsent() {
	expect(isMetadataValidatorStale(null)).toBe(false)
	expect(isMetadataValidatorStale(undefined)).toBe(false)
	expect(isMetadataValidatorStale({})).toBe(false)
})

test("isMetadataValidatorStale: false when validatorResult absent", function staleNoValidator() {
	expect(isMetadataValidatorStale({ promptHash: "abc" })).toBe(false)
})

test("isMetadataValidatorStale: false when staleAfterMs absent", function staleNoMarker() {
	const meta = {
		validatorResult: {
			evaluatedAtMs: 1_700_000_000_000,
			hasAnyFlag: false,
			isPressureCell: false,
			flagsByName: {},
			thresholdsHash: "sha256:abc",
			invokedByAdminEmail: "admin@example.com"
		}
	}
	expect(isMetadataValidatorStale(meta)).toBe(false)
})

test("isMetadataValidatorStale: false when evaluatedAtMs >= staleAfterMs (revalidated)", function staleRevalidated() {
	const meta = {
		validatorResult: {
			evaluatedAtMs: 2_000_000_000_000,
			hasAnyFlag: false,
			isPressureCell: false,
			flagsByName: {},
			thresholdsHash: "sha256:abc",
			invokedByAdminEmail: "admin@example.com",
			staleAfterMs: 1_000_000_000_000
		}
	}
	expect(isMetadataValidatorStale(meta)).toBe(false)
})

test("isMetadataValidatorStale: true when staleAfterMs > evaluatedAtMs (edited after validation)", function staleEdited() {
	const meta = {
		validatorResult: {
			evaluatedAtMs: 1_000_000_000_000,
			hasAnyFlag: false,
			isPressureCell: false,
			flagsByName: {},
			thresholdsHash: "sha256:abc",
			invokedByAdminEmail: "admin@example.com",
			staleAfterMs: 2_000_000_000_000
		}
	}
	expect(isMetadataValidatorStale(meta)).toBe(true)
})

test("isMetadataValidatorStale: false on malformed metadata (Zod parse fails)", function staleMalformed() {
	expect(isMetadataValidatorStale("not an object")).toBe(false)
	expect(isMetadataValidatorStale(123)).toBe(false)
})
