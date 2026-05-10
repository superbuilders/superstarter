// Embedding-regen helper for admin item-edit (Phase 4 sub-phase b §2.3
// commit 1).
//
// Path A per the commit-1 spec: the named helper is preserved over an
// inline `embedText(text)` call in submitEditAction. The boundary buys
// us future async-queue migration room (e.g., batch admin edits firing a
// workflow step) without touching the action's site.
//
// Embedding scope: BODY TEXT ONLY (verified at §2.3 commit-0 audit step
// 12 against `src/workflows/embedding-backfill-steps.ts:64` and
// `src/workflows/sibling-generation-steps.ts:408`). NOT body+options.
// Option-text edits and explanation edits do NOT trigger regen.
// RegenReason currently has one variant — add new variants in lockstep
// with submitEditAction's call sites if scope ever broadens.
//
// Called synchronously inside submitEditAction's transaction (§2.3
// commit-1 spec): the OpenAI API call (~500ms-2s) holds the row open
// for the duration. Trade-off accepted at admin-edit volume (low
// concurrency); not acceptable at batch scale. A future round adds an
// async queue if admin edit throughput surfaces as a real problem.

import * as errors from "@superbuilders/errors"
import { logger } from "@/logger"
import { embedText } from "@/server/generation/embeddings"

type RegenReason = { readonly kind: "body-edit" }

async function enqueueEmbeddingRegen(
	itemId: string,
	reason: RegenReason,
	newBodyText: string
): Promise<number[]> {
	logger.info(
		{ itemId, reasonKind: reason.kind, charCount: newBodyText.length },
		"enqueueEmbeddingRegen: invoking embedText"
	)
	const result = await errors.try(embedText(newBodyText))
	if (result.error) {
		logger.error(
			{ itemId, reasonKind: reason.kind, error: result.error },
			"enqueueEmbeddingRegen: embedText failed"
		)
		throw errors.wrap(result.error, "enqueueEmbeddingRegen embedText")
	}
	logger.info(
		{ itemId, reasonKind: reason.kind, dimensions: result.data.length },
		"enqueueEmbeddingRegen: embedding produced"
	)
	return result.data
}

export type { RegenReason }
export { enqueueEmbeddingRegen }
