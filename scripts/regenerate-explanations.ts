// scripts/regenerate-explanations.ts
//
// Stage 3 of the split OCR pipeline. Reads existing items directly from
// the database via Drizzle, runs the explain pass against current
// options/correctAnswer, validates the output, and UPDATEs items.explanation
// + items.metadata_json.structuredExplanation in a single transaction per
// row.
//
// Stage 3's validation discipline is load-bearing: bypassing the route means
// bypassing the route's request schema, so we re-implement the same
// safeParse + cross-check here. On either failure, log to
// stage3-failures.jsonl and skip the row — never write a malformed
// structure.
//
// EXEMPT FROM THE PROJECT RULESET. Native try/catch, console.log, etc.
//
// Usage:
//   bun run scripts/regenerate-explanations.ts [--dry-run] [--limit N]
//                                               [--sub-type <id>]
//                                               [--since <iso-date>]
//                                               [--source <real|generated>]
//
// See docs/plans/opaque-option-ids-and-pipeline-split.md §4.1 for the design.

import "@/env"
import { and, asc, eq, gte, sql, type SQL } from "drizzle-orm"
import { type SubTypeId, subTypeIds } from "@/config/sub-types"
import { createAdminDb } from "@/db/admin"
import { uuidv7LowerBound } from "@/db/lib/uuid-time"
import { items as itemsTable } from "@/db/schemas/catalog/items"
import { errorToString } from "@scripts/_lib/anthropic"
import {
	renderExplanationProse,
	type StructuredExplanationOutput,
	structuredExplanationOutput,
	writeStructuredExplanation
} from "@scripts/_lib/explain"
import {
	appendJsonl,
	ensureLogsDir,
	nowIso,
	STAGE3_FAILURES_LOG,
	STAGE3_REGENERATED_LOG
} from "@scripts/_lib/logs"

interface CliArgs {
	dryRun: boolean
	limit: number | undefined
	subTypeId: SubTypeId | undefined
	since: Date | undefined
	source: "real" | "generated" | undefined
}

function isSubTypeId(s: string): s is SubTypeId {
	return (subTypeIds as readonly string[]).includes(s)
}

function printUsage(): void {
	console.log(`Usage: bun run scripts/regenerate-explanations.ts [--dry-run] [--limit N] [--sub-type <id>] [--since <iso-date>] [--source <real|generated>]

Stage 3 of the split OCR pipeline: regenerate the structured explanation
(and rendered prose) for already-imported items. Useful when the explain
prompt changes meaningfully and existing explanations become stale.

Flags:
  --dry-run                Run the explain pass and validate but do NOT update the DB.
                           The diff is still logged to stage3-regenerated.jsonl.
  --limit N                Stop after processing N items.
  --sub-type <id>          Only items with this sub-type id (e.g. verbal.synonyms).
  --since <iso-date>       Only items ingested at or after this instant. Uses
                           uuidv7LowerBound against the items.id PK index.
  --source <real|generated>
                           Filter by items.source. 'real' = manually-seeded or OCR-imported;
                           'generated' = Phase 4 LLM output.
  --help, -h               Print this usage message and exit.

Filters AND-combine. Validation discipline:
  - Output is parsed via the same structuredExplanationOutput Zod schema stage 2 uses.
  - Every parts[i].referencedOptions[j] must exist in the row's current options[].id set.
  - On either failure, the row is logged to stage3-failures.jsonl and skipped — the
    row's existing explanation is left untouched.

See docs/plans/opaque-option-ids-and-pipeline-split.md §4.1 for the full design.`)
}

function parseArgs(argv: string[]): CliArgs | { help: true } {
	const args = argv.slice(2)
	if (args.includes("--help") || args.includes("-h")) {
		return { help: true }
	}

	let dryRun = false
	let limit: number | undefined
	let subTypeId: SubTypeId | undefined
	let since: Date | undefined
	let source: "real" | "generated" | undefined

	for (let i = 0; i < args.length; i++) {
		const arg = args[i]
		if (arg === "--dry-run") {
			dryRun = true
		} else if (arg === "--limit") {
			const next = args[i + 1]
			if (!next) {
				console.error("--limit requires a value")
				process.exit(1)
			}
			const parsed = Number.parseInt(next, 10)
			if (!Number.isFinite(parsed) || parsed < 1) {
				console.error(`--limit must be a positive integer, got: ${next}`)
				process.exit(1)
			}
			limit = parsed
			i++
		} else if (arg === "--sub-type") {
			const next = args[i + 1]
			if (!next) {
				console.error("--sub-type requires a value")
				process.exit(1)
			}
			if (!isSubTypeId(next)) {
				console.error(`--sub-type must be one of: ${subTypeIds.join(", ")}`)
				process.exit(1)
			}
			subTypeId = next
			i++
		} else if (arg === "--since") {
			const next = args[i + 1]
			if (!next) {
				console.error("--since requires an ISO-8601 date value")
				process.exit(1)
			}
			const parsed = new Date(next)
			if (Number.isNaN(parsed.getTime())) {
				console.error(`--since: not a valid ISO-8601 date: ${next}`)
				process.exit(1)
			}
			since = parsed
			i++
		} else if (arg === "--source") {
			const next = args[i + 1]
			if (next !== "real" && next !== "generated") {
				console.error("--source must be 'real' or 'generated'")
				process.exit(1)
			}
			source = next
			i++
		} else if (arg?.startsWith("--")) {
			console.error(`unknown flag: ${arg}`)
			process.exit(1)
		} else {
			console.error(`unexpected argument: ${arg}`)
			process.exit(1)
		}
	}

	return { dryRun, limit, subTypeId, since, source }
}

interface ItemRow {
	id: string
	subTypeId: string
	body: unknown
	optionsJson: unknown
	correctAnswer: string
	explanation: string | null
	metadataJson: unknown
}

interface MetadataJson {
	originalExplanation?: string
	importSource?: string
	structuredExplanation?: StructuredExplanationOutput
}

interface OptionShape {
	id: string
	text: string
}

interface BodyText {
	kind: "text"
	text: string
}

function isBodyText(body: unknown): body is BodyText {
	return (
		typeof body === "object" &&
		body !== null &&
		"kind" in body &&
		body.kind === "text" &&
		"text" in body &&
		typeof body.text === "string"
	)
}

function isOptionArray(value: unknown): value is OptionShape[] {
	if (!Array.isArray(value)) return false
	for (const v of value) {
		if (typeof v !== "object" || v === null) return false
		if (typeof v.id !== "string" || typeof v.text !== "string") return false
	}
	return true
}

interface Counters {
	scanned: number
	regenerated: number
	failedZod: number
	failedReferenced: number
	failedExplain: number
	failedShape: number
}

function newCounters(): Counters {
	return {
		scanned: 0,
		regenerated: 0,
		failedZod: 0,
		failedReferenced: 0,
		failedExplain: 0,
		failedShape: 0
	}
}

function pad(value: string | number, width: number): string {
	return String(value).padStart(width, " ")
}

function printSummary(c: Counters): void {
	console.log("")
	console.log("=== Stage 3 summary ===")
	console.log(`Items scanned:               ${pad(c.scanned, 4)}`)
	console.log(`Regenerated:                 ${pad(c.regenerated, 4)}`)
	console.log(`Failed (explain call):       ${pad(c.failedExplain, 4)}`)
	console.log(`Failed (Zod validation):     ${pad(c.failedZod, 4)}`)
	console.log(`Failed (referencedOptions):  ${pad(c.failedReferenced, 4)}`)
	console.log(`Failed (row shape):          ${pad(c.failedShape, 4)}`)
}

async function main(): Promise<void> {
	const parsed = parseArgs(Bun.argv)
	if ("help" in parsed) {
		printUsage()
		return
	}
	const args = parsed

	ensureLogsDir()

	console.log("regenerate-explanations: starting")
	console.log(
		`  flags: dryRun=${args.dryRun} limit=${args.limit ?? "(none)"} subType=${args.subTypeId ?? "(any)"} since=${args.since?.toISOString() ?? "(any)"} source=${args.source ?? "(any)"}`
	)

	await using adminDb = await createAdminDb()
	const db = adminDb.db

	const conditions: SQL[] = []
	if (args.subTypeId) conditions.push(eq(itemsTable.subTypeId, args.subTypeId))
	if (args.source) conditions.push(eq(itemsTable.source, args.source))
	if (args.since) conditions.push(gte(itemsTable.id, uuidv7LowerBound(args.since)))

	let baseQuery = db
		.select({
			id: itemsTable.id,
			subTypeId: itemsTable.subTypeId,
			body: itemsTable.body,
			optionsJson: itemsTable.optionsJson,
			correctAnswer: itemsTable.correctAnswer,
			explanation: itemsTable.explanation,
			metadataJson: itemsTable.metadataJson
		})
		.from(itemsTable)
		.$dynamic()

	if (conditions.length > 0) {
		baseQuery = baseQuery.where(and(...conditions))
	}
	baseQuery = baseQuery.orderBy(asc(itemsTable.id))
	if (args.limit !== undefined) {
		baseQuery = baseQuery.limit(args.limit)
	}

	const rows: ItemRow[] = await baseQuery
	console.log(`  matched ${rows.length} item row(s)`)

	const counters = newCounters()

	for (const row of rows) {
		counters.scanned++
		console.log(`\n--- ${row.id}  subType=${row.subTypeId}`)

		if (!isSubTypeId(row.subTypeId)) {
			counters.failedShape++
			const message = `subTypeId '${row.subTypeId}' not a recognized SubTypeId`
			console.log(`  [skip] ${message}`)
			appendJsonl(STAGE3_FAILURES_LOG, {
				timestamp: nowIso(),
				itemId: row.id,
				error: message,
				stage: "row-shape"
			})
			continue
		}

		if (!isBodyText(row.body)) {
			counters.failedShape++
			const message = "body is not the {kind:'text', text} shape"
			console.log(`  [skip] ${message}`)
			appendJsonl(STAGE3_FAILURES_LOG, {
				timestamp: nowIso(),
				itemId: row.id,
				error: message,
				stage: "row-shape"
			})
			continue
		}

		if (!isOptionArray(row.optionsJson)) {
			counters.failedShape++
			const message = "optionsJson is not [{id, text}] shape"
			console.log(`  [skip] ${message}`)
			appendJsonl(STAGE3_FAILURES_LOG, {
				timestamp: nowIso(),
				itemId: row.id,
				error: message,
				stage: "row-shape"
			})
			continue
		}

		const options = row.optionsJson
		const optionIds = new Set(options.map((o) => o.id))
		const oldMetadata = (row.metadataJson === null || typeof row.metadataJson !== "object"
			? {}
			: row.metadataJson) as MetadataJson
		const oldStructured = oldMetadata.structuredExplanation
		const oldExplanation = row.explanation

		console.log("  [explain]")
		let structured: StructuredExplanationOutput
		try {
			// Stage 3 has no access to source PNG (regen runs against existing
			// items in the DB, not against stage-1 JSONs). Pass imagePath=undefined
			// so the explain pass falls back to text-only mode; the
			// chart-description rule self-disables.
			const explainResult = await writeStructuredExplanation(
				row.body.text,
				options,
				row.correctAnswer,
				row.subTypeId,
				oldMetadata.originalExplanation,
				undefined
			)
			structured = explainResult.structured
		} catch (err) {
			counters.failedExplain++
			const message = errorToString(err)
			console.log(`  [explain failed] ${message}`)
			appendJsonl(STAGE3_FAILURES_LOG, {
				timestamp: nowIso(),
				itemId: row.id,
				error: message,
				stage: "explain-call"
			})
			continue
		}

		// Re-run the same Zod schema to be safe against future drift in the
		// explain helper. The helper already safe-parses but we don't trust
		// that as a contract — stage 3's validation must be self-contained.
		const reparsed = structuredExplanationOutput.safeParse(structured)
		if (!reparsed.success) {
			counters.failedZod++
			const message = `Zod validation failed: ${JSON.stringify(reparsed.error.issues)}`
			console.log(`  [zod failed] ${message}`)
			appendJsonl(STAGE3_FAILURES_LOG, {
				timestamp: nowIso(),
				itemId: row.id,
				error: message,
				stage: "zod",
				rawOutput: structured
			})
			continue
		}

		// Cross-check: every referencedOptions[j] must exist in optionIds.
		let missingRef: string | undefined
		for (const part of structured.parts) {
			for (const ref of part.referencedOptions) {
				if (!optionIds.has(ref)) {
					missingRef = ref
					break
				}
			}
			if (missingRef !== undefined) break
		}
		if (missingRef !== undefined) {
			counters.failedReferenced++
			const message = `referencedOption '${missingRef}' not in row's options`
			console.log(`  [referenced failed] ${message}`)
			appendJsonl(STAGE3_FAILURES_LOG, {
				timestamp: nowIso(),
				itemId: row.id,
				error: message,
				stage: "referenced-cross-check",
				rawOutput: structured,
				rowOptionIds: [...optionIds]
			})
			continue
		}

		const newExplanation = renderExplanationProse(structured)
		const newMetadata: MetadataJson = {
			...oldMetadata,
			structuredExplanation: structured
		}

		// Always log the diff — including dry-run runs — so reviewers can
		// inspect prompt-change effects without committing to an UPDATE.
		appendJsonl(STAGE3_REGENERATED_LOG, {
			timestamp: nowIso(),
			itemId: row.id,
			subTypeId: row.subTypeId,
			oldStructuredExplanation: oldStructured,
			newStructuredExplanation: structured,
			oldExplanation,
			newExplanation,
			dryRun: args.dryRun
		})

		if (args.dryRun) {
			console.log("  [DRY-RUN] would UPDATE explanation + metadata_json.structuredExplanation")
			console.log(`    old: ${oldExplanation ?? "(null)"}`)
			console.log(`    new: ${newExplanation}`)
			counters.regenerated++
			continue
		}

		try {
			await db.transaction(async function applyUpdate(tx) {
				await tx
					.update(itemsTable)
					.set({
						explanation: newExplanation,
						metadataJson: sql`jsonb_set(${itemsTable.metadataJson}, '{structuredExplanation}', ${JSON.stringify(structured)}::jsonb)`
					})
					.where(eq(itemsTable.id, row.id))
				void newMetadata
			})
		} catch (err) {
			counters.failedExplain++
			const message = errorToString(err)
			console.log(`  [update failed] ${message}`)
			appendJsonl(STAGE3_FAILURES_LOG, {
				timestamp: nowIso(),
				itemId: row.id,
				error: `transaction: ${message}`,
				stage: "update"
			})
			continue
		}

		counters.regenerated++
		console.log(`  [regenerated] ${newExplanation}`)
	}

	printSummary(counters)
}

await main().catch((err: unknown) => {
	console.error("[fatal]", errorToString(err))
	if (err instanceof Error && err.stack) console.error(err.stack)
	process.exit(1)
})
