// Logic-only tests for <PerformanceSummary>.
//
// Plan: docs/plans/post-session-audit-fixes-and-wide-token-retrofit.md §5.4
// (audit step (g) — Test option B selected since no React testing library is
// installed in the project; matches existing test discipline).
//
// Covers the pure logic helpers (buildDisplayRows projection, formatSeconds
// formatting, markerPosition arithmetic). JSX render assertions are deferred —
// would require @testing-library/react infrastructure not currently scaffolded.

import { describe, expect, test } from "bun:test"
import {
	buildDisplayRows,
	formatSeconds,
	markerPosition
} from "@/components/post-session/performance-summary"

describe("buildDisplayRows", () => {
	test("empty input returns empty array", () => {
		const result = buildDisplayRows([])
		expect(result).toEqual([])
	})

	test("projects single row with full meta", () => {
		const result = buildDisplayRows([
			{
				subTypeId: "verbal.antonyms",
				correct: 5,
				total: 7,
				medianLatencyMs: 12_500
			}
		])
		expect(result).toHaveLength(1)
		const row = result[0]
		expect(row).toBeDefined()
		if (row === undefined) return
		expect(row.subTypeId).toBe("verbal.antonyms")
		expect(row.correct).toBe(5)
		expect(row.total).toBe(7)
		expect(row.medianLatencyMs).toBe(12_500)
		expect(row.section).toBe("verbal")
		expect(typeof row.displayName).toBe("string")
		expect(typeof row.thresholdMs).toBe("number")
	})

	test("sorts verbal before numerical, alphabetical-within-section", () => {
		const result = buildDisplayRows([
			{ subTypeId: "numerical.fractions", correct: 1, total: 2, medianLatencyMs: 8000 },
			{ subTypeId: "verbal.antonyms", correct: 3, total: 4, medianLatencyMs: 12_000 },
			{ subTypeId: "verbal.analogies", correct: 5, total: 6, medianLatencyMs: 11_000 },
			{ subTypeId: "numerical.averages", correct: 2, total: 3, medianLatencyMs: 14_000 }
		])
		expect(result).toHaveLength(4)
		// All verbal rows first.
		expect(result[0]?.section).toBe("verbal")
		expect(result[1]?.section).toBe("verbal")
		expect(result[2]?.section).toBe("numerical")
		expect(result[3]?.section).toBe("numerical")
	})
})

describe("formatSeconds", () => {
	test("formats ms to seconds with one decimal (exact representation)", () => {
		// 12.5 is exactly representable in IEEE 754; safe to test.
		expect(formatSeconds(12_500)).toBe("12.5 s")
	})

	test("formats integer-second values cleanly", () => {
		expect(formatSeconds(8000)).toBe("8.0 s")
		expect(formatSeconds(15_000)).toBe("15.0 s")
	})

	test("zero ms renders '0.0 s'", () => {
		expect(formatSeconds(0)).toBe("0.0 s")
	})
})

describe("markerPosition", () => {
	test("median equal to threshold lands at 50 (track midpoint)", () => {
		expect(markerPosition(10_000, 10_000)).toBe(50)
	})

	test("median half of threshold lands at 25", () => {
		expect(markerPosition(5000, 10_000)).toBe(25)
	})

	test("median double of threshold clamps at 100", () => {
		expect(markerPosition(20_000, 10_000)).toBe(100)
	})

	test("median over double of threshold clamps at 100", () => {
		expect(markerPosition(50_000, 10_000)).toBe(100)
	})

	test("median negative clamps at 0 (defensive)", () => {
		expect(markerPosition(-100, 10_000)).toBe(0)
	})
})
