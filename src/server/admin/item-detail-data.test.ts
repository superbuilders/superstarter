// Pure-function tests for parseAdminCandidateRow and the provenance Zod
// schema. The async DB + filesystem loader is not exercised here (no DB
// harness + no test fixtures on disk); instead the row parser is hit
// against synthetic RawCandidateRow inputs and the snapshot schema is hit
// against synthetic JSON payloads.

import { expect, test } from "bun:test"
import {
	parseAdminCandidateRow,
	provenanceSnapshotSchema,
	type RawCandidateRow
} from "@/server/admin/item-detail-data"

function makeRow(over: Partial<RawCandidateRow> & { id: string }): RawCandidateRow {
	return {
		id: over.id,
		subTypeId: over.subTypeId === undefined ? "verbal.antonyms" : over.subTypeId,
		difficulty: over.difficulty === undefined ? "medium" : over.difficulty,
		source: over.source === undefined ? "generated" : over.source,
		status: over.status === undefined ? "candidate" : over.status,
		body: over.body === undefined ? { kind: "text", text: "Stem text." } : over.body,
		optionsJson:
			over.optionsJson === undefined
				? [
						{ id: "A", text: "alpha" },
						{ id: "B", text: "beta" }
					]
				: over.optionsJson,
		correctAnswer: over.correctAnswer === undefined ? "A" : over.correctAnswer,
		explanation: over.explanation === undefined ? null : over.explanation,
		sourceFolder: over.sourceFolder === undefined ? null : over.sourceFolder,
		sourceFilename: over.sourceFilename === undefined ? null : over.sourceFilename,
		metadataJson: over.metadataJson === undefined ? {} : over.metadataJson
	}
}

test("parseAdminCandidateRow: passes through scalar fields", function scalarPassthrough() {
	const row = makeRow({
		id: "01abc",
		subTypeId: "numerical.fractions",
		difficulty: "hard",
		source: "real",
		status: "live",
		correctAnswer: "C"
	})
	const parsed = parseAdminCandidateRow(row)
	expect(parsed.id).toBe("01abc")
	expect(parsed.subTypeId).toBe("numerical.fractions")
	expect(parsed.difficulty).toBe("hard")
	expect(parsed.source).toBe("real")
	expect(parsed.status).toBe("live")
	expect(parsed.correctAnswer).toBe("C")
})

test("parseAdminCandidateRow: parses body via itemBody schema", function bodyParse() {
	const row = makeRow({
		id: "01abc",
		body: { kind: "text", text: "What is 2+2?" }
	})
	const parsed = parseAdminCandidateRow(row)
	expect(parsed.body.kind).toBe("text")
	if (parsed.body.kind === "text") {
		expect(parsed.body.text).toBe("What is 2+2?")
	}
})

test("parseAdminCandidateRow: parses options array via schema", function optionsParse() {
	const row = makeRow({
		id: "01abc",
		optionsJson: [
			{ id: "A", text: "Apple" },
			{ id: "B", text: "Banana" },
			{ id: "C", text: "Cherry" }
		]
	})
	const parsed = parseAdminCandidateRow(row)
	expect(parsed.options.length).toBe(3)
	expect(parsed.options[0]?.id).toBe("A")
	expect(parsed.options[2]?.text).toBe("Cherry")
})

test("parseAdminCandidateRow: normalizes null explanation to undefined", function explanationNull() {
	const row = makeRow({ id: "01abc", explanation: null })
	const parsed = parseAdminCandidateRow(row)
	expect(parsed.explanation).toBeUndefined()
})

test("parseAdminCandidateRow: keeps explanation when present", function explanationPresent() {
	const row = makeRow({ id: "01abc", explanation: "Because two plus two." })
	const parsed = parseAdminCandidateRow(row)
	expect(parsed.explanation).toBe("Because two plus two.")
})

test("parseAdminCandidateRow: extracts sibling-gen metadata fields", function siblingGenMeta() {
	const row = makeRow({
		id: "01abc",
		metadataJson: {
			promptHash: "sha256:hash",
			generatedAt: "2026-05-08T21:12:43.432Z",
			parentItemId: "019dfd9c-1e7c-76bc-8299-e08567af3223",
			generatorModel: "claude-sonnet-4-6",
			templateVersion: 1
		}
	})
	const parsed = parseAdminCandidateRow(row)
	expect(parsed.metadata.promptHash).toBe("sha256:hash")
	expect(parsed.metadata.generatedAt).toBe("2026-05-08T21:12:43.432Z")
	expect(parsed.metadata.parentItemId).toBe("019dfd9c-1e7c-76bc-8299-e08567af3223")
	expect(parsed.metadata.generatorModel).toBe("claude-sonnet-4-6")
	expect(parsed.metadata.templateVersion).toBe(1)
})

test("parseAdminCandidateRow: extracts validatorResult into metadata", function validatorMeta() {
	const row = makeRow({
		id: "01abc",
		metadataJson: {
			validatorResult: {
				evaluatedAtMs: 1_700_000_000_000,
				hasAnyFlag: true,
				isPressureCell: false,
				flagsByName: {
					"embedding-distance": {
						kind: "flag",
						reason: "below threshold",
						metadata: { check: "off-topic" }
					}
				},
				thresholdsHash: "sha256:thresh",
				invokedByAdminEmail: "admin@example.com"
			}
		}
	})
	const parsed = parseAdminCandidateRow(row)
	expect(parsed.metadata.validatorResult).toBeDefined()
	expect(parsed.metadata.validatorResult?.hasAnyFlag).toBe(true)
	const flag = parsed.metadata.validatorResult?.flagsByName["embedding-distance"]
	expect(flag?.kind).toBe("flag")
})

test("parseAdminCandidateRow: pass-through unknown metadata keys", function passthrough() {
	const row = makeRow({
		id: "01abc",
		metadataJson: { unknownFutureKey: { nested: "value" } }
	})
	const parsed = parseAdminCandidateRow(row)
	expect(parsed.metadata.parentItemId).toBeUndefined()
})

test("parseAdminCandidateRow: throws on unknown sub_type_id", function unknownSubType() {
	const row = makeRow({ id: "01abc", subTypeId: "fake.sub_type" })
	expect(function attempt() {
		parseAdminCandidateRow(row)
	}).toThrow()
})

test("parseAdminCandidateRow: throws on malformed body", function malformedBody() {
	const row = makeRow({ id: "01abc", body: { wrongKey: true } })
	expect(function attempt() {
		parseAdminCandidateRow(row)
	}).toThrow()
})

test("parseAdminCandidateRow: throws on malformed options", function malformedOptions() {
	const row = makeRow({ id: "01abc", optionsJson: "not-an-array" })
	expect(function attempt() {
		parseAdminCandidateRow(row)
	}).toThrow()
})

test("provenanceSnapshotSchema: parses minimum-shape snapshot", function minSnap() {
	const payload = {
		parentItemId: "019d-test",
		generatedAt: "2026-05-08T21:00:00.000Z",
		generatorModel: "claude-sonnet-4-6",
		templateVersion: 1,
		promptHash: "sha256:abc",
		source: {
			id: "parent-id",
			subTypeId: "verbal.antonyms",
			difficulty: "medium",
			body: { kind: "text", text: "Pick the antonym of phlegmatic." },
			options: [{ id: "A", text: "choleric" }],
			correctAnswer: "A"
		}
	}
	const result = provenanceSnapshotSchema.safeParse(payload)
	expect(result.success).toBe(true)
	if (result.success) {
		expect(result.data.parentItemId).toBe("019d-test")
		expect(result.data.source.body.text).toContain("phlegmatic")
	}
})

test("provenanceSnapshotSchema: accepts optional siblings array", function snapWithSiblings() {
	const payload = {
		parentItemId: "019d-test",
		generatedAt: "2026-05-08T21:00:00.000Z",
		generatorModel: "claude-sonnet-4-6",
		templateVersion: 1,
		promptHash: "sha256:abc",
		source: {
			id: "parent-id",
			subTypeId: "verbal.antonyms",
			difficulty: "medium",
			body: { kind: "text", text: "x" },
			options: [{ id: "A", text: "y" }],
			correctAnswer: "A"
		},
		siblings: [
			{
				tier: "easy",
				insertedItemId: "sib-1",
				body: { kind: "text", text: "easier x" },
				options: [{ id: "A", text: "y" }],
				correctAnswer: "A"
			}
		]
	}
	const result = provenanceSnapshotSchema.safeParse(payload)
	expect(result.success).toBe(true)
	if (result.success) {
		expect(result.data.siblings?.length).toBe(1)
	}
})

test("provenanceSnapshotSchema: rejects missing parentItemId", function missingParent() {
	const payload = {
		generatedAt: "2026-05-08T21:00:00.000Z",
		generatorModel: "claude-sonnet-4-6",
		templateVersion: 1,
		promptHash: "sha256:abc",
		source: {
			id: "parent-id",
			subTypeId: "verbal.antonyms",
			difficulty: "medium",
			body: { kind: "text", text: "x" },
			options: [{ id: "A", text: "y" }],
			correctAnswer: "A"
		}
	}
	const result = provenanceSnapshotSchema.safeParse(payload)
	expect(result.success).toBe(false)
})
