// Server-side data loader for /admin/review (Phase 4 sub-phase b §2.1 commit 0).
//
// Reads all status='candidate' items, parses each row's metadata_json via
// Zod (no `as` casts; project convention rules/no-as-type-assertion + Zod
// safeParse-only per rules/zod-usage), and returns an AdminQueueData payload
// for the queue UI.
//
// Pre-batch seed items without validatorResult are tolerated: the parser
// returns `validatorResult: undefined` for those, and the queue UI renders
// them with no flag/pressure-cell badges. §1.3 commit-2 persisted
// validatorResult to all 1,711 candidates so today every row has one; this
// branch is forward-compat for future /admin/ingest candidates that haven't
// been re-validated yet.
//
// No pagination at v1 — 1,711 rows render in a single page. If memory or
// scroll perf surfaces during manual testing, virtualization is the v1.5
// answer (react-window). For now, plain ordered render via id DESC (which
// is reverse-chronological per the UUIDv7 primary key convention; see
// rules/no-timestamp-columns.md).

import * as errors from "@superbuilders/errors"
import { desc, eq } from "drizzle-orm"
import { connection } from "next/server"
import { z } from "zod"
import type { Difficulty, SubTypeId } from "@/config/sub-types"
import { subTypeIds } from "@/config/sub-types"
import { db } from "@/db"
import { items } from "@/db/schemas/catalog/items"
import { logger } from "@/logger"
import { itemBody } from "@/server/items/body-schema"
import {
	type ParsedValidatorResult,
	type ValidatorVerdict,
	validatorResultSchema
} from "@/server/admin/validator-result-schema"

const ErrLoadQueueQueryFailed = errors.new("loadAdminQueueData query failed")
const ErrUnknownSubTypeId = errors.new("loadAdminQueueData encountered unknown sub_type_id")

const subTypeIdSet: ReadonlySet<string> = new Set<string>(subTypeIds)

function asSubTypeId(s: string): SubTypeId {
	if (!subTypeIdSet.has(s)) {
		logger.error({ subTypeId: s }, "queue-data: unknown sub_type_id")
		throw errors.wrap(ErrUnknownSubTypeId, `value '${s}'`)
	}
	const matched = subTypeIds.find(function eqs(known) {
		return known === s
	})
	if (matched === undefined) {
		logger.error({ subTypeId: s }, "queue-data: post-guard sub-type-id miss (impossible)")
		throw errors.wrap(ErrUnknownSubTypeId, `post-guard miss for '${s}'`)
	}
	return matched
}

const metadataShapeSchema = z
	.object({
		promptHash: z.string().optional(),
		validatorResult: validatorResultSchema.optional()
	})
	.passthrough()

interface AdminQueueItem {
	readonly id: string
	readonly subTypeId: SubTypeId
	readonly difficulty: Difficulty
	readonly source: "real" | "generated"
	readonly correctAnswer: string
	readonly bodyPreview: string
	readonly hasAnyFlag: boolean
	readonly isPressureCell: boolean
	readonly flagsByName: Readonly<Record<string, ValidatorVerdict>>
	readonly evaluatedAtMs?: number
	readonly staleAfterMs?: number
	readonly validatorStale: boolean
	readonly cohortKey?: string
	readonly invokedByAdminEmail?: string
}

interface AdminQueueData {
	readonly items: ReadonlyArray<AdminQueueItem>
	readonly totalCount: number
	readonly flaggedCount: number
	readonly pressureCellCount: number
	readonly unvalidatedCount: number
	readonly staleCount: number
	readonly subTypeDistribution: ReadonlyMap<SubTypeId, number>
	readonly cohortDistribution: ReadonlyMap<string, number>
}

const BODY_PREVIEW_MAX_CHARS = 140

function truncateBodyText(text: string): string {
	if (text.length <= BODY_PREVIEW_MAX_CHARS) return text
	return `${text.slice(0, BODY_PREVIEW_MAX_CHARS)}…`
}

interface CandidateRow {
	readonly id: string
	readonly subTypeId: string
	readonly difficulty: Difficulty
	readonly source: "real" | "generated"
	readonly correctAnswer: string
	readonly body: unknown
	readonly metadataJson: unknown
}

function parseAdminQueueItem(row: CandidateRow): AdminQueueItem {
	const metaParse = metadataShapeSchema.safeParse(row.metadataJson)
	if (!metaParse.success) {
		logger.error(
			{ itemId: row.id, error: metaParse.error },
			"queue-data: metadata_json shape parse failed"
		)
		throw errors.wrap(metaParse.error, `metadata_json parse for item '${row.id}'`)
	}
	const meta = metaParse.data

	const bodyParse = itemBody.safeParse(row.body)
	let bodyPreview = ""
	if (bodyParse.success) {
		const parsed = bodyParse.data
		if (parsed.kind === "text") {
			bodyPreview = truncateBodyText(parsed.text)
		}
	} else {
		logger.warn(
			{ itemId: row.id, error: bodyParse.error },
			"queue-data: body parse failed; rendering empty preview"
		)
	}

	const subTypeId = asSubTypeId(row.subTypeId)
	const validator = meta.validatorResult
	const hasAnyFlag = validator === undefined ? false : validator.hasAnyFlag
	const isPressureCell = validator === undefined ? false : validator.isPressureCell
	const emptyFlags: Record<string, ValidatorVerdict> = {}
	const flagsByName = validator === undefined ? emptyFlags : validator.flagsByName
	const evaluatedAtMs = validator === undefined ? undefined : validator.evaluatedAtMs
	const staleAfterMs = validator === undefined ? undefined : validator.staleAfterMs
	const validatorStale = isValidatorStale(evaluatedAtMs, staleAfterMs)
	const cohortKey = meta.promptHash
	const invokedByAdminEmail = validator === undefined ? undefined : validator.invokedByAdminEmail
	return {
		id: row.id,
		subTypeId,
		difficulty: row.difficulty,
		source: row.source,
		correctAnswer: row.correctAnswer,
		bodyPreview,
		hasAnyFlag,
		isPressureCell,
		flagsByName,
		evaluatedAtMs,
		staleAfterMs,
		validatorStale,
		cohortKey,
		invokedByAdminEmail
	}
}

// Validator results are stale when the candidate has been edited since
// the last validator run. The marker compares `staleAfterMs` (set on edit)
// against `evaluatedAtMs` (set on validator run); only when stale > evaluated
// is the candidate's verdict outdated. Re-running the validator produces a
// new evaluatedAtMs that supersedes the existing staleAfterMs, restoring
// freshness without needing to clear the field.
function isValidatorStale(
	evaluatedAtMs: number | undefined,
	staleAfterMs: number | undefined
): boolean {
	if (staleAfterMs === undefined) return false
	if (evaluatedAtMs === undefined) return true
	return staleAfterMs > evaluatedAtMs
}

function aggregateDistribution<K>(
	queueItems: ReadonlyArray<AdminQueueItem>,
	keyFor: (item: AdminQueueItem) => K | undefined
): ReadonlyMap<K, number> {
	const map = new Map<K, number>()
	for (const item of queueItems) {
		const key = keyFor(item)
		if (key === undefined) continue
		const prev = map.get(key)
		const next = prev === undefined ? 1 : prev + 1
		map.set(key, next)
	}
	return map
}

async function loadAdminQueueData(): Promise<AdminQueueData> {
	// Mark this loader as request-bound for Next.js 16 Cache Components. The
	// logger.info below (and every other logger call on the path) reads
	// Date.now() internally via Pino; without an explicit request-data
	// marker upstream of that read, Cache Components refuses to render
	// because it can't tell whether the time is supposed to be cached or
	// per-request. See https://nextjs.org/docs/messages/next-prerender-current-time
	// — the admin queue is per-request always (validatorResult + status
	// mutate as admins disposition candidates), so connection() is the
	// correct semantic, not "use cache".
	await connection()
	logger.info("queue-data: loadAdminQueueData starting")
	const result = await errors.try(
		db
			.select({
				id: items.id,
				subTypeId: items.subTypeId,
				difficulty: items.difficulty,
				source: items.source,
				correctAnswer: items.correctAnswer,
				body: items.body,
				metadataJson: items.metadataJson
			})
			.from(items)
			.where(eq(items.status, "candidate"))
			.orderBy(desc(items.id))
	)
	if (result.error) {
		logger.error({ error: result.error }, "queue-data: candidates SELECT failed")
		throw errors.wrap(ErrLoadQueueQueryFailed, "candidates SELECT")
	}

	const parsed: AdminQueueItem[] = []
	for (const row of result.data) {
		parsed.push(parseAdminQueueItem(row))
	}

	let flaggedCount = 0
	let pressureCellCount = 0
	let unvalidatedCount = 0
	let staleCount = 0
	for (const item of parsed) {
		if (item.hasAnyFlag) flaggedCount += 1
		if (item.isPressureCell) pressureCellCount += 1
		if (item.evaluatedAtMs === undefined) unvalidatedCount += 1
		if (item.validatorStale) staleCount += 1
	}

	const subTypeDistribution = aggregateDistribution(parsed, function bySubType(item) {
		return item.subTypeId
	})
	const cohortDistribution = aggregateDistribution(parsed, function byCohort(item) {
		return item.cohortKey
	})

	logger.info(
		{
			totalCount: parsed.length,
			flaggedCount,
			pressureCellCount,
			unvalidatedCount,
			staleCount,
			subTypeBuckets: subTypeDistribution.size,
			cohortBuckets: cohortDistribution.size
		},
		"queue-data: loadAdminQueueData complete"
	)
	return {
		items: parsed,
		totalCount: parsed.length,
		flaggedCount,
		pressureCellCount,
		unvalidatedCount,
		staleCount,
		subTypeDistribution,
		cohortDistribution
	}
}

export type { AdminQueueData, AdminQueueItem, CandidateRow, ParsedValidatorResult, ValidatorVerdict }
export {
	ErrLoadQueueQueryFailed,
	ErrUnknownSubTypeId,
	BODY_PREVIEW_MAX_CHARS,
	isValidatorStale,
	loadAdminQueueData,
	parseAdminQueueItem,
	truncateBodyText
}
