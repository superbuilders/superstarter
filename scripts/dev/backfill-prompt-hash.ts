// Phase 4 sub-phase b §1.2 commit 1 — promptHash backfill.
//
// One-off data-migration script that reads sub-phase-a sibling-generation
// provenance files at scripts/_siblings/<parentItemId>.json and writes the
// promptHash from each into items.metadata_json.promptHash for the
// corresponding candidate-status items rows. Pre-backfill state: all 1,711
// candidates carry metadata_json.promptHash = NULL (verified at §1.2 commit-0
// audit step 12); without backfill, the validator's provenance-based-batch-
// reject criterion (Q1 #6) cannot partition cohorts.
//
// §6.14.31 destructive-operation-gate: dry-run by default; --apply required
// to write. Apply runs inside a single transaction; no partial writes.
//
// Idempotent: re-running with the same provenance JSON produces the same
// result. Uses jsonb_set to preserve adjacent metadata_json fields
// (parentItemId, generatorModel, templateVersion, structuredExplanation, ...).
//
// Usage:
//   bun run scripts/dev/backfill-prompt-hash.ts            # dry-run summary
//   bun run scripts/dev/backfill-prompt-hash.ts --dry-run  # explicit dry-run
//   bun run scripts/dev/backfill-prompt-hash.ts --apply    # actually write

import * as errors from "@superbuilders/errors"
import { eq, sql } from "drizzle-orm"
import * as fs from "node:fs"
import * as path from "node:path"
import { z } from "zod"
import { db } from "@/db"
import { items } from "@/db/schemas/catalog/items"
import { logger } from "@/logger"

const SIBLINGS_DIR = "scripts/_siblings"

const ErrProvenanceFileMalformed = errors.new("provenance file JSON malformed")

const ProvenanceSchema = z
	.object({
		parentItemId: z.string().min(1),
		promptHash: z.string().min(1)
	})
	.passthrough()

const CandidateMetadataSchema = z
	.object({
		parentItemId: z.string().min(1)
	})
	.passthrough()

interface ProvenanceMinimal {
	parentItemId: string
	promptHash: string
}

function parseMode(argv: ReadonlyArray<string>): "dry-run" | "apply" {
	if (argv.includes("--apply")) return "apply"
	return "dry-run"
}

function readProvenanceFile(filePath: string): ProvenanceMinimal {
	const raw = fs.readFileSync(filePath, "utf-8")
	const parsed = errors.trySync(function parse() {
		return JSON.parse(raw)
	})
	if (parsed.error) {
		logger.error({ error: parsed.error, filePath }, "provenance file JSON parse failed")
		throw errors.wrap(ErrProvenanceFileMalformed, filePath)
	}
	const validation = ProvenanceSchema.safeParse(parsed.data)
	if (!validation.success) {
		logger.error({ error: validation.error, filePath }, "provenance file schema validation failed")
		throw errors.wrap(ErrProvenanceFileMalformed, filePath)
	}
	return {
		parentItemId: validation.data.parentItemId,
		promptHash: validation.data.promptHash
	}
}

function loadAllProvenance(): ReadonlyMap<string, string> {
	const entries = fs.readdirSync(SIBLINGS_DIR)
	const map = new Map<string, string>()
	for (const entry of entries) {
		if (!entry.endsWith(".json")) continue
		const filePath = path.join(SIBLINGS_DIR, entry)
		const { parentItemId, promptHash } = readProvenanceFile(filePath)
		map.set(parentItemId, promptHash)
	}
	return map
}

interface CohortDistribution {
	readonly totalCandidates: number
	readonly matchedCandidates: number
	readonly unmatchedCandidates: number
	readonly cohortCounts: ReadonlyMap<string, number>
}

function incrementCohort(counts: Map<string, number>, key: string): void {
	const existing = counts.get(key)
	const next = existing === undefined ? 1 : existing + 1
	counts.set(key, next)
}

async function computeDistribution(
	provenance: ReadonlyMap<string, string>
): Promise<CohortDistribution> {
	const candidatesResult = await errors.try(
		db
			.select({
				id: items.id,
				metadataJson: items.metadataJson
			})
			.from(items)
			.where(eq(items.status, "candidate"))
	)
	if (candidatesResult.error) {
		logger.error({ error: candidatesResult.error }, "candidate query failed")
		throw errors.wrap(candidatesResult.error, "candidate query")
	}
	const candidates = candidatesResult.data
	const cohortCounts = new Map<string, number>()
	let matched = 0
	let unmatched = 0
	for (const row of candidates) {
		const metaParse = CandidateMetadataSchema.safeParse(row.metadataJson)
		if (!metaParse.success) {
			unmatched += 1
			continue
		}
		const promptHash = provenance.get(metaParse.data.parentItemId)
		if (promptHash === undefined) {
			unmatched += 1
			continue
		}
		matched += 1
		incrementCohort(cohortCounts, promptHash)
	}
	return {
		totalCandidates: candidates.length,
		matchedCandidates: matched,
		unmatchedCandidates: unmatched,
		cohortCounts
	}
}

async function applyBackfill(provenance: ReadonlyMap<string, string>): Promise<number> {
	let updated = 0
	const txResult = await errors.try(
		db.transaction(async function runApply(tx) {
			for (const [parentItemId, promptHash] of provenance) {
				const updateResult = await errors.try(
					tx
						.update(items)
						.set({
							metadataJson: sql`jsonb_set(${items.metadataJson}, '{promptHash}', to_jsonb(${promptHash}::text))`
						})
						.where(
							sql`${items.status} = 'candidate' AND ${items.metadataJson}->>'parentItemId' = ${parentItemId}`
						)
						.returning({ id: items.id })
				)
				if (updateResult.error) {
					logger.error(
						{ error: updateResult.error, parentItemId, promptHash },
						"backfill update failed for parent"
					)
					throw errors.wrap(updateResult.error, "backfill update")
				}
				updated += updateResult.data.length
			}
		})
	)
	if (txResult.error) {
		logger.error({ error: txResult.error }, "backfill transaction failed")
		throw errors.wrap(txResult.error, "backfill transaction")
	}
	return updated
}

function formatCohortSummary(dist: CohortDistribution): string {
	const lines: string[] = []
	lines.push(`Total candidates: ${dist.totalCandidates}`)
	lines.push(`Matched (provenance file present): ${dist.matchedCandidates}`)
	lines.push(`Unmatched (no provenance file or NULL parentItemId): ${dist.unmatchedCandidates}`)
	lines.push(`Distinct promptHash cohorts: ${dist.cohortCounts.size}`)
	const sortedCohorts = [...dist.cohortCounts.entries()].sort(function byCountDesc(a, b) {
		return b[1] - a[1]
	})
	const topCount = Math.min(10, sortedCohorts.length)
	if (topCount > 0) {
		lines.push("Top cohorts by candidate count:")
		for (let i = 0; i < topCount; i += 1) {
			const entry = sortedCohorts[i]
			if (entry === undefined) continue
			const [hash, count] = entry
			lines.push(`  ${hash} → ${count}`)
		}
	}
	return lines.join("\n")
}

async function main(): Promise<void> {
	const mode = parseMode(process.argv.slice(2))
	logger.info({ mode }, "backfill-prompt-hash starting")

	const provenance = loadAllProvenance()
	logger.info({ fileCount: provenance.size }, "provenance files loaded")

	const distribution = await computeDistribution(provenance)
	const summary = formatCohortSummary(distribution)
	logger.info({ summary }, "dry-run summary")

	if (mode === "dry-run") {
		logger.info("dry-run complete; pass --apply to write")
		process.exit(0)
	}

	const updated = await applyBackfill(provenance)
	logger.info({ updated }, "backfill apply complete")

	process.exit(0)
}

const result = await errors.try(main())
if (result.error) {
	logger.error({ error: result.error }, "backfill-prompt-hash failed")
	process.exit(1)
}
