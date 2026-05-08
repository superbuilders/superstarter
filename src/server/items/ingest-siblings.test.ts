// DB-driven tests for Phase 4 sub-phase a's ingestSiblingSet seam — plan
// §9 commit 5 gate. Three tests:
//
//   1. Happy path — synthetic 4-sibling fixture → ingestSiblingSet
//      succeeds → 4 rows in DB with status='candidate', source='generated',
//      metadata_json.parentItemId set, embedding populated, all 4
//      difficulty tiers present. 1 provenance JSON file at
//      scripts/_siblings/<parentItemId>.json.
//
//   2. Duplicate-option-text rejection — fixture has two options with
//      identical text in the easy tier → validateAndResolveSiblings
//      throws → no DB writes, no JSON file.
//
//   3. referencedOptionTexts mismatch — fixture has a structured-
//      explanation part referencing a text not in options →
//      validateAndResolveSiblings throws → no DB writes, no JSON file.
//
// Tests assume the local docker postgres is up + seeded
// (`numerical.fractions` is one of the v1 sub-types). Each test uses a
// fresh per-test parentItemId so cleanup queries are exact-match. JSON
// files at scripts/_siblings/<parentItemId>.json are unlinked
// post-test.

import "@/env"
import { afterEach, expect, test } from "bun:test"
import * as errors from "@superbuilders/errors"
import { sql } from "drizzle-orm"
import * as fs from "node:fs"
import * as crypto from "node:crypto"
import { createAdminDb } from "@/db/admin"
import { items } from "@/db/schemas/catalog/items"
import { logger } from "@/logger"
import {
	ingestSiblingSet,
	validateAndResolveSiblings
} from "@/server/items/ingest-siblings"
import {
	provenancePathFor,
	type SiblingProvenanceUsage
} from "@/server/generation/sibling-provenance"
import type { SubmitSiblingSetOutput } from "@/server/generation/sibling-schema"

const ErrUnreachable = errors.new("ingest-siblings-test: unreachable code reached")

const cleanupParentIds = new Set<string>()

afterEach(async () => {
	for (const parentItemId of cleanupParentIds) {
		const provPath = provenancePathFor(parentItemId)
		if (fs.existsSync(provPath)) {
			fs.unlinkSync(provPath)
		}
		await using adminDb = await createAdminDb()
		const delResult = await errors.try(
			adminDb.db
				.delete(items)
				.where(sql`${items.metadataJson}->>'parentItemId' = ${parentItemId}`)
		)
		if (delResult.error) {
			logger.error(
				{ error: delResult.error, parentItemId },
				"ingest-siblings-test: cleanup delete failed"
			)
		}
	}
	cleanupParentIds.clear()
})

function syntheticEmbedding(seed: number): number[] {
	const arr = new Array<number>(1536)
	for (let i = 0; i < 1536; i++) {
		arr[i] = ((seed + i) % 200) / 1000
	}
	return arr
}

function buildTier(
	label: string,
	correctText: string,
	refText: string
): SubmitSiblingSetOutput["siblings"]["easy"] {
	return {
		body: { kind: "text", text: `Sample ${label} fractions question.` },
		options: [
			{ text: `${label}-A` },
			{ text: `${label}-B` },
			{ text: `${label}-C` },
			{ text: correctText }
		],
		correctAnswerText: correctText,
		structuredExplanation: {
			parts: [
				{
					kind: "recognition",
					text: `Recognition for ${label}.`,
					referencedOptionTexts: []
				},
				{
					kind: "elimination",
					text: `Elimination for ${label} cuts ${refText}.`,
					referencedOptionTexts: [refText]
				}
			]
		}
	}
}

function freshLlmFixture(): SubmitSiblingSetOutput {
	const fixture: SubmitSiblingSetOutput = {
		siblings: {
			easy: buildTier("easy", "easy-correct", "easy-A"),
			medium: buildTier("medium", "medium-correct", "medium-A"),
			hard: buildTier("hard", "hard-correct", "hard-A"),
			brutal: buildTier("brutal", "brutal-correct", "brutal-A")
		}
	}
	return fixture
}

const SOURCE_SNAPSHOT_OPTIONS = [
	{ id: "aaaaaaaa", text: "src-A" },
	{ id: "bbbbbbbb", text: "src-B" },
	{ id: "cccccccc", text: "src-C" },
	{ id: "dddddddd", text: "src-D" }
]

const USAGE_FIXTURE: SiblingProvenanceUsage = {
	model: "claude-sonnet-4-6",
	input_tokens: 100,
	output_tokens: 100,
	cache_read_input_tokens: 0,
	cache_creation_input_tokens: 0,
	cost_estimate_usd: 0.001,
	duration_ms: 1000
}

test("ingestSiblingSet: happy path writes 4 rows + 1 provenance JSON", async () => {
	const parentItemId = crypto.randomUUID()
	cleanupParentIds.add(parentItemId)

	const llmFixture = freshLlmFixture()
	const resolved = validateAndResolveSiblings(llmFixture.siblings)
	expect(resolved).toHaveLength(4)
	expect(resolved.map((r) => r.tier)).toEqual(["easy", "medium", "hard", "brutal"])

	const embeddings = [
		syntheticEmbedding(1),
		syntheticEmbedding(2),
		syntheticEmbedding(3),
		syntheticEmbedding(4)
	]

	const result = await ingestSiblingSet({
		parentItemId,
		subTypeId: "numerical.fractions",
		resolvedSiblings: resolved,
		embeddings,
		sourceSnapshot: {
			id: parentItemId,
			subTypeId: "numerical.fractions",
			difficulty: "medium",
			body: { kind: "text", text: "Source body for ingest-siblings test." },
			options: SOURCE_SNAPSHOT_OPTIONS,
			correctAnswer: "aaaaaaaa"
		},
		llmContext: {
			llmOutputVerbatim: llmFixture,
			model: "claude-sonnet-4-6",
			promptHash: "sha256:test",
			generatedAt: new Date().toISOString(),
			templateVersion: 1,
			usage: USAGE_FIXTURE
		}
	})

	expect(result.insertedIds).toHaveLength(4)

	const provPath = provenancePathFor(parentItemId)
	expect(fs.existsSync(provPath)).toBe(true)
	const raw = fs.readFileSync(provPath, "utf8")
	expect(raw.endsWith("\n")).toBe(true)
	const parsed = JSON.parse(raw)
	expect(parsed.parentItemId).toBe(parentItemId)
	expect(parsed.siblings).toHaveLength(4)

	await using adminDb = await createAdminDb()
	const rowsResult = await errors.try(
		adminDb.db
			.select({
				id: items.id,
				difficulty: items.difficulty,
				status: items.status,
				source: items.source,
				subTypeId: items.subTypeId,
				metadataJson: items.metadataJson,
				embedding: items.embedding
			})
			.from(items)
			.where(sql`${items.metadataJson}->>'parentItemId' = ${parentItemId}`)
	)
	if (rowsResult.error) {
		logger.error(
			{ error: rowsResult.error, parentItemId },
			"ingest-siblings-test: SELECT failed"
		)
		throw errors.wrap(rowsResult.error, "test SELECT")
	}
	const rows = rowsResult.data
	expect(rows).toHaveLength(4)
	const difficulties = new Set(rows.map((r) => r.difficulty))
	expect(difficulties).toEqual(new Set(["easy", "medium", "hard", "brutal"]))
	for (const row of rows) {
		expect(row.status).toBe("candidate")
		expect(row.source).toBe("generated")
		expect(row.subTypeId).toBe("numerical.fractions")
		expect(row.embedding).not.toBeNull()
		expect(row.embedding?.length).toBe(1536)
	}
})

test("validateAndResolveSiblings: rejects sibling with duplicate option text", () => {
	const broken = freshLlmFixture()
	broken.siblings.easy.options = [
		{ text: "dup" },
		{ text: "dup" },
		{ text: "easy-C" },
		{ text: "easy-correct" }
	]

	const wrapped = errors.trySync(() => validateAndResolveSiblings(broken.siblings))
	expect(wrapped.error).toBeDefined()
	if (wrapped.error === undefined) {
		// rules/require-logger-before-throw — log before throw
		logger.error({}, "ingest-siblings-test: duplicate-text rejection did not throw")
		throw ErrUnreachable
	}
	expect(wrapped.error.message).toContain("duplicate option text")
})

test("validateAndResolveSiblings: rejects sibling with referencedOptionText mismatch", () => {
	const broken = freshLlmFixture()
	broken.siblings.medium.structuredExplanation.parts[1] = {
		kind: "elimination",
		text: "References a text not in options.",
		referencedOptionTexts: ["NOT-A-VALID-OPTION-TEXT"]
	}

	const wrapped = errors.trySync(() => validateAndResolveSiblings(broken.siblings))
	expect(wrapped.error).toBeDefined()
	if (wrapped.error === undefined) {
		logger.error({}, "ingest-siblings-test: ref-mismatch rejection did not throw")
		throw ErrUnreachable
	}
	expect(wrapped.error.message).toContain("referencedOptionText")
})
