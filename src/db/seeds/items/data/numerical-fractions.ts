import type { SeedItemInput } from "@/db/seeds/items/types"

const items: SeedItemInput[] = [
	{
		subTypeId: "numerical.fractions",
		difficulty: "easy",
		body: { kind: "text", text: "What is 1/2 + 1/4?" },
		options: [
			{ text: "1/6" },
			{ text: "2/6" },
			{ text: "3/4" },
			{ text: "1/3" }
		],
		correctAnswerIndex: 2,
		explanation: "1/2 = 2/4; 2/4 + 1/4 = 3/4."
	},
	{
		subTypeId: "numerical.fractions",
		difficulty: "easy",
		body: { kind: "text", text: "What is 2/3 of 9?" },
		options: [
			{ text: "3" },
			{ text: "5" },
			{ text: "6" },
			{ text: "9" }
		],
		correctAnswerIndex: 2,
		explanation: "9 ÷ 3 = 3; 3 × 2 = 6."
	},
	{
		subTypeId: "numerical.fractions",
		difficulty: "medium",
		body: { kind: "text", text: "What is 5/6 − 1/3?" },
		options: [
			{ text: "1/3" },
			{ text: "1/2" },
			{ text: "2/3" },
			{ text: "4/6" }
		],
		correctAnswerIndex: 1,
		explanation: "1/3 = 2/6; 5/6 − 2/6 = 3/6 = 1/2."
	},
	{
		subTypeId: "numerical.fractions",
		difficulty: "medium",
		body: { kind: "text", text: "What is 3/4 × 2/3?" },
		options: [
			{ text: "1/2" },
			{ text: "5/12" },
			{ text: "5/7" },
			{ text: "6/7" }
		],
		correctAnswerIndex: 0,
		explanation: "3/4 × 2/3 = 6/12 = 1/2."
	},
	{
		subTypeId: "numerical.fractions",
		difficulty: "hard",
		body: { kind: "text", text: "What is 7/8 ÷ 3/4?" },
		options: [
			{ text: "21/32" },
			{ text: "7/6" },
			{ text: "21/24" },
			{ text: "4/3" }
		],
		correctAnswerIndex: 1,
		explanation: "7/8 ÷ 3/4 = 7/8 × 4/3 = 28/24 = 7/6."
	}
]

export { items }
