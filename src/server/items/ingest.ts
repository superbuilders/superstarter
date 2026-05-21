import * as errors from "@superbuilders/errors"
import { start } from "workflow/api"
import { z } from "zod"
import { type Difficulty, subTypeIds, type SubTypeId } from "@/config/sub-types"
import { db } from "@/db"
import { items } from "@/db/schemas/catalog/items"
import { logger } from "@/logger"
import { itemBody, type ItemBody } from "@/server/items/body-schema"
import { embeddingBackfillWorkflow } from "@/workflows/embedding-backfill"

const ErrIngestValidation = errors.new("ingest validation failed")

// `optionSchema` and `structuredExplanation` (defined below) are exported
// from the bottom barrel for reuse by Phase 4 sub-phase a's
// ingestSiblingSet (`@/server/items/ingest-siblings`). The post-resolution
// option-id and structured-explanation invariants are identical for real
// and sibling-generated items.
const optionSchema = z.object({
	id: z.string().regex(/^[0-9a-z]{8}$/),
	text: z.string().min(1)
})

const explanationPartKind = z.enum(["recognition", "elimination", "tie-breaker"])

const structuredExplanation = z
	.object({
		parts: z
			.array(
				z.object({
					kind: explanationPartKind,
					text: z.string().min(1),
					referencedOptions: z.array(z.string())
				})
			)
			.min(2)
			.max(3)
	})
	.refine(
		(d) => {
			if (d.parts[0]?.kind !== "recognition") return false
			if (d.parts[1]?.kind !== "elimination") return false
			if (d.parts.length < 3) return true
			return d.parts[2]?.kind === "tie-breaker"
		},
		{
			message:
				"parts must be in order: recognition, elimination, optional tie-breaker"
		}
	)

type StructuredExplanation = z.infer<typeof structuredExplanation>

const ingestMetadata = z.object({
	originalExplanation: z.string().min(1).optional(),
	importSource: z.string().min(1).max(64).optional(),
	structuredExplanation: structuredExplanation.optional()
})

const ingestInput = z.object({
	subTypeId: z.enum(subTypeIds),
	difficulty: z.enum(["easy", "medium", "hard", "brutal"]),
	body: itemBody,
	options: z.array(optionSchema).min(2).max(5),
	correctAnswer: z.string().regex(/^[0-9a-z]{8}$/),
	explanation: z.string().min(1).optional(),
	strategyId: z.string().uuid().optional(),
	// Source provenance — top-level fields (added in
	// phase5-testbank-re-extraction round commit 3 per Q1 redline) that
	// write directly to the items.source_folder + items.source_filename
	// columns added in commit 2. Both optional for backward-compat with
	// the seed loader (which has no provenance).
	sourceFolder: z.string().min(1).max(128).optional(),
	sourceFilename: z.string().min(1).max(256).optional(),
	metadata: ingestMetadata.optional()
})

interface IngestRealItemInput {
	subTypeId: SubTypeId
	difficulty: Difficulty
	body: ItemBody
	options: { id: string; text: string }[]
	correctAnswer: string
	explanation?: string
	strategyId?: string
	sourceFolder?: string
	sourceFilename?: string
	metadata?: {
		originalExplanation?: string
		importSource?: string
		structuredExplanation?: StructuredExplanation
	}
}

function assertReferencedOptionsExist(
	structured: StructuredExplanation,
	optionIds: ReadonlySet<string>
): void {
	for (const part of structured.parts) {
		for (const ref of part.referencedOptions) {
			if (!optionIds.has(ref)) {
				logger.warn(
					{ referencedOption: ref, optionIds: [...optionIds] },
					"ingestRealItem: referencedOption not in options"
				)
				throw errors.wrap(
					ErrIngestValidation,
					`referencedOption '${ref}' not in options`
				)
			}
		}
	}
}

interface IngestRealItemOptions {
	// Skip the embedding-backfill workflow trigger. Used by the seed loader
	// (which runs as a raw Bun process outside Next.js context, where the
	// Workflow SDK's "use workflow" transform does not apply and start() would
	// throw start-invalid-workflow-function). Items inserted with
	// triggerEmbeddingBackfill=false land with embedding=NULL; backfill them
	// with scripts/backfill-missing-embeddings.ts.
	triggerEmbeddingBackfill?: boolean
}

async function ingestRealItem(
	input: IngestRealItemInput,
	options?: IngestRealItemOptions
): Promise<{ itemId: string }> {
	const parsed = ingestInput.safeParse(input)
	if (!parsed.success) {
		logger.error(
			{ issues: parsed.error.issues },
			"ingestRealItem: input failed schema validation"
		)
		throw errors.wrap(ErrIngestValidation, "input schema")
	}

	const data = parsed.data

	const optionIds = new Set<string>()
	for (const option of data.options) {
		if (optionIds.has(option.id)) {
			logger.error({ optionId: option.id }, "ingestRealItem: duplicate option id")
			throw errors.wrap(ErrIngestValidation, `duplicate option id '${option.id}'`)
		}
		optionIds.add(option.id)
	}

	if (!optionIds.has(data.correctAnswer)) {
		logger.error(
			{ correctAnswer: data.correctAnswer, optionIds: [...optionIds] },
			"ingestRealItem: correctAnswer does not match any option id"
		)
		throw errors.wrap(ErrIngestValidation, "correctAnswer not in options")
	}

	if (data.metadata?.structuredExplanation) {
		assertReferencedOptionsExist(data.metadata.structuredExplanation, optionIds)
	}

	const metadataJson: {
		originalExplanation?: string
		importSource?: string
		structuredExplanation?: StructuredExplanation
	} = {}
	if (data.metadata?.originalExplanation) {
		metadataJson.originalExplanation = data.metadata.originalExplanation
	}
	if (data.metadata?.importSource) {
		metadataJson.importSource = data.metadata.importSource
	}
	if (data.metadata?.structuredExplanation) {
		metadataJson.structuredExplanation = data.metadata.structuredExplanation
	}

	const insertResult = await errors.try(
		db
			.insert(items)
			.values({
				subTypeId: data.subTypeId,
				difficulty: data.difficulty,
				source: "real",
				status: "live",
				body: data.body,
				optionsJson: data.options,
				correctAnswer: data.correctAnswer,
				explanation: data.explanation,
				strategyId: data.strategyId,
				metadataJson,
				sourceFolder: data.sourceFolder,
				sourceFilename: data.sourceFilename
			})
			.returning({ id: items.id })
	)
	if (insertResult.error) {
		logger.error(
			{ error: insertResult.error, subTypeId: data.subTypeId },
			"ingestRealItem: insert failed"
		)
		throw errors.wrap(insertResult.error, "ingestRealItem insert")
	}

	const inserted = insertResult.data[0]
	if (!inserted) {
		logger.error({ subTypeId: data.subTypeId }, "ingestRealItem: insert returning empty")
		throw errors.new("ingestRealItem insert returned no rows")
	}

	const itemId = inserted.id

	logger.info(
		{ itemId, subTypeId: data.subTypeId, difficulty: data.difficulty },
		"ingestRealItem: inserted real item"
	)

	const triggerBackfill = options?.triggerEmbeddingBackfill !== false
	if (triggerBackfill) {
		// Trigger embedding backfill. In dev this awaits the OpenAI roundtrip; in
		// production with Vercel Workflows the call enqueues durably and the await
		// resolves once the workflow run is registered (steps run asynchronously).
		const backfillResult = await errors.try(start(embeddingBackfillWorkflow, [{ itemId }]))
		if (backfillResult.error) {
			logger.error(
				{ error: backfillResult.error, itemId },
				"ingestRealItem: embedding-backfill workflow failed to start"
			)
			throw errors.wrap(backfillResult.error, "embeddingBackfillWorkflow")
		}
	} else {
		logger.info(
			{ itemId },
			"ingestRealItem: skipping embedding-backfill workflow per options.triggerEmbeddingBackfill=false"
		)
	}

	return { itemId }
}

export type { IngestRealItemInput, IngestRealItemOptions, StructuredExplanation }
export {
	assertReferencedOptionsExist,
	ErrIngestValidation,
	ingestInput,
	ingestRealItem,
	optionSchema,
	structuredExplanation
}
