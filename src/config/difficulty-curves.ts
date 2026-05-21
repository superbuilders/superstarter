import { mulberry32, xmur3 } from "@/config/diagnostic-mix"
import { type Difficulty, type SubTypeId, subTypeIds } from "@/config/sub-types"

type DecileDistribution = Readonly<Record<Difficulty, number>>

// Five deciles for a 50-question full-length test. Each entry is the
// proportional mix of easy/medium/hard/brutal items in that decile,
// per the difficulty-progression decision in docs/design_decisions.md.
// Mirrors the Criteria On-Demand "harder later" curve.
const standardCurve: ReadonlyArray<DecileDistribution> = [
	{ easy: 0.7, medium: 0.25, hard: 0.05, brutal: 0.0 }, // decile 1 (q01-q10)
	{ easy: 0.35, medium: 0.45, hard: 0.2, brutal: 0.0 }, // decile 2 (q11-q20)
	{ easy: 0.15, medium: 0.4, hard: 0.35, brutal: 0.1 }, // decile 3 (q21-q30)
	{ easy: 0.05, medium: 0.25, hard: 0.45, brutal: 0.25 }, // decile 4 (q31-q40)
	{ easy: 0.0, medium: 0.15, hard: 0.4, brutal: 0.45 } // decile 5 (q41-q50)
]

const difficultyCurves = {
	full_length: standardCurve,
	simulation: standardCurve
} as const

type CurveKey = keyof typeof difficultyCurves

const DIFFICULTY_ORDER: ReadonlyArray<Difficulty> = ["easy", "medium", "hard", "brutal"]

interface CountedTier {
	tier: Difficulty
	whole: number
	remainder: number
	originalIndex: number
}

// Largest-remainder rounding within a 10-item decile, ties broken by
// lower-tier preference. So 7.0 easy + 2.5 medium + 0.5 hard rounds to
// 7 easy + 3 medium + 0 hard, not 7 + 2 + 1. Documented in the
// difficulty-progression decision.
function roundDecile(distribution: DecileDistribution, totalCount: number): Record<Difficulty, number> {
	const counted: CountedTier[] = DIFFICULTY_ORDER.map(function buildCounted(tier, idx) {
		const exact = distribution[tier] * totalCount
		const whole = Math.floor(exact)
		const remainder = exact - whole
		return { tier, whole, remainder, originalIndex: idx }
	})
	let assigned = counted.reduce(function sumWhole(acc, c) {
		return acc + c.whole
	}, 0)
	const sorted = [...counted].sort(function compareForRoundUp(a, b) {
		if (a.remainder !== b.remainder) {
			return b.remainder - a.remainder
		}
		// tie-break: lower tier wins (lower originalIndex)
		return a.originalIndex - b.originalIndex
	})
	for (const c of sorted) {
		if (assigned >= totalCount) {
			break
		}
		c.whole += 1
		assigned += 1
	}
	const result: Record<Difficulty, number> = { easy: 0, medium: 0, hard: 0, brutal: 0 }
	for (const c of counted) {
		result[c.tier] = c.whole
	}
	return result
}

// generateFullLengthSlots — pure function returning a deterministic
// 50-tuple sequence of (subTypeId, difficulty) tuples for a full-length
// test seeded by `sessionId`. Same sessionId always returns the same
// 50-slot order; different sessionIds produce independently-shuffled
// sequences with overwhelming probability.
//
// Algorithm per docs/plans/phase5-full-length-test.md §3:
//   1. For each decile k ∈ [0..4], compute per-tier integer counts via
//      `roundDecile(standardCurve[k], 10)` — sums to 10 by construction.
//   2. For each (decileIndex, tier) pair with count n, deterministically
//      pick n sub-type-ids from the 14-pool with replacement, seeded by
//      `${sessionId}:d${decileIndex}:${tier}`. Uniform draws (Q12.3 v1
//      shape — empirical-anchor weighting deferred).
//   3. Within each decile's 10-slot block, Fisher-Yates shuffle the
//      tuples deterministically, seeded by
//      `${sessionId}:d${decileIndex}:order`. Decouples within-decile
//      order from the per-tier draw order so sub-types interleave.
//   4. Concatenate the 5 deciles' 10-slot blocks → 50 slots.
//
// Pure: no I/O, no DB reads. Consumed by getNextFixedCurve in
// src/server/items/selection.ts at full-length sub-phase 3 commit 3
// (dormant until then).
const FULL_LENGTH_SLOT_COUNT = 50
const DECILE_SIZE = 10

interface FullLengthSlot {
	subTypeId: SubTypeId
	difficulty: Difficulty
}

// seededRand — string seed → mulberry32 PRNG. Independent streams per
// distinct seed string, enabling per-(decileIndex, tier) and
// per-(decileIndex, order) decoupling.
function seededRand(seed: string): () => number {
	const seedFn = xmur3(seed)
	return mulberry32(seedFn())
}

// pickSubTypesWithReplacement — n uniform with-replacement draws from
// the 14-pool. Per Q12.3 v1 ships uniform; empirical-anchor weighting
// is a follow-up edit if dogfood signal demands.
function pickSubTypesWithReplacement(rand: () => number, count: number): SubTypeId[] {
	const picks: SubTypeId[] = []
	for (let i = 0; i < count; i += 1) {
		const idx = Math.floor(rand() * subTypeIds.length)
		const picked = subTypeIds[idx]
		// Defensive narrowing: idx is in-range by construction
		// (Math.floor of [0,1) * length); this guard satisfies
		// noUncheckedIndexedAccess without the banned non-null
		// assertion.
		if (picked === undefined) continue
		picks.push(picked)
	}
	return picks
}

// shuffleInPlace — Fisher-Yates over a mutable array, seeded by `rand`.
function shuffleInPlace<T>(rand: () => number, arr: T[]): void {
	for (let i = arr.length - 1; i > 0; i -= 1) {
		const j = Math.floor(rand() * (i + 1))
		const tmp = arr[i]
		const swap = arr[j]
		if (tmp === undefined || swap === undefined) continue
		arr[i] = swap
		arr[j] = tmp
	}
}

// buildDecileSlots — construct the 10-slot block for one decile.
// Per-tier integer counts come from `roundDecile`; sub-types per tier
// are drawn via `pickSubTypesWithReplacement` seeded by
// `${sessionId}:d${decileIndex}:${tier}`; in-decile order is shuffled
// by Fisher-Yates seeded `${sessionId}:d${decileIndex}:order`.
function buildDecileSlots(
	sessionId: string,
	decileIndex: number,
	distribution: DecileDistribution
): FullLengthSlot[] {
	const tierCounts = roundDecile(distribution, DECILE_SIZE)
	const decileSlots: FullLengthSlot[] = []
	for (const tier of DIFFICULTY_ORDER) {
		const count = tierCounts[tier]
		if (count === 0) continue
		const tierRand = seededRand(`${sessionId}:d${decileIndex}:${tier}`)
		const picks = pickSubTypesWithReplacement(tierRand, count)
		for (const subTypeId of picks) {
			decileSlots.push({ subTypeId, difficulty: tier })
		}
	}
	const orderRand = seededRand(`${sessionId}:d${decileIndex}:order`)
	shuffleInPlace(orderRand, decileSlots)
	return decileSlots
}

function generateFullLengthSlots(sessionId: string): ReadonlyArray<FullLengthSlot> {
	const result: FullLengthSlot[] = []
	for (const [decileIndex, distribution] of standardCurve.entries()) {
		const decileSlots = buildDecileSlots(sessionId, decileIndex, distribution)
		for (const slot of decileSlots) {
			result.push(slot)
		}
	}
	return result
}

export type { CurveKey, DecileDistribution, FullLengthSlot }
export {
	DECILE_SIZE,
	FULL_LENGTH_SLOT_COUNT,
	difficultyCurves,
	generateFullLengthSlots,
	roundDecile,
	standardCurve
}
