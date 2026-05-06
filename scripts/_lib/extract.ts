// scripts/_lib/extract.ts
//
// Extract pass: OCR + classification of a single CCAT screenshot.
// EXEMPT FROM THE PROJECT RULESET.
//
// Note: as of the opaque-option-id migration, the extract pass returns
// options as `{ text }[]` only — no `id` field. Stage 1 assigns opaque ids
// after this pass. The LLM still names a visible correct answer by letter
// (A-E) when answerVisible=true; that letter is a *positional* reference
// into the options array and gets translated to an opaque id by the caller.

import type Anthropic from "@anthropic-ai/sdk"
import { Buffer } from "node:buffer"
import * as path from "node:path"
import { z } from "zod"
import { type SubTypeId, subTypeIds, subTypes } from "@/config/sub-types"
import {
	client,
	errorToString,
	EXTRACT_MAX_TOKENS,
	EXTRACT_MODEL,
	withBackoff
} from "@scripts/_lib/anthropic"

const optionLetter = z.enum(["A", "B", "C", "D", "E"])

const extractedItem = z
	.object({
		isTextOnly: z.boolean(),
		question: z.string().min(1),
		options: z
			.array(z.object({ text: z.string().min(1) }))
			.min(2)
			.max(5),
		answerVisible: z.boolean(),
		correctAnswer: optionLetter.optional(),
		explanationVisible: z.boolean(),
		originalExplanation: z.string().min(1).optional(),
		subTypeId: z.enum(subTypeIds),
		difficulty: z.enum(["easy", "medium", "hard", "brutal"])
	})
	.refine((d) => !d.answerVisible || d.correctAnswer !== undefined, {
		message: "answerVisible=true but correctAnswer missing"
	})
	.refine((d) => !d.explanationVisible || d.originalExplanation !== undefined, {
		message: "explanationVisible=true but originalExplanation missing"
	})

type ExtractedItem = z.infer<typeof extractedItem>

interface ExtractResult {
	ok: true
	data: ExtractedItem
	rawOutput: string
}
interface ExtractFailure {
	ok: false
	stage: "extract"
	rawOutput: string
	error: string
}

function buildSubTypeList(): string {
	return subTypes
		.map((s) => `- ${s.id} — ${s.displayName} (${s.section})`)
		.join("\n")
}

const EXTRACT_SYSTEM_TEMPLATE = `You are an OCR + classification helper for CCAT (Criteria Cognitive Aptitude Test) practice screenshots. You will be shown one screenshot at a time, each containing one multiple-choice question.

Your job is to extract the question's structured content and classify it into one of the 14 v1 sub-types.

Sub-types (id — display name (section)):

\${SUB_TYPE_LIST}

Disambiguation for numerical items — classify by the dominant operation, not surface vocabulary:
- When a problem matches multiple rules, prefer the most specific: percentages > fractions > workrate / speed_distance_time / averages / lowest_values > ratios > word_problems.
- "%" symbol or the word "percent" → numerical.percentages.
- a/b fraction notation as operands → numerical.fractions.
- "average"/"mean" of a value set → numerical.averages.
- a:b ratio notation, OR proportional/unit-rate reasoning involving objects, money, or static quantities ("X items cost Y, what about Z items?"; "A is k times B, given A+B, find A or B"; "scale up/down by factor") → numerical.ratios. Time/work/speed/distance scenarios — even when proportional in shape — go to numerical.workrate or numerical.speed_distance_time per their rules below.
- combined-work or rate-of-completion ("A and B together can…") → numerical.workrate.
- speed / distance / time scenario → numerical.speed_distance_time.
- compare a small set of numeric expressions → numerical.lowest_values.
- Otherwise prose arithmetic without those markers → numerical.word_problems.

Difficulty (anchored by question features, not by the latency thresholds the names suggest):

- easy: vocabulary the average adult knows; arithmetic doable in your head in under 5 seconds; clear pattern. Single-step computation. Unit-rate problems with small integers (e.g., '8 parts in 20 min, 6 parts?') count as easy.
- medium: less common vocabulary; arithmetic needing one written intermediate step; pattern requires a moment to spot.
- hard: uncommon vocabulary or trap distractors; multi-step arithmetic with fractions/percentages; pattern with two interleaved rules. Multi-step compound expressions, especially mixed fraction/decimal subtraction or cross-multiplied comparisons (e.g., '.4-1/4 vs .55-1/3'; '2/11 vs 3/15'), count as hard.
- brutal: vocabulary most adults wouldn't know; calculation path itself is hard to see; deeply ambiguous patterns.

Estimate from question complexity. Ignore any "Difficulty: hard" label printed on the screenshot.

Important conventions of CCAT screenshots:
- Some screenshots show the correct answer (a green checkmark, a highlighted option, a "Correct answer: X" line, or a "✓" next to one option). When you see one, set "answerVisible": true and put the option letter in "correctAnswer". The letter refers to the option's position in the screenshot's printed list (A=first, B=second, etc.).
- Some screenshots show a written explanation below the question, typically titled "Explanation", "Solution", or similar. When present, set "explanationVisible": true and copy the explanation text verbatim into "originalExplanation". Preserve tables and structured layouts as best you can in plain text — they will be used as background context, not user-facing.
- If neither is shown, set both flags to false and omit "correctAnswer" and "originalExplanation".
- Synonyms/antonyms questions in the CCAT convention put the target word in ALL CAPS (e.g. "Choose the word that most nearly means HAPPY.").
- Set "isTextOnly": false if ANY of the answer choices is a chart, shape, image, or visual diagram. Set it true only if the entire question and every option is plain text.

Call the extract_ccat_question tool with the question's structured content. The tool's input_schema defines every field name and type — populate every required field, and only include "correctAnswer" / "originalExplanation" when their corresponding visibility flag is true.

Options: return each option in "options" with just its "text". Do NOT invent ids or letter labels — the system assigns ids server-side. The list order is the source of truth (the first array element is the screenshot's "A" option, the second is "B", and so on).`

const EXTRACT_TOOL_NAME = "extract_ccat_question"
const EXTRACT_TOOL: Anthropic.Messages.Tool = {
	name: EXTRACT_TOOL_NAME,
	description:
		"Return the CCAT question's extracted content as structured fields. Populate every required field. Only set correctAnswer when answerVisible is true. Only set originalExplanation when explanationVisible is true. Each option's content goes in 'text' only — do not include ids.",
	input_schema: {
		type: "object",
		properties: {
			isTextOnly: {
				type: "boolean",
				description:
					"false if any answer choice (or the question itself) is a chart, shape, image, or visual diagram"
			},
			question: {
				type: "string",
				description: "the question prompt text verbatim from the screenshot"
			},
			options: {
				type: "array",
				minItems: 2,
				maxItems: 5,
				items: {
					type: "object",
					properties: {
						text: { type: "string" }
					},
					required: ["text"]
				},
				description:
					"options in screenshot order — the first element is the 'A' option, the second 'B', and so on"
			},
			answerVisible: {
				type: "boolean",
				description:
					"true when a checkmark, highlight, 'Correct answer: X' line, or '✓' marks the correct option"
			},
			correctAnswer: {
				type: "string",
				enum: ["A", "B", "C", "D", "E"],
				description:
					"set ONLY when answerVisible is true. References the option's position (A=first option in array, B=second, ...)."
			},
			explanationVisible: {
				type: "boolean",
				description: "true when a written explanation is shown below the question"
			},
			originalExplanation: {
				type: "string",
				description: "verbatim from the screenshot. set ONLY when explanationVisible is true"
			},
			subTypeId: {
				type: "string",
				enum: [...subTypeIds]
			},
			difficulty: {
				type: "string",
				enum: ["easy", "medium", "hard", "brutal"]
			}
		},
		required: [
			"isTextOnly",
			"question",
			"options",
			"answerVisible",
			"explanationVisible",
			"subTypeId",
			"difficulty"
		]
	}
}

// Resolved system prompt — substitutes the dynamic SUB_TYPE_LIST into the
// template. Exported so siblings (e.g., scripts/dev/retag-items.ts) can
// reuse the exact same classifier prompt mechanically rather than
// transcribing it. The disambiguation rules + difficulty rubric are the
// load-bearing rubric the testbank-ingest pipeline classifies under.
function buildExtractSystemPrompt(): string {
	return EXTRACT_SYSTEM_TEMPLATE.replace("${SUB_TYPE_LIST}", buildSubTypeList())
}

async function extractFromImage(imagePath: string): Promise<ExtractResult | ExtractFailure> {
	const buf = await Bun.file(imagePath).arrayBuffer()
	const b64 = Buffer.from(buf).toString("base64")

	const system = buildExtractSystemPrompt()

	let message: Anthropic.Messages.Message
	try {
		message = await withBackoff(`extract:${path.basename(imagePath)}`, () =>
			client.messages.create({
				model: EXTRACT_MODEL,
				max_tokens: EXTRACT_MAX_TOKENS,
				temperature: 0,
				system,
				tools: [EXTRACT_TOOL],
				tool_choice: { type: "tool", name: EXTRACT_TOOL_NAME },
				messages: [
					{
						role: "user",
						content: [
							{
								type: "image",
								source: { type: "base64", media_type: "image/png", data: b64 }
							},
							{
								type: "text",
								text: `Extract this CCAT question by calling the ${EXTRACT_TOOL_NAME} tool.`
							}
						]
					}
				]
			})
		)
	} catch (err) {
		return { ok: false, stage: "extract", rawOutput: "", error: errorToString(err) }
	}

	let toolInput: unknown
	for (const block of message.content) {
		if (block.type === "tool_use" && block.name === EXTRACT_TOOL_NAME) {
			toolInput = block.input
			break
		}
	}

	if (toolInput === undefined) {
		return {
			ok: false,
			stage: "extract",
			rawOutput: JSON.stringify(message.content),
			error: `no ${EXTRACT_TOOL_NAME} tool_use block in response`
		}
	}

	const rawOutput = JSON.stringify(toolInput)

	const parsed = extractedItem.safeParse(toolInput)
	if (!parsed.success) {
		return {
			ok: false,
			stage: "extract",
			rawOutput,
			error: `Zod validation failed: ${JSON.stringify(parsed.error.issues)}`
		}
	}

	return { ok: true, data: parsed.data, rawOutput }
}

export type { ExtractedItem, ExtractFailure, ExtractResult, SubTypeId }
export {
	buildExtractSystemPrompt,
	EXTRACT_TOOL,
	EXTRACT_TOOL_NAME,
	extractedItem,
	extractFromImage
}
