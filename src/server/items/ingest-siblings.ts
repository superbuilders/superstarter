// Phase 4 sub-phase a's similar-item generator — DB ingest seam.
//
// Per plan §4.10 + §4.11 + §4.12 + §5.5 + §7.2 + §7.3, this file owns:
//
//   1. validateAndResolveSiblings(siblings) — converts the LLM-boundary
//      shape (text-only options, referencedOptionTexts on structured-
//      explanation parts) into the post-resolution shape (id-bearing
//      options via assignOptionIds, resolved correctAnswer id,
//      referencedOptions ids), rejecting on duplicate option text per
//      §5.5 and on referencedOptionText miss per §7.2 step 5.
//
//   2. ingestSiblingSet(input) — opens a single db.transaction, batch-
//      inserts the 4 sibling rows with status='candidate' /
//      source='generated' / metadata_json.parentItemId / embedding set
//      inline (§4.10 atomicity contract). After the tx commits, writes
//      the per-source provenance JSON via writeSiblingProvenance
//      (§4.12 dual-write). Filesystem error after DB-commit logs and
//      re-throws WITHOUT rolling back the DB row inserts; the §7.3
//      trade-off is explicit.
//
// NOT consumed by ingestRealItem (the seed-loader + OCR-pipeline path
// in `./ingest.ts`); ingestSiblingSet is the parallel seam for
// generated items, sharing only the post-resolution validation
// primitives.

import * as errors from "@superbuilders/errors"
import { db } from "@/db"
import { items } from "@/db/schemas/catalog/items"
import { logger } from "@/logger"
import type { Difficulty, SubTypeId } from "@/config/sub-types"
import { itemBody, type ItemBody } from "@/server/items/body-schema"
import {
	assertReferencedOptionsExist,
	ErrIngestValidation,
	type StructuredExplanation
} from "@/server/items/ingest"
import { assignOptionIds } from "@/server/items/option-id"
import {
	type SiblingProvenancePayload,
	type SiblingProvenancePerSibling,
	type SiblingProvenanceSourceSnapshot,
	type SiblingProvenanceUsage,
	writeSiblingProvenance
} from "@/server/generation/sibling-provenance"
import type { SubmitSiblingSetOutput } from "@/server/generation/sibling-schema"

const TIER_ORDER: Difficulty[] = ["easy", "medium", "hard", "brutal"]
const EMBEDDING_DIMENSIONS = 1536

interface ResolvedSiblingInput {
	tier: Difficulty
	body: ItemBody
	options: { id: string; text: string }[]
	correctAnswer: string
	structuredExplanation: StructuredExplanation
}

interface IngestSiblingSetInput {
	parentItemId: string
	subTypeId: SubTypeId
	strategyId?: string
	resolvedSiblings: ResolvedSiblingInput[]
	embeddings: number[][]
	sourceSnapshot: SiblingProvenanceSourceSnapshot
	llmContext: {
		llmOutputVerbatim: SubmitSiblingSetOutput
		model: string
		promptHash: string
		generatedAt: string
		templateVersion: number
		usage: SiblingProvenanceUsage
	}
}

interface IngestSiblingSetResult {
	insertedIds: string[]
}

function rejectTier(tier: Difficulty, detail: string): never {
	logger.error(
		{ tier, detail },
		"validateAndResolveSiblings: rejected sibling tier"
	)
	throw errors.wrap(ErrIngestValidation, `sibling tier '${tier}': ${detail}`)
}

function resolveOneSibling(
	tier: Difficulty,
	rawSibling: SubmitSiblingSetOutput["siblings"]["easy"]
): ResolvedSiblingInput {
	const bodyParse = itemBody.safeParse(rawSibling.body)
	if (!bodyParse.success) {
		logger.error(
			{ tier, issues: bodyParse.error.issues },
			"validateAndResolveSiblings: body failed schema"
		)
		rejectTier(tier, "body failed itemBody schema")
	}

	const idBearingOptions = assignOptionIds(rawSibling.options)

	const textToId = new Map<string, string>()
	for (const option of idBearingOptions) {
		if (textToId.has(option.text)) {
			rejectTier(tier, `duplicate option text '${option.text}'`)
		}
		textToId.set(option.text, option.id)
	}

	const correctId = textToId.get(rawSibling.correctAnswerText)
	if (correctId === undefined) {
		rejectTier(
			tier,
			`correctAnswerText '${rawSibling.correctAnswerText}' did not match any option text`
		)
	}

	const resolvedParts: StructuredExplanation["parts"] = []
	for (const part of rawSibling.structuredExplanation.parts) {
		const resolvedRefs: string[] = []
		for (const refText of part.referencedOptionTexts) {
			const id = textToId.get(refText)
			if (id === undefined) {
				rejectTier(
					tier,
					`structuredExplanation referencedOptionText '${refText}' did not match any option text`
				)
			}
			resolvedRefs.push(id)
		}
		resolvedParts.push({
			kind: part.kind,
			text: part.text,
			referencedOptions: resolvedRefs
		})
	}

	const optionIds = new Set(idBearingOptions.map((o) => o.id))
	const resolvedStructured: StructuredExplanation = { parts: resolvedParts }
	assertReferencedOptionsExist(resolvedStructured, optionIds)

	return {
		tier,
		body: bodyParse.data,
		options: idBearingOptions,
		correctAnswer: correctId,
		structuredExplanation: resolvedStructured
	}
}

function validateAndResolveSiblings(
	siblings: SubmitSiblingSetOutput["siblings"]
): ResolvedSiblingInput[] {
	const resolved: ResolvedSiblingInput[] = []
	for (const tier of TIER_ORDER) {
		resolved.push(resolveOneSibling(tier, siblings[tier]))
	}
	return resolved
}

function buildPerSiblingProvenance(
	tier: Difficulty,
	insertedItemId: string,
	resolved: ResolvedSiblingInput,
	embedding: number[]
): SiblingProvenancePerSibling {
	const resolvedReferencedOptions = resolved.structuredExplanation.parts.map(
		function toRow(part) {
			return { partKind: part.kind, optionIds: part.referencedOptions }
		}
	)
	const embeddingSampleHead = embedding.slice(0, 8)
	return {
		tier,
		insertedItemId,
		body: { kind: "text", text: resolved.body.text },
		options: resolved.options,
		correctAnswer: resolved.correctAnswer,
		resolvedReferencedOptions,
		embeddingDimensions: embedding.length,
		embeddingSampleHead
	}
}

function validateInputShape(input: IngestSiblingSetInput): void {
	if (input.resolvedSiblings.length !== TIER_ORDER.length) {
		logger.error(
			{ count: input.resolvedSiblings.length, expected: TIER_ORDER.length },
			"ingestSiblingSet: resolvedSiblings length mismatch"
		)
		throw errors.wrap(
			ErrIngestValidation,
			`resolvedSiblings length ${input.resolvedSiblings.length} !== ${TIER_ORDER.length}`
		)
	}
	if (input.embeddings.length !== TIER_ORDER.length) {
		logger.error(
			{ count: input.embeddings.length, expected: TIER_ORDER.length },
			"ingestSiblingSet: embeddings length mismatch"
		)
		throw errors.wrap(
			ErrIngestValidation,
			`embeddings length ${input.embeddings.length} !== ${TIER_ORDER.length}`
		)
	}
	for (let i = 0; i < TIER_ORDER.length; i++) {
		validateTierAlignmentAtIndex(i, input)
	}
}

function validateTierAlignmentAtIndex(i: number, input: IngestSiblingSetInput): void {
	const expectedTier = TIER_ORDER[i]
	const resolved = input.resolvedSiblings[i]
	const embedding = input.embeddings[i]
	if (resolved === undefined || embedding === undefined || expectedTier === undefined) {
		logger.error({ index: i }, "ingestSiblingSet: index hole during input validation")
		throw errors.wrap(ErrIngestValidation, `input index hole at [${i}]`)
	}
	if (resolved.tier !== expectedTier) {
		logger.error(
			{ index: i, expected: expectedTier, got: resolved.tier },
			"ingestSiblingSet: tier ordering mismatch"
		)
		throw errors.wrap(
			ErrIngestValidation,
			`resolvedSiblings[${i}].tier '${resolved.tier}' expected '${expectedTier}'`
		)
	}
	if (embedding.length !== EMBEDDING_DIMENSIONS) {
		logger.error(
			{ index: i, length: embedding.length, expected: EMBEDDING_DIMENSIONS },
			"ingestSiblingSet: embedding dimension mismatch"
		)
		throw errors.wrap(
			ErrIngestValidation,
			`embeddings[${i}] dimensions ${embedding.length} !== ${EMBEDDING_DIMENSIONS}`
		)
	}
}

function verifyAndCollectInserted(
	insertedRows: { id: string; difficulty: Difficulty }[],
	input: IngestSiblingSetInput
): { insertedIds: string[]; perSiblingProvenance: SiblingProvenancePerSibling[] } {
	if (insertedRows.length !== TIER_ORDER.length) {
		logger.error(
			{
				parentItemId: input.parentItemId,
				inserted: insertedRows.length,
				expected: TIER_ORDER.length
			},
			"ingestSiblingSet: insert returning length mismatch"
		)
		throw errors.wrap(
			ErrIngestValidation,
			`insert returned ${insertedRows.length} rows; expected ${TIER_ORDER.length}`
		)
	}
	const insertedIds: string[] = []
	const perSiblingProvenance: SiblingProvenancePerSibling[] = []
	for (let i = 0; i < TIER_ORDER.length; i++) {
		const row = insertedRows[i]
		const resolved = input.resolvedSiblings[i]
		const embedding = input.embeddings[i]
		const expectedTier = TIER_ORDER[i]
		if (
			row === undefined ||
			resolved === undefined ||
			embedding === undefined ||
			expectedTier === undefined
		) {
			logger.error(
				{ index: i, parentItemId: input.parentItemId },
				"ingestSiblingSet: post-tx index hole"
			)
			throw errors.wrap(ErrIngestValidation, `post-tx index hole at [${i}]`)
		}
		if (row.difficulty !== expectedTier) {
			logger.error(
				{
					index: i,
					expected: expectedTier,
					got: row.difficulty,
					parentItemId: input.parentItemId
				},
				"ingestSiblingSet: returned difficulty does not match input order"
			)
			throw errors.wrap(
				ErrIngestValidation,
				`row[${i}].difficulty '${row.difficulty}' expected '${expectedTier}'`
			)
		}
		insertedIds.push(row.id)
		perSiblingProvenance.push(
			buildPerSiblingProvenance(expectedTier, row.id, resolved, embedding)
		)
	}
	return { insertedIds, perSiblingProvenance }
}

async function ingestSiblingSet(
	input: IngestSiblingSetInput
): Promise<IngestSiblingSetResult> {
	validateInputShape(input)

	const txResult = await errors.try(
		db.transaction(async (tx) => {
			const rows = input.resolvedSiblings.map(function toRow(resolved, idx) {
				const embedding = input.embeddings[idx]
				if (embedding === undefined) {
					logger.error(
						{ idx },
						"ingestSiblingSet: embedding lookup returned undefined inside tx"
					)
					throw errors.wrap(ErrIngestValidation, `embeddings[${idx}] undefined inside tx`)
				}
				const metadataJson = {
					parentItemId: input.parentItemId,
					generatorModel: input.llmContext.model,
					templateVersion: input.llmContext.templateVersion,
					generatedAt: input.llmContext.generatedAt,
					structuredExplanation: resolved.structuredExplanation
				}
				return {
					subTypeId: input.subTypeId,
					difficulty: resolved.tier,
					source: "generated" as const,
					status: "candidate" as const,
					body: resolved.body,
					optionsJson: resolved.options,
					correctAnswer: resolved.correctAnswer,
					explanation: resolved.structuredExplanation.parts.map((p) => p.text).join(" "),
					strategyId: input.strategyId,
					embedding,
					metadataJson
				}
			})

			const inserted = await tx
				.insert(items)
				.values(rows)
				.returning({ id: items.id, difficulty: items.difficulty })
			return inserted
		})
	)
	if (txResult.error) {
		logger.error(
			{ error: txResult.error, parentItemId: input.parentItemId },
			"ingestSiblingSet: transaction failed"
		)
		throw errors.wrap(txResult.error, "ingestSiblingSet transaction")
	}

	const { insertedIds, perSiblingProvenance } = verifyAndCollectInserted(
		txResult.data,
		input
	)

	logger.info(
		{
			parentItemId: input.parentItemId,
			subTypeId: input.subTypeId,
			insertedIds
		},
		"ingestSiblingSet: 4 candidate rows committed"
	)

	const provenancePayload: SiblingProvenancePayload = {
		parentItemId: input.parentItemId,
		generatedAt: input.llmContext.generatedAt,
		generatorModel: input.llmContext.model,
		templateVersion: input.llmContext.templateVersion,
		promptHash: input.llmContext.promptHash,
		source: input.sourceSnapshot,
		llmOutputVerbatim: input.llmContext.llmOutputVerbatim,
		siblings: perSiblingProvenance,
		usage: input.llmContext.usage
	}

	// Filesystem write happens AFTER the DB transaction commits; per plan
	// §7.3 a write failure here logs + re-throws WITHOUT rolling back the
	// DB rows (the trade-off the stage-1 pattern accepts; partial-write
	// recovery is the orchestrator's surface, not this function's).
	writeSiblingProvenance(input.parentItemId, provenancePayload)

	return { insertedIds }
}

export type {
	IngestSiblingSetInput,
	IngestSiblingSetResult,
	ResolvedSiblingInput
}
export { ingestSiblingSet, validateAndResolveSiblings }
