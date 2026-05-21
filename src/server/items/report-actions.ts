"use server"

// User-submitted item-report server action (User Question Reports round
// §1.2 per docs/plans/user-question-reports.md). End users submit a
// report from the post-session WrongItemsBrowser when they believe a
// question is broken (formatting / wrong-answer / mislabeled / other).
//
// Style precedent: src/server/admin/disposition-actions.ts (admin-side
// disposition shape). This module is the user-side analog — same
// per-stage cadence (AUDIT → VALIDATE → PRE-FLIGHT → UPSERT →
// POSTVERIFY), different auth gate (auth() resolves end-user session
// instead of requireAdminEmail() resolving admin session), different
// persistence shape (single INSERT ... ON CONFLICT DO UPDATE rather
// than a transaction wrapping items UPDATE + item_admin_actions
// INSERT — there is no audit-ledger row written for user reports at
// v1; the report row itself IS the record of the user's submission).
//
// Transaction shape:
//   1. AUDIT — auth() resolves session.user.id; throws ErrUnauthorized
//      if no session. requireUserId() helper mirrors the inline pattern
//      at src/app/(app)/actions.ts:55-62 (the project precedent for
//      end-user-scoped server actions; no shared helper module exists
//      yet, and replicating inline matches the existing isolation).
//   2. VALIDATE — Zod safeParse against submitItemReportInputSchema
//      (includes reason-required-when-other refinement); throws
//      ErrSubmitReportInputInvalid on failure.
//   3. PRE-FLIGHT — single SELECT against items.id to confirm the
//      item exists. Throws ErrItemNotFound on miss. Mirrors
//      disposition-actions.ts pattern (rules/no-implicit-select-all:
//      explicit column list). The FK constraint on item_user_reports.
//      item_id would also surface a missing item, but as a Postgres
//      FK-violation error rather than a clean sentinel; the pre-flight
//      gives a structured error response shape.
//   4. UPSERT — single INSERT into item_user_reports with
//      .onConflictDoUpdate against the (user_id, item_id) unique
//      composite per plan-doc §0.9 re-report semantics. The conflict
//      clause overwrites reason / reasonNote / reportedAtMs, resets
//      status to 'open', and clears all four disposition_* columns to
//      NULL (previous disposition is overwritten, per v1 simplicity
//      trade-off documented in §0.9). Drizzle builder form mirrors
//      src/server/mastery/recompute.ts:115-135 precedent.
//   5. POSTVERIFY — logger.info records the submission;
//      revalidatePath fires for the post-session route convention so
//      any open post-session page refreshes its reflectance state.
//
// revalidatePath form (per audit step A3): route-convention form
// "/post-session/[sessionId]" with the "page" type so all
// post-session pages refresh — the user might re-encounter the item
// in any future session and the reflectance state should refresh
// everywhere. Project precedent at disposition-actions.ts uses
// literal-path form, but the user-side reflectance refresh use case is
// structurally different (multi-page invalidation needed). Documented
// deviation; matches the redirector's A3 default recommendation.

import * as errors from "@superbuilders/errors"
import { eq } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import { auth } from "@/auth"
import { db } from "@/db"
import { itemUserReports } from "@/db/schemas/catalog/item-user-reports"
import { items } from "@/db/schemas/catalog/items"
import { logger } from "@/logger"
import {
	ErrItemNotFound,
	ErrReportPersistFailed,
	ErrSubmitReportInputInvalid,
	ErrUnauthorized,
	type SubmitItemReportOutput,
	submitItemReportInputSchema
} from "@/server/items/report-input-schema"

async function requireUserId(): Promise<string> {
	const session = await auth()
	if (!session?.user?.id) {
		logger.warn("submitItemReportAction: no auth session")
		throw errors.wrap(ErrUnauthorized, "no session")
	}
	return session.user.id
}

async function submitItemReportAction(
	rawInput: unknown
): Promise<SubmitItemReportOutput> {
	const userId = await requireUserId()

	const parse = submitItemReportInputSchema.safeParse(rawInput)
	if (!parse.success) {
		logger.error(
			{ userId, error: parse.error },
			"submitItemReportAction: input validation failed"
		)
		throw errors.wrap(ErrSubmitReportInputInvalid, "input validation")
	}
	const input = parse.data

	const itemResult = await errors.try(
		db.select({ id: items.id }).from(items).where(eq(items.id, input.itemId)).limit(1)
	)
	if (itemResult.error) {
		logger.error(
			{ userId, itemId: input.itemId, error: itemResult.error },
			"submitItemReportAction: pre-flight SELECT failed"
		)
		throw errors.wrap(itemResult.error, "submitItemReportAction pre-flight SELECT")
	}
	const itemRow = itemResult.data[0]
	if (itemRow === undefined) {
		logger.warn(
			{ userId, itemId: input.itemId },
			"submitItemReportAction: item not found"
		)
		throw errors.wrap(ErrItemNotFound, `id '${input.itemId}'`)
	}

	const nowMs = Date.now()
	const reasonNoteValue = input.reasonNote === undefined ? null : input.reasonNote

	const upsertResult = await errors.try(
		db
			.insert(itemUserReports)
			.values({
				userId,
				itemId: input.itemId,
				reason: input.reason,
				reasonNote: reasonNoteValue,
				status: "open",
				reportedAtMs: nowMs
			})
			.onConflictDoUpdate({
				target: [itemUserReports.userId, itemUserReports.itemId],
				set: {
					reason: input.reason,
					reasonNote: reasonNoteValue,
					status: "open",
					dispositionAdminUserId: null,
					dispositionAtMs: null,
					dispositionItemActionId: null,
					dispositionKind: null,
					reportedAtMs: nowMs
				}
			})
	)
	if (upsertResult.error) {
		logger.error(
			{ userId, itemId: input.itemId, error: upsertResult.error },
			"submitItemReportAction: upsert failed"
		)
		throw errors.wrap(ErrReportPersistFailed, "item_user_reports upsert")
	}

	logger.info(
		{
			userId,
			itemId: input.itemId,
			reason: input.reason,
			hasReasonNote: input.reasonNote !== undefined
		},
		"submitItemReportAction: report submitted"
	)

	revalidatePath("/post-session/[sessionId]", "page")

	return { outcome: "ok", itemId: input.itemId }
}

export { submitItemReportAction }
