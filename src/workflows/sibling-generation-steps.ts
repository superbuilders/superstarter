// Step bodies for siblingGenerationWorkflow.
//
// Lives separately from the workflow file (`./sibling-generation`)
// because the `@workflow/next` plugin's node-module guard rejects any
// reachable Node.js dependency (pino via `@/logger`) on a workflow
// file's import graph. Step files run outside the workflow VM, so
// they're allowed Node.js modules. All `logger.*` calls and the
// `errors.new()` sentinels live here; the workflow file imports only
// the step functions and contains no pino-reachable edges.
//
// The 5 steps mirror plan §7.3:
//   1. loadSourceItemStep      — DB read; produces SourceItem snapshot
//   2. generateSiblingSetStep  — Anthropic call; bundles llmContext
//   3. assignIdsAndValidateStep — pure post-processing
//   4. embedSiblingStep        — 4× embedText (Promise.all)
//   5. writeSiblingSetStep     — idempotency guard + ingestSiblingSet

import * as errors from "@superbuilders/errors"
import { and, asc, eq, sql } from "drizzle-orm"
import * as crypto from "node:crypto"
import { type Difficulty, subTypeIds, type SubTypeId } from "@/config/sub-types"
import { db } from "@/db"
import { items } from "@/db/schemas/catalog/items"
import { logger } from "@/logger"
import { embedText } from "@/server/generation/embeddings"
import {
	generateSiblingSet,
	SIBLING_GEN_MODEL,
	type SourceItem
} from "@/server/generation/sibling-generator"
import type {
	SiblingProvenanceSourceSnapshot,
	SiblingProvenanceUsage
} from "@/server/generation/sibling-provenance"
import type { SubmitSiblingSetOutput } from "@/server/generation/sibling-schema"
import { itemBody } from "@/server/items/body-schema"
import {
	type IngestSiblingSetResult,
	ingestSiblingSet,
	type ResolvedSiblingInput,
	validateAndResolveSiblings
} from "@/server/items/ingest-siblings"

const TEMPLATE_VERSION = 1
const TIER_ORDER: Difficulty[] = ["easy", "medium", "hard", "brutal"]

const ErrSourceItemNotFound = errors.new("sibling-generation: source item not found")
const ErrInvalidSourceBody = errors.new("sibling-generation: source body failed schema")
const ErrInvalidSourceSubType = errors.new("sibling-generation: source sub_type_id not in v1 union")
const ErrInvalidSourceOptions = errors.new("sibling-generation: source options_json malformed")
const ErrPartialSiblingSet = errors.new("sibling-generation: partial sibling set already on disk")

const subTypeIdSet: ReadonlySet<string> = new Set<string>(subTypeIds)

function asSubTypeId(s: string): SubTypeId {
	if (!subTypeIdSet.has(s)) {
		logger.error({ subTypeId: s }, "sibling-generation: unknown sub_type_id")
		throw errors.wrap(ErrInvalidSourceSubType, `value '${s}'`)
	}
	const matched = subTypeIds.find(function eqs(known) {
		return known === s
	})
	if (!matched) {
		logger.error(
			{ subTypeId: s },
			"sibling-generation: post-guard sub-type-id miss (impossible)"
		)
		throw errors.wrap(ErrInvalidSourceSubType, `post-guard miss for '${s}'`)
	}
	return matched
}

interface LoadedSource {
	source: SiblingProvenanceSourceSnapshot
	strategyId: string | undefined
}

async function loadSourceItemStep(itemId: string): Promise<LoadedSource> {
	"use step"
	const result = await errors.try(
		db
			.select({
				id: items.id,
				subTypeId: items.subTypeId,
				difficulty: items.difficulty,
				body: items.body,
				optionsJson: items.optionsJson,
				correctAnswer: items.correctAnswer,
				explanation: items.explanation,
				strategyId: items.strategyId,
				metadataJson: items.metadataJson
			})
			.from(items)
			.where(eq(items.id, itemId))
			.limit(1)
	)
	if (result.error) {
		logger.error(
			{ error: result.error, itemId },
			"sibling-generation: loadSourceItemStep query failed"
		)
		throw errors.wrap(result.error, "loadSourceItemStep query")
	}
	const row = result.data[0]
	if (!row) {
		logger.warn({ itemId }, "sibling-generation: source item not found")
		throw errors.wrap(ErrSourceItemNotFound, `item id '${itemId}'`)
	}

	const bodyParsed = itemBody.safeParse(row.body)
	if (!bodyParsed.success) {
		logger.error(
			{ itemId, issues: bodyParsed.error.issues },
			"sibling-generation: source body failed itemBody schema"
		)
		throw errors.wrap(ErrInvalidSourceBody, `item id '${itemId}'`)
	}

	const optionsParsed = parseSourceOptions(row.optionsJson, itemId)
	const subTypeId = asSubTypeId(row.subTypeId)
	const explanation = row.explanation === null ? undefined : row.explanation
	const strategyId = row.strategyId === null ? undefined : row.strategyId
	const source: SiblingProvenanceSourceSnapshot = {
		id: row.id,
		subTypeId,
		difficulty: row.difficulty,
		body: bodyParsed.data,
		options: optionsParsed,
		correctAnswer: row.correctAnswer,
		explanation
	}

	logger.info(
		{ itemId, subTypeId, difficulty: row.difficulty },
		"sibling-generation: loaded source item"
	)
	return { source, strategyId }
}

function parseSourceOptions(
	raw: unknown,
	itemId: string
): { id: string; text: string }[] {
	if (!Array.isArray(raw)) {
		logger.error(
			{ itemId, optionsType: typeof raw },
			"sibling-generation: options_json not an array"
		)
		throw errors.wrap(ErrInvalidSourceOptions, `item id '${itemId}'`)
	}
	const out: { id: string; text: string }[] = []
	for (const o of raw) {
		if (
			typeof o !== "object" ||
			o === null ||
			!("id" in o) ||
			!("text" in o) ||
			typeof o.id !== "string" ||
			typeof o.text !== "string"
		) {
			logger.error({ itemId, option: o }, "sibling-generation: option entry malformed")
			throw errors.wrap(ErrInvalidSourceOptions, `item id '${itemId}'`)
		}
		out.push({ id: o.id, text: o.text })
	}
	return out
}

interface GenerationResult {
	siblingSet: SubmitSiblingSetOutput
	llmContext: {
		llmOutputVerbatim: SubmitSiblingSetOutput
		model: string
		promptHash: string
		generatedAt: string
		templateVersion: number
		usage: SiblingProvenanceUsage
	}
}

async function generateSiblingSetStep(source: SourceItem): Promise<GenerationResult> {
	"use step"
	const generatedAt = new Date().toISOString()
	const promptHash = `sha256:${crypto
		.createHash("sha256")
		.update(`${source.subTypeId}|v${TEMPLATE_VERSION}`)
		.digest("hex")}`

	const result = await generateSiblingSet(source)

	const usage: SiblingProvenanceUsage = {
		model: result.usage.model,
		input_tokens: result.usage.input_tokens,
		output_tokens: result.usage.output_tokens,
		cache_read_input_tokens: result.usage.cache_read_input_tokens,
		cache_creation_input_tokens: result.usage.cache_creation_input_tokens,
		cost_estimate_usd: result.costEstimateUsd,
		duration_ms: result.durationMs
	}

	logger.info(
		{
			sourceItemId: source.id,
			tiers: Object.keys(result.siblingSet.siblings),
			cost_estimate_usd: result.costEstimateUsd
		},
		"sibling-generation: generateSiblingSetStep produced sibling set"
	)

	return {
		siblingSet: result.siblingSet,
		llmContext: {
			llmOutputVerbatim: result.siblingSet,
			model: result.usage.model,
			promptHash,
			generatedAt,
			templateVersion: TEMPLATE_VERSION,
			usage
		}
	}
}

async function assignIdsAndValidateStep(
	siblings: SubmitSiblingSetOutput["siblings"]
): Promise<ResolvedSiblingInput[]> {
	"use step"
	return validateAndResolveSiblings(siblings)
}

async function embedSiblingStep(
	resolvedSiblings: ResolvedSiblingInput[]
): Promise<number[][]> {
	"use step"
	const texts = resolvedSiblings.map((r) => r.body.text)
	const embedResult = await errors.try(Promise.all(texts.map((t) => embedText(t))))
	if (embedResult.error) {
		logger.error(
			{ error: embedResult.error, count: texts.length },
			"sibling-generation: embedSiblingStep embedText failure"
		)
		throw errors.wrap(embedResult.error, "embedSiblingStep embedText")
	}
	logger.info(
		{ count: embedResult.data.length, dims: embedResult.data[0]?.length },
		"sibling-generation: embedSiblingStep produced embeddings"
	)
	return embedResult.data
}

interface WriteSiblingSetInput {
	parentItemId: string
	subTypeId: SubTypeId
	strategyId: string | undefined
	resolvedSiblings: ResolvedSiblingInput[]
	embeddings: number[][]
	sourceSnapshot: SiblingProvenanceSourceSnapshot
	llmContext: GenerationResult["llmContext"]
}

async function writeSiblingSetStep(
	input: WriteSiblingSetInput
): Promise<IngestSiblingSetResult> {
	"use step"
	const existingIds = await loadExistingSiblingIds(input.parentItemId)
	if (existingIds.length === TIER_ORDER.length) {
		logger.info(
			{ parentItemId: input.parentItemId, insertedIds: existingIds },
			"sibling-generation: writeSiblingSetStep idempotent — 4 siblings already on disk"
		)
		return { insertedIds: existingIds }
	}
	if (existingIds.length > 0) {
		logger.error(
			{ parentItemId: input.parentItemId, existingCount: existingIds.length },
			"sibling-generation: writeSiblingSetStep partial sibling set on disk; refusing to add more"
		)
		throw errors.wrap(
			ErrPartialSiblingSet,
			`parent '${input.parentItemId}' has ${existingIds.length}/${TIER_ORDER.length} siblings`
		)
	}

	const result = await ingestSiblingSet({
		parentItemId: input.parentItemId,
		subTypeId: input.subTypeId,
		strategyId: input.strategyId,
		resolvedSiblings: input.resolvedSiblings,
		embeddings: input.embeddings,
		sourceSnapshot: input.sourceSnapshot,
		llmContext: input.llmContext
	})
	return result
}

async function loadExistingSiblingIds(parentItemId: string): Promise<string[]> {
	const result = await errors.try(
		db
			.select({ id: items.id, difficulty: items.difficulty })
			.from(items)
			.where(
				and(
					sql`${items.metadataJson}->>'parentItemId' = ${parentItemId}`,
					eq(items.source, "generated")
				)
			)
			.orderBy(asc(items.difficulty))
	)
	if (result.error) {
		logger.error(
			{ error: result.error, parentItemId },
			"sibling-generation: loadExistingSiblingIds query failed"
		)
		throw errors.wrap(result.error, "loadExistingSiblingIds query")
	}
	return result.data.map((r) => r.id)
}

export type { GenerationResult, LoadedSource, WriteSiblingSetInput }
export {
	assignIdsAndValidateStep,
	embedSiblingStep,
	generateSiblingSetStep,
	loadSourceItemStep,
	SIBLING_GEN_MODEL,
	writeSiblingSetStep
}
