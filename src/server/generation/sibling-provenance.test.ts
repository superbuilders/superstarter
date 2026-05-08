import { afterEach, expect, test } from "bun:test"
import * as fs from "node:fs"
import * as path from "node:path"
import {
	provenancePathFor,
	type SiblingComparisonRow,
	type SiblingProvenancePayload,
	writeSiblingComparisonMd,
	writeSiblingProvenance
} from "@/server/generation/sibling-provenance"

const TEST_PARENT_ID = "019ffff0-test-7000-0000-000000000001"
const TEST_MD_PATH = "scripts/_logs/_sibling-test-run-comparison-test.md"

function cleanupProvenanceFile(): void {
	const target = provenancePathFor(TEST_PARENT_ID)
	if (fs.existsSync(target)) {
		fs.unlinkSync(target)
	}
}

function cleanupMdFile(): void {
	if (fs.existsSync(TEST_MD_PATH)) {
		fs.unlinkSync(TEST_MD_PATH)
	}
}

afterEach(() => {
	cleanupProvenanceFile()
	cleanupMdFile()
})

const samplePayload: SiblingProvenancePayload = {
	parentItemId: TEST_PARENT_ID,
	generatedAt: "2026-05-08T12:00:00.000Z",
	generatorModel: "claude-sonnet-4-6",
	templateVersion: 1,
	promptHash: "sha256:0000000000000000000000000000000000000000000000000000000000000000",
	source: {
		id: TEST_PARENT_ID,
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
		explanation: "Common denominator 4."
	},
	llmOutputVerbatim: {
		siblings: {
			easy: {
				body: { kind: "text", text: "1/2 + 1/2" },
				options: [{ text: "1" }, { text: "2" }, { text: "0" }, { text: "1/4" }],
				correctAnswerText: "1",
				structuredExplanation: {
					parts: [
						{
							kind: "recognition",
							text: "Same-denominator addition.",
							referencedOptionTexts: []
						},
						{
							kind: "elimination",
							text: "Eliminate non-1 options.",
							referencedOptionTexts: ["2", "0", "1/4"]
						}
					]
				}
			},
			medium: {
				body: { kind: "text", text: "2/3 + 1/6" },
				options: [{ text: "5/6" }, { text: "3/9" }, { text: "1/2" }, { text: "3/6" }],
				correctAnswerText: "5/6",
				structuredExplanation: {
					parts: [
						{
							kind: "recognition",
							text: "Common-denominator addition.",
							referencedOptionTexts: []
						},
						{
							kind: "elimination",
							text: "Eliminate options not equal to 5/6.",
							referencedOptionTexts: ["3/9", "1/2", "3/6"]
						}
					]
				}
			},
			hard: {
				body: { kind: "text", text: "5/8 - 1/3" },
				options: [
					{ text: "7/24" },
					{ text: "4/5" },
					{ text: "5/24" },
					{ text: "8/24" }
				],
				correctAnswerText: "7/24",
				structuredExplanation: {
					parts: [
						{
							kind: "recognition",
							text: "Subtraction with LCD = 24.",
							referencedOptionTexts: []
						},
						{
							kind: "elimination",
							text: "Eliminate options not equal to 7/24.",
							referencedOptionTexts: ["4/5", "5/24", "8/24"]
						}
					]
				}
			},
			brutal: {
				body: { kind: "text", text: "(2/3 + 1/4) × (3/5 - 1/2)" },
				options: [
					{ text: "11/120" },
					{ text: "1/24" },
					{ text: "5/12" },
					{ text: "11/12" }
				],
				correctAnswerText: "11/120",
				structuredExplanation: {
					parts: [
						{
							kind: "recognition",
							text: "Compound-operation fraction problem.",
							referencedOptionTexts: []
						},
						{
							kind: "elimination",
							text: "Eliminate fractions whose denominators don't divide 120.",
							referencedOptionTexts: ["5/12", "11/12"]
						},
						{
							kind: "tie-breaker",
							text: "Pick the option requiring both LCD and difference of small fractions.",
							referencedOptionTexts: ["11/120", "1/24"]
						}
					]
				}
			}
		}
	},
	siblings: [
		{
			tier: "easy",
			insertedItemId: "019ffff0-test-7000-0000-000000000010",
			body: { kind: "text", text: "1/2 + 1/2" },
			options: [
				{ id: "11111111", text: "1" },
				{ id: "22222222", text: "2" },
				{ id: "33333333", text: "0" },
				{ id: "44444444", text: "1/4" }
			],
			correctAnswer: "11111111",
			resolvedReferencedOptions: [
				{ partKind: "recognition", optionIds: [] },
				{ partKind: "elimination", optionIds: ["22222222", "33333333", "44444444"] }
			],
			embeddingDimensions: 1536,
			embeddingSampleHead: [0.01, 0.02, 0.03]
		}
	],
	usage: {
		model: "claude-sonnet-4-6",
		input_tokens: 1300,
		output_tokens: 1100,
		cache_read_input_tokens: 0,
		cache_creation_input_tokens: 0,
		cost_estimate_usd: 0.0204,
		duration_ms: 5400
	}
}

test("writeSiblingProvenance: round-trips through fs and parses back to the same shape", () => {
	writeSiblingProvenance(TEST_PARENT_ID, samplePayload)
	const target = provenancePathFor(TEST_PARENT_ID)
	expect(fs.existsSync(target)).toBe(true)

	const raw = fs.readFileSync(target, "utf8")
	expect(raw.endsWith("\n")).toBe(true)
	expect(raw).toContain('"parentItemId": "019ffff0-test-7000-0000-000000000001"')

	const parsed = JSON.parse(raw)
	expect(parsed.parentItemId).toBe(TEST_PARENT_ID)
	expect(parsed.generatorModel).toBe("claude-sonnet-4-6")
	expect(parsed.usage.input_tokens).toBe(1300)
	expect(parsed.usage.cost_estimate_usd).toBe(0.0204)
	expect(parsed.source.subTypeId).toBe("numerical.fractions")
	expect(parsed.siblings).toHaveLength(1)
})

test("provenancePathFor: builds scripts/_siblings/<id>.json", () => {
	const p = provenancePathFor("abc-def")
	expect(p).toBe(path.join("scripts/_siblings", "abc-def.json"))
})

test("writeSiblingComparisonMd: renders without throwing for empty rows", () => {
	writeSiblingComparisonMd([], TEST_MD_PATH)
	expect(fs.existsSync(TEST_MD_PATH)).toBe(true)
	const raw = fs.readFileSync(TEST_MD_PATH, "utf8")
	expect(raw).toContain("# Sibling test-run comparison")
	expect(raw).toContain("empty test run")
})

test("writeSiblingComparisonMd: renders a 1-row fixture with source + sibling sections", () => {
	// `siblings` is optional on SiblingProvenancePayload (commit 4 made it
	// optional so the LLM-call-only smoke can write a payload without
	// post-processing decisions). The fixture populates it; assert via
	// expect() and narrow with an early return to satisfy the type check
	// without invoking the require-logger-before-throw rule.
	const siblings = samplePayload.siblings
	expect(siblings).toBeDefined()
	if (siblings === undefined) return
	const row: SiblingComparisonRow = {
		subTypeId: "numerical.fractions",
		source: samplePayload.source,
		siblings
	}
	writeSiblingComparisonMd([row], TEST_MD_PATH)
	const raw = fs.readFileSync(TEST_MD_PATH, "utf8")
	expect(raw).toContain("## numerical.fractions")
	expect(raw).toContain("**Source**")
	expect(raw).toContain("**Sibling — easy**")
	expect(raw).toContain("What is 1/2 + 1/4?")
	expect(raw).toContain("1/2 + 1/2")
})
