// Prompt builders for Phase 4 sub-phase a's similar-item generator.
//
// The system prompt is the per-sub-type stem from `itemTemplates`
// (preserved through commit 2's body/option Zod consolidation) plus a
// sibling-mode appendix that describes the four-tier output contract
// per plan §7.1's bulleted instructions. The user prompt renders the
// source item's body / options / correct answer plus an optional
// source explanation (the 50 seed items lack `structuredExplanation`
// per the §12 distribution audit, so the explanation field is
// optional at the boundary).

import type { Difficulty, SubTypeId } from "@/config/sub-types"
import { itemTemplates } from "@/config/item-templates"

const SIBLING_MODE_APPENDIX = [
	"",
	"You are now in sibling-mode. Given ONE source CCAT question, produce FOUR sibling questions — one each at easy, medium, hard, and brutal difficulty — by calling the `submit_sibling_set` tool.",
	"",
	"Hard rules for siblings:",
	"- Preserve problem structure: same operation, same number of decision-points, same relationship between the correct answer and the distractors.",
	"- Vary surface details: different numbers, different named entities, different subjects. The sibling must NOT be a near-duplicate of the source.",
	"- Each sibling is independently solvable from its own body + options. Do not assume the solver has seen the source.",
	"- Difficulty tiers map to expected solver-time budgets: easy under 8 seconds, medium 8–14 seconds, hard 14–18 seconds, brutal above 18 seconds.",
	"- Options are text-only — return options[].text strings only. The server assigns opaque ids after your call. The correctAnswerText must equal the EXACT text of one of the options.",
	"- Each sibling carries its own structured explanation: 2 or 3 parts in order [recognition, elimination, optional tie-breaker]. The structured explanation's `referencedOptionTexts` lists the EXACT option-text strings the part names; the server resolves text → id post-assignment.",
	"- Each sibling has 4 or 5 options.",
	""
].join("\n")

const DIFFICULTY_BUDGET_LINES: Record<Difficulty, string> = {
	easy: "easy: solver hits this in under 8 seconds.",
	medium: "medium: solver hits this in 8–14 seconds.",
	hard: "hard: solver hits this in 14–18 seconds; clear traps for inattention.",
	brutal: "brutal: solver hits this only above the 18-second target; should reward triage."
}

function buildSiblingSystemPrompt(subTypeId: SubTypeId): string {
	const template = itemTemplates[subTypeId]
	const tierLines = [
		"Per-tier solver-time budgets for this set:",
		`- ${DIFFICULTY_BUDGET_LINES.easy}`,
		`- ${DIFFICULTY_BUDGET_LINES.medium}`,
		`- ${DIFFICULTY_BUDGET_LINES.hard}`,
		`- ${DIFFICULTY_BUDGET_LINES.brutal}`
	].join("\n")
	return `${template.systemPrompt}${SIBLING_MODE_APPENDIX}${tierLines}`
}

interface SiblingSourceContext {
	subTypeId: SubTypeId
	difficulty: Difficulty
	body: { kind: "text"; text: string }
	options: { id: string; text: string }[]
	correctAnswer: string
	explanation?: string
}

function findCorrectAnswerText(
	options: { id: string; text: string }[],
	correctAnswerId: string
): string | undefined {
	for (const option of options) {
		if (option.id === correctAnswerId) return option.text
	}
	return undefined
}

function buildSiblingUserPrompt(source: SiblingSourceContext): string {
	const correctText = findCorrectAnswerText(source.options, source.correctAnswer)
	const correctTextLine = correctText === undefined
		? `Correct answer (option id, text not resolvable): ${source.correctAnswer}`
		: `Correct answer (text): ${correctText}`
	const explanationBlock = source.explanation === undefined
		? "Source explanation: (none — generate the sibling explanations from the body + options + correct answer alone.)"
		: `Source explanation:\n${source.explanation}`
	const lines = [
		`Source sub-type: ${source.subTypeId}`,
		`Source difficulty: ${source.difficulty}`,
		"",
		"Source question:",
		source.body.text,
		"",
		"Source options (text only):",
		source.options.map((o) => `- ${o.text}`).join("\n"),
		"",
		correctTextLine,
		"",
		explanationBlock,
		"",
		"Produce four siblings — easy, medium, hard, brutal — via the submit_sibling_set tool."
	]
	return lines.join("\n")
}

export type { SiblingSourceContext }
export { buildSiblingSystemPrompt, buildSiblingUserPrompt }
