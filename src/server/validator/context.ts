// ValidationContext constructors (Phase 4 sub-phase b §1.2 + §1.3).
//
// `emptyValidationContext` — used by tests to construct contexts with
// explicit overrides. Defaults are empty maps + defaultThresholds.
//
// `buildValidationContext` — DB-backed builder used by the §1.3 batch runner
// and the dry-run CLI script. Loads parent embeddings (live items joined to
// candidates via metadata_json.parentItemId), provenance siblings (read from
// scripts/_siblings/<parentItemId>.json), cohort peers (grouped by promptHash),
// and pressure cells (live cells with insufficient bank coverage at hard +
// brutal tiers). Returns context with empty cohortFailureRates — populated
// by the runner's two-pass orchestration.

import * as errors from "@superbuilders/errors"
import { eq, inArray, sql } from "drizzle-orm"
import * as fs from "node:fs"
import * as path from "node:path"
import { z } from "zod"
import type { Difficulty } from "@/config/sub-types"
import { db } from "@/db"
import { items } from "@/db/schemas/catalog/items"
import { logger } from "@/logger"
import { defaultThresholds } from "@/server/validator/thresholds"
import type {
	CandidateForValidation,
	CohortPeer,
	ProvenanceSiblingRecord,
	ValidationContext
} from "@/server/validator/types"

const SIBLINGS_DIR = "scripts/_siblings"

const PRESSURE_HARD_TARGET = 3
const PRESSURE_BRUTAL_TARGET = 1

const ErrParentEmbeddingMissing = errors.new(
	"buildValidationContext: parent embedding missing for one or more parents"
)
const ErrProvenanceFileMissing = errors.new(
	"buildValidationContext: provenance file missing for parent"
)
const ErrProvenanceFileMalformed = errors.new(
	"buildValidationContext: provenance file malformed"
)

interface ValidationContextOverrides {
	readonly cohortFailureRates?: ReadonlyMap<string, number>
	readonly pressureCells?: ReadonlySet<string>
	readonly parentEmbeddingByItemId?: ReadonlyMap<string, ReadonlyArray<number>>
	readonly provenanceByParentItemId?: ValidationContext["provenanceByParentItemId"]
	readonly cohortPeersByCohortKey?: ValidationContext["cohortPeersByCohortKey"]
	readonly thresholds?: ValidationContext["thresholds"]
}

function emptyValidationContext(overrides?: ValidationContextOverrides): ValidationContext {
	const o = overrides
	if (o === undefined) {
		return {
			cohortFailureRates: new Map(),
			pressureCells: new Set(),
			parentEmbeddingByItemId: new Map(),
			provenanceByParentItemId: new Map(),
			cohortPeersByCohortKey: new Map(),
			thresholds: defaultThresholds
		}
	}
	const cohortFailureRates =
		o.cohortFailureRates === undefined ? new Map<string, number>() : o.cohortFailureRates
	const pressureCells =
		o.pressureCells === undefined ? new Set<string>() : o.pressureCells
	const parentEmbeddingByItemId =
		o.parentEmbeddingByItemId === undefined
			? new Map<string, ReadonlyArray<number>>()
			: o.parentEmbeddingByItemId
	const provenanceByParentItemId =
		o.provenanceByParentItemId === undefined
			? new Map() satisfies ValidationContext["provenanceByParentItemId"]
			: o.provenanceByParentItemId
	const cohortPeersByCohortKey =
		o.cohortPeersByCohortKey === undefined
			? new Map() satisfies ValidationContext["cohortPeersByCohortKey"]
			: o.cohortPeersByCohortKey
	const thresholds = o.thresholds === undefined ? defaultThresholds : o.thresholds
	return {
		cohortFailureRates,
		pressureCells,
		parentEmbeddingByItemId,
		provenanceByParentItemId,
		cohortPeersByCohortKey,
		thresholds
	}
}

function getParentItemId(c: CandidateForValidation): string | null {
	const v = c.metadataJson.parentItemId
	if (typeof v !== "string" || v.length === 0) return null
	return v
}

function getPromptHash(c: CandidateForValidation): string | null {
	const v = c.metadataJson.promptHash
	if (typeof v !== "string" || v.length === 0) return null
	return v
}

function getBodyText(c: CandidateForValidation): string {
	const parsed = z.object({ kind: z.literal("text"), text: z.string() }).safeParse(c.body)
	if (!parsed.success) return ""
	return parsed.data.text
}

async function loadParentEmbeddings(
	parentIds: ReadonlyArray<string>
): Promise<ReadonlyMap<string, ReadonlyArray<number>>> {
	if (parentIds.length === 0) return new Map()
	const result = await errors.try(
		db
			.select({ id: items.id, embedding: items.embedding })
			.from(items)
			.where(inArray(items.id, [...parentIds]))
	)
	if (result.error) {
		logger.error({ error: result.error }, "buildValidationContext: parent embedding query failed")
		throw errors.wrap(result.error, "buildValidationContext parent embedding query")
	}
	const map = new Map<string, ReadonlyArray<number>>()
	for (const row of result.data) {
		if (row.embedding === null) continue
		map.set(row.id, row.embedding)
	}
	const missing: string[] = []
	for (const id of parentIds) {
		if (!map.has(id)) missing.push(id)
	}
	if (missing.length > 0) {
		logger.warn(
			{ missingCount: missing.length, sample: missing.slice(0, 5) },
			"buildValidationContext: some parents lack embeddings"
		)
	}
	return map
}

const provenancePayloadSchema = z
	.object({
		parentItemId: z.string().min(1),
		siblings: z
			.array(
				z.object({
					tier: z.enum(["easy", "medium", "hard", "brutal"]),
					insertedItemId: z.string().min(1)
				})
			)
			.optional()
	})
	.passthrough()

function readProvenanceForParent(parentItemId: string): ReadonlyArray<ProvenanceSiblingRecord> {
	const filePath = path.join(SIBLINGS_DIR, `${parentItemId}.json`)
	if (!fs.existsSync(filePath)) {
		logger.warn({ parentItemId, filePath }, "buildValidationContext: provenance file missing")
		throw errors.wrap(ErrProvenanceFileMissing, parentItemId)
	}
	const raw = fs.readFileSync(filePath, "utf-8")
	const parsed = errors.trySync(function parse() {
		return JSON.parse(raw)
	})
	if (parsed.error) {
		logger.error({ error: parsed.error, parentItemId }, "buildValidationContext: provenance JSON parse failed")
		throw errors.wrap(ErrProvenanceFileMalformed, parentItemId)
	}
	const validation = provenancePayloadSchema.safeParse(parsed.data)
	if (!validation.success) {
		logger.error(
			{ error: validation.error, parentItemId },
			"buildValidationContext: provenance schema validation failed"
		)
		throw errors.wrap(ErrProvenanceFileMalformed, parentItemId)
	}
	const siblings = validation.data.siblings
	if (siblings === undefined) return []
	return siblings.map(function toRecord(s): ProvenanceSiblingRecord {
		return { insertedItemId: s.insertedItemId, tier: s.tier }
	})
}

function loadProvenanceMap(
	parentIds: ReadonlyArray<string>
): ReadonlyMap<string, ReadonlyArray<ProvenanceSiblingRecord>> {
	const map = new Map<string, ReadonlyArray<ProvenanceSiblingRecord>>()
	let missingCount = 0
	for (const parentItemId of parentIds) {
		const result = errors.trySync(function read() {
			return readProvenanceForParent(parentItemId)
		})
		if (result.error) {
			missingCount += 1
			continue
		}
		map.set(parentItemId, result.data)
	}
	if (missingCount > 0) {
		logger.warn(
			{ missingCount, totalParents: parentIds.length },
			"buildValidationContext: provenance files missing or malformed for some parents"
		)
	}
	return map
}

function buildCohortPeersMap(
	candidates: ReadonlyArray<CandidateForValidation>
): ReadonlyMap<string, ReadonlyArray<CohortPeer>> {
	const map = new Map<string, CohortPeer[]>()
	for (const c of candidates) {
		const cohortKey = getPromptHash(c)
		if (cohortKey === null) continue
		if (c.embedding === null) continue
		const peer: CohortPeer = {
			id: c.id,
			embedding: c.embedding,
			bodyText: getBodyText(c)
		}
		const existing = map.get(cohortKey)
		if (existing === undefined) {
			map.set(cohortKey, [peer])
		} else {
			existing.push(peer)
		}
	}
	return map
}

interface LiveCellCount {
	readonly subTypeId: string
	readonly difficulty: Difficulty
	readonly count: number
}

async function loadLiveCellCounts(): Promise<ReadonlyArray<LiveCellCount>> {
	const result = await errors.try(
		db
			.select({
				subTypeId: items.subTypeId,
				difficulty: items.difficulty,
				count: sql<number>`count(*)::int`
			})
			.from(items)
			.where(eq(items.status, "live"))
			.groupBy(items.subTypeId, items.difficulty)
	)
	if (result.error) {
		logger.error({ error: result.error }, "buildValidationContext: live-cell query failed")
		throw errors.wrap(result.error, "buildValidationContext live-cell query")
	}
	return result.data
}

async function loadPressureCells(): Promise<ReadonlySet<string>> {
	const cells = await loadLiveCellCounts()
	const liveByCell = new Map<string, number>()
	for (const c of cells) {
		liveByCell.set(`${c.subTypeId}:${c.difficulty}`, c.count)
	}
	const pressure = new Set<string>()
	const subTypeIds = new Set(cells.map(function getId(c) {
		return c.subTypeId
	}))
	for (const subTypeId of subTypeIds) {
		const hardKey = `${subTypeId}:hard`
		const brutalKey = `${subTypeId}:brutal`
		const hardCount = liveByCell.get(hardKey)
		const brutalCount = liveByCell.get(brutalKey)
		const hardObserved = hardCount === undefined ? 0 : hardCount
		const brutalObserved = brutalCount === undefined ? 0 : brutalCount
		if (hardObserved < PRESSURE_HARD_TARGET) pressure.add(hardKey)
		if (brutalObserved < PRESSURE_BRUTAL_TARGET) pressure.add(brutalKey)
	}
	return pressure
}

async function buildValidationContext(
	candidates: ReadonlyArray<CandidateForValidation>
): Promise<ValidationContext> {
	const parentIdSet = new Set<string>()
	for (const c of candidates) {
		const pid = getParentItemId(c)
		if (pid !== null) parentIdSet.add(pid)
	}
	const parentIds = [...parentIdSet]
	logger.info(
		{ candidateCount: candidates.length, distinctParents: parentIds.length },
		"buildValidationContext: starting"
	)
	const parentEmbeddingByItemId = await loadParentEmbeddings(parentIds)
	const provenanceByParentItemId = loadProvenanceMap(parentIds)
	const cohortPeersByCohortKey = buildCohortPeersMap(candidates)
	const pressureCells = await loadPressureCells()
	logger.info(
		{
			parentEmbeddingsLoaded: parentEmbeddingByItemId.size,
			provenanceLoaded: provenanceByParentItemId.size,
			cohortCount: cohortPeersByCohortKey.size,
			pressureCellCount: pressureCells.size
		},
		"buildValidationContext: complete"
	)
	return {
		cohortFailureRates: new Map(),
		pressureCells,
		parentEmbeddingByItemId,
		provenanceByParentItemId,
		cohortPeersByCohortKey,
		thresholds: defaultThresholds
	}
}

function withCohortFailureRates(
	ctx: ValidationContext,
	cohortFailureRates: ReadonlyMap<string, number>
): ValidationContext {
	return {
		cohortFailureRates,
		pressureCells: ctx.pressureCells,
		parentEmbeddingByItemId: ctx.parentEmbeddingByItemId,
		provenanceByParentItemId: ctx.provenanceByParentItemId,
		cohortPeersByCohortKey: ctx.cohortPeersByCohortKey,
		thresholds: ctx.thresholds
	}
}

export {
	buildValidationContext,
	emptyValidationContext,
	ErrParentEmbeddingMissing,
	ErrProvenanceFileMalformed,
	ErrProvenanceFileMissing,
	withCohortFailureRates
}
