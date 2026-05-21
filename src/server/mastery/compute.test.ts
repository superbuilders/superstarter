import { expect, test } from "bun:test"
import { computeMastery, median, sourceParams } from "@/server/mastery/compute"

test("sourceParams: diagnostic enforces 3-attempt threshold and 1.5x latency", function checkDiagnostic() {
	// 1.5× under the capacity-measurement framing (PRD §4.1, plan
	// docs/plans/phase3-diagnostic-flow.md §4). The diagnostic is
	// untimed at the session level; the generous latency multiplier
	// reflects untimed measurement conditions, not paced performance.
	// The polish round briefly recalibrated this to 1.2× under a
	// session-level 15-minute cutoff that was reverted in this round.
	const p = sourceParams("diagnostic")
	expect(p.minAttempts).toBe(3)
	expect(p.latencyMultiplier).toBe(1.5)
	expect(p.allowMastered).toBe(false)
})

test("sourceParams: ongoing enforces 5-attempt threshold and 1.0x latency", function checkOngoing() {
	const p = sourceParams("ongoing")
	expect(p.minAttempts).toBe(5)
	expect(p.latencyMultiplier).toBe(1.0)
	expect(p.allowMastered).toBe(true)
})

test("median: empty input returns 0", function emptyMedian() {
	expect(median([])).toBe(0)
})

test("median: odd-length array returns middle element", function oddMedian() {
	expect(median([1, 5, 3])).toBe(3)
	expect(median([10])).toBe(10)
})

test("median: even-length array returns average of two middle elements", function evenMedian() {
	expect(median([1, 2, 3, 4])).toBe(2.5)
	expect(median([10, 20])).toBe(15)
})

test("computeMastery: under min attempts → learning (diagnostic)", function underThresholdDiagnostic() {
	const result = computeMastery({
		last10Correct: [true, true],
		last10LatencyMs: [10_000, 10_000],
		latencyThresholdMs: 18_000,
		previousState: undefined,
		source: "diagnostic"
	})
	expect(result).toBe("learning")
})

test("computeMastery: under min attempts → learning (ongoing)", function underThresholdOngoing() {
	const result = computeMastery({
		last10Correct: [true, true, true, true],
		last10LatencyMs: [10_000, 10_000, 10_000, 10_000],
		latencyThresholdMs: 18_000,
		previousState: undefined,
		source: "ongoing"
	})
	expect(result).toBe("learning")
})

test("computeMastery: diagnostic NEVER assigns mastered even on perfect performance", function diagnosticCannotMaster() {
	const result = computeMastery({
		last10Correct: [true, true, true, true, true, true, true, true, true, true],
		last10LatencyMs: [5000, 5000, 5000, 5000, 5000, 5000, 5000, 5000, 5000, 5000],
		latencyThresholdMs: 18_000,
		previousState: undefined,
		source: "diagnostic"
	})
	expect(result).toBe("fluent")
})

test("computeMastery: ongoing source returns mastered on perfect performance", function ongoingCanMaster() {
	const result = computeMastery({
		last10Correct: [true, true, true, true, true, true, true, true, true, true],
		last10LatencyMs: [5000, 5000, 5000, 5000, 5000, 5000, 5000, 5000, 5000, 5000],
		latencyThresholdMs: 18_000,
		previousState: undefined,
		source: "ongoing"
	})
	expect(result).toBe("mastered")
})

test("computeMastery: ongoing source returns fluent when fast but inaccurate", function ongoingFluent() {
	const result = computeMastery({
		last10Correct: [true, true, true, true, true, true, true, true, false, false],
		last10LatencyMs: [25_000, 25_000, 25_000, 25_000, 25_000, 25_000, 25_000, 25_000, 25_000, 25_000],
		latencyThresholdMs: 18_000,
		previousState: undefined,
		source: "ongoing"
	})
	// 8/10 = 0.8 accuracy, median 25s > 18s threshold → fluent
	expect(result).toBe("fluent")
})

test("computeMastery: ongoing source returns decayed when previously mastered and slipping", function ongoingDecayed() {
	const result = computeMastery({
		last10Correct: [true, true, true, true, true, false, false, false, false, false],
		last10LatencyMs: [25_000, 25_000, 25_000, 25_000, 25_000, 25_000, 25_000, 25_000, 25_000, 25_000],
		latencyThresholdMs: 18_000,
		previousState: "mastered",
		source: "ongoing"
	})
	// 5/10 = 0.5 accuracy, was previously mastered → decayed
	expect(result).toBe("decayed")
})

test("computeMastery: diagnostic-source decayed path — previously-mastered re-take diverges between 1.2× and 1.5×", function diagnosticDecayedReTakeMultiplierLoadBearing() {
	// Diagnostic-source decayed path. A previously-mastered user re-taking
	// the diagnostic with a median latency between the two adjusted-threshold
	// values (12000ms under 1.2×, 15000ms under 1.5×) lands in different
	// verdicts. This is the actually-load-bearing case for the
	// latencyMultiplier parameter in diagnostic source — the
	// first-time-diagnostic over-credit case described in earlier rounds
	// does not exist (Branches 3 + 4 of computeMastery both return 'fluent'
	// for first-time high-accuracy users regardless of multiplier; only
	// the previousState='mastered' decayed branch is multiplier-dependent
	// under diagnostic source).
	//
	// `computeMastery` reads the multiplier from sourceParams('diagnostic')
	// internally — there's no parameter to inject a different multiplier.
	// To exercise the "what would have happened under 1.2×" branch, this
	// test scales `latencyThresholdMs` by 0.8 (= 1.2 / 1.5) so the
	// effective `adjustedThreshold = threshold × 1.5` lands at the same
	// 12000ms that 1.2× × 10000ms would produce. Same input shape, same
	// branch logic, both multiplier values exercised.

	// Under the active 1.5× multiplier (sourceParams('diagnostic')):
	//   adjustedThreshold = 10000 × 1.5 = 15000 ms
	//   medianLatency 14000 ≤ 15000 → decayed gate fails → falls
	//   through to Branch 4 (diagnostic-cap fluent).
	const under15 = computeMastery({
		last10Correct: [true, true, true, true, false],
		last10LatencyMs: [14_000, 14_000, 14_000, 14_000, 14_000],
		latencyThresholdMs: 10_000,
		previousState: "mastered",
		source: "diagnostic"
	})
	expect(under15).toBe("fluent")

	// Same input but with `latencyThresholdMs` lowered so the effective
	// adjusted threshold matches what 1.2× would have produced:
	//   adjusted = 8000 × 1.5 = 12000 ms (= 10000 × 1.2)
	//   medianLatency 14000 > 12000 → decayed (Branch 2 fires).
	// This empirically confirms the multiplier IS load-bearing on this
	// branch — same accuracy, same latency, different effective
	// adjusted-threshold → different verdict.
	const under12Equivalent = computeMastery({
		last10Correct: [true, true, true, true, false],
		last10LatencyMs: [14_000, 14_000, 14_000, 14_000, 14_000],
		latencyThresholdMs: 8_000,
		previousState: "mastered",
		source: "diagnostic"
	})
	expect(under12Equivalent).toBe("decayed")
})

test("computeMastery: diagnostic floor case — slow + inaccurate stays learning under any multiplier", function diagnosticFloorCase() {
	// Plan §4.3 floor case: low accuracy AND slow latency lands
	// `learning` regardless of latency multiplier. 4/10 accuracy fails
	// the accuracy gate; the multiplier is irrelevant. This test pins
	// the floor — even if the multiplier moves, this case must stay
	// `learning`.
	const result = computeMastery({
		last10Correct: [true, true, true, true, false, false, false, false, false, false],
		last10LatencyMs: [30_000, 30_000, 30_000, 30_000, 30_000, 30_000, 30_000, 30_000, 30_000, 30_000],
		latencyThresholdMs: 18_000,
		previousState: undefined,
		source: "diagnostic"
	})
	expect(result).toBe("learning")
})

test("computeMastery: low accuracy → learning regardless of source", function lowAccuracyLearning() {
	const result = computeMastery({
		last10Correct: [true, false, false, false, false, false, false, false, false, false],
		last10LatencyMs: [10_000, 10_000, 10_000, 10_000, 10_000, 10_000, 10_000, 10_000, 10_000, 10_000],
		latencyThresholdMs: 18_000,
		previousState: undefined,
		source: "ongoing"
	})
	expect(result).toBe("learning")
})

test("computeMastery: 3 attempts (just over diagnostic threshold) yields a real result", function diagnosticBoundary() {
	const result = computeMastery({
		last10Correct: [true, true, true],
		last10LatencyMs: [5000, 5000, 5000],
		latencyThresholdMs: 18_000,
		previousState: undefined,
		source: "diagnostic"
	})
	// 3/3 = 1.0 accuracy, fast → fluent (capped, not mastered)
	expect(result).toBe("fluent")
})

test("computeMastery: previously mastered with on-pace performance stays mastered", function previouslyMasteredHolds() {
	const result = computeMastery({
		last10Correct: [true, true, true, true, true, true, true, true, false, false],
		last10LatencyMs: [10_000, 10_000, 10_000, 10_000, 10_000, 10_000, 10_000, 10_000, 10_000, 10_000],
		latencyThresholdMs: 18_000,
		previousState: "mastered",
		source: "ongoing"
	})
	// 0.8 accuracy + 10s ≤ 18s → mastered
	expect(result).toBe("mastered")
})
