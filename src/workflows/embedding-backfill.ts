// embeddingBackfillWorkflow — the workflow function only. The actual
// step bodies live in `./embedding-backfill-steps` to keep this file's
// import graph free of `@/logger` (and its pino dependency), which the
// `@workflow/next` plugin's node-module guard rejects on workflow files.
// See `embedding-backfill-steps.ts` for the rationale + the full step
// bodies.

import {
	embedStep,
	loadItemStep,
	writeStep
} from "@/workflows/embedding-backfill-steps"

async function embeddingBackfillWorkflow(input: { itemId: string }): Promise<void> {
	"use workflow"
	const loaded = await loadItemStep(input.itemId)
	const embedding = await embedStep(loaded.bodyText)
	await writeStep(loaded.id, embedding)
}

export { embeddingBackfillWorkflow }
