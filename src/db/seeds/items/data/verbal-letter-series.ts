import type { SeedItemInput } from "@/db/seeds/items/types"

const items: SeedItemInput[] = [
	{
		subTypeId: "verbal.letter_series",
		difficulty: "easy",
		body: { kind: "text", text: "What letter comes next? A, C, E, G, ___" },
		options: [
			{ text: "H" },
			{ text: "I" },
			{ text: "J" },
			{ text: "K" }
		],
		correctAnswerIndex: 1,
		explanation: "Skip every other letter; G + 2 = I."
	},
	{
		subTypeId: "verbal.letter_series",
		difficulty: "easy",
		body: { kind: "text", text: "What letter comes next? Z, X, V, T, ___" },
		options: [
			{ text: "S" },
			{ text: "R" },
			{ text: "Q" },
			{ text: "P" }
		],
		correctAnswerIndex: 1,
		explanation: "Decreasing alphabet by 2; T - 2 = R."
	},
	{
		subTypeId: "verbal.letter_series",
		difficulty: "medium",
		body: { kind: "text", text: "What pair comes next? AZ, BY, CX, ___" },
		options: [
			{ text: "DV" },
			{ text: "DW" },
			{ text: "EW" },
			{ text: "DX" }
		],
		correctAnswerIndex: 1,
		explanation: "First letter advances forward (A, B, C, D); second letter moves backward (Z, Y, X, W). Next pair: DW."
	},
	{
		subTypeId: "verbal.letter_series",
		difficulty: "medium",
		body: { kind: "text", text: "What letter comes next? B, D, G, K, ___" },
		options: [
			{ text: "M" },
			{ text: "N" },
			{ text: "O" },
			{ text: "P" }
		],
		correctAnswerIndex: 3,
		explanation: "Gaps grow by one: B(+2)D(+3)G(+4)K(+5)P. Next is P."
	},
	{
		subTypeId: "verbal.letter_series",
		difficulty: "hard",
		body: { kind: "text", text: "What pair comes next? AB, DE, HI, MN, ___" },
		options: [
			{ text: "RS" },
			{ text: "ST" },
			{ text: "TU" },
			{ text: "QR" }
		],
		correctAnswerIndex: 1,
		explanation: "Pairs are consecutive letter-pairs separated by gaps of 1, 2, 3, 4 letters. After MN, skip 4 (O, P, Q, R) to start at S → ST."
	}
]

export { items }
