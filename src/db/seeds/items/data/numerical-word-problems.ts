import type { SeedItemInput } from "@/db/seeds/items/types"

const items: SeedItemInput[] = [
	{
		subTypeId: "numerical.word_problems",
		difficulty: "easy",
		body: {
			kind: "text",
			text: "A box contains 12 apples. If 4 apples are eaten, how many remain?"
		},
		options: [
			{ text: "6" },
			{ text: "7" },
			{ text: "8" },
			{ text: "9" }
		],
		correctAnswerIndex: 2,
		explanation: "12 − 4 = 8."
	},
	{
		subTypeId: "numerical.word_problems",
		difficulty: "easy",
		body: {
			kind: "text",
			text: "A bus has 47 passengers; 12 get off and 8 get on. How many passengers are on the bus now?"
		},
		options: [
			{ text: "35" },
			{ text: "43" },
			{ text: "51" },
			{ text: "67" }
		],
		correctAnswerIndex: 1,
		explanation: "47 − 12 + 8 = 43."
	},
	{
		subTypeId: "numerical.word_problems",
		difficulty: "medium",
		body: {
			kind: "text",
			text: "A train travels 60 miles in 1.5 hours. At the same speed, how far does it travel in 4 hours?"
		},
		options: [
			{ text: "120 miles" },
			{ text: "150 miles" },
			{ text: "160 miles" },
			{ text: "180 miles" }
		],
		correctAnswerIndex: 2,
		explanation: "Speed = 60 ÷ 1.5 = 40 mph; 40 × 4 = 160 miles."
	},
	{
		subTypeId: "numerical.word_problems",
		difficulty: "medium",
		body: {
			kind: "text",
			text: "A class has 30 students. If 60% are girls, how many are boys?"
		},
		options: [
			{ text: "10" },
			{ text: "12" },
			{ text: "15" },
			{ text: "18" }
		],
		correctAnswerIndex: 1,
		explanation: "Boys = 40% of 30 = 0.4 × 30 = 12."
	},
	{
		subTypeId: "numerical.word_problems",
		difficulty: "hard",
		body: {
			kind: "text",
			text: "Pipe A fills a tank in 6 hours; pipe B fills it in 12 hours. If both run together, how long do they take to fill the tank?"
		},
		options: [
			{ text: "3 hours" },
			{ text: "4 hours" },
			{ text: "5 hours" },
			{ text: "9 hours" }
		],
		correctAnswerIndex: 1,
		explanation: "Combined rate = 1/6 + 1/12 = 3/12 = 1/4 tank per hour, so 4 hours."
	}
]

export { items }
