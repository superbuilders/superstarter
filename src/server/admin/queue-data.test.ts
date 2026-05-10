// Pure-function tests for parseAdminQueueItem (the Zod-narrowed metadata
// parser inside loadAdminQueueData). The DB-touching async loader is not
// tested here (no DB harness wired into bun:test); instead the parser is
// exercised against synthetic CandidateRow inputs that mirror the row shape
// returned by the candidate SELECT.

import { expect, test } from "bun:test"
import {
	BODY_PREVIEW_MAX_CHARS,
	isValidatorStale,
	parseAdminQueueItem,
	truncateBodyText,
	type CandidateRow
} from "@/server/admin/queue-data"

function makeRow(over: Partial<CandidateRow> & { id: string }): CandidateRow {
	return {
		id: over.id,
		subTypeId: over.subTypeId === undefined ? "verbal.antonyms" : over.subTypeId,
		difficulty: over.difficulty === undefined ? "medium" : over.difficulty,
		source: over.source === undefined ? "generated" : over.source,
		correctAnswer: over.correctAnswer === undefined ? "A" : over.correctAnswer,
		body: over.body === undefined ? { kind: "text", text: "Stem text." } : over.body,
		metadataJson: over.metadataJson === undefined ? {} : over.metadataJson
	}
}

test("truncateBodyText: returns input unchanged when ≤ max", function noTruncation() {
	const short = "Stem text."
	expect(truncateBodyText(short)).toBe(short)
})

test("truncateBodyText: truncates + appends ellipsis when > max", function truncation() {
	const long = "x".repeat(BODY_PREVIEW_MAX_CHARS + 10)
	const out = truncateBodyText(long)
	expect(out.length).toBe(BODY_PREVIEW_MAX_CHARS + 1)
	expect(out.endsWith("…")).toBe(true)
})

test("parseAdminQueueItem: passes through subType + difficulty + correctAnswer", function basicPassthrough() {
	const row = makeRow({
		id: "01abc",
		subTypeId: "numerical.fractions",
		difficulty: "hard",
		correctAnswer: "C"
	})
	const parsed = parseAdminQueueItem(row)
	expect(parsed.id).toBe("01abc")
	expect(parsed.subTypeId).toBe("numerical.fractions")
	expect(parsed.difficulty).toBe("hard")
	expect(parsed.correctAnswer).toBe("C")
})

test("parseAdminQueueItem: extracts body preview from text body", function bodyPreview() {
	const row = makeRow({
		id: "01abc",
		body: { kind: "text", text: "What is 2 + 2?" }
	})
	const parsed = parseAdminQueueItem(row)
	expect(parsed.bodyPreview).toBe("What is 2 + 2?")
})

test("parseAdminQueueItem: bodyPreview empty when body parse fails", function bodyParseFails() {
	const row = makeRow({
		id: "01abc",
		body: { invalid: true }
	})
	const parsed = parseAdminQueueItem(row)
	expect(parsed.bodyPreview).toBe("")
})

test("parseAdminQueueItem: defaults validator fields to clean state when absent", function noValidator() {
	const row = makeRow({ id: "01abc", metadataJson: {} })
	const parsed = parseAdminQueueItem(row)
	expect(parsed.hasAnyFlag).toBe(false)
	expect(parsed.isPressureCell).toBe(false)
	expect(parsed.flagsByName).toEqual({})
	expect(parsed.evaluatedAtMs).toBeUndefined()
	expect(parsed.invokedByAdminEmail).toBeUndefined()
})

test("parseAdminQueueItem: extracts validatorResult fields when present", function withValidator() {
	const row = makeRow({
		id: "01abc",
		metadataJson: {
			promptHash: "abc123def456",
			validatorResult: {
				evaluatedAtMs: 1_700_000_000_000,
				hasAnyFlag: true,
				isPressureCell: true,
				flagsByName: {
					"embedding-distance": {
						kind: "flag",
						reason: "cosine 0.12 below min 0.30",
						metadata: { cosine: 0.12 }
					},
					"schema-shape": { kind: "pass" }
				},
				thresholdsHash: "sha256:abcd",
				invokedByAdminEmail: "admin@example.com"
			}
		}
	})
	const parsed = parseAdminQueueItem(row)
	expect(parsed.hasAnyFlag).toBe(true)
	expect(parsed.isPressureCell).toBe(true)
	expect(parsed.evaluatedAtMs).toBe(1_700_000_000_000)
	expect(parsed.invokedByAdminEmail).toBe("admin@example.com")
	expect(parsed.cohortKey).toBe("abc123def456")
	const flag = parsed.flagsByName["embedding-distance"]
	expect(flag?.kind).toBe("flag")
	if (flag?.kind === "flag") {
		expect(flag.reason).toBe("cosine 0.12 below min 0.30")
	}
})

test("parseAdminQueueItem: extracts cohortKey from metadata.promptHash even without validatorResult", function cohortOnly() {
	const row = makeRow({
		id: "01abc",
		metadataJson: { promptHash: "hash-xyz" }
	})
	const parsed = parseAdminQueueItem(row)
	expect(parsed.cohortKey).toBe("hash-xyz")
	expect(parsed.hasAnyFlag).toBe(false)
})

test("parseAdminQueueItem: throws on unknown sub_type_id", function unknownSubType() {
	const row = makeRow({ id: "01abc", subTypeId: "fake.sub_type" })
	expect(function attempt() {
		parseAdminQueueItem(row)
	}).toThrow()
})

test("isValidatorStale: false when staleAfterMs absent", function staleAbsent() {
	expect(isValidatorStale(1000, undefined)).toBe(false)
})

test("isValidatorStale: false when evaluatedAtMs > staleAfterMs (post-revalidation)", function postRevalidate() {
	expect(isValidatorStale(2000, 1000)).toBe(false)
})

test("isValidatorStale: false when evaluatedAtMs equal to staleAfterMs", function equalTimestamps() {
	expect(isValidatorStale(1000, 1000)).toBe(false)
})

test("isValidatorStale: true when staleAfterMs > evaluatedAtMs (edit after validation)", function staleAfterEdit() {
	expect(isValidatorStale(1000, 2000)).toBe(true)
})

test("isValidatorStale: true when evaluatedAtMs undefined but staleAfterMs present", function impossibleStateGuard() {
	// Defensive: an item with a stale marker but no evaluation timestamp
	// shouldn't occur in practice (submitEditAction sets staleAfterMs only
	// on rows that already had a validator run). If it does happen, treat
	// as stale to surface the anomaly in the queue.
	expect(isValidatorStale(undefined, 1000)).toBe(true)
})

test("parseAdminQueueItem: validatorStale=true when staleAfterMs > evaluatedAtMs", function parsedStale() {
	const row = makeRow({
		id: "01abc",
		metadataJson: {
			validatorResult: {
				evaluatedAtMs: 1_700_000_000_000,
				hasAnyFlag: false,
				isPressureCell: false,
				flagsByName: {},
				thresholdsHash: "sha256:thresh",
				invokedByAdminEmail: "admin@example.com",
				staleAfterMs: 1_700_000_000_001
			}
		}
	})
	const parsed = parseAdminQueueItem(row)
	expect(parsed.validatorStale).toBe(true)
	expect(parsed.staleAfterMs).toBe(1_700_000_000_001)
})

test("parseAdminQueueItem: validatorStale=false when validatorResult absent", function parsedNoValidator() {
	const row = makeRow({ id: "01abc", metadataJson: {} })
	const parsed = parseAdminQueueItem(row)
	expect(parsed.validatorStale).toBe(false)
	expect(parsed.staleAfterMs).toBeUndefined()
})
