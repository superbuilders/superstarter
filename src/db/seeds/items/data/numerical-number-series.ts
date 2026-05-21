import type { SeedItemInput } from "@/db/seeds/items/types"

const items: SeedItemInput[] = [
	{
		subTypeId: "numerical.number_series",
		difficulty: "easy",
		body: { kind: "text", text: "What number comes next? 2, 4, 6, 8, ___" },
		options: [
			{ text: "9" },
			{ text: "10" },
			{ text: "11" },
			{ text: "12" }
		],
		correctAnswerIndex: 1,
		explanation: "Arithmetic sequence with common difference +2; 8 + 2 = 10."
	},
	{
		subTypeId: "numerical.number_series",
		difficulty: "easy",
		body: { kind: "text", text: "What number comes next? 5, 10, 20, 40, ___" },
		options: [
			{ text: "60" },
			{ text: "70" },
			{ text: "80" },
			{ text: "100" }
		],
		correctAnswerIndex: 2,
		explanation: "Each term doubles; 40 × 2 = 80."
	},
	{
		subTypeId: "numerical.number_series",
		difficulty: "medium",
		body: { kind: "text", text: "What number comes next? 3, 5, 9, 15, 23, ___" },
		options: [
			{ text: "30" },
			{ text: "31" },
			{ text: "33" },
			{ text: "35" }
		],
		correctAnswerIndex: 2,
		explanation: "Differences are 2, 4, 6, 8, 10 (increase by 2 each step). 23 + 10 = 33."
	},
	{
		subTypeId: "numerical.number_series",
		difficulty: "medium",
		body: { kind: "text", text: "What number comes next? 1, 4, 9, 16, 25, ___" },
		options: [
			{ text: "30" },
			{ text: "32" },
			{ text: "34" },
			{ text: "36" }
		],
		correctAnswerIndex: 3,
		explanation: "Sequence of perfect squares: 1², 2², 3², 4², 5², 6². The next is 6² = 36."
	},
	{
		subTypeId: "numerical.number_series",
		difficulty: "hard",
		body: { kind: "text", text: "What number comes next? 2, 6, 12, 20, 30, ___" },
		options: [
			{ text: "40" },
			{ text: "42" },
			{ text: "44" },
			{ text: "48" }
		],
		correctAnswerIndex: 1,
		explanation: "Each term is n(n+1) for n = 1, 2, 3, 4, 5, so n = 6 gives 6 × 7 = 42. (Differences: 4, 6, 8, 10, 12.)"
	}
]

export { items }
