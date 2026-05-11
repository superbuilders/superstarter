// Pure-function tests for parseAdminQueueItem (the Zod-narrowed metadata
// parser inside loadAdminQueueData). The DB-touching async loader is not
// tested here (no DB harness wired into bun:test); instead the parser is
// exercised against synthetic CandidateRow inputs that mirror the row shape
// returned by the candidate SELECT.

import { expect, test } from "bun:test"
import {
	aggregateDispositionStats,
	aggregateStatusCounts,
	BODY_PREVIEW_MAX_CHARS,
	isValidatorStale,
	parseAdminQueueItem,
	truncateBodyText,
	utcMidnightForToday,
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

test("aggregateDispositionStats: empty input → all zeros", function dispositionEmpty() {
	const stats = aggregateDispositionStats([])
	expect(stats.approvedCount).toBe(0)
	expect(stats.rejectedCount).toBe(0)
	expect(stats.totalDisposedToday).toBe(0)
})

test("aggregateDispositionStats: approve only", function dispositionApproveOnly() {
	const stats = aggregateDispositionStats([
		{ actionType: "approve", count: 17, todayCount: 5 }
	])
	expect(stats.approvedCount).toBe(17)
	expect(stats.rejectedCount).toBe(0)
	expect(stats.totalDisposedToday).toBe(5)
})

test("aggregateDispositionStats: reject only", function dispositionRejectOnly() {
	const stats = aggregateDispositionStats([
		{ actionType: "reject", count: 8, todayCount: 3 }
	])
	expect(stats.approvedCount).toBe(0)
	expect(stats.rejectedCount).toBe(8)
	expect(stats.totalDisposedToday).toBe(3)
})

test("aggregateDispositionStats: both action types sum today correctly", function dispositionBoth() {
	const stats = aggregateDispositionStats([
		{ actionType: "approve", count: 25, todayCount: 7 },
		{ actionType: "reject", count: 12, todayCount: 4 }
	])
	expect(stats.approvedCount).toBe(25)
	expect(stats.rejectedCount).toBe(12)
	expect(stats.totalDisposedToday).toBe(11)
})

test("aggregateDispositionStats: ignores unknown action types", function dispositionIgnoresUnknown() {
	const stats = aggregateDispositionStats([
		{ actionType: "approve", count: 10, todayCount: 2 },
		{ actionType: "edit", count: 99, todayCount: 50 },
		{ actionType: "flag", count: 5, todayCount: 1 }
	])
	expect(stats.approvedCount).toBe(10)
	expect(stats.rejectedCount).toBe(0)
	expect(stats.totalDisposedToday).toBe(2)
})

test("utcMidnightForToday: returns UTC midnight for fixed date", function utcMidnight() {
	const sample = new Date(Date.UTC(2026, 4, 10, 14, 23, 45, 678))
	const result = utcMidnightForToday(sample)
	expect(result).toBe(Date.UTC(2026, 4, 10, 0, 0, 0, 0))
})

test("utcMidnightForToday: collapses any time-of-day to same midnight", function utcMidnightStable() {
	const morning = new Date(Date.UTC(2026, 0, 1, 0, 0, 1, 0))
	const evening = new Date(Date.UTC(2026, 0, 1, 23, 59, 59, 999))
	expect(utcMidnightForToday(morning)).toBe(utcMidnightForToday(evening))
})

test("aggregateStatusCounts: empty input → all zeros", function statusCountsEmpty() {
	const counts = aggregateStatusCounts([])
	expect(counts.candidate).toBe(0)
	expect(counts.live).toBe(0)
	expect(counts.rejected).toBe(0)
})

test("aggregateStatusCounts: extracts each status into its own bucket", function statusCountsAll() {
	const counts = aggregateStatusCounts([
		{ status: "candidate", count: 1708 },
		{ status: "live", count: 53 },
		{ status: "rejected", count: 2 }
	])
	expect(counts.candidate).toBe(1708)
	expect(counts.live).toBe(53)
	expect(counts.rejected).toBe(2)
})

test("aggregateStatusCounts: ignores unknown status values (e.g. retired)", function statusCountsIgnoresUnknown() {
	const counts = aggregateStatusCounts([
		{ status: "candidate", count: 5 },
		{ status: "retired", count: 99 }
	])
	expect(counts.candidate).toBe(5)
	expect(counts.live).toBe(0)
	expect(counts.rejected).toBe(0)
})
