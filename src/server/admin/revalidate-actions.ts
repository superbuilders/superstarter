"use server"

// Admin candidate re-validation server actions (Phase 4 sub-phase b §2.4
// commit 1). Two actions; structurally mirror disposition-actions.ts (the
// canonical immediate-prior precedent for admin per-item write paths) and
// validator-batch-steps.ts persistResultsStep (the canonical
// validatorResult-write precedent — re-uses serializeValidatorResult and
// the jsonb_set-on-validatorResult expression verbatim).
//
// Transaction shape (per §6.14.31 destructive-operation-gate, per-item or
// per-batch scope):
//   1. AUDIT — Zod safeParse on input (single only; bulk takes no input).
//   2. VERIFY — pre-flight SELECT(s); single confirms current item exists
//      and is status='candidate'; bulk's SELECT inherently filters to
//      candidates with stale validatorResult.
//   3. GATE — single's status check refuses non-candidate items
//      (live/rejected are out of scope per redirector ratification); bulk
//      relies on the WHERE clause to restrict scope.
//   4. EXECUTE — buildValidationContext over the working set;
//      validateCandidate per item; jsonb_set persist of fresh
//      validatorResult into metadata_json. Single does this outside a
//      transaction (one row, one UPDATE); bulk wraps the iteration in a
//      single db.transaction so the batch commits atomically.
//   5. POSTVERIFY — revalidatePath fires for queue + (single) item-detail;
//      logger.info records the outcome.
//
// validatorResult overwrite is destructive — old verdicts are gone after
// re-validation. This is by design; the staleness marker exists precisely
// to signal "old verdicts no longer trustworthy, replace them."
//
// staleAfterMs naturally absent in the new payload — the validator result
// schema marks the field optional. queue-data.ts's isValidatorStale
// returns false when staleAfterMs is undefined, so the stale badge
// disappears automatically after re-validation.
//
// NO item_admin_actions rows are written. Re-validation is a refresh, not
// a disposition. If audit-of-re-validation surfaces as a need (e.g.,
// "this admin re-validated the same item 8 times before approving"),
// surface for §2 round-close consideration.
//
// Bulk per-item failure policy: validateCandidate errors for one item are
// logged and the item is SKIPPED (the batch continues). DB UPDATE errors
// for one item ROLL BACK the batch — they signal infra trouble that
// wouldn't be safe to keep writing through. This trade-off is documented
// in the plan's heads-up.

import * as errors from "@superbuilders/errors"
import { and, eq, sql } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import { z } from "zod"
import { type SubTypeId, subTypeIds } from "@/config/sub-types"
import { db } from "@/db"
import { items } from "@/db/schemas/catalog/items"
import { logger } from "@/logger"
import { requireAdminEmail } from "@/server/auth/admin-gate"
import {
	ErrItemNotCandidateForRevalidate,
	ErrItemNotFoundForRevalidate,
	ErrRevalidateSingleInputInvalid,
	revalidateSingleInputSchema,
	type RevalidateBulkOutput,
	type RevalidateSingleOutput
} from "@/server/admin/revalidate-input-schema"
import { buildValidationContext } from "@/server/validator/context"
import { validateCandidate } from "@/server/validator/engine"
import { defaultThresholds } from "@/server/validator/thresholds"
import { computeThresholdsHash } from "@/server/validator/thresholds-hash"
import type {
	CandidateForValidation,
	CandidateValidationResult,
	ValidatorVerdict
} from "@/server/validator/types"

const ErrRevalidateLoadFailed = errors.new("revalidate action load failed")
const ErrRevalidatePersistFailed = errors.new("revalidate action persist failed")
const ErrRevalidateBulkQueryFailed = errors.new("revalidate bulk query failed")
const ErrRevalidateTransactionFailed = errors.new("revalidate transaction failed")
const ErrUnknownSubTypeId = errors.new("revalidate-actions: unknown sub_type_id")
const ErrMetadataMalformed = errors.new("revalidate-actions: metadata_json failed object schema")

const subTypeIdSet: ReadonlySet<string> = new Set<string>(subTypeIds)

function asSubTypeId(s: string): SubTypeId {
	if (!subTypeIdSet.has(s)) {
		logger.error({ subTypeId: s }, "revalidate-actions: unknown sub_type_id")
		throw errors.wrap(ErrUnknownSubTypeId, `value '${s}'`)
	}
	const matched = subTypeIds.find(function eqs(known) {
		return known === s
	})
	if (matched === undefined) {
		logger.error({ subTypeId: s }, "revalidate-actions: post-guard miss (impossible)")
		throw errors.wrap(ErrUnknownSubTypeId, `post-guard miss for '${s}'`)
	}
	return matched
}

const metadataObjectSchema = z.record(z.string(), z.unknown())

interface RawItemForValidation {
	readonly id: string
	readonly subTypeId: string
	readonly difficulty: "easy" | "medium" | "hard" | "brutal"
	readonly source: "real" | "generated"
	readonly status: "live" | "candidate" | "retired" | "rejected"
	readonly body: unknown
	readonly optionsJson: unknown
	readonly correctAnswer: string
	readonly explanation: string | null
	readonly embedding: ReadonlyArray<number> | null
	readonly metadataJson: unknown
	readonly sourceFolder: string | null
	readonly sourceFilename: string | null
}

function projectItemRowToCandidate(row: RawItemForValidation): CandidateForValidation {
	const metaParse = metadataObjectSchema.safeParse(row.metadataJson)
	if (!metaParse.success) {
		logger.error(
			{ itemId: row.id, error: metaParse.error },
			"revalidate-actions: metadata_json failed object schema"
		)
		throw errors.wrap(ErrMetadataMalformed, `id '${row.id}'`)
	}
	return {
		id: row.id,
		subTypeId: asSubTypeId(row.subTypeId),
		difficulty: row.difficulty,
		source: row.source,
		status: row.status,
		body: row.body,
		optionsJson: row.optionsJson,
		correctAnswer: row.correctAnswer,
		explanation: row.explanation,
		embedding: row.embedding,
		metadataJson: metaParse.data,
		sourceFolder: row.sourceFolder,
		sourceFilename: row.sourceFilename
	}
}

const ITEMS_SELECT_FOR_VALIDATION = {
	id: items.id,
	subTypeId: items.subTypeId,
	difficulty: items.difficulty,
	source: items.source,
	status: items.status,
	body: items.body,
	optionsJson: items.optionsJson,
	correctAnswer: items.correctAnswer,
	explanation: items.explanation,
	embedding: items.embedding,
	metadataJson: items.metadataJson,
	sourceFolder: items.sourceFolder,
	sourceFilename: items.sourceFilename
}

interface SerializedValidatorResult {
	readonly evaluatedAtMs: number
	readonly hasAnyFlag: boolean
	readonly isPressureCell: boolean
	readonly flagsByName: Readonly<Record<string, ValidatorVerdict>>
	readonly thresholdsHash: string
	readonly invokedByAdminEmail: string
}

function serializeValidatorResult(
	result: CandidateValidationResult,
	thresholdsHash: string,
	invokedByAdminEmail: string
): SerializedValidatorResult {
	const flagsRecord: Record<string, ValidatorVerdict> = {}
	for (const [name, verdict] of result.flagsByName) {
		flagsRecord[name] = verdict
	}
	return {
		evaluatedAtMs: result.evaluatedAtMs,
		hasAnyFlag: result.hasAnyFlag,
		isPressureCell: result.isPressureCell,
		flagsByName: flagsRecord,
		thresholdsHash,
		invokedByAdminEmail
	}
}

async function revalidateCandidateAction(
	rawInput: unknown
): Promise<RevalidateSingleOutput> {
	const adminCtx = await requireAdminEmail()

	const parse = revalidateSingleInputSchema.safeParse(rawInput)
	if (!parse.success) {
		logger.error(
			{ adminUserId: adminCtx.userId, error: parse.error },
			"revalidateCandidateAction: input validation failed"
		)
		throw errors.wrap(ErrRevalidateSingleInputInvalid, "input validation")
	}
	const input = parse.data

	const loadResult = await errors.try(
		db
			.select(ITEMS_SELECT_FOR_VALIDATION)
			.from(items)
			.where(eq(items.id, input.itemId))
			.limit(1)
	)
	if (loadResult.error) {
		logger.error(
			{ adminUserId: adminCtx.userId, itemId: input.itemId, error: loadResult.error },
			"revalidateCandidateAction: pre-flight SELECT failed"
		)
		throw errors.wrap(ErrRevalidateLoadFailed, "candidate load")
	}
	const row = loadResult.data[0]
	if (row === undefined) {
		logger.warn(
			{ adminUserId: adminCtx.userId, itemId: input.itemId },
			"revalidateCandidateAction: item not found"
		)
		throw errors.wrap(ErrItemNotFoundForRevalidate, `id '${input.itemId}'`)
	}
	if (row.status !== "candidate") {
		logger.warn(
			{ adminUserId: adminCtx.userId, itemId: input.itemId, currentStatus: row.status },
			"revalidateCandidateAction: not in candidate status"
		)
		throw errors.wrap(
			ErrItemNotCandidateForRevalidate,
			`id '${input.itemId}' status '${row.status}'`
		)
	}

	const candidate = projectItemRowToCandidate(row)
	const ctx = await buildValidationContext([candidate])

	const validationResult = await errors.try(validateCandidate(candidate, ctx))
	if (validationResult.error) {
		logger.error(
			{ adminUserId: adminCtx.userId, itemId: input.itemId, error: validationResult.error },
			"revalidateCandidateAction: validateCandidate failed"
		)
		throw errors.wrap(validationResult.error, "validateCandidate")
	}

	const thresholdsHash = computeThresholdsHash(defaultThresholds)
	const serialized = serializeValidatorResult(
		validationResult.data,
		thresholdsHash,
		adminCtx.email
	)
	const payloadJson = JSON.stringify(serialized)

	const persistResult = await errors.try(
		db
			.update(items)
			.set({
				metadataJson: sql`jsonb_set(${items.metadataJson}, '{validatorResult}', ${payloadJson}::jsonb)`
			})
			.where(eq(items.id, input.itemId))
	)
	if (persistResult.error) {
		logger.error(
			{ adminUserId: adminCtx.userId, itemId: input.itemId, error: persistResult.error },
			"revalidateCandidateAction: persist failed"
		)
		throw errors.wrap(ErrRevalidatePersistFailed, "validator-result persist")
	}

	logger.info(
		{
			adminUserId: adminCtx.userId,
			itemId: input.itemId,
			newHasAnyFlag: validationResult.data.hasAnyFlag,
			newIsPressureCell: validationResult.data.isPressureCell
		},
		"revalidateCandidateAction: revalidation committed"
	)

	revalidatePath("/admin/review")
	revalidatePath(`/admin/review/${input.itemId}`)

	return {
		outcome: "ok",
		itemId: input.itemId,
		newHasAnyFlag: validationResult.data.hasAnyFlag
	}
}

async function revalidateStaleCandidatesAction(): Promise<RevalidateBulkOutput> {
	const adminCtx = await requireAdminEmail()

	const staleResult = await errors.try(
		db
			.select(ITEMS_SELECT_FOR_VALIDATION)
			.from(items)
			.where(
				and(
					eq(items.status, "candidate"),
					sql`(${items.metadataJson}->'validatorResult'->>'staleAfterMs')::bigint > (${items.metadataJson}->'validatorResult'->>'evaluatedAtMs')::bigint`
				)
			)
	)
	if (staleResult.error) {
		logger.error(
			{ adminUserId: adminCtx.userId, error: staleResult.error },
			"revalidateStaleCandidatesAction: query failed"
		)
		throw errors.wrap(ErrRevalidateBulkQueryFailed, "stale candidates SELECT")
	}

	const attemptedCount = staleResult.data.length
	if (attemptedCount === 0) {
		logger.info(
			{ adminUserId: adminCtx.userId },
			"revalidateStaleCandidatesAction: no stale candidates"
		)
		return {
			outcome: "ok",
			attemptedCount: 0,
			revalidatedCount: 0,
			nowFlaggedCount: 0,
			nowClearedCount: 0,
			skippedCount: 0
		}
	}

	const candidates = staleResult.data.map(projectItemRowToCandidate)
	logger.info(
		{ adminUserId: adminCtx.userId, attemptedCount },
		"revalidateStaleCandidatesAction: starting bulk revalidation"
	)

	const ctx = await buildValidationContext(candidates)
	const thresholdsHash = computeThresholdsHash(defaultThresholds)

	let nowFlaggedCount = 0
	let nowClearedCount = 0

	const txResult = await errors.try(
		db.transaction(async function applyBulkRevalidate(tx) {
			for (const candidate of candidates) {
				const validationResult = await errors.try(validateCandidate(candidate, ctx))
				if (validationResult.error) {
					// Per plan heads-up: skip-and-continue per-item validate
					// failures so a single faulty embedding doesn't roll back
					// the entire batch. Skipped items keep their stale
					// validatorResult; admin can retry them individually
					// after fixing the root cause.
					logger.error(
						{
							adminUserId: adminCtx.userId,
							itemId: candidate.id,
							error: validationResult.error
						},
						"revalidateStaleCandidatesAction: validateCandidate failed; skipping item"
					)
					continue
				}
				if (validationResult.data.hasAnyFlag) {
					nowFlaggedCount += 1
				} else {
					nowClearedCount += 1
				}
				const serialized = serializeValidatorResult(
					validationResult.data,
					thresholdsHash,
					adminCtx.email
				)
				const payloadJson = JSON.stringify(serialized)
				const updateResult = await errors.try(
					tx
						.update(items)
						.set({
							metadataJson: sql`jsonb_set(${items.metadataJson}, '{validatorResult}', ${payloadJson}::jsonb)`
						})
						.where(eq(items.id, candidate.id))
				)
				if (updateResult.error) {
					// UPDATE failures DO roll back the transaction (per-item
					// validate failures continue, but per-item DB write
					// failures escalate — they signal infra trouble that
					// wouldn't be safe to keep writing through).
					logger.error(
						{
							adminUserId: adminCtx.userId,
							itemId: candidate.id,
							error: updateResult.error
						},
						"revalidateStaleCandidatesAction: items UPDATE failed; rolling back batch"
					)
					throw errors.wrap(updateResult.error, "items UPDATE")
				}
			}
		})
	)
	if (txResult.error) {
		logger.error(
			{ adminUserId: adminCtx.userId, error: txResult.error },
			"revalidateStaleCandidatesAction: transaction rolled back"
		)
		throw errors.wrap(ErrRevalidateTransactionFailed, "bulk revalidation transaction")
	}

	const revalidatedCount = nowFlaggedCount + nowClearedCount
	const skippedCount = attemptedCount - revalidatedCount
	logger.info(
		{
			adminUserId: adminCtx.userId,
			attemptedCount,
			revalidatedCount,
			nowFlaggedCount,
			nowClearedCount,
			skippedCount
		},
		"revalidateStaleCandidatesAction: bulk revalidation committed"
	)

	revalidatePath("/admin/review")

	return {
		outcome: "ok",
		attemptedCount,
		revalidatedCount,
		nowFlaggedCount,
		nowClearedCount,
		skippedCount
	}
}

export { revalidateCandidateAction, revalidateStaleCandidatesAction }
