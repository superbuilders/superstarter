import type { SeedItemInput } from "@/db/seeds/items/types"

const items: SeedItemInput[] = [
	{
		subTypeId: "verbal.sentence_completion",
		difficulty: "easy",
		body: {
			kind: "text",
			text: "After the long hike, the children were so ___ that they fell asleep immediately."
		},
		options: [
			{ text: "energetic" },
			{ text: "tired" },
			{ text: "curious" },
			{ text: "hungry" }
		],
		correctAnswerIndex: 1,
		explanation: "Falling asleep immediately follows from being tired, not energetic, curious, or hungry."
	},
	{
		subTypeId: "verbal.sentence_completion",
		difficulty: "easy",
		body: {
			kind: "text",
			text: "Although the recipe was simple, the cake turned out ___ because the oven was broken."
		},
		options: [
			{ text: "delicious" },
			{ text: "perfect" },
			{ text: "ruined" },
			{ text: "famous" }
		],
		correctAnswerIndex: 2,
		explanation: "A broken oven explains a bad outcome; 'ruined' is the only option that fits the cause."
	},
	{
		subTypeId: "verbal.sentence_completion",
		difficulty: "medium",
		body: {
			kind: "text",
			text: "The committee's decision was met with ___ approval; even members who had opposed the proposal congratulated the chair."
		},
		options: [
			{ text: "reluctant" },
			{ text: "unanimous" },
			{ text: "partial" },
			{ text: "delayed" }
		],
		correctAnswerIndex: 1,
		explanation: "Even former opponents congratulating the chair signals everyone agreed; 'unanimous' fits."
	},
	{
		subTypeId: "verbal.sentence_completion",
		difficulty: "medium",
		body: {
			kind: "text",
			text: "Despite extensive preparation, the speaker grew increasingly ___ as the audience filled the room."
		},
		options: [
			{ text: "confident" },
			{ text: "nervous" },
			{ text: "indifferent" },
			{ text: "amused" }
		],
		correctAnswerIndex: 1,
		explanation: "'Despite preparation' signals an unexpected response to a growing crowd; 'nervous' captures that tension."
	},
	{
		subTypeId: "verbal.sentence_completion",
		difficulty: "hard",
		body: {
			kind: "text",
			text: "The historian's account was praised for its ___, presenting events without favoring any party in the conflict."
		},
		options: [
			{ text: "verbosity" },
			{ text: "impartiality" },
			{ text: "embellishment" },
			{ text: "obscurity" }
		],
		correctAnswerIndex: 1,
		explanation: "'Without favoring any party' defines impartiality."
	}
]

export { items }
