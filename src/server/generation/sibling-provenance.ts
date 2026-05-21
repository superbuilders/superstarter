// Provenance writer for Phase 4 sub-phase a's similar-item generator.
//
// Per plan §4.12 / §7.2 step 9 / §7.3: every successful sibling-set
// generation writes a per-source JSON file at
// `scripts/_siblings/<parentItemId>.json` carrying the full audit trail
// (source snapshot, generator config, per-sibling LLM-output verbatim,
// per-sibling post-processing decisions, per-sibling embedding hash,
// inserted item ids, cost telemetry, generatedAt ISO timestamp). Mirrors
// the `scripts/_stage1/<source_folder>/<source_filename>.json` pattern
// from `scripts/import-questions.ts` — same formatter (2-space indent,
// trailing newline), same synchronous writer, same auto-create-dir
// behavior.
//
// `writeSiblingComparisonMd` renders the human-review markdown surface
// commit 7's test-run consumes (per New Ask 1 from b19042a). It lands
// here so commit 7 is a script-only change.
//
// EXEMPT FROM no-try only at the fs-write boundary; the project ruleset
// applies to the rest of the file. errors.try / errors.trySync wraps fs
// calls per `rules/error-handling.md`.

import * as errors from "@superbuilders/errors"
import * as fs from "node:fs"
import * as path from "node:path"
import { logger } from "@/logger"
import type { SubTypeId } from "@/config/sub-types"
import type { SubmitSiblingSetOutput } from "@/server/generation/sibling-schema"

const SIBLINGS_DIR = "scripts/_siblings"
const COMPARISON_MD_DEFAULT_PATH = "scripts/_logs/sibling-test-run-comparison.md"

interface SiblingProvenanceUsage {
	model: string
	input_tokens: number
	output_tokens: number
	cache_read_input_tokens: number
	cache_creation_input_tokens: number
	cost_estimate_usd: number
	duration_ms: number
}

interface SiblingProvenanceSourceSnapshot {
	id: string
	subTypeId: SubTypeId
	difficulty: "easy" | "medium" | "hard" | "brutal"
	body: { kind: "text"; text: string }
	options: { id: string; text: string }[]
	correctAnswer: string
	explanation?: string
	originalExplanation?: string
}

interface SiblingProvenancePerSibling {
	tier: "easy" | "medium" | "hard" | "brutal"
	insertedItemId: string
	body: { kind: "text"; text: string }
	options: { id: string; text: string }[]
	correctAnswer: string
	resolvedReferencedOptions: { partKind: string; optionIds: string[] }[]
	embeddingDimensions: number
	embeddingSampleHead: number[]
}

interface SiblingProvenancePayload {
	parentItemId: string
	generatedAt: string
	generatorModel: string
	templateVersion: number
	promptHash: string
	source: SiblingProvenanceSourceSnapshot
	llmOutputVerbatim: SubmitSiblingSetOutput
	// Per-sibling post-processing decisions are populated by commit 5's
	// `ingest-siblings.ts` after id-assignment + correctAnswer resolution +
	// referencedOptionTexts → ids resolution + embedding compute + DB
	// transaction. Commit 4's smoke (LLM-call only) writes the payload
	// without this field; the field is forward-compatible with commit 5
	// which always populates it.
	siblings?: SiblingProvenancePerSibling[]
	usage: SiblingProvenanceUsage
}

function provenancePathFor(parentItemId: string): string {
	return path.join(SIBLINGS_DIR, `${parentItemId}.json`)
}

function writeSiblingProvenance(parentItemId: string, payload: SiblingProvenancePayload): void {
	const target = provenancePathFor(parentItemId)
	const dir = path.dirname(target)
	if (!fs.existsSync(dir)) {
		const mkdirResult = errors.trySync(() => fs.mkdirSync(dir, { recursive: true }))
		if (mkdirResult.error) {
			logger.error(
				{ error: mkdirResult.error, dir },
				"sibling-provenance: mkdirSync failed"
			)
			throw errors.wrap(mkdirResult.error, "sibling-provenance mkdirSync")
		}
	}
	const body = `${JSON.stringify(payload, null, 2)}\n`
	const writeResult = errors.trySync(() => fs.writeFileSync(target, body))
	if (writeResult.error) {
		logger.error(
			{ error: writeResult.error, target },
			"sibling-provenance: writeFileSync failed"
		)
		throw errors.wrap(writeResult.error, "sibling-provenance writeFileSync")
	}
	logger.info({ parentItemId, target }, "sibling-provenance: wrote per-source provenance JSON")
}

interface SiblingComparisonRow {
	subTypeId: SubTypeId
	source: SiblingProvenanceSourceSnapshot
	siblings: SiblingProvenancePerSibling[]
}

function renderSourceBlock(source: SiblingProvenanceSourceSnapshot): string[] {
	const explanationLine = source.explanation === undefined
		? "_(no source explanation)_"
		: source.explanation
	const optionsBlock = source.options
		.map((o) => `  - \`${o.id}\` — ${o.text}`)
		.join("\n")
	return [
		`**Source** (id \`${source.id}\`, difficulty \`${source.difficulty}\`):`,
		"",
		`> ${source.body.text}`,
		"",
		"Options:",
		optionsBlock,
		"",
		`Correct answer (id): \`${source.correctAnswer}\``,
		"",
		"Explanation:",
		"",
		explanationLine,
		""
	]
}

function renderSiblingBlock(sibling: SiblingProvenancePerSibling): string[] {
	const optionsBlock = sibling.options
		.map((o) => `  - \`${o.id}\` — ${o.text}`)
		.join("\n")
	return [
		`**Sibling — ${sibling.tier}** (insertedItemId \`${sibling.insertedItemId}\`):`,
		"",
		`> ${sibling.body.text}`,
		"",
		"Options:",
		optionsBlock,
		"",
		`Correct answer (id): \`${sibling.correctAnswer}\``,
		""
	]
}

function renderRowSection(row: SiblingComparisonRow): string[] {
	const lines: string[] = []
	lines.push(...renderSourceBlock(row.source))
	for (const sibling of row.siblings) {
		lines.push(...renderSiblingBlock(sibling))
	}
	lines.push("---", "")
	return lines
}

function groupBySubType(rows: SiblingComparisonRow[]): Map<SubTypeId, SiblingComparisonRow[]> {
	const grouped = new Map<SubTypeId, SiblingComparisonRow[]>()
	for (const row of rows) {
		const existing = grouped.get(row.subTypeId)
		if (existing) {
			existing.push(row)
			continue
		}
		grouped.set(row.subTypeId, [row])
	}
	return grouped
}

function writeSiblingComparisonMd(
	rows: SiblingComparisonRow[],
	outputPath: string = COMPARISON_MD_DEFAULT_PATH
): void {
	const lines: string[] = ["# Sibling test-run comparison", ""]
	if (rows.length === 0) {
		lines.push("_(no rows — empty test run.)_", "")
	} else {
		const grouped = groupBySubType(rows)
		for (const [subTypeId, subRows] of grouped) {
			lines.push(`## ${subTypeId}`, "")
			for (const row of subRows) {
				lines.push(...renderRowSection(row))
			}
		}
	}
	const dir = path.dirname(outputPath)
	if (!fs.existsSync(dir)) {
		const mkdirResult = errors.trySync(() => fs.mkdirSync(dir, { recursive: true }))
		if (mkdirResult.error) {
			logger.error(
				{ error: mkdirResult.error, dir },
				"sibling-provenance: comparison-md mkdirSync failed"
			)
			throw errors.wrap(mkdirResult.error, "sibling-provenance comparison-md mkdirSync")
		}
	}
	const body = `${lines.join("\n")}\n`
	const writeResult = errors.trySync(() => fs.writeFileSync(outputPath, body))
	if (writeResult.error) {
		logger.error(
			{ error: writeResult.error, outputPath },
			"sibling-provenance: comparison-md writeFileSync failed"
		)
		throw errors.wrap(writeResult.error, "sibling-provenance comparison-md writeFileSync")
	}
	logger.info(
		{ outputPath, rowCount: rows.length },
		"sibling-provenance: wrote test-run comparison markdown"
	)
}

export type {
	SiblingComparisonRow,
	SiblingProvenancePayload,
	SiblingProvenancePerSibling,
	SiblingProvenanceSourceSnapshot,
	SiblingProvenanceUsage
}
export { provenancePathFor, writeSiblingComparisonMd, writeSiblingProvenance }
