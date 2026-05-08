// Zod schemas for Phase 4 sub-phase a's similar-item generator tool-use I/O.
//
// The generator's Anthropic call returns a `submit_sibling_set` tool-use
// payload containing four siblings keyed by difficulty tier
// (easy / medium / hard / brutal). This file defines the LLM-boundary
// shape — text-only options, text-keyed referenced-options on the
// structured-explanation parts. Server-side post-processing in commit 5
// (`ingest-siblings.ts`) assigns opaque option ids, resolves
// `correctAnswerText` and `referencedOptionTexts` to ids, and validates
// the resolved record against the canonical `ingest.ts` schemas before
// the DB transaction.
//
// Naming: the LLM-boundary structured-explanation part uses
// `referencedOptionTexts` (plural, with `Texts` suffix) to make the
// pre-resolution shape explicit. The post-resolution canonical name on
// `ingest.ts` is `referencedOptions` — distinct on purpose so a future
// reviewer reads the field name and immediately knows which side of the
// resolve transform they're on.

import { z } from "zod"
import type { Difficulty } from "@/config/sub-types"
import { itemBody } from "@/server/items/body-schema"

const explanationPartKind = z.enum(["recognition", "elimination", "tie-breaker"])

const llmStructuredExplanation = z
	.object({
		parts: z
			.array(
				z.object({
					kind: explanationPartKind,
					text: z.string().min(1),
					referencedOptionTexts: z.array(z.string())
				})
			)
			.min(2)
			.max(3)
	})
	.refine(
		(d) => {
			if (d.parts[0]?.kind !== "recognition") return false
			if (d.parts[1]?.kind !== "elimination") return false
			if (d.parts.length < 3) return true
			return d.parts[2]?.kind === "tie-breaker"
		},
		{
			message: "parts must be in order: recognition, elimination, optional tie-breaker"
		}
	)

const llmOption = z.object({
	text: z.string().min(1)
})

const siblingItemSchema = z.object({
	body: itemBody,
	options: z.array(llmOption).min(4).max(5),
	correctAnswerText: z.string().min(1),
	structuredExplanation: llmStructuredExplanation
})

const submitSiblingSetSchema = z.object({
	siblings: z.object({
		easy: siblingItemSchema,
		medium: siblingItemSchema,
		hard: siblingItemSchema,
		brutal: siblingItemSchema
	})
})

type LlmStructuredExplanation = z.infer<typeof llmStructuredExplanation>
type SiblingItemInput = z.infer<typeof siblingItemSchema>
type SubmitSiblingSetOutput = z.infer<typeof submitSiblingSetSchema>

// Vector-similar-context sub-round commit 1 (sub-round plan §4.1, §4.4):
// neighbor item shape rendered into the user prompt. Type-only — no Zod
// schema since the LLM never receives this as a tool-input; it flows into
// the user-prompt text via `buildSiblingUserPrompt`. Options are
// text-only per the opaque-id pipeline-split contract; the option ids in
// the DB row are stripped at the SiblingNeighbor boundary. The neighbor's
// `id` is the neighbor item's id (NOT an option id) — kept for debugging
// and future provenance use.
interface SiblingNeighbor {
	id: string
	difficulty: Difficulty
	body: { kind: "text"; text: string }
	options: { text: string }[]
	correctAnswerText: string
}

export type { LlmStructuredExplanation, SiblingItemInput, SiblingNeighbor, SubmitSiblingSetOutput }
export {
	llmOption,
	llmStructuredExplanation,
	siblingItemSchema,
	submitSiblingSetSchema
}
