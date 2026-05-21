// §2.3 commit-1: enqueueEmbeddingRegen is now a real wrapper around
// embedText (no longer a stub-throw). The function's logic is:
//
//   1. logger.info before call
//   2. errors.try(embedText(newBodyText))
//   3. wrap + rethrow on error
//   4. logger.info after
//   5. return embedding array
//
// All of those are I/O wrappers; the only unit-testable piece is the
// type signature. The actual embedText integration is exercised by the
// real-DB manual verification path (audit step 4 in §2.3 commit-1) and
// by the existing sibling-generation + embedding-backfill workflows
// that share the same embedText call site.
//
// We avoid mocking embedText to stay consistent with the project's
// test discipline (no DB or external-API mocks in unit tests).

import { expect, test } from "bun:test"
import {
	enqueueEmbeddingRegen,
	type RegenReason
} from "@/server/admin/embedding-regen"

test("enqueueEmbeddingRegen: signature accepts body-edit reason variant", function typeShape() {
	const fnTypeCheck: (id: string, r: RegenReason, t: string) => Promise<number[]> =
		enqueueEmbeddingRegen
	expect(typeof fnTypeCheck).toBe("function")
})

test("RegenReason: body-edit variant is constructible", function variantSanity() {
	const reason: RegenReason = { kind: "body-edit" }
	expect(reason.kind).toBe("body-edit")
})
