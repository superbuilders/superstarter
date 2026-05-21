import type { SeedItemInput } from "@/db/seeds/items/types"

const items: SeedItemInput[] = [
	{
		subTypeId: "numerical.ratios",
		difficulty: "easy",
		body: { kind: "text", text: "If the ratio of cats to dogs is 3 : 2, and there are 9 cats, how many dogs are there?" },
		options: [
			{ text: "4" },
			{ text: "6" },
			{ text: "8" },
			{ text: "12" }
		],
		correctAnswerIndex: 1,
		explanation: "3 cats per 2 dogs; 9 cats ÷ 3 = 3 groups; 3 × 2 = 6 dogs."
	},
	{
		subTypeId: "numerical.ratios",
		difficulty: "medium",
		body: { kind: "text", text: "A recipe uses flour and sugar in a 5 : 3 ratio. If 24 ounces of sugar are used, how many ounces of flour are used?" },
		options: [
			{ text: "30" },
			{ text: "32" },
			{ text: "36" },
			{ text: "40" }
		],
		correctAnswerIndex: 3,
		explanation: "Sugar : flour = 3 : 5; 24 / 3 = 8 per part; 5 × 8 = 40 ounces of flour."
	}
]

export { items }
