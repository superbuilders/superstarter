// Anthropic tool definition for `submit_sibling_set` — the single tool the
// Phase 4 sub-phase a generator uses to return a four-sibling set per
// source item.
//
// The tool's `input_schema` is derived from the canonical Zod schema in
// `sibling-schema.ts` via Zod 4's built-in `z.toJSONSchema()` so the two
// stay in lockstep without two-place authoring (§6.14.19 forward-pin
// realization; commit 3 brief audit step 4 shape a-i). Zod's parser
// strips unknown keys (notably the `$schema` draft URL that
// `z.toJSONSchema()` injects but Anthropic's input_schema surface does
// not consume), so the boundary parser doubles as a passthrough scrubber.

import type Anthropic from "@anthropic-ai/sdk"
import * as errors from "@superbuilders/errors"
import { z } from "zod"
import { logger } from "@/logger"
import { submitSiblingSetSchema } from "@/server/generation/sibling-schema"

const SIBLING_TOOL_NAME = "submit_sibling_set"

const SIBLING_TOOL_DESCRIPTION =
	"Submit four sibling items for a source CCAT question — one each at easy, medium, hard, and brutal difficulty. Each sibling preserves the source's problem structure and the relationship between distractors and the correct answer; surface details (numbers, named entities, subjects) vary. Options are text-only — the server assigns opaque ids after the call. Each sibling carries its own structured explanation with `referencedOptionTexts` keyed to its own options' text."

const inputSchemaShape = z.object({
	type: z.literal("object"),
	properties: z.record(z.string(), z.unknown()).optional(),
	required: z.array(z.string()).optional(),
	additionalProperties: z.boolean().optional()
})

function buildInputSchema(): z.infer<typeof inputSchemaShape> {
	const raw = z.toJSONSchema(submitSiblingSetSchema)
	const parsed = inputSchemaShape.safeParse(raw)
	if (!parsed.success) {
		logger.error(
			{ issues: parsed.error.issues, raw },
			"sibling-tool: derived JSON Schema failed shape validation"
		)
		throw errors.wrap(parsed.error, "sibling-tool input_schema derivation")
	}
	return parsed.data
}

const SIBLING_TOOL: Anthropic.Messages.Tool = {
	name: SIBLING_TOOL_NAME,
	description: SIBLING_TOOL_DESCRIPTION,
	input_schema: buildInputSchema()
}

export { SIBLING_TOOL, SIBLING_TOOL_DESCRIPTION, SIBLING_TOOL_NAME }
