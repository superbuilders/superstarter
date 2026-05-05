import { z } from "zod"
import type { Difficulty, SubTypeId } from "@/config/sub-types"

const BodyText = z.object({
	kind: z.literal("text"),
	text: z.string().min(1)
})

const ItemBody = z.discriminatedUnion("kind", [BodyText])

const Option = z.object({
	text: z.string().min(1)
})

const generatedItem = z.object({
	body: ItemBody,
	options: z.array(Option).min(2).max(5),
	correctAnswer: z.string().min(1),
	explanation: z.string().min(1)
})

type GeneratedItem = z.infer<typeof generatedItem>

interface ItemTemplate {
	subTypeId: SubTypeId
	version: number
	systemPrompt: string
	userPromptFor: (difficulty: Difficulty) => string
	schema: typeof generatedItem
}

const COMMON_SYSTEM = [
	"You are generating a single Criteria Cognitive Aptitude Test (CCAT) practice item for an adult test-prep app.",
	"The CCAT gives the user roughly 18 seconds per question.",
	"Output must validate against the provided JSON schema. No prose outside the JSON.",
	"Provide between 4 and 5 options, each with just its text; the system will assign ids.",
	"correctAnswer must equal exactly one of the option ids.",
	"explanation must be one or two sentences explaining why the answer is correct."
].join(" ")

function difficultyHint(difficulty: Difficulty): string {
	if (difficulty === "easy") {
		return "Difficulty: easy. The expected solver hits this in under 8 seconds."
	}
	if (difficulty === "medium") {
		return "Difficulty: medium. The expected solver hits this in 8–14 seconds."
	}
	if (difficulty === "hard") {
		return "Difficulty: hard. The expected solver hits this in 14–18 seconds; clear traps for inattention."
	}
	return "Difficulty: brutal. The expected solver hits this only above the 18-second target; should reward triage."
}

function buildTemplate(
	subTypeId: SubTypeId,
	systemTail: string,
	userPromptStem: (difficulty: Difficulty) => string
): ItemTemplate {
	return {
		subTypeId,
		version: 1,
		systemPrompt: `${COMMON_SYSTEM} ${systemTail}`,
		userPromptFor: (difficulty) => `${userPromptStem(difficulty)}\n${difficultyHint(difficulty)}`,
		schema: generatedItem
	}
}

const itemTemplates: Record<SubTypeId, ItemTemplate> = {
	"verbal.antonyms": buildTemplate(
		"verbal.antonyms",
		"Generate a CCAT antonyms item: a target word and four to five candidate options of which one is the clearest opposite.",
		(difficulty) =>
			`Generate one CCAT antonyms item at ${difficulty} difficulty. The body.text must be a single target word. Options are candidate antonyms.`
	),
	"verbal.analogies": buildTemplate(
		"verbal.analogies",
		"Generate a CCAT analogy item in the form A : B :: C : ?. Options complete the second pair such that the relationship matches.",
		(difficulty) =>
			`Generate one CCAT analogy item at ${difficulty} difficulty. body.text contains the partial analogy in the form 'A : B :: C : ?'.`
	),
	"verbal.sentence_completion": buildTemplate(
		"verbal.sentence_completion",
		"Generate a CCAT sentence-completion item: a sentence with one or two blanks and four to five options that fill the blanks.",
		(difficulty) =>
			`Generate one CCAT sentence-completion item at ${difficulty} difficulty. body.text contains the sentence with blanks marked as '___'.`
	),
	"verbal.critical_reasoning": buildTemplate(
		"verbal.critical_reasoning",
		"Generate a CCAT critical-reasoning item: a short premise (or pair of premises) and a candidate conclusion. Options are True / False / Uncertain or labeled equivalents. Spatial-direction problems are valid.",
		(difficulty) =>
			`Generate one CCAT critical-reasoning item at ${difficulty} difficulty. body.text contains the premises and the candidate conclusion.`
	),
	"verbal.letter_series": buildTemplate(
		"verbal.letter_series",
		"Generate a CCAT letter-series item: a sequence of letters or letter groups with one missing term. Options are candidate next terms.",
		(difficulty) =>
			`Generate one CCAT letter-series item at ${difficulty} difficulty. body.text contains the sequence ending in '?'. Underlying rule maps to alphabet positions.`
	),
	"numerical.number_series": buildTemplate(
		"numerical.number_series",
		"Generate a CCAT number-series item: a sequence of numbers with one missing term (the next term). Options are candidate next terms.",
		(difficulty) =>
			`Generate one CCAT number-series item at ${difficulty} difficulty. body.text contains the sequence ending in '?'. Underlying rule should be guessable in under 18 seconds.`
	),
	"numerical.word_problems": buildTemplate(
		"numerical.word_problems",
		"Generate a CCAT arithmetic word-problem item: a short real-world scenario with one numeric answer. No calculator. Math should be light (one or two steps).",
		(difficulty) =>
			`Generate one CCAT word-problem item at ${difficulty} difficulty. body.text contains the problem statement. Options are candidate numeric answers.`
	),
	"numerical.fractions": buildTemplate(
		"numerical.fractions",
		"Generate a CCAT fractions item: compare fractions, pick the largest/smallest, or convert between forms. Options are fractions or numeric answers.",
		(difficulty) =>
			`Generate one CCAT fractions item at ${difficulty} difficulty. body.text contains the question and the fraction set if needed.`
	),
	"numerical.percentages": buildTemplate(
		"numerical.percentages",
		"Generate a CCAT percentages item: compute a percent change, percent-of, or relative comparison. Options are numeric answers.",
		(difficulty) =>
			`Generate one CCAT percentages item at ${difficulty} difficulty. body.text contains the scenario.`
	),
	"numerical.averages": buildTemplate(
		"numerical.averages",
		"Generate a CCAT averages item: compute a mean or weighted average. Options are numeric answers.",
		(difficulty) =>
			`Generate one CCAT averages item at ${difficulty} difficulty. body.text contains the scenario.`
	),
	"numerical.ratios": buildTemplate(
		"numerical.ratios",
		"Generate a CCAT ratios item: compute a ratio split, scale a ratio, or compare ratios. Options are numeric answers or ratio expressions.",
		(difficulty) =>
			`Generate one CCAT ratios item at ${difficulty} difficulty. body.text contains the scenario.`
	),
	"numerical.workrate": buildTemplate(
		"numerical.workrate",
		"Generate a CCAT work-rate item: combined-work or rate-of-completion problem (e.g. 'A and B together can paint a room in N hours…'). Options are numeric answers in time units.",
		(difficulty) =>
			`Generate one CCAT work-rate item at ${difficulty} difficulty. body.text contains the scenario.`
	),
	"numerical.speed_distance_time": buildTemplate(
		"numerical.speed_distance_time",
		"Generate a CCAT speed-distance-time item: solve for any one of speed, distance, or time given the other two. Options are numeric answers.",
		(difficulty) =>
			`Generate one CCAT speed-distance-time item at ${difficulty} difficulty. body.text contains the scenario.`
	),
	"numerical.lowest_values": buildTemplate(
		"numerical.lowest_values",
		"Generate a CCAT lowest-value item: a small set of numeric expressions to compare and pick the smallest (or largest) value. Options are the candidates themselves.",
		(difficulty) =>
			`Generate one CCAT lowest-value item at ${difficulty} difficulty. body.text contains the comparison prompt.`
	)
}

export type { GeneratedItem, ItemTemplate }
export { generatedItem, itemTemplates }
