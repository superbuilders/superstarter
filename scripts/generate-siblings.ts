// scripts/generate-siblings.ts
//
// Phase 4 sub-phase a's orchestration script. Enumerates source items
// in the live testbank and invokes siblingGenerationWorkflow per source
// per plan §7.3. Idempotency log + cost cap + per-source provenance JSON
// + comparison markdown are the run-shape.
//
// Two empirical corrections to plan §4.7 / §10 confirmed at commits
// 4 + 6 are folded in here:
//   - The workflow is invoked DIRECTLY (not via start() from
//     workflow/api). start() throws "invalid workflow function" outside
//     the Next.js / @workflow/next runtime; the "use workflow" / "use
//     step" directives are no-ops in this CLI context. Direct
//     invocation is verified-working.
//   - --force semantics pre-delete a source's existing siblings + JSON
//     BEFORE the workflow runs (so the workflow's count==0 path
//     executes cleanly). The PK-uniqueness-on-replay claim in plan §10
//     does not apply to UUIDv7-generated PKs; the writeSiblingSetStep
//     idempotency guard is the load-bearing mitigation, NOT PK
//     constraints.
//
// CLI:
//   --max-sources-per-sub-type=N   Cap sources per sub-type. Default unbounded.
//                                   For the test-run gate use N=3.
//   --sub-type=<id>                 Single-sub-type filter. Default all 14.
//   --all-sub-types                 Default; explicit alias.
//   --force                         Pre-delete every source's existing siblings
//                                   + JSON before invoking workflow. Bypasses
//                                   the §4.8 skip-if-4 idempotency.
//   --reset-source=<id>             Pre-delete ONE source's siblings + JSON;
//                                   other sources still follow skip-if-exists.
//   --max-cost-usd=N                Cumulative cost cap per run. Default 50.
//   --neighbors-per-tier=N          Vector-similar-context neighbors per
//                                   difficulty tier (b1 iteration of sub-round
//                                   plan §4.2). Integer ≥ 0. Default 2 →
//                                   2 × 4 tiers = 8 total neighbors. N=0
//                                   disables neighbor injection (ablation).
//   --help, -h                      Print usage and exit.
//
// Usage:
//   bun run scripts/generate-siblings.ts --max-sources-per-sub-type=3
//
// Pre-conditions:
//   - ANTHROPIC_API_KEY + OPENAI_API_KEY in .env.
//   - Local docker postgres up + items table populated.
//   - Network reachable.

import "@/env"
import * as errors from "@superbuilders/errors"
import * as fs from "node:fs"
import * as path from "node:path"
import { and, asc, eq, sql } from "drizzle-orm"
import { z } from "zod"
import { type SubTypeId, subTypeIds } from "@/config/sub-types"
import { createAdminDb } from "@/db/admin"
import { items } from "@/db/schemas/catalog/items"
import { logger } from "@/logger"
import {
	provenancePathFor,
	type SiblingComparisonRow,
	writeSiblingComparisonMd
} from "@/server/generation/sibling-provenance"
import { siblingGenerationWorkflow } from "@/workflows/sibling-generation"

const SIBLINGS_LOG = "scripts/_logs/siblings-generated.jsonl"
const COMPARISON_MD = "scripts/_logs/sibling-test-run-comparison.md"
const DEFAULT_MAX_COST_USD = 50
const DEFAULT_NEIGHBORS_PER_TIER = 2

const ErrCliParseFailed = errors.new("generate-siblings: CLI parse failed")
const ErrInvalidSubType = errors.new("generate-siblings: --sub-type value not in subTypeIds")
const ErrInvalidMaxSources = errors.new(
	"generate-siblings: --max-sources-per-sub-type must be positive integer"
)
const ErrInvalidMaxCost = errors.new(
	"generate-siblings: --max-cost-usd must be positive number"
)
const ErrInvalidNeighborsPerTier = errors.new(
	"generate-siblings: --neighbors-per-tier must be non-negative integer"
)

interface CliArgs {
	maxSourcesPerSubType: number | undefined
	subType: SubTypeId | undefined
	force: boolean
	resetSource: string | undefined
	maxCostUsd: number
	neighborsPerTier: number
}

const USAGE_MESSAGE =
	"Usage: bun run scripts/generate-siblings.ts [--max-sources-per-sub-type=N] [--sub-type=<id>] [--force] [--reset-source=<id>] [--max-cost-usd=N] [--neighbors-per-tier=N]"

function parseValuedFlag(
	arg: string,
	prefix: string
): { matched: boolean; value: string } {
	if (!arg.startsWith(prefix)) return { matched: false, value: "" }
	if (arg.length === prefix.length || arg[prefix.length] !== "=") {
		logger.error({ arg, prefix }, "generate-siblings: flag missing '=value'")
		throw errors.wrap(ErrCliParseFailed, `flag '${prefix}' requires '=value'`)
	}
	return { matched: true, value: arg.slice(prefix.length + 1) }
}

function parsePositiveInt(value: string, label: string): number {
	const n = Number.parseInt(value, 10)
	if (!Number.isFinite(n) || n < 1) {
		logger.error({ value, label }, "generate-siblings: bad positive-int flag")
		throw errors.wrap(ErrInvalidMaxSources, `${label} value '${value}'`)
	}
	return n
}

function parsePositiveFloat(value: string, label: string): number {
	const n = Number.parseFloat(value)
	if (!Number.isFinite(n) || n <= 0) {
		logger.error({ value, label }, "generate-siblings: bad positive-float flag")
		throw errors.wrap(ErrInvalidMaxCost, `${label} value '${value}'`)
	}
	return n
}

function parseNonNegativeInt(value: string, label: string): number {
	const n = Number.parseInt(value, 10)
	if (!Number.isFinite(n) || n < 0 || !Number.isInteger(n)) {
		logger.error({ value, label }, "generate-siblings: bad non-negative-int flag")
		throw errors.wrap(ErrInvalidNeighborsPerTier, `${label} value '${value}'`)
	}
	return n
}

function narrowSubTypeId(value: string): SubTypeId {
	const subTypeIdSet: ReadonlySet<string> = new Set<string>(subTypeIds)
	if (!subTypeIdSet.has(value)) {
		logger.error({ value }, "generate-siblings: bad --sub-type")
		throw errors.wrap(ErrInvalidSubType, `value '${value}'`)
	}
	const matched = subTypeIds.find(function eqs(known) {
		return known === value
	})
	if (!matched) {
		logger.error({ value }, "generate-siblings: --sub-type post-guard miss")
		throw errors.wrap(ErrInvalidSubType, `post-guard miss for '${value}'`)
	}
	return matched
}

function applyArgToCli(arg: string, acc: CliArgs): CliArgs {
	if (arg === "--all-sub-types") return acc
	if (arg === "--force") return { ...acc, force: true }
	const ms = parseValuedFlag(arg, "--max-sources-per-sub-type")
	if (ms.matched) {
		return { ...acc, maxSourcesPerSubType: parsePositiveInt(ms.value, "--max-sources-per-sub-type") }
	}
	const st = parseValuedFlag(arg, "--sub-type")
	if (st.matched) return { ...acc, subType: narrowSubTypeId(st.value) }
	const rs = parseValuedFlag(arg, "--reset-source")
	if (rs.matched) return { ...acc, resetSource: rs.value }
	const mc = parseValuedFlag(arg, "--max-cost-usd")
	if (mc.matched) return { ...acc, maxCostUsd: parsePositiveFloat(mc.value, "--max-cost-usd") }
	const npt = parseValuedFlag(arg, "--neighbors-per-tier")
	if (npt.matched) {
		return {
			...acc,
			neighborsPerTier: parseNonNegativeInt(npt.value, "--neighbors-per-tier")
		}
	}
	logger.error({ arg }, "generate-siblings: unknown flag")
	throw errors.wrap(ErrCliParseFailed, `unknown flag '${arg}'`)
}

function parseArgs(argv: string[]): CliArgs | { help: true } {
	const args = argv.slice(2)
	if (args.includes("--help") || args.includes("-h")) return { help: true }
	let acc: CliArgs = {
		maxSourcesPerSubType: undefined,
		subType: undefined,
		force: false,
		resetSource: undefined,
		maxCostUsd: DEFAULT_MAX_COST_USD,
		neighborsPerTier: DEFAULT_NEIGHBORS_PER_TIER
	}
	for (const arg of args) {
		acc = applyArgToCli(arg, acc)
	}
	return acc
}

interface SourceRow {
	id: string
	subTypeId: SubTypeId
}

async function enumerateSources(args: CliArgs): Promise<SourceRow[]> {
	await using adminDb = await createAdminDb()
	const subTypeFilter = args.subType
	const whereClause = subTypeFilter === undefined
		? eq(items.status, "live")
		: and(eq(items.status, "live"), eq(items.subTypeId, subTypeFilter))
	const queryResult = await errors.try(
		adminDb.db
			.select({ id: items.id, subTypeId: items.subTypeId })
			.from(items)
			.where(whereClause)
			.orderBy(asc(items.id))
	)
	if (queryResult.error) {
		logger.error({ error: queryResult.error }, "generate-siblings: enumerate query failed")
		throw errors.wrap(queryResult.error, "enumerate query")
	}

	const subTypeIdSet: ReadonlySet<string> = new Set<string>(subTypeIds)
	const valid: SourceRow[] = []
	for (const row of queryResult.data) {
		if (!subTypeIdSet.has(row.subTypeId)) {
			logger.warn({ subTypeId: row.subTypeId, id: row.id }, "generate-siblings: skipping unknown sub-type")
			continue
		}
		const matched = subTypeIds.find(function eqs(known) {
			return known === row.subTypeId
		})
		if (!matched) continue
		valid.push({ id: row.id, subTypeId: matched })
	}

	const cap = args.maxSourcesPerSubType
	if (cap === undefined) return valid
	const perSubTypeCount = new Map<SubTypeId, number>()
	const capped: SourceRow[] = []
	for (const row of valid) {
		const seen = perSubTypeCount.get(row.subTypeId)
		const next = seen === undefined ? 1 : seen + 1
		if (next > cap) continue
		perSubTypeCount.set(row.subTypeId, next)
		capped.push(row)
	}
	return capped
}

async function existingSiblingCount(parentItemId: string): Promise<number> {
	await using adminDb = await createAdminDb()
	const result = await errors.try(
		adminDb.db
			.select({ id: items.id })
			.from(items)
			.where(
				and(
					sql`${items.metadataJson}->>'parentItemId' = ${parentItemId}`,
					eq(items.source, "generated")
				)
			)
	)
	if (result.error) {
		logger.error({ error: result.error, parentItemId }, "generate-siblings: count query failed")
		throw errors.wrap(result.error, "count query")
	}
	return result.data.length
}

async function deleteExistingSiblings(parentItemId: string): Promise<void> {
	await using adminDb = await createAdminDb()
	const delResult = await errors.try(
		adminDb.db
			.delete(items)
			.where(
				and(
					sql`${items.metadataJson}->>'parentItemId' = ${parentItemId}`,
					eq(items.source, "generated")
				)
			)
	)
	if (delResult.error) {
		logger.error({ error: delResult.error, parentItemId }, "generate-siblings: delete failed")
		throw errors.wrap(delResult.error, "delete existing siblings")
	}
	const provPath = provenancePathFor(parentItemId)
	if (fs.existsSync(provPath)) {
		fs.unlinkSync(provPath)
	}
}

// The orchestration script reads the per-source provenance JSON to extract
// cost telemetry + the post-processing siblings array for the comparison
// markdown. The full provenance shape is defined in
// @/server/generation/sibling-provenance; here we Zod-narrow only the
// fields we actually consume (cost telemetry + source snapshot + siblings
// array). Unknown keys pass through (the stored JSON has more — promptHash,
// llmOutputVerbatim, generatorModel, etc. — we don't need them here).
const provenanceUsageShape = z.object({
	input_tokens: z.number(),
	output_tokens: z.number(),
	cache_read_input_tokens: z.number(),
	cache_creation_input_tokens: z.number(),
	cost_estimate_usd: z.number(),
	duration_ms: z.number()
})

const provenanceSourceSnapshotShape = z.object({
	id: z.string(),
	subTypeId: z.enum(subTypeIds),
	difficulty: z.enum(["easy", "medium", "hard", "brutal"]),
	body: z.object({ kind: z.literal("text"), text: z.string() }),
	options: z.array(z.object({ id: z.string(), text: z.string() })),
	correctAnswer: z.string(),
	explanation: z.string().optional(),
	originalExplanation: z.string().optional()
})

const provenancePerSiblingShape = z.object({
	tier: z.enum(["easy", "medium", "hard", "brutal"]),
	insertedItemId: z.string(),
	body: z.object({ kind: z.literal("text"), text: z.string() }),
	options: z.array(z.object({ id: z.string(), text: z.string() })),
	correctAnswer: z.string(),
	resolvedReferencedOptions: z.array(
		z.object({ partKind: z.string(), optionIds: z.array(z.string()) })
	),
	embeddingDimensions: z.number(),
	embeddingSampleHead: z.array(z.number())
})

const provenanceFileShape = z.object({
	parentItemId: z.string(),
	source: provenanceSourceSnapshotShape,
	siblings: z.array(provenancePerSiblingShape),
	usage: provenanceUsageShape
})

type ProvenanceFileShape = z.infer<typeof provenanceFileShape>

function readProvenanceFile(parentItemId: string): ProvenanceFileShape | undefined {
	const target = provenancePathFor(parentItemId)
	if (!fs.existsSync(target)) return undefined
	const raw = fs.readFileSync(target, "utf8")
	const parseResult = errors.trySync(function doParse() {
		return JSON.parse(raw)
	})
	if (parseResult.error) {
		logger.error(
			{ error: parseResult.error, target },
			"generate-siblings: failed to parse provenance JSON"
		)
		throw errors.wrap(parseResult.error, "provenance JSON parse")
	}
	const validated = provenanceFileShape.safeParse(parseResult.data)
	if (!validated.success) {
		logger.error(
			{ issues: validated.error.issues, target },
			"generate-siblings: provenance JSON failed shape validation"
		)
		throw errors.wrap(validated.error, "provenance JSON validation")
	}
	return validated.data
}

interface RunState {
	processedIds: string[]
	skippedCount: number
	failedCount: number
	cumulativeCostUsd: number
	totalInputTokens: number
	totalOutputTokens: number
	totalCacheReadTokens: number
	totalCacheCreationTokens: number
	durationsMs: number[]
	perSubType: Map<SubTypeId, {
		sources: number
		costUsd: number
		cacheReadTokens: number
		cacheCreationTokens: number
		inputTokens: number
	}>
}

function newRunState(): RunState {
	return {
		processedIds: [],
		skippedCount: 0,
		failedCount: 0,
		cumulativeCostUsd: 0,
		totalInputTokens: 0,
		totalOutputTokens: 0,
		totalCacheReadTokens: 0,
		totalCacheCreationTokens: 0,
		durationsMs: [],
		perSubType: new Map()
	}
}

function accumulateRunStats(
	state: RunState,
	source: SourceRow,
	prov: ProvenanceFileShape
): void {
	state.cumulativeCostUsd += prov.usage.cost_estimate_usd
	state.totalInputTokens += prov.usage.input_tokens
	state.totalOutputTokens += prov.usage.output_tokens
	state.totalCacheReadTokens += prov.usage.cache_read_input_tokens
	state.totalCacheCreationTokens += prov.usage.cache_creation_input_tokens
	state.durationsMs.push(prov.usage.duration_ms)
	state.processedIds.push(source.id)
	const existing = state.perSubType.get(source.subTypeId)
	const next = existing === undefined
		? {
				sources: 1,
				costUsd: prov.usage.cost_estimate_usd,
				cacheReadTokens: prov.usage.cache_read_input_tokens,
				cacheCreationTokens: prov.usage.cache_creation_input_tokens,
				inputTokens: prov.usage.input_tokens
			}
		: {
				sources: existing.sources + 1,
				costUsd: existing.costUsd + prov.usage.cost_estimate_usd,
				cacheReadTokens: existing.cacheReadTokens + prov.usage.cache_read_input_tokens,
				cacheCreationTokens:
					existing.cacheCreationTokens + prov.usage.cache_creation_input_tokens,
				inputTokens: existing.inputTokens + prov.usage.input_tokens
			}
	state.perSubType.set(source.subTypeId, next)
}

function appendIdempotencyEntry(
	source: SourceRow,
	prov: ProvenanceFileShape,
	insertedIds: string[]
): void {
	const dir = path.dirname(SIBLINGS_LOG)
	if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
	const entry = {
		timestamp: new Date().toISOString(),
		sourceId: source.id,
		subTypeId: source.subTypeId,
		costUsd: prov.usage.cost_estimate_usd,
		durationMs: prov.usage.duration_ms,
		insertedIds
	}
	fs.appendFileSync(SIBLINGS_LOG, `${JSON.stringify(entry)}\n`)
}

async function processOneSource(
	source: SourceRow,
	args: CliArgs,
	state: RunState,
	index: number,
	total: number
): Promise<"continue" | "abort"> {
	const isResetTarget = args.resetSource === source.id

	if (args.force || isResetTarget) {
		await deleteExistingSiblings(source.id)
	} else {
		const existing = await existingSiblingCount(source.id)
		if (existing === 4) {
			logger.info(
				{ index: index + 1, total, sourceId: source.id, subTypeId: source.subTypeId },
				"generate-siblings: skip (already 4 siblings on disk)"
			)
			state.skippedCount++
			return "continue"
		}
		if (existing > 0 && existing < 4) {
			logger.warn(
				{ sourceId: source.id, existing },
				"generate-siblings: skip (partial sibling set; use --reset-source to recover)"
			)
			state.skippedCount++
			return "continue"
		}
	}

	const wfResult = await errors.try(
		siblingGenerationWorkflow({
			itemId: source.id,
			neighborsPerTier: args.neighborsPerTier
		})
	)
	if (wfResult.error) {
		logger.error(
			{ error: wfResult.error, sourceId: source.id, subTypeId: source.subTypeId },
			"generate-siblings: workflow invocation failed"
		)
		state.failedCount++
		return "continue"
	}

	const prov = readProvenanceFile(source.id)
	if (prov === undefined) {
		logger.error(
			{ sourceId: source.id },
			"generate-siblings: provenance JSON missing after workflow success"
		)
		state.failedCount++
		return "continue"
	}

	accumulateRunStats(state, source, prov)
	appendIdempotencyEntry(source, prov, wfResult.data.insertedIds)

	logger.info(
		{
			index: index + 1,
			total,
			sourceId: source.id,
			subTypeId: source.subTypeId,
			cost_estimate_usd: prov.usage.cost_estimate_usd,
			cumulative_cost_usd: state.cumulativeCostUsd,
			duration_ms: prov.usage.duration_ms
		},
		"generate-siblings: processed source"
	)

	if (state.cumulativeCostUsd > args.maxCostUsd) {
		logger.error(
			{
				cumulative_cost_usd: state.cumulativeCostUsd,
				max_cost_usd: args.maxCostUsd,
				processed: state.processedIds.length,
				remaining: total - (index + 1)
			},
			"generate-siblings: cost cap exceeded; aborting"
		)
		return "abort"
	}
	return "continue"
}

function buildComparisonRows(processedIds: string[]): SiblingComparisonRow[] {
	const rows: SiblingComparisonRow[] = []
	for (const id of processedIds) {
		const prov = readProvenanceFile(id)
		if (prov === undefined) continue
		if (prov.siblings.length === 0) continue
		rows.push({
			subTypeId: prov.source.subTypeId,
			source: prov.source,
			siblings: prov.siblings
		})
	}
	return rows
}

function percentile(sorted: number[], p: number): number {
	if (sorted.length === 0) return 0
	const idx = Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length))
	const value = sorted[idx]
	return value === undefined ? 0 : value
}

function logEndOfRunSummary(state: RunState, total: number): void {
	const sortedDurations = [...state.durationsMs].sort(function asc(a, b) {
		return a - b
	})
	const cacheTokensTotal = state.totalCacheReadTokens + state.totalCacheCreationTokens
	const cacheHitRate = cacheTokensTotal === 0 ? 0 : state.totalCacheReadTokens / cacheTokensTotal

	const perSubTypeBreakdown: Record<string, unknown> = {}
	for (const [subTypeId, stats] of state.perSubType) {
		const cacheTotal = stats.cacheReadTokens + stats.cacheCreationTokens
		const subTypeCacheHitRate = cacheTotal === 0 ? 0 : stats.cacheReadTokens / cacheTotal
		perSubTypeBreakdown[subTypeId] = {
			sources: stats.sources,
			siblings: stats.sources * 4,
			costUsd: stats.costUsd,
			inputTokens: stats.inputTokens,
			cacheReadTokens: stats.cacheReadTokens,
			cacheCreationTokens: stats.cacheCreationTokens,
			cacheHitRate: subTypeCacheHitRate
		}
	}

	logger.info(
		{
			totalCalls: state.processedIds.length,
			totalSources: total,
			totalSourcesProcessed: state.processedIds.length,
			totalSourcesSkipped: state.skippedCount,
			totalSourcesFailed: state.failedCount,
			totalSiblingsWritten: state.processedIds.length * 4,
			totalInputTokens: state.totalInputTokens,
			totalOutputTokens: state.totalOutputTokens,
			totalCacheReadTokens: state.totalCacheReadTokens,
			totalCacheCreationTokens: state.totalCacheCreationTokens,
			cacheHitRate,
			totalCostUsd: state.cumulativeCostUsd,
			p50DurationMs: percentile(sortedDurations, 50),
			p95DurationMs: percentile(sortedDurations, 95),
			perSubTypeBreakdown
		},
		"generate-siblings: end-of-run summary"
	)
}

async function main(): Promise<number> {
	const parsed = parseArgs(process.argv)
	if ("help" in parsed) {
		logger.info({}, USAGE_MESSAGE)
		return 0
	}
	const args = parsed
	logger.info(
		{
			maxSourcesPerSubType: args.maxSourcesPerSubType,
			subType: args.subType,
			force: args.force,
			resetSource: args.resetSource,
			maxCostUsd: args.maxCostUsd,
			neighborsPerTier: args.neighborsPerTier
		},
		"generate-siblings: starting run"
	)

	const sources = await enumerateSources(args)
	logger.info({ totalSources: sources.length }, "generate-siblings: enumerated sources")

	const state = newRunState()
	let aborted = false
	for (let i = 0; i < sources.length; i++) {
		const source = sources[i]
		if (source === undefined) continue
		const outcome = await processOneSource(source, args, state, i, sources.length)
		if (outcome === "abort") {
			aborted = true
			break
		}
	}

	const idsForComparison = [...state.processedIds]
	if (idsForComparison.length === 0) {
		logger.warn({}, "generate-siblings: no processed sources; skipping comparison markdown")
	} else {
		const rows = buildComparisonRows(idsForComparison)
		writeSiblingComparisonMd(rows, COMPARISON_MD)
	}

	logEndOfRunSummary(state, sources.length)

	if (aborted) return 1
	if (state.failedCount > 0) return 1
	return 0
}

const result = await errors.try(main())
if (result.error) {
	logger.error({ error: result.error }, "generate-siblings: top-level failure")
	process.exit(1)
}
process.exit(result.data)
