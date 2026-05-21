import "@/env"
import * as errors from "@superbuilders/errors"
import { and, asc, eq, inArray, isNull, sql } from "drizzle-orm"
import { z } from "zod"
import { DEFAULT_DRILL_QUESTIONS, type Difficulty, subTypes } from "@/config/sub-types"
import { createAdminDb } from "@/db/admin"
import { items } from "@/db/schemas/catalog/items"
import { experimentalItems } from "@/db/schemas/experimental/experimental-items"
import { logger } from "@/logger"
import { itemBody } from "@/server/items/body-schema"
import {
	EXPERIMENTAL_PRACTICE_TEST_QUESTIONS,
	EXPERIMENTAL_PRACTICE_TEST_SUBTYPE_MINIMUM
} from "@/server/experimental/practice-test-data"

const SEED_METHOD = "generated_import_v1"
const MIN_ELIGIBLE_SUBTYPE_COUNT = 2
const difficultyOrder: ReadonlyArray<Difficulty> = ["easy", "medium", "hard", "brutal"]
const EMPTY_SOURCE_ROWS: ReadonlyArray<SourceItemRow> = []

const optionsJsonSchema = z
	.array(
		z.object({
			id: z.string().min(1),
			text: z.string().min(1)
		})
	)
	.min(2)
	.max(5)

interface Args {
	replace: boolean
}

interface SourceCountRow {
	subTypeId: string
	count: number
}

interface SourceItemRow {
	id: string
	subTypeId: string
	difficulty: Difficulty
	status: "candidate" | "live" | "rejected" | "retired"
	body: unknown
	optionsJson: unknown
	correctAnswer: string
	explanation: string | null
	metadataJson: unknown
	sourceFolder: string | null
	sourceFilename: string | null
}

interface SelectedSubTypePlan {
	subTypeId: string
	targetCount: number
	existingEligibleCount: number
	deficitCount: number
	insertedCount: number
	skippedAlreadySeededCount: number
	sourceAvailableCount: number
}

interface SeedPlanResult {
	readonly plans: ReadonlyArray<SelectedSubTypePlan>
	readonly rowsToInsert: Array<typeof experimentalItems.$inferInsert>
	readonly projectedEligibleCounts: ReadonlyMap<string, number>
}

function parseArgs(argv: ReadonlyArray<string>): Args {
	let replace = false
	for (const arg of argv) {
		if (arg === "--replace") {
			replace = true
			continue
		}
		logger.error({ arg }, "seed-experimental-items: unknown argument")
		throw errors.new(`seed-experimental-items: unknown argument '${arg}'`)
	}
	return { replace }
}

function sectionForSubTypeId(subTypeId: string): "verbal" | "numerical" | undefined {
	const match = subTypes.find(function findSubType(entry) {
		return entry.id === subTypeId
	})
	if (match === undefined) return undefined
	return match.section
}

function isKnownSubTypeId(subTypeId: string): boolean {
	return sectionForSubTypeId(subTypeId) !== undefined
}

function chooseSubTypes(sourceCounts: ReadonlyArray<SourceCountRow>): ReadonlyArray<string> {
	const eligible = sourceCounts
		.filter(function filterEligible(row) {
			return isKnownSubTypeId(row.subTypeId) && row.count > 0
		})
		.sort(function sortDescending(a, b) {
			if (b.count !== a.count) return b.count - a.count
			return a.subTypeId.localeCompare(b.subTypeId)
		})

	if (eligible.length < MIN_ELIGIBLE_SUBTYPE_COUNT) {
		logger.error(
			{ eligibleSubTypeCount: eligible.length },
			"seed-experimental-items: insufficient eligible source subtypes"
		)
		throw errors.new(
			"seed-experimental-items: fewer than 2 generated subtypes available"
		)
	}

	return eligible.map(function pickSubTypeId(row) {
		return row.subTypeId
	})
}

function distributeTargets(
	subTypeIdsToSeed: ReadonlyArray<string>,
	sourceCounts: ReadonlyArray<SourceCountRow>
): ReadonlyMap<string, number> {
	const countBySubType = new Map<string, number>()
	for (const row of sourceCounts) {
		countBySubType.set(row.subTypeId, row.count)
	}
	const targetMap = new Map<string, number>()
	for (const subTypeId of subTypeIdsToSeed) {
		const count = countBySubType.get(subTypeId)
		if (count === undefined) continue
		targetMap.set(subTypeId, count)
	}
	return targetMap
}

function readMapCount(map: ReadonlyMap<string, number>, key: string): number {
	const value = map.get(key)
	if (value === undefined) return 0
	return value
}

function readRowsForSubType(
	map: ReadonlyMap<string, ReadonlyArray<SourceItemRow>>,
	key: string
): ReadonlyArray<SourceItemRow> {
	const value = map.get(key)
	if (value === undefined) return EMPTY_SOURCE_ROWS
	return value
}

function validateSourceRow(row: SourceItemRow): void {
	const bodyResult = itemBody.safeParse(row.body)
	if (!bodyResult.success) {
		logger.error(
			{ sourceItemId: row.id, issues: bodyResult.error.issues },
			"seed-experimental-items: source body invalid"
		)
		throw errors.wrap(bodyResult.error, `source body invalid: ${row.id}`)
	}
	const optionsResult = optionsJsonSchema.safeParse(row.optionsJson)
	if (!optionsResult.success) {
		logger.error(
			{ sourceItemId: row.id, issues: optionsResult.error.issues },
			"seed-experimental-items: source options invalid"
		)
		throw errors.wrap(optionsResult.error, `source options invalid: ${row.id}`)
	}
	const optionIds = new Set(
		optionsResult.data.map(function mapOption(option) {
			return option.id
		})
	)
	if (!optionIds.has(row.correctAnswer)) {
		logger.error(
			{ sourceItemId: row.id, correctAnswer: row.correctAnswer },
			"seed-experimental-items: source correct answer missing from options"
		)
		throw errors.new(
			`seed-experimental-items: correct answer missing from options for ${row.id}`
		)
	}
}

function takeFromBucket(
	selected: SourceItemRow[],
	selectedIds: Set<string>,
	bucket: SourceItemRow[] | undefined,
	limit: number
): number {
	if (bucket === undefined) return 0
	let inserted = 0
	let remainingSlots = limit
	while (remainingSlots > 0) {
		const next = bucket.shift()
		if (next === undefined) break
		if (selectedIds.has(next.id)) continue
		selected.push(next)
		selectedIds.add(next.id)
		inserted += 1
		remainingSlots -= 1
	}
	return inserted
}

function fillBaseQuota(
	buckets: ReadonlyMap<Difficulty, SourceItemRow[]>,
	selected: SourceItemRow[],
	selectedIds: Set<string>,
	baseQuota: number
): void {
	for (const difficulty of difficultyOrder) {
		const bucket = buckets.get(difficulty)
		takeFromBucket(selected, selectedIds, bucket, baseQuota)
	}
}

function fillRemainingSlots(
	buckets: ReadonlyMap<Difficulty, SourceItemRow[]>,
	selected: SourceItemRow[],
	selectedIds: Set<string>,
	remaining: number
): void {
	let remainingSlots = remaining
	while (remainingSlots > 0) {
		let progressed = false
		for (const difficulty of difficultyOrder) {
			const bucket = buckets.get(difficulty)
			const inserted = takeFromBucket(selected, selectedIds, bucket, 1)
			if (inserted > 0) {
				progressed = true
				remainingSlots -= inserted
				if (remainingSlots <= 0) return
			}
		}
		if (!progressed) return
	}
}

function selectRowsForSubtype(
	rows: ReadonlyArray<SourceItemRow>,
	targetCount: number
): ReadonlyArray<SourceItemRow> {
	if (targetCount <= 0) return []
	const buckets = new Map<Difficulty, SourceItemRow[]>(
		difficultyOrder.map(function initBucket(difficulty) {
			return [difficulty, []]
		})
	)
	for (const row of rows) {
		const bucket = buckets.get(row.difficulty)
		if (bucket === undefined) continue
		bucket.push(row)
	}

	const selected: SourceItemRow[] = []
	const selectedIds = new Set<string>()
	const baseQuota = Math.floor(targetCount / difficultyOrder.length)
	fillBaseQuota(buckets, selected, selectedIds, baseQuota)
	const remaining = targetCount - selected.length
	fillRemainingSlots(buckets, selected, selectedIds, remaining)
	return selected
}

function buildSourceRowsBySubType(
	sourceRows: ReadonlyArray<SourceItemRow>
): ReadonlyMap<string, ReadonlyArray<SourceItemRow>> {
	const rowsBySubType = new Map<string, SourceItemRow[]>()
	for (const row of sourceRows) {
		validateSourceRow(row)
		const existing = rowsBySubType.get(row.subTypeId)
		if (existing === undefined) {
			rowsBySubType.set(row.subTypeId, [row])
			continue
		}
		existing.push(row)
	}
	return rowsBySubType
}

function buildSeedPlan(input: {
	readonly selectedSubTypes: ReadonlyArray<string>
	readonly targetBySubType: ReadonlyMap<string, number>
	readonly existingEligibleBySubType: ReadonlyMap<string, number>
	readonly alreadySeededSourceIds: ReadonlySet<string>
	readonly sourceRowsBySubType: ReadonlyMap<string, ReadonlyArray<SourceItemRow>>
	readonly nowMs: number
}): SeedPlanResult {
	const plans: SelectedSubTypePlan[] = []
	const rowsToInsert: Array<typeof experimentalItems.$inferInsert> = []
	const projectedEligibleCounts = new Map(input.existingEligibleBySubType)

	for (const subTypeId of input.selectedSubTypes) {
		const targetCount = input.targetBySubType.get(subTypeId)
		if (targetCount === undefined) continue
		const currentEligibleCount = readMapCount(input.existingEligibleBySubType, subTypeId)
		const allSourceRowsForSubtype = readRowsForSubType(input.sourceRowsBySubType, subTypeId)
		const availableRows = allSourceRowsForSubtype.filter(function filterSourceRow(row) {
			return !input.alreadySeededSourceIds.has(row.id)
		})
		const deficitCount = availableRows.length
		const selectedRows = selectRowsForSubtype(availableRows, deficitCount)
		for (const row of selectedRows) {
			rowsToInsert.push({
				subTypeId: row.subTypeId,
				difficulty: row.difficulty,
				body: row.body,
				optionsJson: row.optionsJson,
				correctAnswer: row.correctAnswer,
				explanation: row.explanation,
				metadataJson: {
					seedMethod: SEED_METHOD,
					seedSourceItemId: row.id,
					seededFromTable: "items",
					source: "generated",
					status: row.status,
					sourceFolder: row.sourceFolder,
					sourceFilename: row.sourceFilename,
					sourceItemMetadata: row.metadataJson
				},
				auditStatus: "unaudited",
				sourceVersion: 1,
				parentExperimentalItemId: null,
				promotedItemId: null,
				hiddenAtMs: null,
				createdByUserId: null,
				createdAtMs: input.nowMs,
				updatedAtMs: input.nowMs
			})
		}
		const projectedCount = currentEligibleCount + selectedRows.length
		projectedEligibleCounts.set(subTypeId, projectedCount)
		plans.push({
			subTypeId,
			targetCount,
			existingEligibleCount: currentEligibleCount,
			deficitCount,
			insertedCount: selectedRows.length,
			skippedAlreadySeededCount: allSourceRowsForSubtype.length - availableRows.length,
			sourceAvailableCount: availableRows.length
		})
	}

	return { plans, rowsToInsert, projectedEligibleCounts }
}

function assertProjectedGates(
	plans: ReadonlyArray<SelectedSubTypePlan>,
	projectedEligibleCounts: ReadonlyMap<string, number>
): void {
	const projectedEligibleValues = Array.from(projectedEligibleCounts.values())
	const projectedEligibleSubTypes = projectedEligibleValues.filter(function filterPositive(count) {
		return count > 0
	}).length
	const projectedEligibleTotal = projectedEligibleValues.reduce(function sum(acc, count) {
		return acc + count
	}, 0)
	const projectedHasDrillSubtype = plans.some(function checkPlan(plan) {
		const projected = readMapCount(projectedEligibleCounts, plan.subTypeId)
		return projected >= DEFAULT_DRILL_QUESTIONS
	})
	if (
		projectedEligibleTotal < EXPERIMENTAL_PRACTICE_TEST_QUESTIONS ||
		projectedEligibleSubTypes < EXPERIMENTAL_PRACTICE_TEST_SUBTYPE_MINIMUM ||
		!projectedHasDrillSubtype
	) {
		logger.error(
			{
				projectedEligibleTotal,
				projectedEligibleSubTypes,
				projectedHasDrillSubtype,
				plans
			},
			"seed-experimental-items: source pool insufficient to satisfy experimental gates"
		)
		throw errors.new(
			"seed-experimental-items: source pool insufficient to satisfy experimental gates"
		)
	}
}

async function loadSourceCounts(
	adminDb: Awaited<ReturnType<typeof createAdminDb>>
): Promise<ReadonlyArray<SourceCountRow>> {
	return await adminDb.db
		.select({
			subTypeId: items.subTypeId,
			count: sql<number>`COUNT(*)::int`
		})
		.from(items)
		.where(and(eq(items.source, "generated"), inArray(items.status, ["candidate", "live"])))
		.groupBy(items.subTypeId)
}

async function loadExistingEligibleCountsBySubtype(
	adminDb: Awaited<ReturnType<typeof createAdminDb>>
): Promise<ReadonlyMap<string, number>> {
	const rows = await adminDb.db
		.select({
			subTypeId: experimentalItems.subTypeId,
			count: sql<number>`COUNT(*)::int`
		})
		.from(experimentalItems)
		.where(
			and(
				eq(experimentalItems.auditStatus, "unaudited"),
				isNull(experimentalItems.hiddenAtMs)
			)
		)
		.groupBy(experimentalItems.subTypeId)
	return new Map(
		rows.map(function mapRow(row) {
			return [row.subTypeId, row.count] as const
		})
	)
}

async function deletePriorSeedRows(
	adminDb: Awaited<ReturnType<typeof createAdminDb>>
): Promise<number> {
	const deleted = await adminDb.db
		.delete(experimentalItems)
		.where(sql`${experimentalItems.metadataJson}->>'seedMethod' = ${SEED_METHOD}`)
		.returning({ id: experimentalItems.id })
	return deleted.length
}

async function loadAlreadySeededSourceIds(
	adminDb: Awaited<ReturnType<typeof createAdminDb>>
): Promise<ReadonlySet<string>> {
	const rows = await adminDb.db
		.select({
			sourceItemId: sql<string | null>`${experimentalItems.metadataJson}->>'seedSourceItemId'`
		})
		.from(experimentalItems)
		.where(sql`${experimentalItems.metadataJson}->>'seedMethod' = ${SEED_METHOD}`)
	const ids = rows.flatMap(function mapRow(row) {
		return row.sourceItemId === null ? [] : [row.sourceItemId]
	})
	return new Set(ids)
}

async function loadSourceRowsForSubTypes(
	adminDb: Awaited<ReturnType<typeof createAdminDb>>,
	subTypeIdsToSeed: ReadonlyArray<string>
): Promise<ReadonlyArray<SourceItemRow>> {
	return await adminDb.db
		.select({
			id: items.id,
			subTypeId: items.subTypeId,
			difficulty: items.difficulty,
			body: items.body,
			optionsJson: items.optionsJson,
			correctAnswer: items.correctAnswer,
			status: items.status,
			explanation: items.explanation,
			metadataJson: items.metadataJson,
			sourceFolder: items.sourceFolder,
			sourceFilename: items.sourceFilename
		})
		.from(items)
		.where(
			and(
				eq(items.source, "generated"),
				inArray(items.status, ["candidate", "live"]),
				inArray(items.subTypeId, [...subTypeIdsToSeed])
			)
		)
		.orderBy(
			asc(items.subTypeId),
			asc(items.difficulty),
			asc(items.sourceFolder),
			asc(items.sourceFilename),
			asc(items.id)
		)
}

async function loadFinalEligibleCounts(
	adminDb: Awaited<ReturnType<typeof createAdminDb>>
): Promise<ReadonlyArray<{ subTypeId: string; count: number }>> {
	return await adminDb.db
		.select({
			subTypeId: experimentalItems.subTypeId,
			count: sql<number>`COUNT(*)::int`
		})
		.from(experimentalItems)
		.where(
			and(
				eq(experimentalItems.auditStatus, "unaudited"),
				isNull(experimentalItems.hiddenAtMs)
			)
		)
		.groupBy(experimentalItems.subTypeId)
		.orderBy(sql`COUNT(*) DESC`, asc(experimentalItems.subTypeId))
}

async function maybeReplaceSeededRows(
	adminDb: Awaited<ReturnType<typeof createAdminDb>>,
	replace: boolean
): Promise<void> {
	if (!replace) return
	const deletedCount = await deletePriorSeedRows(adminDb)
	logger.info(
		{ deletedCount },
		"seed-experimental-items: removed prior script-seeded rows"
	)
}

async function main(): Promise<void> {
	const args = parseArgs(Bun.argv.slice(2))
	await using adminDb = await createAdminDb()
	await maybeReplaceSeededRows(adminDb, args.replace)

	const sourceCounts = await loadSourceCounts(adminDb)
	const totalSourceGeneratedItems = sourceCounts.reduce(function sum(acc, row) {
		return acc + row.count
	}, 0)
	const selectedSubTypes = chooseSubTypes(sourceCounts)
	const targetBySubType = distributeTargets(selectedSubTypes, sourceCounts)
	const existingEligibleBySubType = await loadExistingEligibleCountsBySubtype(adminDb)
	const alreadySeededSourceIds = await loadAlreadySeededSourceIds(adminDb)
	const sourceRows = await loadSourceRowsForSubTypes(adminDb, selectedSubTypes)
	const sourceRowsBySubType = buildSourceRowsBySubType(sourceRows)
	const nowMs = Date.now()
	const seedPlan = buildSeedPlan({
		selectedSubTypes,
		targetBySubType,
		existingEligibleBySubType,
		alreadySeededSourceIds,
		sourceRowsBySubType,
		nowMs
	})

	assertProjectedGates(seedPlan.plans, seedPlan.projectedEligibleCounts)

	let insertedCount = 0
	if (seedPlan.rowsToInsert.length > 0) {
		const inserted = await adminDb.db
			.insert(experimentalItems)
			.values(seedPlan.rowsToInsert)
			.returning({ id: experimentalItems.id })
		insertedCount = inserted.length
	}

	const finalEligibleCounts = await loadFinalEligibleCounts(adminDb)
	const skippedCount = seedPlan.plans.reduce(function sum(acc, plan) {
		return acc + plan.skippedAlreadySeededCount
	}, 0)
	logger.info(
		{
			totalSourceGeneratedItems,
			distinctSourceGeneratedSubtypes: sourceCounts.length,
			selectedSubTypes,
			insertedCount,
			skippedCount,
			plans: seedPlan.plans,
			finalEligibleCounts
		},
		"seed-experimental-items: completed"
	)
}

const result = await errors.try(main())
if (result.error) {
	logger.error({ error: result.error }, "seed-experimental-items: failed")
	process.exit(1)
}
