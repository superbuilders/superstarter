// Embedding-regen helper for admin item-edit (Phase 4 sub-phase b §2.3
// commit 0).
//
// SCAFFOLD ONLY. Called by submitEditAction's commit-1 implementation when
// body text edits land. Throws ErrRegenNotYetImplemented on invocation
// today — same safeguard pattern as §1.2 commit-0 criterion stubs and
// §1.3 commit-0 persistResultsStep stub: ensures §2.3 commit-1 cannot
// ship without wiring this in.
//
// Embedding scope: BODY TEXT ONLY. Verified at audit step 12 against
// `src/workflows/embedding-backfill-steps.ts:64` (`textForBody` returns
// body.text only) and `src/workflows/sibling-generation-steps.ts:408`
// (`resolvedSiblings.map((r) => r.body.text)`). NOT body+options. NOT
// body+options+explanation. Option-text edits do NOT trigger regen at
// the current embedding scope. If future scope changes to include
// option text, add a new RegenReason variant + update commit-1's
// implementation in lockstep.

import * as errors from "@superbuilders/errors"
import { logger } from "@/logger"

const ErrRegenNotYetImplemented = errors.new(
	"enqueueEmbeddingRegen not yet implemented (§2.3 commit-1)"
)

type RegenReason = { readonly kind: "body-edit" }

async function enqueueEmbeddingRegen(itemId: string, reason: RegenReason): Promise<void> {
	logger.info(
		{ itemId, reasonKind: reason.kind },
		"enqueueEmbeddingRegen: stub invoked"
	)
	throw errors.wrap(ErrRegenNotYetImplemented, "stub")
}

export type { RegenReason }
export { enqueueEmbeddingRegen, ErrRegenNotYetImplemented }
