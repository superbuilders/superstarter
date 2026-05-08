import { expect, test } from "bun:test"
import { SIBLING_TOOL, SIBLING_TOOL_NAME } from "@/server/generation/sibling-tool"
import { submitSiblingSetSchema } from "@/server/generation/sibling-schema"
import { buildSiblingSystemPrompt, buildSiblingUserPrompt } from "@/server/generation/sibling-prompts"
import { subTypeIds } from "@/config/sub-types"

const validSibling = {
	body: { kind: "text" as const, text: "What is 2 + 2?" },
	options: [
		{ text: "3" },
		{ text: "4" },
		{ text: "5" },
		{ text: "22" }
	],
	correctAnswerText: "4",
	structuredExplanation: {
		parts: [
			{
				kind: "recognition" as const,
				text: "Single-step addition; standard arithmetic.",
				referencedOptionTexts: []
			},
			{
				kind: "elimination" as const,
				text: "Eliminate options whose value is not the sum of 2 and 2.",
				referencedOptionTexts: ["3", "5", "22"]
			}
		]
	}
}

const validPayload = {
	siblings: {
		easy: validSibling,
		medium: validSibling,
		hard: validSibling,
		brutal: validSibling
	}
}

test("submitSiblingSetSchema: parses a valid 4-tier payload", () => {
	const result = submitSiblingSetSchema.safeParse(validPayload)
	expect(result.success).toBe(true)
})

test("submitSiblingSetSchema: rejects payload missing the brutal tier", () => {
	const broken = {
		siblings: {
			easy: validSibling,
			medium: validSibling,
			hard: validSibling
		}
	}
	const result = submitSiblingSetSchema.safeParse(broken)
	expect(result.success).toBe(false)
})

test("submitSiblingSetSchema: rejects sibling with malformed body kind", () => {
	const broken = {
		siblings: {
			easy: validSibling,
			medium: validSibling,
			hard: validSibling,
			brutal: {
				...validSibling,
				body: { kind: "image", text: "should be rejected" }
			}
		}
	}
	const result = submitSiblingSetSchema.safeParse(broken)
	expect(result.success).toBe(false)
})

test("submitSiblingSetSchema: rejects structured-explanation with parts in wrong order", () => {
	const broken = {
		siblings: {
			easy: {
				...validSibling,
				structuredExplanation: {
					parts: [
						{
							kind: "elimination" as const,
							text: "wrong-order",
							referencedOptionTexts: []
						},
						{
							kind: "recognition" as const,
							text: "wrong-order",
							referencedOptionTexts: []
						}
					]
				}
			},
			medium: validSibling,
			hard: validSibling,
			brutal: validSibling
		}
	}
	const result = submitSiblingSetSchema.safeParse(broken)
	expect(result.success).toBe(false)
})

test("SIBLING_TOOL: name + JSON-Schema root shape derived from Zod", () => {
	expect(SIBLING_TOOL.name).toBe("submit_sibling_set")
	expect(SIBLING_TOOL.name).toBe(SIBLING_TOOL_NAME)
	expect(SIBLING_TOOL.input_schema.type).toBe("object")
	expect(SIBLING_TOOL.input_schema.required).toContain("siblings")
})

test("buildSiblingSystemPrompt: returns non-empty for every sub-type", () => {
	for (const subTypeId of subTypeIds) {
		const prompt = buildSiblingSystemPrompt(subTypeId)
		expect(prompt.length).toBeGreaterThan(0)
		expect(prompt).toContain("submit_sibling_set")
		expect(prompt).toContain("brutal")
	}
})

test("buildSiblingUserPrompt: renders source body, options, and correct answer text", () => {
	const prompt = buildSiblingUserPrompt({
		subTypeId: "numerical.fractions",
		difficulty: "medium",
		body: { kind: "text", text: "What is 1/2 + 1/4?" },
		options: [
			{ id: "abc12345", text: "1/2" },
			{ id: "def67890", text: "3/4" },
			{ id: "ghi23456", text: "1/8" },
			{ id: "jkl78901", text: "2/3" }
		],
		correctAnswer: "def67890",
		explanation: "Common denominator 4: 1/2 = 2/4; 2/4 + 1/4 = 3/4."
	})
	expect(prompt).toContain("What is 1/2 + 1/4?")
	expect(prompt).toContain("3/4")
	expect(prompt).toContain("Source explanation:")
})

test("buildSiblingUserPrompt: handles missing source explanation gracefully", () => {
	const prompt = buildSiblingUserPrompt({
		subTypeId: "verbal.antonyms",
		difficulty: "easy",
		body: { kind: "text", text: "Choose the antonym of LARGE." },
		options: [
			{ id: "aaa11111", text: "small" },
			{ id: "bbb22222", text: "huge" },
			{ id: "ccc33333", text: "tall" },
			{ id: "ddd44444", text: "wide" }
		],
		correctAnswer: "aaa11111"
	})
	expect(prompt).toContain("Choose the antonym")
	expect(prompt).toContain("(none")
})
