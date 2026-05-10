// Shared Zod schemas for the persisted validator-result payload (Phase 4
// sub-phase b §2.2 commit 0). Extracted from queue-data.ts so the queue
// loader (§2.1) and the item-detail loader (§2.2) both narrow the same
// metadata_json.validatorResult shape from a single source of truth.
//
// Mirrors the SerializedValidatorResult interface in
// src/workflows/validator-batch-steps.ts. The workflow file lives in the
// @workflow/next plugin's import-graph guard and cannot be imported here;
// the shape is re-declared via Zod so runtime parsing happens at the
// server-only consumer boundary (no `as` casts, .safeParse only per
// rules/zod-usage.md + rules/no-as-type-assertion.md).

import { z } from "zod"

const validatorVerdictSchema = z.discriminatedUnion("kind", [
	z.object({ kind: z.literal("pass") }),
	z.object({
		kind: z.literal("flag"),
		reason: z.string(),
		metadata: z.record(z.string(), z.unknown())
	}),
	z.object({ kind: z.literal("error"), reason: z.string() })
])

const validatorResultSchema = z.object({
	evaluatedAtMs: z.number(),
	hasAnyFlag: z.boolean(),
	isPressureCell: z.boolean(),
	flagsByName: z.record(z.string(), validatorVerdictSchema),
	thresholdsHash: z.string(),
	invokedByAdminEmail: z.string()
})

type ValidatorVerdict = z.infer<typeof validatorVerdictSchema>
type ParsedValidatorResult = z.infer<typeof validatorResultSchema>

export type { ParsedValidatorResult, ValidatorVerdict }
export { validatorResultSchema, validatorVerdictSchema }
