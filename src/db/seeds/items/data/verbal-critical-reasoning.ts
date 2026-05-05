import type { SeedItemInput } from "@/db/seeds/items/types"

const items: SeedItemInput[] = [
	{
		subTypeId: "verbal.critical_reasoning",
		difficulty: "easy",
		body: {
			kind: "text",
			text: "All robins are birds. All birds have feathers. Which conclusion follows?"
		},
		options: [
			{ text: "All robins have feathers." },
			{ text: "All birds are robins." },
			{ text: "Only robins have feathers." },
			{ text: "Some robins do not have feathers." }
		],
		correctAnswerIndex: 0,
		explanation: "Transitivity: robins ⊂ birds, birds have feathers, so robins have feathers."
	},
	{
		subTypeId: "verbal.critical_reasoning",
		difficulty: "easy",
		body: {
			kind: "text",
			text: "If it is raining, the field is wet. The field is not wet. Which conclusion follows?"
		},
		options: [
			{ text: "It is raining." },
			{ text: "It is not raining." },
			{ text: "It will rain soon." },
			{ text: "The field is dry because of the sun." }
		],
		correctAnswerIndex: 1,
		explanation: "Modus tollens: rain → wet field; field not wet, so it is not raining."
	},
	{
		subTypeId: "verbal.critical_reasoning",
		difficulty: "medium",
		body: {
			kind: "text",
			text: "No reptiles are mammals. All snakes are reptiles. Which conclusion must be true?"
		},
		options: [
			{ text: "All mammals are snakes." },
			{ text: "Some snakes are mammals." },
			{ text: "No snakes are mammals." },
			{ text: "All reptiles are snakes." }
		],
		correctAnswerIndex: 2,
		explanation: "Snakes ⊂ reptiles, and reptiles ∩ mammals = ∅, so snakes ∩ mammals = ∅."
	},
	{
		subTypeId: "verbal.critical_reasoning",
		difficulty: "medium",
		body: {
			kind: "text",
			text: "Every employee at the firm has a security badge. Mira has a security badge. Which conclusion must be true?"
		},
		options: [
			{ text: "Mira is an employee at the firm." },
			{ text: "Mira is not an employee at the firm." },
			{ text: "If Mira is an employee at the firm, she has a security badge." },
			{ text: "Everyone with a security badge is an employee at the firm." }
		],
		correctAnswerIndex: 2,
		explanation: "Affirming the consequent is invalid; only the original conditional, restricted to Mira, can be reaffirmed."
	},
	{
		subTypeId: "verbal.critical_reasoning",
		difficulty: "hard",
		body: {
			kind: "text",
			text: "All physicists at the conference are also mathematicians. Some mathematicians at the conference are not physicists. Which statement must be true?"
		},
		options: [
			{ text: "There are mathematicians at the conference who are not physicists." },
			{ text: "All mathematicians at the conference are physicists." },
			{ text: "No physicists at the conference are mathematicians." },
			{ text: "There are no mathematicians at the conference." }
		],
		correctAnswerIndex: 0,
		explanation: "The second premise directly states there exist mathematicians (at the conference) who are not physicists."
	}
]

export { items }
