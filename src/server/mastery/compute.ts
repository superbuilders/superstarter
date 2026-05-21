// Pure mastery-level computation. No DB, no logger, no I/O — every call
// is a deterministic function of its input. The recompute orchestrator
// (recompute.ts) is what touches the database; this file is what it calls
// to derive the next state.
//
// SPEC §9.3, plus the diagnostic-source rules from §3.9 of
// docs/plans/phase-3-practice-surface.md (latency multiplier
// recalibrated by docs/plans/phase-3-polish-practice-surface-features.md
// §3.1):
// - diagnostic source: 3-attempt threshold, 1.2× latency relaxation
//   (was 1.5× before the 15-minute hard cutoff), `mastered` is never
//   assigned (capped at `fluent`).
// - ongoing source: standard 5-attempt threshold, 1.0× latency, `mastered`
//   reachable.
//
// Where the multiplier is load-bearing for diagnostic source: the
// `decayed` branch only. A first-time diagnostic user with accuracy ≥ 0.8
// lands `fluent` regardless of multiplier (Branches 3 + 4 both return
// `fluent` because `allowMastered: false` masks the `mastered` branch).
// A previously-mastered user re-taking the diagnostic with median
// latency between the two adjusted thresholds (12000ms under 1.2×,
// 15000ms under 1.5×) lands `decayed` under 1.2× and `fluent` under
// 1.5×. The 1.5 → 1.2 swap correctly surfaces rust in re-take users
// rather than letting them coast as `fluent`. See the
// `diagnosticDecayedReTakeMultiplierLoadBearing` test in
// compute.test.ts for the contract.
//
// The function is total over the input space — no `?` returns, no throws.
// Every reachable (state × source × counts × accuracy × latency) tuple maps
// to exactly one MasteryLevel.

type MasteryLevel = "learning" | "fluent" | "mastered" | "decayed"
type MasterySource = "diagnostic" | "ongoing"

interface ComputeMasteryInput {
	last10Correct: ReadonlyArray<boolean>
	last10LatencyMs: ReadonlyArray<number>
	latencyThresholdMs: number
	previousState: MasteryLevel | undefined
	source: MasterySource
}

interface SourceParams {
	minAttempts: number
	latencyMultiplier: number
	allowMastered: boolean
}

function sourceParams(s: MasterySource): SourceParams {
	if (s === "diagnostic") {
		// 1.5× — diagnostic is untimed at the session level (PRD §4.1, plan
		// docs/plans/phase3-diagnostic-flow.md §4). The diagnostic measures
		// the user's untimed capacity baseline; this generous latency
		// multiplier reflects "capacity, not pacing." The
		// polish round briefly calibrated this to 1.2× under a 15-minute
		// session-level cutoff that has since been reverted.
		return { minAttempts: 3, latencyMultiplier: 1.5, allowMastered: false }
	}
	if (s === "ongoing") {
		return { minAttempts: 5, latencyMultiplier: 1.0, allowMastered: true }
	}
	const _exhaustive: never = s
	return _exhaustive
}

function median(values: ReadonlyArray<number>): number {
	const sorted = [...values].sort(function ascending(a, b) {
		return a - b
	})
	const n = sorted.length
	if (n === 0) return 0
	const mid = Math.floor(n / 2)
	if (n % 2 === 1) {
		const v = sorted[mid]
		if (v === undefined) return 0
		return v
	}
	const lo = sorted[mid - 1]
	const hi = sorted[mid]
	if (lo === undefined || hi === undefined) return 0
	return (lo + hi) / 2
}

function computeMastery(input: ComputeMasteryInput): MasteryLevel {
	const params = sourceParams(input.source)
	const adjustedThreshold = input.latencyThresholdMs * params.latencyMultiplier
	const n = input.last10Correct.length
	if (n < params.minAttempts) return "learning"
	const accuracy = input.last10Correct.filter(Boolean).length / n
	const medianLatency = median(input.last10LatencyMs)

	// `mastered` requires accuracy ≥ 0.8 AND latency at-or-under threshold.
	// Diagnostic source masks this branch via allowMastered=false.
	if (params.allowMastered && accuracy >= 0.8 && medianLatency <= adjustedThreshold) {
		return "mastered"
	}

	// `decayed` only reachable from a previously-mastered state. Symmetric to
	// the mastered guard: drop to decayed when the user falls below the
	// fluent latency or accuracy bar AFTER having been mastered.
	if (input.previousState === "mastered" && (accuracy < 0.8 || medianLatency > adjustedThreshold)) {
		return "decayed"
	}

	// `fluent` is the right-of-`learning` bucket: enough accuracy, but slow.
	// Same accuracy gate as `mastered`, latency exceeds the threshold.
	if (accuracy >= 0.8 && medianLatency > adjustedThreshold) {
		return "fluent"
	}

	// Otherwise — accuracy under 0.8, or accuracy ≥ 0.8 but medianLatency at
	// or under threshold while allowMastered=false (the diagnostic-cap path) —
	// land in `learning` for diagnostic, `fluent` for ongoing-source-with-
	// mastered-blocked-but-perfect-result. The diagnostic-source caller wants
	// `fluent` here, not `learning`, so users who ace the diagnostic land
	// in `fluent` rather than `learning`.
	if (!params.allowMastered && accuracy >= 0.8 && medianLatency <= adjustedThreshold) {
		return "fluent"
	}

	return "learning"
}

export type { ComputeMasteryInput, MasteryLevel, MasterySource }
export { computeMastery, median, sourceParams }
