// Pure-function staleness check for the persisted validator-result payload
// (Phase 4 sub-phase b §2.4 commit 0). Extracted from disposition-actions.ts
// so the approve action's pre-flight gate can be unit-tested against
// synthetic metadata_json shapes without standing up a DB harness.
//
// "Stale" semantics match the read-time computation in queue-data.ts (see
// isValidatorStale there): a verdict is stale when an admin edit happened
// AFTER the last validator run — i.e. validatorResult.staleAfterMs >
// validatorResult.evaluatedAtMs. Re-running the validator produces a new
// evaluatedAtMs that supersedes staleAfterMs, restoring freshness.
//
// Returns false in the "metadata absent / malformed / no validatorResult /
// no staleAfterMs" cases — the approve action treats those as "not stale"
// and proceeds without requiring acknowledgement. Pre-batch seed items
// (the 50 NULL-source_folder rows) and any candidate that hasn't yet been
// edited fall in this branch.

import { z } from "zod"
import { validatorResultSchema } from "@/server/admin/validator-result-schema"

const metadataStaleShape = z
	.object({
		validatorResult: validatorResultSchema.optional()
	})
	.passthrough()

function isMetadataValidatorStale(metadataJson: unknown): boolean {
	const parse = metadataStaleShape.safeParse(metadataJson)
	if (!parse.success) return false
	const validator = parse.data.validatorResult
	if (validator === undefined) return false
	if (validator.staleAfterMs === undefined) return false
	return validator.staleAfterMs > validator.evaluatedAtMs
}

export { isMetadataValidatorStale }
