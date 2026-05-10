"use server"

// Admin item-edit server action (Phase 4 sub-phase b §2.3 commit 0).
//
// SCAFFOLD ONLY. Pre-flight Zod validation (in `edit-input-schema.ts`)
// IS run before the throw: input shape, at-least-one-edit refinement,
// bucket-change-acknowledged refinement. The actual DB mutation,
// embedding regen invocation, validator-result-staleness handling, and
// item_admin_actions ledger write all land at §2.3 commit-1.
//
// The stub deliberately throws ErrEditNotYetImplemented AFTER passing
// pre-flight validation — same safeguard pattern as `persistResultsStep`
// (§1.3 commit-0) and the criterion error-verdict stubs (§1.2 commit-0).
// Forces commit-1 to ship before the affordance becomes silently
// functional.
//
// "use server" file restricts exports to async functions only; schema +
// types + error sentinels live in `edit-input-schema.ts`.

import * as errors from "@superbuilders/errors"
import { logger } from "@/logger"
import { requireAdminEmail } from "@/server/auth/admin-gate"
import {
	ErrEditInputInvalid,
	ErrEditNotYetImplemented,
	submitEditInputSchema,
	type SubmitEditOutput
} from "@/server/admin/edit-input-schema"

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
	const fieldKeys: string[] = []
	for (const [key, val] of Object.entries(input.editedFields)) {
		if (val !== undefined) fieldKeys.push(key)
	}
	logger.info(
		{
			adminUserId: adminCtx.userId,
			itemId: input.itemId,
			fieldKeys,
			bucketChangeAcknowledged: input.bucketChangeAcknowledged,
			hasReasonNote: input.reasonNote !== undefined
		},
		"submitEditAction: stub invoked; throws ErrEditNotYetImplemented after pre-flight validation"
	)
	throw errors.wrap(ErrEditNotYetImplemented, "stub")
}

export { submitEditAction }
