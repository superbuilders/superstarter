// Pure helpers for post-session struggle derivation + strategy
// kind-preference selection.
//
// Plan: docs/plans/phase5-post-session-review.md §9.
//
// Lives under src/server/post-session/ rather than alongside
// <StrategySurface> because Next.js disallows server components from
// CALLING functions exported by `"use client"` modules. The post-
// session page (server component) needs to invoke these helpers to
// produce SurfacedStrategy[] for the shell to render. Plan §9's
// original framing ("numeric anchors live inside <StrategySurface>")
// is revised here: anchors live with the helpers, not the component.
// SPEC §6.14 will note this in commit 7.
//
// Helpers are pure functions over plain data — no DB, no I/O, no
// React. Server-and-client safe.

import type {
	PerSubTypePerformance,
	SurfacedStrategy
} from "@/app/(diagnostic-flow)/post-session/[sessionId]/page"
import { type SubTypeId, subTypes } from "@/config/sub-types"

// ---------------- Numeric anchors + lookup ----------------

// "Struggled" definition per plan §9: a sub-type is struggled if
// EITHER accuracy < 70% (matches computeMastery's SPEC §9.3 learning
// floor) OR median latency > the sub-type's threshold (matches what
// <PerformanceSummary> already marks; Round 2 §5.4 absorbed the prior
// <LatencySummary>'s threshold-mark rendering).
const STRUGGLED_ACCURACY_FLOOR = 0.7

const THRESHOLD_BY_SUB_TYPE: ReadonlyMap<SubTypeId, number> = new Map(
	subTypes.map(function entry(t) {
		return [t.id, t.latencyThresholdMs]
	})
)

// ---------------- Failure-mode + kind-preference ----------------

type FailureMode = "fast-wrong" | "slow-wrong" | "slow-but-right" | "not-struggled"

function deriveFailureMode(args: {
	accuracyRatio: number
	medianLatencyMs: number
	thresholdMs: number
}): FailureMode {
	const lowAccuracy = args.accuracyRatio < STRUGGLED_ACCURACY_FLOOR
	const slowMedian = args.medianLatencyMs > args.thresholdMs
	if (lowAccuracy && !slowMedian) return "fast-wrong"
	if (lowAccuracy && slowMedian) return "slow-wrong"
	if (!lowAccuracy && slowMedian) return "slow-but-right"
	return "not-struggled"
}

interface KindPreference {
	primary: SurfacedStrategy["kind"]
	fallback: SurfacedStrategy["kind"]
}

// Plan §9 kind-preference table:
//   fast-wrong     → trap (primary), technique (fallback)
//   slow-wrong     → recognition (primary), technique (fallback)
//   slow-but-right → recognition (primary), technique (fallback)
function preferredKind(mode: FailureMode): KindPreference | null {
	switch (mode) {
		case "fast-wrong":
			return { primary: "trap", fallback: "technique" }
		case "slow-wrong":
			return { primary: "recognition", fallback: "technique" }
		case "slow-but-right":
			return { primary: "recognition", fallback: "technique" }
		case "not-struggled":
			return null
	}
}

function pickOneStrategy(
	strategies: ReadonlyArray<SurfacedStrategy>,
	mode: FailureMode
): SurfacedStrategy | null {
	const pref = preferredKind(mode)
	if (pref === null) return null
	for (const s of strategies) {
		if (s.kind === pref.primary) return s
	}
	for (const s of strategies) {
		if (s.kind === pref.fallback) return s
	}
	// Last resort: any strategy that exists for this sub-type.
	for (const s of strategies) {
		return s
	}
	return null
}

// ---------------- Struggle derivation ----------------

function isStruggled(args: {
	performance: PerSubTypePerformance | undefined
	threshold: number
}): boolean {
	const accRatio =
		args.performance !== undefined && args.performance.total > 0
			? args.performance.correct / args.performance.total
			: 1
	const medianMs = args.performance !== undefined ? args.performance.medianLatencyMs : 0
	const lowAccuracy = accRatio < STRUGGLED_ACCURACY_FLOOR
	const slowMedian = medianMs > args.threshold
	return lowAccuracy || slowMedian
}

function deriveStruggledSubTypes(
	performance: ReadonlyArray<PerSubTypePerformance>
): SubTypeId[] {
	// Single iteration over consolidated rows — Round 2 §5.4b cascade
	// resolution per §0.15. The pre-§5.4b implementation built two
	// per-axis Maps (accuracy + latency) then intersected via a Set of
	// seen sub-type ids; post-consolidation each row carries both
	// metrics by construction (attempts.latency_ms NOT NULL +
	// getPerSubTypePerformance's single GROUP BY), so the intersection
	// step is structurally redundant.
	const struggled: SubTypeId[] = []
	for (const row of performance) {
		const threshold = THRESHOLD_BY_SUB_TYPE.get(row.subTypeId)
		if (threshold === undefined) continue
		const struggledHere = isStruggled({ performance: row, threshold })
		if (struggledHere) struggled.push(row.subTypeId)
	}
	return struggled
}

// ---------------- Strategy selection ----------------

interface StruggleContext {
	mode: FailureMode
	threshold: number
}

function buildStruggleContexts(
	performance: ReadonlyArray<PerSubTypePerformance>,
	struggled: ReadonlyArray<SubTypeId>
): Map<SubTypeId, StruggleContext> {
	const performanceBySubType = new Map<SubTypeId, PerSubTypePerformance>()
	for (const p of performance) performanceBySubType.set(p.subTypeId, p)
	const out = new Map<SubTypeId, StruggleContext>()
	for (const subTypeId of struggled) {
		const threshold = THRESHOLD_BY_SUB_TYPE.get(subTypeId)
		if (threshold === undefined) continue
		const row = performanceBySubType.get(subTypeId)
		const accRatio = row !== undefined && row.total > 0 ? row.correct / row.total : 1
		const medianMs = row !== undefined ? row.medianLatencyMs : 0
		const mode = deriveFailureMode({
			accuracyRatio: accRatio,
			medianLatencyMs: medianMs,
			thresholdMs: threshold
		})
		out.set(subTypeId, { mode, threshold })
	}
	return out
}

function groupStrategiesBySubType(
	all: ReadonlyArray<SurfacedStrategy>
): Map<SubTypeId, SurfacedStrategy[]> {
	const out = new Map<SubTypeId, SurfacedStrategy[]>()
	for (const s of all) {
		const list = out.get(s.subTypeId)
		if (list === undefined) {
			out.set(s.subTypeId, [s])
		} else {
			list.push(s)
		}
	}
	return out
}

function selectStrategiesForStruggledSubTypes(
	performance: ReadonlyArray<PerSubTypePerformance>,
	allStrategies: ReadonlyArray<SurfacedStrategy>
): SurfacedStrategy[] {
	const struggled = deriveStruggledSubTypes(performance)
	if (struggled.length === 0) return []
	const ctx = buildStruggleContexts(performance, struggled)
	const stratsBySubType = groupStrategiesBySubType(allStrategies)
	const surfaced: SurfacedStrategy[] = []
	for (const subTypeId of struggled) {
		const strugCtx = ctx.get(subTypeId)
		if (strugCtx === undefined) continue
		const strategiesForSubType = stratsBySubType.get(subTypeId)
		if (strategiesForSubType === undefined || strategiesForSubType.length === 0) {
			continue
		}
		const picked = pickOneStrategy(strategiesForSubType, strugCtx.mode)
		if (picked !== null) surfaced.push(picked)
	}
	return surfaced
}

export type { FailureMode, KindPreference, StruggleContext }
export {
	buildStruggleContexts,
	deriveFailureMode,
	deriveStruggledSubTypes,
	groupStrategiesBySubType,
	isStruggled,
	pickOneStrategy,
	preferredKind,
	selectStrategiesForStruggledSubTypes,
	STRUGGLED_ACCURACY_FLOOR,
	THRESHOLD_BY_SUB_TYPE
}
