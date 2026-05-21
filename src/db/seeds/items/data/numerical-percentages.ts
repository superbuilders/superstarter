import type { SeedItemInput } from "@/db/seeds/items/types"

const items: SeedItemInput[] = [
	{
		subTypeId: "numerical.percentages",
		difficulty: "easy",
		body: { kind: "text", text: "What is 25% of 80?" },
		options: [
			{ text: "15" },
			{ text: "20" },
			{ text: "25" },
			{ text: "30" }
		],
		correctAnswerIndex: 1,
		explanation: "25% of 80 = 80 ÷ 4 = 20."
	},
	{
		subTypeId: "numerical.percentages",
		difficulty: "easy",
		body: { kind: "text", text: "What is 10% of 250?" },
		options: [
			{ text: "20" },
			{ text: "25" },
			{ text: "30" },
			{ text: "50" }
		],
		correctAnswerIndex: 1,
		explanation: "10% of 250 = 250 ÷ 10 = 25."
	},
	{
		subTypeId: "numerical.percentages",
		difficulty: "medium",
		body: { kind: "text", text: "A jacket originally costs $80. After a 15% discount, what is the sale price?" },
		options: [
			{ text: "$60" },
			{ text: "$65" },
			{ text: "$68" },
			{ text: "$72" }
		],
		correctAnswerIndex: 2,
		explanation: "Discount = 0.15 × 80 = 12; sale price = 80 − 12 = $68."
	},
	{
		subTypeId: "numerical.percentages",
		difficulty: "medium",
		body: {
			kind: "text",
			text: "A salary of $40,000 increases by 12%. What is the new salary?"
		},
		options: [
			{ text: "$42,800" },
			{ text: "$44,000" },
			{ text: "$44,800" },
			{ text: "$48,000" }
		],
		correctAnswerIndex: 2,
		explanation: "12% of 40,000 = 4,800; 40,000 + 4,800 = 44,800."
	},
	{
		subTypeId: "numerical.percentages",
		difficulty: "hard",
		body: {
			kind: "text",
			text: "A price rises 20% then falls 20%. The final price is what percent of the original?"
		},
		options: [
			{ text: "100%" },
			{ text: "98%" },
			{ text: "96%" },
			{ text: "92%" }
		],
		correctAnswerIndex: 2,
		explanation: "1.20 × 0.80 = 0.96, so the final price is 96% of the original."
	}
]

export { items }
