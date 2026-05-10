// Server-side data loader for /admin/review/[itemId] (Phase 4 sub-phase b
// §2.2 commit 0).
//
// Single-item-by-id read + parent-by-id read + sibling-set-by-parentItemId
// read + provenance-file read (scripts/_siblings/<parentItemId>.json).
// All four loads run in parallel after the candidate's metadata_json is
// parsed (the parentItemId comes from the candidate's metadata; parent +
// siblings + provenance all key off it).
//
// Parent-missing case (rare; design discipline keeps parents live): logged
// as warn, returned as parent=null. Provenance-file-missing case: logged
// as warn, returned as provenanceSnapshot=null. Sibling-set is always at
// least 1 row (the candidate itself).
//
// Zod parsing reuses validator-result-schema; declares an extended
// metadata schema covering parentItemId + generatedAt + generatorModel +
// templateVersion + structuredExplanation (the canonical metadata_json
// shape produced by §1.2 commit-1's sibling-generation backfill plus
// §1.3 commit-2's validator persistence).

import * as fs from "node:fs"
import * as errors from "@superbuilders/errors"
import { eq, sql } from "drizzle-orm"
import { connection } from "next/server"
import { z } from "zod"
import type { Difficulty, SubTypeId } from "@/config/sub-types"
import { subTypeIds } from "@/config/sub-types"
import { db } from "@/db"
import { items } from "@/db/schemas/catalog/items"
import { logger } from "@/logger"
import { itemBody, type ItemBody } from "@/server/items/body-schema"
import { provenancePathFor } from "@/server/generation/sibling-provenance"
import {
	type ParsedValidatorResult,
	validatorResultSchema
} from "@/server/admin/validator-result-schema"

const ErrLoadCandidateQueryFailed = errors.new("loadAdminItemDetail candidate query failed")
const ErrLoadParentQueryFailed = errors.new("loadAdminItemDetail parent query failed")
const ErrLoadSiblingsQueryFailed = errors.new("loadAdminItemDetail siblings query failed")
const ErrCandidateNotFound = errors.new("loadAdminItemDetail: candidate not found")
const ErrUnknownSubTypeId = errors.new("loadAdminItemDetail encountered unknown sub_type_id")

const subTypeIdSet: ReadonlySet<string> = new Set<string>(subTypeIds)

function asSubTypeId(s: string): SubTypeId {
	if (!subTypeIdSet.has(s)) {
		logger.error({ subTypeId: s }, "item-detail-data: unknown sub_type_id")
		throw errors.wrap(ErrUnknownSubTypeId, `value '${s}'`)
	}
	const matched = subTypeIds.find(function eqs(known) {
		return known === s
	})
	if (matched === undefined) {
		logger.error({ subTypeId: s }, "item-detail-data: post-guard miss (impossible)")
		throw errors.wrap(ErrUnknownSubTypeId, `post-guard miss for '${s}'`)
	}
	return matched
}

// Extended metadata schema. Includes the §1.2 commit-1 sibling-generation
// fields (parentItemId, generatedAt, generatorModel, templateVersion,
// promptHash) and the §1.3 commit-2 validatorResult field. The 50
// NULL-source_folder seed items predate sibling-generation; for those,
// all sibling-gen fields will be undefined post-parse.
const itemMetadataSchema = z
	.object({
		promptHash: z.string().optional(),
		generatedAt: z.string().optional(),
		parentItemId: z.string().optional(),
		generatorModel: z.string().optional(),
		templateVersion: z.number().optional(),
		validatorResult: validatorResultSchema.optional(),
		structuredExplanation: z.unknown().optional()
	})
	.passthrough()

const optionShapeSchema = z.object({
	id: z.string(),
	text: z.string()
})

const optionsArraySchema = z.array(optionShapeSchema)

type ItemOption = z.infer<typeof optionShapeSchema>

interface AdminItemMetadata {
	readonly promptHash?: string
	readonly generatedAt?: string
	readonly parentItemId?: string
	readonly generatorModel?: string
	readonly templateVersion?: number
	readonly validatorResult?: ParsedValidatorResult
	readonly structuredExplanation?: unknown
}

interface AdminCandidateRow {
	readonly id: string
	readonly subTypeId: SubTypeId
	readonly difficulty: Difficulty
	readonly source: "real" | "generated"
	readonly status: "live" | "candidate" | "retired" | "rejected"
	readonly body: ItemBody
	readonly options: ReadonlyArray<ItemOption>
	readonly correctAnswer: string
	readonly explanation?: string
	readonly sourceFolder?: string
	readonly sourceFilename?: string
	readonly metadata: AdminItemMetadata
}

// Provenance file Zod schema. Mirrors SiblingProvenancePayload in
// src/server/generation/sibling-provenance.ts. Re-declared via Zod rather
// than imported because the on-disk file is the source of truth and may
// (in future) drift slightly from the in-memory writer's payload shape
// (e.g., older test-run files predating template-version bumps); .safeParse
// with .passthrough() tolerates additive fields without rejecting the
// whole snapshot.
const provenanceUsageSchema = z.object({
	model: z.string(),
	input_tokens: z.number(),
	output_tokens: z.number(),
	cache_read_input_tokens: z.number(),
	cache_creation_input_tokens: z.number(),
	cost_estimate_usd: z.number(),
	duration_ms: z.number()
})

const provenanceSourceSchema = z
	.object({
		id: z.string(),
		subTypeId: z.string(),
		difficulty: z.enum(["easy", "medium", "hard", "brutal"]),
		body: z.object({ kind: z.literal("text"), text: z.string() }),
		options: z.array(optionShapeSchema),
		correctAnswer: z.string(),
		explanation: z.string().optional(),
		originalExplanation: z.string().optional()
	})
	.passthrough()

const provenancePerSiblingSchema = z
	.object({
		tier: z.enum(["easy", "medium", "hard", "brutal"]),
		insertedItemId: z.string(),
		body: z.object({ kind: z.literal("text"), text: z.string() }),
		options: z.array(optionShapeSchema),
		correctAnswer: z.string()
	})
	.passthrough()

const provenanceSnapshotSchema = z
	.object({
		parentItemId: z.string(),
		generatedAt: z.string(),
		generatorModel: z.string(),
		templateVersion: z.number(),
		promptHash: z.string(),
		source: provenanceSourceSchema,
		siblings: z.array(provenancePerSiblingSchema).optional(),
		usage: provenanceUsageSchema.optional()
	})
	.passthrough()

type ProvenanceSnapshot = z.infer<typeof provenanceSnapshotSchema>

interface AdminItemDetail {
	readonly candidate: AdminCandidateRow
	readonly parent?: AdminCandidateRow
	readonly siblings: ReadonlyArray<AdminCandidateRow>
	readonly provenanceSnapshot?: ProvenanceSnapshot
}

interface RawCandidateRow {
	readonly id: string
	readonly subTypeId: string
	readonly difficulty: Difficulty
	readonly source: "real" | "generated"
	readonly status: "live" | "candidate" | "retired" | "rejected"
	readonly body: unknown
	readonly optionsJson: unknown
	readonly correctAnswer: string
	readonly explanation: string | null
	readonly sourceFolder: string | null
	readonly sourceFilename: string | null
	readonly metadataJson: unknown
}

function parseAdminCandidateRow(row: RawCandidateRow): AdminCandidateRow {
	const bodyParse = itemBody.safeParse(row.body)
	if (!bodyParse.success) {
		logger.error(
			{ itemId: row.id, error: bodyParse.error },
			"item-detail-data: body parse failed"
		)
		throw errors.wrap(bodyParse.error, `body parse for item '${row.id}'`)
	}
	const optionsParse = optionsArraySchema.safeParse(row.optionsJson)
	if (!optionsParse.success) {
		logger.error(
			{ itemId: row.id, error: optionsParse.error },
			"item-detail-data: options parse failed"
		)
		throw errors.wrap(optionsParse.error, `options parse for item '${row.id}'`)
	}
	const metadataParse = itemMetadataSchema.safeParse(row.metadataJson)
	if (!metadataParse.success) {
		logger.error(
			{ itemId: row.id, error: metadataParse.error },
			"item-detail-data: metadata parse failed"
		)
		throw errors.wrap(metadataParse.error, `metadata parse for item '${row.id}'`)
	}
	const subTypeId = asSubTypeId(row.subTypeId)
	const explanation = row.explanation === null ? undefined : row.explanation
	const sourceFolder = row.sourceFolder === null ? undefined : row.sourceFolder
	const sourceFilename = row.sourceFilename === null ? undefined : row.sourceFilename
	return {
		id: row.id,
		subTypeId,
		difficulty: row.difficulty,
		source: row.source,
		status: row.status,
		body: bodyParse.data,
		options: optionsParse.data,
		correctAnswer: row.correctAnswer,
		explanation,
		sourceFolder,
		sourceFilename,
		metadata: metadataParse.data
	}
}

const CANDIDATE_SELECT = {
	id: items.id,
	subTypeId: items.subTypeId,
	difficulty: items.difficulty,
	source: items.source,
	status: items.status,
	body: items.body,
	optionsJson: items.optionsJson,
	correctAnswer: items.correctAnswer,
	explanation: items.explanation,
	sourceFolder: items.sourceFolder,
	sourceFilename: items.sourceFilename,
	metadataJson: items.metadataJson
}

async function loadOneById(itemId: string): Promise<AdminCandidateRow | undefined> {
	const result = await errors.try(
		db.select(CANDIDATE_SELECT).from(items).where(eq(items.id, itemId)).limit(1)
	)
	if (result.error) {
		logger.error({ error: result.error, itemId }, "item-detail-data: loadOneById query failed")
		throw errors.wrap(ErrLoadCandidateQueryFailed, "item by id")
	}
	const row = result.data[0]
	if (row === undefined) return undefined
	return parseAdminCandidateRow(row)
}

async function loadSiblings(parentItemId: string): Promise<ReadonlyArray<AdminCandidateRow>> {
	const result = await errors.try(
		db
			.select(CANDIDATE_SELECT)
			.from(items)
			.where(sql`${items.metadataJson}->>'parentItemId' = ${parentItemId}`)
	)
	if (result.error) {
		logger.error(
			{ error: result.error, parentItemId },
			"item-detail-data: loadSiblings query failed"
		)
		throw errors.wrap(ErrLoadSiblingsQueryFailed, "siblings by parentItemId")
	}
	const out: AdminCandidateRow[] = []
	for (const row of result.data) {
		out.push(parseAdminCandidateRow(row))
	}
	return out
}

function readProvenanceSnapshot(parentItemId: string): ProvenanceSnapshot | undefined {
	const target = provenancePathFor(parentItemId)
	if (!fs.existsSync(target)) {
		logger.warn(
			{ parentItemId, target },
			"item-detail-data: provenance file missing; rendering without snapshot"
		)
		return undefined
	}
	const readResult = errors.trySync(function read() {
		return fs.readFileSync(target, "utf8")
	})
	if (readResult.error) {
		logger.error(
			{ error: readResult.error, target },
			"item-detail-data: provenance read failed"
		)
		throw errors.wrap(readResult.error, "provenance read")
	}
	const jsonResult = errors.trySync(function parseJson() {
		return JSON.parse(readResult.data)
	})
	if (jsonResult.error) {
		logger.error(
			{ error: jsonResult.error, target },
			"item-detail-data: provenance JSON.parse failed"
		)
		throw errors.wrap(jsonResult.error, "provenance JSON.parse")
	}
	const parsed = provenanceSnapshotSchema.safeParse(jsonResult.data)
	if (!parsed.success) {
		logger.error(
			{ error: parsed.error, target },
			"item-detail-data: provenance Zod parse failed"
		)
		throw errors.wrap(parsed.error, "provenance Zod parse")
	}
	return parsed.data
}

async function loadAdminItemDetail(itemId: string): Promise<AdminItemDetail> {
	// Mark this loader as request-bound for Next.js 16 Cache Components —
	// Pino's logger reads Date.now() internally on every log line, which
	// trips next-prerender-current-time without an explicit upstream marker.
	// Admin item-detail is per-request always (candidate status + audit
	// history mutate as admins disposition), so connection() is correct.
	await connection()
	logger.info({ itemId }, "item-detail-data: loadAdminItemDetail starting")
	const candidate = await loadOneById(itemId)
	if (candidate === undefined) {
		logger.warn({ itemId }, "item-detail-data: candidate not found")
		throw errors.wrap(ErrCandidateNotFound, `id '${itemId}'`)
	}
	const parentItemId = candidate.metadata.parentItemId
	if (parentItemId === undefined) {
		logger.info(
			{ itemId },
			"item-detail-data: candidate has no parentItemId (likely 50-seed item)"
		)
		return {
			candidate,
			siblings: [candidate]
		}
	}
	const [parentResult, siblingsResult] = await Promise.all([
		errors.try(loadOneById(parentItemId)),
		errors.try(loadSiblings(parentItemId))
	])
	if (parentResult.error) {
		logger.error(
			{ error: parentResult.error, parentItemId },
			"item-detail-data: parent fetch failed"
		)
		throw errors.wrap(ErrLoadParentQueryFailed, "parent load")
	}
	if (siblingsResult.error) {
		logger.error(
			{ error: siblingsResult.error, parentItemId },
			"item-detail-data: siblings fetch failed"
		)
		throw errors.wrap(siblingsResult.error, "siblings load")
	}
	const provenanceResult = errors.trySync(function read() {
		return readProvenanceSnapshot(parentItemId)
	})
	if (provenanceResult.error) {
		logger.error(
			{ error: provenanceResult.error, parentItemId },
			"item-detail-data: provenance read failed"
		)
		throw errors.wrap(provenanceResult.error, "provenance load")
	}
	const parent = parentResult.data
	const siblings = siblingsResult.data
	const provenanceSnapshot = provenanceResult.data
	if (parent === undefined) {
		logger.warn(
			{ itemId, parentItemId },
			"item-detail-data: parent referenced by parentItemId does not exist"
		)
	}
	logger.info(
		{
			itemId,
			parentItemId,
			parentFound: parent !== undefined,
			siblingCount: siblings.length,
			provenanceFound: provenanceSnapshot !== undefined
		},
		"item-detail-data: loadAdminItemDetail complete"
	)
	return {
		candidate,
		parent,
		siblings,
		provenanceSnapshot
	}
}

export type {
	AdminCandidateRow,
	AdminItemDetail,
	AdminItemMetadata,
	ItemOption,
	ProvenanceSnapshot,
	RawCandidateRow
}
export {
	ErrCandidateNotFound,
	ErrLoadCandidateQueryFailed,
	ErrLoadParentQueryFailed,
	ErrLoadSiblingsQueryFailed,
	ErrUnknownSubTypeId,
	loadAdminItemDetail,
	parseAdminCandidateRow,
	provenanceSnapshotSchema
}
