import type { SeedItemInput } from "@/db/seeds/items/types"

const items: SeedItemInput[] = [
	{
		subTypeId: "verbal.antonyms",
		difficulty: "easy",
		body: { kind: "text", text: "Choose the word that is most nearly the OPPOSITE of HOT." },
		options: [
			{ text: "warm" },
			{ text: "tepid" },
			{ text: "cold" },
			{ text: "humid" }
		],
		correctAnswerIndex: 2,
		explanation: "'Cold' is the direct opposite of HOT."
	},
	{
		subTypeId: "verbal.antonyms",
		difficulty: "easy",
		body: { kind: "text", text: "Choose the word that is most nearly the OPPOSITE of FAST." },
		options: [
			{ text: "rapid" },
			{ text: "slow" },
			{ text: "loud" },
			{ text: "early" }
		],
		correctAnswerIndex: 1,
		explanation: "'Slow' is the direct opposite of FAST."
	},
	{
		subTypeId: "verbal.antonyms",
		difficulty: "medium",
		body: { kind: "text", text: "Choose the word that is most nearly the OPPOSITE of SCARCE." },
		options: [
			{ text: "abundant" },
			{ text: "expensive" },
			{ text: "useful" },
			{ text: "limited" }
		],
		correctAnswerIndex: 0,
		explanation: "'Scarce' means rare or in short supply; 'abundant' is its opposite."
	},
	{
		subTypeId: "verbal.antonyms",
		difficulty: "medium",
		body: { kind: "text", text: "Choose the word that is most nearly the OPPOSITE of PRAISE." },
		options: [
			{ text: "applaud" },
			{ text: "criticize" },
			{ text: "ignore" },
			{ text: "study" }
		],
		correctAnswerIndex: 1,
		explanation: "'Criticize' (find fault with) is the most direct opposite of PRAISE."
	},
	{
		subTypeId: "verbal.antonyms",
		difficulty: "hard",
		body: { kind: "text", text: "Choose the word that is most nearly the OPPOSITE of GREGARIOUS." },
		options: [
			{ text: "talkative" },
			{ text: "outgoing" },
			{ text: "reclusive" },
			{ text: "courteous" }
		],
		correctAnswerIndex: 2,
		explanation: "'Gregarious' means sociable; 'reclusive' (avoiding company) is the opposite."
	}
]

export { items }
