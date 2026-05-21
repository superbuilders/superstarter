// Pure-function tests for the re-validate input schema (Phase 4 sub-phase b
// §2.4 commit 1). Mirrors disposition-input-schema.test.ts in shape. The
// DB-touching server actions are NOT tested here (no DB harness in
// bun:test); this file exercises only the Zod refinements that gate the
// single re-validate input before it reaches the action body.
//
// The bulk action takes no input and therefore has no schema to test.

import { expect, test } from "bun:test"
import { revalidateSingleInputSchema } from "@/server/admin/revalidate-input-schema"

const VALID_UUID = "01956a4d-1234-7000-8000-abcdef012345"

test("revalidateSingleInputSchema: accepts valid uuid itemId", function singleValid() {
	const result = revalidateSingleInputSchema.safeParse({ itemId: VALID_UUID })
	expect(result.success).toBe(true)
})

test("revalidateSingleInputSchema: rejects non-uuid itemId", function singleBadId() {
	const result = revalidateSingleInputSchema.safeParse({ itemId: "not-a-uuid" })
	expect(result.success).toBe(false)
})

test("revalidateSingleInputSchema: rejects missing itemId", function singleMissingId() {
	const result = revalidateSingleInputSchema.safeParse({})
	expect(result.success).toBe(false)
})

test("revalidateSingleInputSchema: rejects extra fields strictly absent — passthrough by default", function singleExtraFields() {
	// Default Zod object behavior is strip; safeParse succeeds and the
	// extra field is dropped from .data. Documented here so future readers
	// know we explicitly do NOT use .strict() (which would fail this).
	const result = revalidateSingleInputSchema.safeParse({
		itemId: VALID_UUID,
		bonus: "ignored"
	})
	expect(result.success).toBe(true)
	if (result.success) {
		expect(result.data).toEqual({ itemId: VALID_UUID })
	}
})

test("revalidateSingleInputSchema: rejects null input", function singleNullInput() {
	const result = revalidateSingleInputSchema.safeParse(null)
	expect(result.success).toBe(false)
})

test("revalidateSingleInputSchema: rejects array input", function singleArrayInput() {
	const result = revalidateSingleInputSchema.safeParse([VALID_UUID])
	expect(result.success).toBe(false)
})
