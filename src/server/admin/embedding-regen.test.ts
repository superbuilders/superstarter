// Pure-function tests for enqueueEmbeddingRegen stub.
//
// Confirms the safeguard pattern: invocation throws ErrRegenNotYetImplemented
// so §2.3 commit-1 must wire this in before it can be silently a no-op.

import * as errors from "@superbuilders/errors"
import { expect, test } from "bun:test"
import {
	enqueueEmbeddingRegen,
	ErrRegenNotYetImplemented
} from "@/server/admin/embedding-regen"

test("enqueueEmbeddingRegen: throws ErrRegenNotYetImplemented on body-edit reason", async function stubThrows() {
	const result = await errors.try(
		enqueueEmbeddingRegen("019e0967-62a7-73c3-8126-4fabe217a8c1", { kind: "body-edit" })
	)
	expect(result.error).toBeDefined()
	if (result.error) {
		expect(errors.is(result.error, ErrRegenNotYetImplemented)).toBe(true)
	}
})

test("ErrRegenNotYetImplemented message mentions commit-1", function sentinelMessage() {
	expect(ErrRegenNotYetImplemented.message).toContain("§2.3 commit-1")
})
