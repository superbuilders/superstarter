// Pure-function unit tests for the SPEC §9.1 adaptive difficulty
// stepper, exposed at @/server/items/selection. These tests cover the
// 8 scenarios enumerated in docs/plans/phase5-adaptive-walker.md §5.1:
// floor, step-up, step-up clamp, step-down by accuracy, step-down by
// latency, step-down clamp, hold, and the strict-< latency boundary at
// the step-up zone edge.

import { expect, test } from "bun:test"
import { nextDifficultyTier } from "@/server/items/selection"

test("nextDifficultyTier: floor — fewer than 10 attempts → hold currentTier", function floorBeforeTen() {
	const result = nextDifficultyTier({
		last10Correct: [true, true, true, true, true],
		last10LatencyMs: [5_000, 5_000, 5_000, 5_000, 5_000],
		currentTier: "medium",
		latencyThresholdMs: 12_000
	})
	expect(result).toBe("medium")
})

test("nextDifficultyTier: step up — 9/10 correct AND median 0.5x threshold → stepUp", function stepUpHighAccuracyLowLatency() {
	const result = nextDifficultyTier({
		last10Correct: [true, true, true, true, true, true, true, true, true, false],
		last10LatencyMs: [6_000, 6_000, 6_000, 6_000, 6_000, 6_000, 6_000, 6_000, 6_000, 6_000],
		currentTier: "medium",
		latencyThresholdMs: 12_000
	})
	expect(result).toBe("hard")
})

test("nextDifficultyTier: step up clamps at brutal", function stepUpClampsAtBrutal() {
	const result = nextDifficultyTier({
		last10Correct: [true, true, true, true, true, true, true, true, true, false],
		last10LatencyMs: [6_000, 6_000, 6_000, 6_000, 6_000, 6_000, 6_000, 6_000, 6_000, 6_000],
		currentTier: "brutal",
		latencyThresholdMs: 12_000
	})
	expect(result).toBe("brutal")
})

test("nextDifficultyTier: step down — accuracy 5/10 → stepDown (latency irrelevant)", function stepDownByAccuracy() {
	const result = nextDifficultyTier({
		last10Correct: [true, true, true, true, true, false, false, false, false, false],
		last10LatencyMs: [5_000, 5_000, 5_000, 5_000, 5_000, 5_000, 5_000, 5_000, 5_000, 5_000],
		currentTier: "medium",
		latencyThresholdMs: 12_000
	})
	expect(result).toBe("easy")
})

test("nextDifficultyTier: step down — median latency 1.5x threshold → stepDown (accuracy irrelevant)", function stepDownByLatency() {
	const result = nextDifficultyTier({
		last10Correct: [true, true, true, true, true, true, true, true, true, false],
		last10LatencyMs: [18_000, 18_000, 18_000, 18_000, 18_000, 18_000, 18_000, 18_000, 18_000, 18_000],
		currentTier: "medium",
		latencyThresholdMs: 12_000
	})
	expect(result).toBe("easy")
})

test("nextDifficultyTier: step down clamps at easy", function stepDownClampsAtEasy() {
	const result = nextDifficultyTier({
		last10Correct: [true, true, true, true, true, false, false, false, false, false],
		last10LatencyMs: [5_000, 5_000, 5_000, 5_000, 5_000, 5_000, 5_000, 5_000, 5_000, 5_000],
		currentTier: "easy",
		latencyThresholdMs: 12_000
	})
	expect(result).toBe("easy")
})

test("nextDifficultyTier: hold — accuracy 0.7 latency at threshold → currentTier", function holdMidZone() {
	const result = nextDifficultyTier({
		last10Correct: [true, true, true, true, true, true, true, false, false, false],
		last10LatencyMs: [12_000, 12_000, 12_000, 12_000, 12_000, 12_000, 12_000, 12_000, 12_000, 12_000],
		currentTier: "medium",
		latencyThresholdMs: 12_000
	})
	expect(result).toBe("medium")
})

test("nextDifficultyTier: step-up boundary — accuracy 0.9 with latency exactly 0.8x threshold → hold (strict <)", function stepUpStrictBoundary() {
	// SPEC §9.1: medianLatency < ctx.latencyThresholdMs * 0.8 (strict <).
	// 9600ms is exactly 0.8 * 12000ms; the strict comparison fires false;
	// step-up does not engage; falls through to the step-down OR check
	// (accuracy 0.9 fails ≤ 0.6, latency 9600 fails > 14400); holds.
	const result = nextDifficultyTier({
		last10Correct: [true, true, true, true, true, true, true, true, true, false],
		last10LatencyMs: [9_600, 9_600, 9_600, 9_600, 9_600, 9_600, 9_600, 9_600, 9_600, 9_600],
		currentTier: "medium",
		latencyThresholdMs: 12_000
	})
	expect(result).toBe("medium")
})
