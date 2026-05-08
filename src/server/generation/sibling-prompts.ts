// Prompt builders for Phase 4 sub-phase a's similar-item generator.
//
// The system prompt is the per-sub-type stem from `itemTemplates`
// (preserved through commit 2's body/option Zod consolidation) plus a
// sibling-mode appendix that describes the four-tier output contract.
// The user prompt renders the source item's body / options / correct
// answer plus an optional source explanation (the 50 seed items lack
// `structuredExplanation` per the §12 distribution audit, so the
// explanation field is optional at the boundary).
//
// Difficulty calibration anchor (recalibrated post-commit-7):
//
//   The four tiers are anchored to real-CCAT distribution rather than
//   abstract relative-difficulty bands. BRUTAL is the ceiling — the
//   maximum-difficulty items a real 50-question CCAT throws at high-
//   performing test-takers. EASY / MEDIUM / HARD are spaced relative
//   to that ceiling. A solver consistently correct on brutal-tier
//   items under the 18-second-per-question CCAT pressure should be
//   expected to score 40+ on a real CCAT (~95th percentile per
//   published Criteria Cognitive Aptitude Test norms; modest variance
//   by candidate role). This benchmark makes brutal non-arbitrary.
//
// Per-sub-type brutal anchors:
//
//   Each of the 14 v1 sub-types has its own concrete characterization
//   of what max-CCAT-difficulty looks like for that sub-type. The
//   anchor is embedded inline in the system prompt for the active
//   sub-type only (cache-friendly + tighter prompt). These anchors
//   become the validator's reference points in sub-phase b.

import type { Difficulty, SubTypeId } from "@/config/sub-types"
import { itemTemplates } from "@/config/item-templates"

const SIBLING_MODE_APPENDIX = [
	"",
	"You are now in sibling-mode. Given ONE source CCAT question, produce FOUR sibling questions — one each at easy, medium, hard, and brutal difficulty — by calling the `submit_sibling_set` tool.",
	"",
	"CRITICAL — anti-copying rule. When an anchor description below names a specific word, number, sequence, structural pattern, or worked example, that example exists for your understanding only. NEVER reuse the named instance as the generated item's surface content. For each sibling you produce, the body, options, and structured explanation MUST use DIFFERENT specific words / numbers / structures than any named in this prompt. The anchor describes a SHAPE the item must satisfy; you select the surface. This rule applies across the four siblings within one source AND across separate generation calls — siblings produced for two different source items in the same sub-type must NOT share the same target word, the same numeric sequence, or the same worked-example structure.",
	"",
	"Hard rules for siblings:",
	"- Preserve problem structure: the same operation family and the same relationship between the correct answer and the distractors. Surface details (numbers, named entities, subjects) MUST vary; the sibling must NOT be a near-duplicate of the source.",
	"- Each sibling is independently solvable from its own body + options. Do not assume the solver has seen the source.",
	"- Options are text-only — return options[].text strings only. The server assigns opaque ids after your call. The correctAnswerText must equal the EXACT text of one of the options.",
	"- OPTION DISTINCTNESS: each option's text must be lexically distinct from every other option's text within the same sibling. Identical strings across two options will cause the sibling set to be rejected. If two computations or two semantic constructions yield the same surface text (e.g., two arithmetic paths producing '216', or two phrasings yielding 'increase'), choose a different surface for one (different rounding, different unit, different phrasing) OR replace one with a different distractor.",
	"- Each sibling carries its own structured explanation: 2 or 3 parts in order [recognition, elimination, optional tie-breaker].",
	"- REFERENCED OPTION EXACT-MATCH: when listing referencedOptionTexts in any structuredExplanation part, each string must be COPY-PASTE EXACT from the same sibling's options[].text field. No paraphrasing. No character substitution (e.g., do NOT substitute em-dash '—' for hyphen-minus '-'; do NOT substitute typographic quotes for straight quotes; do NOT add or drop whitespace). The mismatch will cause the sibling set to be rejected; the server resolves text → id post-assignment via exact-string match.",
	"- Each sibling has 4 or 5 options.",
	""
].join("\n")

const DIFFICULTY_TIER_CALIBRATION = [
	"Difficulty calibration — anchored to real-CCAT distribution, NOT abstract relative bands:",
	"",
	"- BRUTAL is the CEILING of real-CCAT difficulty. The hardest items a real Criteria Cognitive Aptitude Test gives high-performing test-takers under 18-second-per-question pressure. Multi-step reasoning, sophisticated distractors that match the correct answer except for one subtle attribute, combined operations or unusual transformations within the sub-type. Solver time: 18–25+ seconds even for trained solvers. The benchmark: a solver who is consistently correct on brutal-tier items under CCAT timing should score 40+ on a real 50-question CCAT (~95th percentile per published norms).",
	"- HARD = difficult-but-recognizable technique. The technique is recognizable to someone trained in the sub-type, but applying it under time pressure is still demanding. Solver time: 15–20 seconds. Distractors include common-error traps (off-by-one, wrong-step-order, premature simplification).",
	"- MEDIUM = standard CCAT test items. Single-technique recognition, moderate trap, ~10–15 seconds. The bulk of a real CCAT.",
	"- EASY = entry-level CCAT items. Single straightforward operation, ~6–10 seconds. STILL CCAT-shape — not arithmetic drill, not elementary vocabulary; the lower end of real-CCAT distribution.",
	"",
	"Tier-spacing tests (apply these BEFORE submitting each tier):",
	"- The brutal sibling MUST require either (a) more decision points than the source, OR (b) a transformation/composition the source does not have, OR (c) distractors with strictly more sophisticated trap-mechanics than the source. \"Bigger numbers\" or \"longer noun phrases\" alone do not raise difficulty — they are surface-detail variations belonging to medium tier at most.",
	"- The easy → medium → hard → brutal progression must be MEANINGFUL, not compressed. If you cannot articulate WHY each step is harder than the prior, the spacing is too tight; reach for the per-sub-type brutal anchor below to widen brutal, then space easy/medium/hard relative to it.",
	""
].join("\n")

const SUB_TYPE_BRUTAL_ANCHORS: Record<SubTypeId, string> = {
	"verbal.antonyms":
		"Brutal-tier anchor for verbal.antonyms: Low-frequency vocabulary at college+ register where the target word is polysemous — it carries a dominant semantic sense AND a secondary (often historical, archaic, or domain-specific) sense, and the two senses have DIFFERENT antonyms. The CORRECT answer is the antonym of the dominant sense. The distractor set is structured to defeat surface-reading: (a) the antonym of the secondary sense — the most sophisticated trap, since it IS technically an antonym just of the wrong sense; (b) one near-synonym of the target's dominant sense (defeats solvers who reverse the question); (c) one word from the same semantic field that opposes a different attribute (e.g., if target involves emotional state, this distractor opposes a tonal/affective attribute the target only weakly evokes); (d) optionally a synonym of the secondary sense (reinforces the secondary-sense trap). Vocabulary candidates: words with humoral/medical-historical etymology, Latin/Greek-rooted abstract qualities, or words whose surface morphology suggests a meaning that the etymology contradicts. Each generation MUST select a different target word; do not reuse a target word seen in any other generation, in any other sibling tier, or implied by any example in this prompt.",
	"verbal.analogies":
		"Brutal-tier anchor for verbal.analogies: Multi-step or abstract relationships (causal, transformative, part/whole inversion, function/agent) where the relationship type ITSELF is ambiguous. Distractors offer plausible adjacent relationships (e.g., synonym vs causal opposite, container/contained vs origin/product), so the solver must lock the precise relationship type from the first pair before testing options. Avoid simple category-membership analogies (cat:mammal::dog:?) at brutal tier.",
	"verbal.sentence_completion":
		"Brutal-tier anchor for verbal.sentence_completion: Double-blank sentences where each blank locks a different semantic constraint via a conjunction (but / although / despite / yet / nonetheless), with college+ register vocabulary. Distractor pairs satisfy ONE blank's constraint while violating the other; the correct pair is the only one satisfying both simultaneously. Single-blank brutal items use vocabulary at GRE register (perspicacious, nascent, mendacious) where the blank's collocation rules out plausible-but-wrong fits.",
	"verbal.critical_reasoning":
		"Brutal-tier anchor for verbal.critical_reasoning: Multi-premise logical chains requiring tracking 3+ propositions or set relationships, OR spatial-direction puzzles with 3+ direction changes where intermediate state must be reconstructed, OR conditional-with-negation chains (modus tollens through a conjunctive antecedent). Distractors capture errors in any single intermediate step (off-by-one in direction, swapped premise polarity, conflated necessary-vs-sufficient, illicit conversion). Avoid 2-premise transitive syllogisms (All A are B; All B are C) at brutal tier — those belong at easy/medium.",
	"verbal.letter_series":
		"Brutal-tier anchor for verbal.letter_series: Multi-letter groups (2–3 letters per term) where each letter-position follows a different rule (e.g., position 1 advances by +2, position 2 alternates +1/+3, position 3 advances by primes), OR single-letter sequences whose alphabet-distance follows a non-trivial pattern (1, 2, 4, 7, 11 — distances of differences), OR sequences with case-shifts encoding a parallel rule. Distractors offer the answer for the wrong rule on one position.",
	"numerical.number_series":
		"Brutal-tier anchor for numerical.number_series: Alternating dual operations within one sequence (e.g., +n then ×m repeating), second-differences forming a sub-pattern, OR position-dependent rules where term-k is f(k) (squares, primes, factorial-related, k²+k). Distractors capture single-rule extrapolations (the answer if you assumed only the first operation continues, or assumed simple arithmetic when the pattern is multiplicative). \"Bigger numbers with the same arithmetic rule\" is medium tier at most.",
	"numerical.word_problems":
		"Brutal-tier anchor for numerical.word_problems: Multi-step prose requiring 3+ chained operations, often with embedded unit conversions or rate transformations within the prose. One or more distractors match the answer if a single intermediate step is computed correctly but combined incorrectly (off-by-one in operation order, missed final scaling, wrong direction of subtraction). Avoid pure two-step word problems at brutal — those are medium.",
	"numerical.fractions":
		"Brutal-tier anchor for numerical.fractions: Nested fraction operations (fraction-of-a-fraction with intermediate simplification), OR comparison/operation across fractions where the answer set mixes lowest-terms forms with non-reduced equivalents, OR mixed-number operations requiring conversion both ways. Distractors include unsimplified-correct values, same-numerator-wrong-denominator traps, and arithmetic-instead-of-fraction errors (3/4 + 2/5 → 5/9). \"Larger numerators/denominators with the same one-step operation\" is medium tier.",
	"numerical.percentages":
		"Brutal-tier anchor for numerical.percentages: Successive or compounded percent changes (e.g., +X% then −Y% on the new amount, where the trap distractor computes ±(X−Y)%), OR percent-relative-to-which-baseline ambiguity where the trap computes against the wrong reference value. Correct answer requires explicit baseline tracking; distractors include the result if you used the original instead of the new baseline, or applied the second percentage to the original.",
	"numerical.averages":
		"Brutal-tier anchor for numerical.averages: Weighted averages where the weights must be derived from the prose, OR averages-of-averages where the trap distractor naively averages the group means (correct answer requires recomputing from total values), OR add-or-remove-element problems where the new mean depends on the deviation of the changed element from the existing mean. Avoid plain arithmetic-mean problems at brutal — those are easy/medium.",
	"numerical.ratios":
		"Brutal-tier anchor for numerical.ratios: Three-part ratios (a:b:c) requiring proportional split across all three parts simultaneously, OR ratio-change problems where a known total plus a new ratio implies a specific add/remove from one part. The brutal version layers either (a) a third part the solver must allocate alongside two named parts, OR (b) a mid-process state where the prose gives one ratio at time T1 and a different ratio at time T2 with a known relationship between the totals or one specific part. Distractors compute under a two-part-ratio assumption (ignoring the third part), against the wrong total, or by treating the ratio as additive rather than proportional. Each generation MUST select different ratio numerals and different total-quantities; do not reuse the specific ratio shape from any earlier generation.",
	"numerical.workrate":
		"Brutal-tier anchor for numerical.workrate: Combined-work problems with mid-task changes — one worker joins or leaves partway, a draining process counteracts a filling process, OR rates given in different units (per hour vs per shift) requiring conversion before combination. Distractors compute the steady-state rate without accounting for the change-point, or use the wrong rate-combination formula (sum vs harmonic).",
	"numerical.speed_distance_time":
		"Brutal-tier anchor for numerical.speed_distance_time: Two-leg journeys at different speeds where the AVERAGE-speed answer is harmonic, NOT the arithmetic mean of the leg speeds, OR relative-speed problems with two objects in motion (closing or separating, possibly from different start times). Distractors compute the arithmetic mean of speeds, or use one object's speed as the answer, or invert the time/distance relation.",
	"numerical.lowest_values":
		"Brutal-tier anchor for numerical.lowest_values: Comparing 5+ expressions across mixed forms (decimals, fractions, percents, mixed numbers, ratios) where 2–3 candidates differ by under 5% requiring careful conversion. Distractors capture solvers who eyeball the form without converting (e.g., picking the option with the smallest numerator, or assuming \"smaller decimal = smaller value\" without checking sign or magnitude). At least one distractor is the second-smallest value to penalize careless ordering."
}

function buildSiblingSystemPrompt(subTypeId: SubTypeId): string {
	const template = itemTemplates[subTypeId]
	const brutalAnchor = SUB_TYPE_BRUTAL_ANCHORS[subTypeId]
	const calibration = `${DIFFICULTY_TIER_CALIBRATION}\n${brutalAnchor}\n`
	return `${template.systemPrompt}${SIBLING_MODE_APPENDIX}${calibration}`
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
