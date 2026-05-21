import "@/env"
import * as errors from "@superbuilders/errors"
import { sql } from "drizzle-orm"
import { type SubTypeId, subTypeIds } from "@/config/sub-types"
import { db } from "@/db"
import { items } from "@/db/schemas/catalog/items"
import { logger } from "@/logger"
import { type IngestRealItemInput, ingestRealItem } from "@/server/items/ingest"
import { seedDataBySubType } from "@/db/seeds/items/data"
import type { SeedItemInput } from "@/db/seeds/items/types"
import { assignOptionIds } from "@/server/items/option-id"

interface SkippedRow {
	subTypeId: SubTypeId
	reason: "exists"
}

interface InsertedRow {
	subTypeId: SubTypeId
	itemId: string
}

async function existsByBodyText(text: string): Promise<boolean> {
	const rows = await db
		.select({ id: items.id })
		.from(items)
		.where(sql`${items.body}->>'text' = ${text}`)
		.limit(1)
	return rows.length > 0
}

function toIngestInput(seed: SeedItemInput): IngestRealItemInput {
	const optionsWithIds = assignOptionIds(seed.options)
	const correctOption = optionsWithIds[seed.correctAnswerIndex]
	if (!correctOption) {
		logger.error(
			{
				subTypeId: seed.subTypeId,
				correctAnswerIndex: seed.correctAnswerIndex,
				optionCount: optionsWithIds.length
			},
			"seed: correctAnswerIndex out of range"
		)
		throw errors.new("seed: correctAnswerIndex out of range")
	}
	return {
		subTypeId: seed.subTypeId,
		difficulty: seed.difficulty,
		body: seed.body,
		options: optionsWithIds,
		correctAnswer: correctOption.id,
		explanation: seed.explanation,
		strategyId: seed.strategyId
	}
}

async function ingestOne(seed: SeedItemInput): Promise<InsertedRow | SkippedRow> {
	if (seed.body.kind !== "text") {
		// v1 has only the 'text' body variant; this guard exists so adding a
		// future variant forces an update here rather than silently skipping.
		logger.error({ subTypeId: seed.subTypeId }, "seed: non-text body variants not supported")
		throw errors.new("seed: only text body variant supported in v1")
	}
	const exists = await existsByBodyText(seed.body.text)
	if (exists) {
		return { subTypeId: seed.subTypeId, reason: "exists" }
	}
	const input = toIngestInput(seed)
	// Skip the embedding-backfill workflow trigger: the seed runs as a raw
	// Bun process outside Next.js context, so start(workflow, ...) would throw
	// start-invalid-workflow-function. Items land with embedding=NULL here;
	// run scripts/backfill-missing-embeddings.ts after seeding to populate.
	const result = await errors.try(ingestRealItem(input, { triggerEmbeddingBackfill: false }))
	if (result.error) {
		logger.error(
			{ error: result.error, subTypeId: seed.subTypeId },
			"seed: ingestRealItem failed"
		)
		throw errors.wrap(result.error, "seed ingestRealItem")
	}
	return { subTypeId: seed.subTypeId, itemId: result.data.itemId }
}

async function main(): Promise<void> {
	const summary: Record<string, { inserted: number; skipped: number }> = {}
	for (const subTypeId of subTypeIds) {
		summary[subTypeId] = { inserted: 0, skipped: 0 }
	}

	for (const subTypeId of subTypeIds) {
		const dataset = seedDataBySubType[subTypeId]
		if (!dataset) {
			logger.error({ subTypeId }, "seed: missing dataset")
			throw errors.new(`seed: missing dataset for ${subTypeId}`)
		}
		logger.info({ subTypeId, count: dataset.length }, "seed: ingesting sub-type")
		for (const input of dataset) {
			const result = await ingestOne(input)
			const cell = summary[subTypeId]
			if (!cell) {
				logger.error({ subTypeId }, "seed: summary cell missing (impossible)")
				throw errors.new("seed: summary cell missing")
			}
			if ("itemId" in result) {
				cell.inserted += 1
				logger.info(
					{ subTypeId, itemId: result.itemId },
					"seed: inserted real item"
				)
			} else {
				cell.skipped += 1
			}
		}
	}

	logger.info({ summary }, "seed: per-sub-type summary")
	logger.info(
		"seed: items inserted with embedding=NULL — run scripts/backfill-missing-embeddings.ts to populate"
	)
}

const result = await errors.try(main())
if (result.error) {
	logger.error({ error: result.error }, "seed: failed")
	process.exit(1)
}
process.exit(0)
