// scripts/dev/smoke/sibling-generator-smoke.ts
//
// Manual smoke for plan §9 commit 4 gate. Calls generateSiblingSet against
// one real source item from numerical.fractions and writes the per-source
// provenance JSON via writeSiblingProvenance.
//
// Source picked at audit time:
//   id            019dfd8d-3cf5-7d78-b668-7f75e2a7fd11
//   sub-type      numerical.fractions
//   difficulty    medium
//   text          Ruby has 3 pairs of shoes ... what are the chances both
//                 items will be in the same color?
//   options       qg5yg1gt=1/3 (correct), wasj2a46=2/5, y9tr2wtf=1/5,
//                 5xrajsq8=4/5, fb7rsax1=1/6
//   structured    2 parts (recognition + elimination)
//
// Hardcoded inline so the smoke runs without a DB connection.
//
// Usage: bun run scripts/dev/smoke/sibling-generator-smoke.ts
//
// Pre-conditions:
//   - ANTHROPIC_API_KEY in .env.
//   - Network reachable.

import "@/env"
import * as crypto from "node:crypto"
import * as errors from "@superbuilders/errors"
import { logger } from "@/logger"
import {
	generateSiblingSet,
	SIBLING_GEN_MODEL,
	type SourceItem
} from "@/server/generation/sibling-generator"
import {
	type SiblingProvenancePayload,
	writeSiblingProvenance
} from "@/server/generation/sibling-provenance"

const SMOKE_SOURCE: SourceItem = {
	id: "019dfd8d-3cf5-7d78-b668-7f75e2a7fd11",
	subTypeId: "numerical.fractions",
	difficulty: "medium",
	body: {
		kind: "text",
		text: "Ruby has 3 pairs of shoes -black, silver, white – and two pairs of trousers – black and white. if she chooses one pair of shoes and one pair of trousers arbitrarily, what are the chances that both items will be in the same color?"
	},
	options: [
		{ id: "qg5yg1gt", text: "1/3" },
		{ id: "wasj2a46", text: "2/5" },
		{ id: "y9tr2wtf", text: "1/5" },
		{ id: "5xrajsq8", text: "4/5" },
		{ id: "fb7rsax1", text: "1/6" }
	],
	correctAnswer: "qg5yg1gt",
	explanation:
		"Combinatorial probability problem with two independent selections; the fast move is to count only the matching-color outcomes (black-black and white-white) out of all possible shoe-trouser pairs — total pairs = 3 × 2 = 6, matching pairs = 2. Convert all options to sixths: '2/5' = 2.4/6, '1/5' = 1.2/6, '4/5' = 4.8/6, '1/6' = 1/6 — none equal 2/6, so cut all four; only '1/3' = 2/6 matches the two matching outcomes out of six total.",
	// Vector-similar-context sub-round commit 1: SourceItem.neighbors is
	// required at the type level. This dev smoke runs without a DB
	// connection so empty array is the correct value here (the workflow
	// runtime is the authoritative populator via loadNearestNeighborsStep).
	neighbors: []
}

async function main(): Promise<void> {
	logger.info(
		{
			sourceItemId: SMOKE_SOURCE.id,
			subTypeId: SMOKE_SOURCE.subTypeId,
			difficulty: SMOKE_SOURCE.difficulty
		},
		"sibling-generator-smoke: starting"
	)

	const result = await generateSiblingSet(SMOKE_SOURCE)

	const promptHash = `sha256:${crypto
		.createHash("sha256")
		.update(`${SMOKE_SOURCE.subTypeId}|v1`)
		.digest("hex")}`

	const sourceSnapshotBase = {
		id: SMOKE_SOURCE.id,
		subTypeId: SMOKE_SOURCE.subTypeId,
		difficulty: SMOKE_SOURCE.difficulty,
		body: SMOKE_SOURCE.body,
		options: SMOKE_SOURCE.options,
		correctAnswer: SMOKE_SOURCE.correctAnswer
	}

	const sourceSnapshot = SMOKE_SOURCE.explanation === undefined
		? sourceSnapshotBase
		: { ...sourceSnapshotBase, explanation: SMOKE_SOURCE.explanation }

	const payload: SiblingProvenancePayload = {
		parentItemId: SMOKE_SOURCE.id,
		generatedAt: new Date().toISOString(),
		generatorModel: SIBLING_GEN_MODEL,
		templateVersion: 1,
		promptHash,
		source: sourceSnapshot,
		llmOutputVerbatim: result.siblingSet,
		usage: {
			model: result.usage.model,
			input_tokens: result.usage.input_tokens,
			output_tokens: result.usage.output_tokens,
			cache_read_input_tokens: result.usage.cache_read_input_tokens,
			cache_creation_input_tokens: result.usage.cache_creation_input_tokens,
			cost_estimate_usd: result.costEstimateUsd,
			duration_ms: result.durationMs
		}
	}

	writeSiblingProvenance(SMOKE_SOURCE.id, payload)

	logger.info(
		{
			sourceItemId: SMOKE_SOURCE.id,
			input_tokens: result.usage.input_tokens,
			output_tokens: result.usage.output_tokens,
			cache_read_input_tokens: result.usage.cache_read_input_tokens,
			cache_creation_input_tokens: result.usage.cache_creation_input_tokens,
			cost_estimate_usd: result.costEstimateUsd,
			durationMs: result.durationMs,
			tiers: Object.keys(result.siblingSet.siblings)
		},
		"sibling-generator-smoke: completed"
	)
}

const result = await errors.try(main())
if (result.error) {
	logger.error({ error: result.error }, "sibling-generator-smoke: failed")
	process.exit(1)
}
