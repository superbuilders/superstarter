// scripts/_lib/explain.ts
//
// Explain pass: writes the structured triage explanation for a CCAT
// question that already has options assigned opaque ids. Used by stage 2
// (generate-explanations) and stage 3 (regenerate-explanations).
// EXEMPT FROM THE PROJECT RULESET.

import type Anthropic from "@anthropic-ai/sdk"
import { z } from "zod"
import type { SubTypeId } from "@/config/sub-types"
import {
	client,
	EXPLAIN_MAX_TOKENS,
	EXPLAIN_MODEL,
	withBackoff
} from "@scripts/_lib/anthropic"

const subTypeStyleHints: Partial<Record<SubTypeId, string>> = {
	"verbal.antonyms":
		"When two options point opposite, the more general opposite usually wins. Watch for words with multiple meanings keyed to the less obvious sense.",
	"verbal.analogies":
		"The relationship is the answer; the words are the problem. Solve the relationship first, then test it against each option.",
	"verbal.sentence_completion":
		"Conjunctions and contrast words (but, although, however) lock the relationship between blanks. Solve the locked side first.",
	"verbal.critical_reasoning":
		"Translate the premises into the simplest spatial or set-relationship form. The conclusion is then a direct read-off.",
	"verbal.letter_series":
		"Convert letters to alphabet positions and pattern-match on the integers. Group letters work the same way per slot.",
	"numerical.number_series":
		"Look for first or second differences before exotic rules. If differences don't help, check ratios.",
	"numerical.word_problems":
		"Set up the calculation in the smallest unit, then scale up at the end. Most traps come from premature rounding or unit-confusion.",
	"numerical.fractions":
		"Convert to a common form before comparing — either common denominator or decimals to two places. Eyeballing fails on close pairs.",
	"numerical.percentages":
		"Translate 'X% of Y' into multiplication and 'X is what % of Y' into division. Most traps come from confusing the two directions.",
	"numerical.averages":
		"Sum first, divide last. For added/removed-element averages, work the delta-from-mean rather than re-averaging.",
	"numerical.ratios":
		"Decide parts-to-parts or parts-to-whole first; then scale to the question's known quantity (3:2 with 9 → 9:6)."
	// numerical.workrate, numerical.speed_distance_time, numerical.lowest_values: pending strategy-authoring round.
}

const FALLBACK_HINT =
	"Walk through the question step-by-step and explain the path a fast solver would take from prompt to answer."

const structuredExplanationOutput = z
	.object({
		parts: z
			.array(
				z.object({
					kind: z.enum(["recognition", "elimination", "tie-breaker"]),
					text: z.string().min(1),
					referencedOptions: z.array(z.string())
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

type StructuredExplanationOutput = z.infer<typeof structuredExplanationOutput>

const EXPLAIN_SYSTEM_TEMPLATE = `You are writing a post-session-review explanation for a CCAT (Criteria Cognitive Aptitude Test) multiple-choice question. The user has already attempted the question; they are now reviewing items they got wrong (or got slowly).

Your explanation models the internal monologue of a fast test-taker working through this problem in 15 seconds — recognize, eliminate, decide. The CCAT gives 18 seconds per question; the user does not have time for a derivation. They need two or three decision moves they can use on the next problem of the same kind.

Call the submit_structured_explanation tool with two or three parts in this order:

1. RECOGNITION — Name the pattern type AND the first move a fast solver makes. Examples:
   - "Double-blank sentence-completion problem; solve the conjunction-locked blank first."
   - "Antonym problem; sort options by relationship-to-target before reading meanings."
   - "Multi-letter group letter series; convert each position to its number track separately."
   referencedOptions: usually empty, since recognition names the pattern, not specific options. Include an option only if the recognition itself depends on a specific option's content.

2. ELIMINATION — A scan-and-cut rule that gets the user from 5 options to 2 in seconds. NOT a derivation. Examples:
   - "Cross out any option whose adjective and noun feel interchangeable — analogies require directional relationships."
   - "Eliminate options describing substitution or movement; the answer must reverse acquisition itself, so 'replace' and 'pass' both go."
   referencedOptions: list the option ids your elimination rule cuts. If the rule cuts 'replace' and 'pass', return the ids of those options (not the words — look up the ids from the options array provided in the user message).

3. TIE-BREAKER (CONDITIONAL — see rule below) — When elimination leaves two or more plausibly-correct options, write a tie-breaker that names the rule for picking between them. Examples:
   - "Between 'pass' and 'sell', prefer 'sell' — antonyms reward reversing the core action, not naming a transfer."
   - "Pick the first-word option that causally explains the effect; 'lengthy' causes drowsiness, while 'rambling' merely describes a quality."
   referencedOptions: list the option ids the tie-breaker is choosing between.

When to OMIT the tie-breaker: count the option ids in your elimination's referencedOptions array. If they include every option except the correct answer, OMIT the tie-breaker — submit only two parts (recognition + elimination). The test is mechanical: count the ids, compare to the option list, decide. Do not emit a tie-breaker that compares the correct answer to "any survivor" or "any remaining option" — those phrases are signals you should have omitted instead.

Hard rules:
- When referring to an answer choice in the text, quote its text exactly (e.g., 'sell' or 'engaging') rather than paraphrasing. Do not invent paraphrases like "the transfer-flavored option."
- The text of each part teaches a *triage move*, not a derivation. If a part walks step-by-step through arithmetic or restates premises, it's failing the contract.
- Each part's text is one sentence, or two if the move genuinely has parallel sub-steps (e.g., a double-blank where each blank needs a rule).
- referencedOptions contains option ids drawn directly from the options array in the user message — never invented, never option text. Look up each option id from the user message's options block.
- referencedOptions for a part lists every option whose content is named anywhere in that part's text — including options named as counter-examples, named in passing, or named alongside the primary subject. If the text contains the literal text of an option (or any substring distinctive to that option), include the option's id. When in doubt, include.
- Do not address the user ("you should…", "notice that…"). Describe the moves in third person or imperative.
- Do not restate the question.
- Do not name option ids in the explanation prose. The ids are for the referencedOptions array only — the prose refers to options by quoted text.
- Elimination teaches a single cut RULE — not multiple sequential cuts wrapped in derivation. If your elimination is naming each wrong option individually with its own per-option reasoning, you are deriving the answer rather than teaching a triage move. Compress to a single rule that cuts multiple options at once. Example: "Cut any pair where both words share the same part of speech" cuts four options in one move; "Cut 'Excited:Thrilled' because synonyms, cut 'Potent:Robust' because synonyms, cut 'Capacity:Volume' because nouns, cut 'Wrath:Irate' because reversed" is the same elimination performed wrong.
- No bullets, no headers, no LaTeX, no multi-line equations. Plain prose inside each part's text.

Sub-type style hint for this question: \${SUB_TYPE_HINT}`

const EXPLAIN_TOOL_NAME = "submit_structured_explanation"
const EXPLAIN_TOOL: Anthropic.Messages.Tool = {
	name: EXPLAIN_TOOL_NAME,
	description:
		"Submit the post-session-review explanation as two or three structured parts in fixed order: recognition, elimination, optional tie-breaker. Each part's text teaches a triage move; referencedOptions lists the option ids whose content the text names.",
	input_schema: {
		type: "object",
		properties: {
			parts: {
				type: "array",
				minItems: 2,
				maxItems: 3,
				items: {
					type: "object",
					properties: {
						kind: {
							type: "string",
							enum: ["recognition", "elimination", "tie-breaker"]
						},
						text: { type: "string" },
						referencedOptions: {
							type: "array",
							items: { type: "string" },
							description:
								"option ids drawn from the options array in the user message — opaque strings, not letters or invented values"
						}
					},
					required: ["kind", "text", "referencedOptions"]
				}
			}
		},
		required: ["parts"]
	}
}

function formatOptionsBlock(options: { id: string; text: string }[]): string {
	return options.map((o) => `${o.id}. ${o.text}`).join("\n")
}

async function writeStructuredExplanation(
	question: string,
	options: { id: string; text: string }[],
	correctAnswer: string,
	subTypeId: SubTypeId,
	originalExplanation: string | undefined
): Promise<StructuredExplanationOutput> {
	const hint = subTypeStyleHints[subTypeId] ?? FALLBACK_HINT
	const system = EXPLAIN_SYSTEM_TEMPLATE.replace("${SUB_TYPE_HINT}", hint)

	const userContent = [
		"Question:",
		question,
		"",
		"Options (id. text):",
		formatOptionsBlock(options),
		"",
		`Correct answer (option id): ${correctAnswer}`,
		"",
		`Source explanation (background context only — write a fresh explanation, do not paraphrase): ${originalExplanation ?? "(none)"}`
	].join("\n")

	const message = await withBackoff("explain", () =>
		client.messages.create({
			model: EXPLAIN_MODEL,
			max_tokens: EXPLAIN_MAX_TOKENS,
			temperature: 0,
			system,
			tools: [EXPLAIN_TOOL],
			tool_choice: { type: "tool", name: EXPLAIN_TOOL_NAME },
			messages: [{ role: "user", content: userContent }]
		})
	)

	let toolInput: unknown
	for (const block of message.content) {
		if (block.type === "tool_use" && block.name === EXPLAIN_TOOL_NAME) {
			toolInput = block.input
			break
		}
	}
	if (toolInput === undefined) {
		throw new Error(`no ${EXPLAIN_TOOL_NAME} tool_use block in explain response`)
	}

	const parsed = structuredExplanationOutput.safeParse(toolInput)
	if (!parsed.success) {
		throw new Error(`explanation Zod validation failed: ${JSON.stringify(parsed.error.issues)}`)
	}
	return parsed.data
}

function renderExplanationProse(structured: StructuredExplanationOutput): string {
	return structured.parts.map((p) => p.text).join(" ")
}

export type { StructuredExplanationOutput }
export { renderExplanationProse, structuredExplanationOutput, writeStructuredExplanation }
