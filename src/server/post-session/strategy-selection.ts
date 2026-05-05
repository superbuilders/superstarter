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
	PerSubTypeAccuracy,
	PerSubTypeLatency,
	SurfacedStrategy
} from "@/app/(diagnostic-flow)/post-session/[sessionId]/page"
import { type SubTypeId, subTypes } from "@/config/sub-types"

// ---------------- Numeric anchors + lookup ----------------

// "Struggled" definition per plan §9: a sub-type is struggled if
// EITHER accuracy < 70% (matches computeMastery's SPEC §9.3 learning
// floor) OR median latency > the sub-type's threshold (matches what
// <LatencySummary> already marks).
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
	accuracy: PerSubTypeAccuracy | undefined
	latency: PerSubTypeLatency | undefined
	threshold: number
}): boolean {
	const accRatio =
		args.accuracy !== undefined && args.accuracy.total > 0
			? args.accuracy.correct / args.accuracy.total
			: 1
	const medianMs = args.latency !== undefined ? args.latency.medianLatencyMs : 0
	const lowAccuracy = accRatio < STRUGGLED_ACCURACY_FLOOR
	const slowMedian = medianMs > args.threshold
	return lowAccuracy || slowMedian
}

function deriveStruggledSubTypes(
	accuracy: ReadonlyArray<PerSubTypeAccuracy>,
	latency: ReadonlyArray<PerSubTypeLatency>
): SubTypeId[] {
	const accuracyBySubType = new Map<SubTypeId, PerSubTypeAccuracy>()
	for (const a of accuracy) {
		accuracyBySubType.set(a.subTypeId, a)
	}
	const latencyBySubType = new Map<SubTypeId, PerSubTypeLatency>()
	for (const l of latency) {
		latencyBySubType.set(l.subTypeId, l)
	}
	const seen = new Set<SubTypeId>()
	for (const a of accuracy) seen.add(a.subTypeId)
	for (const l of latency) seen.add(l.subTypeId)
	const struggled: SubTypeId[] = []
	for (const subTypeId of seen) {
		const threshold = THRESHOLD_BY_SUB_TYPE.get(subTypeId)
		if (threshold === undefined) continue
		const struggledHere = isStruggled({
			accuracy: accuracyBySubType.get(subTypeId),
			latency: latencyBySubType.get(subTypeId),
			threshold
		})
		if (struggledHere) struggled.push(subTypeId)
	}
	return struggled
}

// ---------------- Strategy selection ----------------

interface StruggleContext {
	mode: FailureMode
	threshold: number
}

function buildStruggleContexts(
	accuracy: ReadonlyArray<PerSubTypeAccuracy>,
	latency: ReadonlyArray<PerSubTypeLatency>,
	struggled: ReadonlyArray<SubTypeId>
): Map<SubTypeId, StruggleContext> {
	const accBySubType = new Map<SubTypeId, PerSubTypeAccuracy>()
	for (const a of accuracy) accBySubType.set(a.subTypeId, a)
	const latBySubType = new Map<SubTypeId, PerSubTypeLatency>()
	for (const l of latency) latBySubType.set(l.subTypeId, l)
	const out = new Map<SubTypeId, StruggleContext>()
	for (const subTypeId of struggled) {
		const threshold = THRESHOLD_BY_SUB_TYPE.get(subTypeId)
		if (threshold === undefined) continue
		const acc = accBySubType.get(subTypeId)
		const lat = latBySubType.get(subTypeId)
		const accRatio =
			acc !== undefined && acc.total > 0 ? acc.correct / acc.total : 1
		const medianMs = lat !== undefined ? lat.medianLatencyMs : 0
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
	accuracy: ReadonlyArray<PerSubTypeAccuracy>,
	latency: ReadonlyArray<PerSubTypeLatency>,
	allStrategies: ReadonlyArray<SurfacedStrategy>
): SurfacedStrategy[] {
	const struggled = deriveStruggledSubTypes(accuracy, latency)
	if (struggled.length === 0) return []
	const ctx = buildStruggleContexts(accuracy, latency, struggled)
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
