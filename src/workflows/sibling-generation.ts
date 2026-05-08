// siblingGenerationWorkflow — Phase 4 sub-phase a's similar-item
// generator orchestration.
//
// All step bodies live in `./sibling-generation-steps`. This file
// contains only the workflow orchestration so the `@workflow/next`
// plugin's node-module guard sees no pino-reachable edge in the
// workflow file's import graph. See sibling-generation-steps.ts for
// the rationale + the actual logic + logger calls (precedent:
// `embedding-backfill.ts` + `mastery-recompute.ts`).

import {
	assignIdsAndValidateStep,
	embedSiblingStep,
	generateSiblingSetStep,
	loadNearestNeighborsStep,
	loadSourceItemStep,
	writeSiblingSetStep
} from "@/workflows/sibling-generation-steps"

const DEFAULT_NEIGHBORS_PER_TIER = 2

async function siblingGenerationWorkflow(
	input: { itemId: string; neighborsPerTier?: number }
): Promise<{ insertedIds: string[] }> {
	"use workflow"
	const loaded = await loadSourceItemStep(input.itemId)
	const neighborsPerTier =
		input.neighborsPerTier === undefined ? DEFAULT_NEIGHBORS_PER_TIER : input.neighborsPerTier
	const neighbors = await loadNearestNeighborsStep({
		sourceId: loaded.source.id,
		subTypeId: loaded.source.subTypeId,
		neighborsPerTier
	})
	const generation = await generateSiblingSetStep({ ...loaded.source, neighbors })
	const resolvedSiblings = await assignIdsAndValidateStep(generation.siblingSet.siblings)
	const embeddings = await embedSiblingStep(resolvedSiblings)
	return await writeSiblingSetStep({
		parentItemId: input.itemId,
		subTypeId: loaded.source.subTypeId,
		strategyId: loaded.strategyId,
		resolvedSiblings,
		embeddings,
		sourceSnapshot: loaded.source,
		llmContext: generation.llmContext
	})
}

export { siblingGenerationWorkflow }
