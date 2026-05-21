import type { SeedItemInput } from "@/db/seeds/items/types"

const items: SeedItemInput[] = [
	{
		subTypeId: "verbal.analogies",
		difficulty: "easy",
		body: { kind: "text", text: "PUPPY is to DOG as KITTEN is to ___." },
		options: [
			{ text: "mouse" },
			{ text: "cat" },
			{ text: "fish" },
			{ text: "bird" }
		],
		correctAnswerIndex: 1,
		explanation: "A puppy is a young dog; a kitten is a young cat."
	},
	{
		subTypeId: "verbal.analogies",
		difficulty: "easy",
		body: { kind: "text", text: "PETAL is to FLOWER as LEAF is to ___." },
		options: [
			{ text: "tree" },
			{ text: "stone" },
			{ text: "river" },
			{ text: "cloud" }
		],
		correctAnswerIndex: 0,
		explanation: "A petal is a part of a flower; a leaf is a part of a tree."
	},
	{
		subTypeId: "verbal.analogies",
		difficulty: "medium",
		body: { kind: "text", text: "AUTHOR is to BOOK as COMPOSER is to ___." },
		options: [
			{ text: "stage" },
			{ text: "audience" },
			{ text: "symphony" },
			{ text: "instrument" }
		],
		correctAnswerIndex: 2,
		explanation: "An author creates a book; a composer creates a symphony (a musical work)."
	},
	{
		subTypeId: "verbal.analogies",
		difficulty: "medium",
		body: { kind: "text", text: "OUNCE is to POUND as CENTIMETER is to ___." },
		options: [
			{ text: "kilogram" },
			{ text: "meter" },
			{ text: "liter" },
			{ text: "inch" }
		],
		correctAnswerIndex: 1,
		explanation: "There are 16 ounces in a pound and 100 centimeters in a meter — both pairs are smaller-to-larger units of the same kind (mass, length)."
	},
	{
		subTypeId: "verbal.analogies",
		difficulty: "hard",
		body: { kind: "text", text: "CAUTIOUS is to RECKLESS as FRUGAL is to ___." },
		options: [
			{ text: "thrifty" },
			{ text: "extravagant" },
			{ text: "honest" },
			{ text: "wealthy" }
		],
		correctAnswerIndex: 1,
		explanation: "Cautious and reckless are antonyms; frugal (sparing) and extravagant (lavish) are antonyms in the same way."
	}
]

export { items }
