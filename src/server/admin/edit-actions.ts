"use server"

// Admin item-edit server action (Phase 4 sub-phase b §2.3 commit 1 —
// implementation replacing the commit-0 stub).
//
// Transaction shape (per §6.14.31 destructive-operation-gate, per-edit
// scope):
//   1. AUDIT — Zod safeParse against submitEditInputSchema (input shape +
//      at-least-one-edit + bucket-change-acknowledged refinement).
//   2. VERIFY — pre-flight SELECT of the candidate's current state for
//      before_json snapshot + structural sanity (item exists).
//   3. GATE — server-side bucket-change refinement already ran at (1);
//      client-side modal is UX (BucketChangeConfirm in stem-options-tab).
//   4. EXECUTE — single db.transaction wrapping:
//        a) UPDATE items SET { ...changed columns, embedding?, metadata_json }
//        b) INSERT INTO item_admin_actions (full audit row)
//      If body edited, enqueueEmbeddingRegen(itemId, body-edit, newText)
//      runs inside the transaction to produce the new embedding; the
//      OpenAI roundtrip (~500ms-2s) holds the row open for that duration.
//      Trade-off accepted at admin edit volume; async-queue is a future
//      round if throughput surfaces as a problem.
//   5. POSTVERIFY — transaction commit success implies all writes landed;
//      revalidatePath fires for queue + item-detail; logger.info records
//      the edit.
//
// Stale-marker: every successful edit sets metadata_json.validatorResult.
// staleAfterMs = Date.now(). Consumers compute staleness via the
// staleAfterMs > evaluatedAtMs comparison (queue-data.ts + provenance-
// tab.tsx). Re-validating the candidate produces a new evaluatedAtMs that
// supersedes staleAfterMs, restoring freshness without clearing fields.
//
// before_json / after_json: full snapshot of the 7 admin-editable columns
// (body, optionsJson, correctAnswer, explanation, subTypeId, difficulty,
// metadataJson) at action time per the item-admin-actions table's
// "replay-of-edits for forensics" doc. Unchanged columns are mirrored
// from current to after so the diff is computable from a single row.

import * as errors from "@superbuilders/errors"
import { eq, sql } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import { db } from "@/db"
import { items } from "@/db/schemas/catalog/items"
import { itemAdminActions } from "@/db/schemas/catalog/item-admin-actions"
import { logger } from "@/logger"
import { requireAdminEmail } from "@/server/auth/admin-gate"
import { enqueueEmbeddingRegen } from "@/server/admin/embedding-regen"
import {
	ErrEditInputInvalid,
	submitEditInputSchema,
	type SubmitEditOutput
} from "@/server/admin/edit-input-schema"

const ErrItemNotFound = errors.new("submitEditAction: item not found")
const ErrEditTransactionFailed = errors.new("submitEditAction: transaction failed")

async function submitEditAction(rawInput: unknown): Promise<SubmitEditOutput> {
	const adminCtx = await requireAdminEmail()

	const parse = submitEditInputSchema.safeParse(rawInput)
	if (!parse.success) {
		logger.error(
			{ adminUserId: adminCtx.userId, error: parse.error },
			"submitEditAction: input validation failed"
		)
		throw errors.wrap(ErrEditInputInvalid, "input validation")
	}
	const input = parse.data

	const currentResult = await errors.try(
		db
			.select({
				body: items.body,
				optionsJson: items.optionsJson,
				correctAnswer: items.correctAnswer,
				explanation: items.explanation,
				subTypeId: items.subTypeId,
				difficulty: items.difficulty,
				metadataJson: items.metadataJson
			})
			.from(items)
			.where(eq(items.id, input.itemId))
			.limit(1)
	)
	if (currentResult.error) {
		logger.error(
			{ adminUserId: adminCtx.userId, itemId: input.itemId, error: currentResult.error },
			"submitEditAction: pre-flight SELECT failed"
		)
		throw errors.wrap(currentResult.error, "pre-flight SELECT")
	}
	const current = currentResult.data[0]
	if (current === undefined) {
		logger.warn(
			{ adminUserId: adminCtx.userId, itemId: input.itemId },
			"submitEditAction: item not found"
		)
		throw errors.wrap(ErrItemNotFound, `id '${input.itemId}'`)
	}

	const nowMs = Date.now()

	const txResult = await errors.try(
		db.transaction(async function applyEdit(tx) {
			const updateSet = buildUpdateSet(input, nowMs)
			if (input.editedFields.body !== undefined) {
				const embedding = await enqueueEmbeddingRegen(
					input.itemId,
					{ kind: "body-edit" },
					input.editedFields.body.text
				)
				updateSet.embedding = embedding
			}
			const updateResult = await errors.try(
				tx.update(items).set(updateSet).where(eq(items.id, input.itemId))
			)
			if (updateResult.error) {
				logger.error(
					{ adminUserId: adminCtx.userId, itemId: input.itemId, error: updateResult.error },
					"submitEditAction: items UPDATE failed"
				)
				throw errors.wrap(updateResult.error, "items UPDATE")
			}
			const auditRow = buildAuditRow(input, current, adminCtx.userId, nowMs)
			const insertResult = await errors.try(tx.insert(itemAdminActions).values(auditRow))
			if (insertResult.error) {
				logger.error(
					{ adminUserId: adminCtx.userId, itemId: input.itemId, error: insertResult.error },
					"submitEditAction: item_admin_actions INSERT failed"
				)
				throw errors.wrap(insertResult.error, "item_admin_actions INSERT")
			}
		})
	)
	if (txResult.error) {
		logger.error(
			{ adminUserId: adminCtx.userId, itemId: input.itemId, error: txResult.error },
			"submitEditAction: transaction rolled back"
		)
		throw errors.wrap(ErrEditTransactionFailed, "edit transaction")
	}

	const editedKeys: string[] = []
	for (const [key, val] of Object.entries(input.editedFields)) {
		if (val !== undefined) editedKeys.push(key)
	}
	logger.info(
		{
			adminUserId: adminCtx.userId,
			itemId: input.itemId,
			editedKeys,
			bucketChangeAcknowledged: input.bucketChangeAcknowledged,
			hasReasonNote: input.reasonNote !== undefined,
			staleAfterMs: nowMs
		},
		"submitEditAction: edit committed"
	)

	revalidatePath("/admin/review")
	revalidatePath(`/admin/review/${input.itemId}`)

	return { itemId: input.itemId }
}

interface CurrentItemSnapshot {
	readonly body: unknown
	readonly optionsJson: unknown
	readonly correctAnswer: string
	readonly explanation: string | null
	readonly subTypeId: string
	readonly difficulty: "easy" | "medium" | "hard" | "brutal"
	readonly metadataJson: unknown
}

type ParsedEditInput = {
	readonly itemId: string
	readonly editedFields: {
		readonly body?: { readonly kind: "text"; readonly text: string }
		readonly options?: ReadonlyArray<{ readonly id: string; readonly text: string }>
		readonly correctAnswer?: string
		readonly explanation?: string
		readonly structuredExplanation?: unknown
		readonly subTypeId?: string
		readonly difficulty?: "easy" | "medium" | "hard" | "brutal"
	}
	readonly reasonNote?: string
	readonly bucketChangeAcknowledged: boolean
}

function buildUpdateSet(input: ParsedEditInput, nowMs: number): Record<string, unknown> {
	const updateSet: Record<string, unknown> = {}
	if (input.editedFields.body !== undefined) updateSet.body = input.editedFields.body
	if (input.editedFields.options !== undefined) updateSet.optionsJson = input.editedFields.options
	if (input.editedFields.correctAnswer !== undefined) {
		updateSet.correctAnswer = input.editedFields.correctAnswer
	}
	if (input.editedFields.explanation !== undefined) {
		updateSet.explanation = input.editedFields.explanation
	}
	if (input.editedFields.subTypeId !== undefined) {
		updateSet.subTypeId = input.editedFields.subTypeId
	}
	if (input.editedFields.difficulty !== undefined) {
		updateSet.difficulty = input.editedFields.difficulty
	}
	updateSet.metadataJson = buildMetadataExpr(input, nowMs)
	return updateSet
}

// jsonb_set chain on metadata_json. Order matters: we apply the
// staleAfterMs marker first, then layer structuredExplanation on top if
// edited. Each jsonb_set's 4th arg (create_missing=true) ensures absent
// paths are added rather than ignored.
function buildMetadataExpr(input: ParsedEditInput, nowMs: number): unknown {
	const staleJson = JSON.stringify(nowMs)
	let expr = sql<unknown>`jsonb_set(${items.metadataJson}, '{validatorResult,staleAfterMs}', ${staleJson}::jsonb, true)`
	if (input.editedFields.structuredExplanation !== undefined) {
		const structuredJson = JSON.stringify(input.editedFields.structuredExplanation)
		expr = sql<unknown>`jsonb_set(${expr}, '{structuredExplanation}', ${structuredJson}::jsonb, true)`
	}
	return expr
}

function buildAuditRow(
	input: ParsedEditInput,
	current: CurrentItemSnapshot,
	adminUserId: string,
	nowMs: number
) {
	const beforeJson = {
		body: current.body,
		optionsJson: current.optionsJson,
		correctAnswer: current.correctAnswer,
		explanation: current.explanation,
		subTypeId: current.subTypeId,
		difficulty: current.difficulty,
		metadataJson: current.metadataJson
	}
	const afterJson = buildAfterJson(input, current, nowMs)
	const insertReason = input.reasonNote === undefined ? null : input.reasonNote
	return {
		itemId: input.itemId,
		adminUserId,
		actionType: "edit" as const,
		beforeJson,
		afterJson,
		reason: insertReason
	}
}

function buildAfterJson(
	input: ParsedEditInput,
	current: CurrentItemSnapshot,
	nowMs: number
): Record<string, unknown> {
	const ef = input.editedFields
	return {
		body: ef.body === undefined ? current.body : ef.body,
		optionsJson: ef.options === undefined ? current.optionsJson : ef.options,
		correctAnswer: ef.correctAnswer === undefined ? current.correctAnswer : ef.correctAnswer,
		explanation: ef.explanation === undefined ? current.explanation : ef.explanation,
		subTypeId: ef.subTypeId === undefined ? current.subTypeId : ef.subTypeId,
		difficulty: ef.difficulty === undefined ? current.difficulty : ef.difficulty,
		// metadataJson is a synthetic projection mirroring the DB-side
		// jsonb_set chain; see projectMetadataAfter for the precise
		// reconstruction logic.
		metadataJson: projectMetadataAfter(current.metadataJson, nowMs, ef.structuredExplanation)
	}
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
	if (value === null) return false
	if (typeof value !== "object") return false
	if (Array.isArray(value)) return false
	return true
}

function cloneOrEmptyObject(value: unknown): Record<string, unknown> {
	if (isPlainObject(value)) return { ...value }
	return {}
}

// Forensic mirror of the jsonb_set chain applied in the transaction. The
// DB-side metadata is the source of truth — this projection just makes the
// after_json snapshot reflect what the DB will hold post-commit. Defensive
// against current.metadataJson being malformed: if the object shape is
// unrecognizable we still produce a synthetic object containing at least
// the new validatorResult.staleAfterMs marker.
function projectMetadataAfter(
	currentMetadataJson: unknown,
	staleAfterMs: number,
	newStructuredExplanation: unknown
): Record<string, unknown> {
	const base = cloneOrEmptyObject(currentMetadataJson)
	const validatorBase = cloneOrEmptyObject(base.validatorResult)
	validatorBase.staleAfterMs = staleAfterMs
	base.validatorResult = validatorBase
	if (newStructuredExplanation !== undefined) {
		base.structuredExplanation = newStructuredExplanation
	}
	return base
}

export { submitEditAction }
