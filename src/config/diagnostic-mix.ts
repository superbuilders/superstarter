import type { Difficulty, SubTypeId } from "@/config/sub-types"

interface DiagnosticEntry {
	subTypeId: SubTypeId
	difficulty: Exclude<Difficulty, "brutal">
}

// 50-entry diagnostic mix — empirical-anchor allocation shipped 2026-05-06
// (phase5-testbank-re-extraction round commit 5).
//
// Allocation algorithm (Q4 redline-resolved): clamped proportional with
// a 3-entry minimum floor per sub-type.
//   - 14 sub-types × 3 floor = 42 entries reserved (covers SPEC §9.3's
//     mastery-computation per-sub-type-floor of >=3 attempts; the
//     diagnostic's whole product purpose is calibrating mastery state,
//     and the floor guarantees no sub-type stays at 'unknown' on the
//     user's first session).
//   - 8 entries allocated proportionally to the most-prevalent sub-types
//     in the empirical CCAT-prep distribution (per-sub-type counts from
//     items where source_folder LIKE '12min_prep_practice_%' across the
//     6 prep-practice folders, totaling 204 items).
//   - Largest-remainders method against an 8-entry budget assigned the
//     +1 bonus to the top 8 sub-types by empirical count: number_series,
//     antonyms, sentence_completion, analogies, lowest_values,
//     critical_reasoning, word_problems, percentages.
//
// Total: 50 entries (8 sub-types × 4 entries + 6 sub-types × 3 entries).
//
// Tier mix per sub-type (no brutal — the diagnostic must not produce
// 0%-accuracy bands that contaminate mastery):
//   - 4-entry blocks: easy + medium + medium + hard.
//   - 3-entry blocks: easy + medium + hard.
//
// targetQuestionCountFor in start.ts derives from diagnosticMix.length
// per the data-wipe-round commit 2 derivation fix; growing or shrinking
// this mix automatically updates the diagnostic's session-quota with
// no coordinated edit needed.
//
// Storage contract: this constant is a TUPLE-DISTRIBUTION SPEC, not a
// served sequence. The selection engine reads
// `shuffledDiagnosticOrder(sessionId)[attemptIndex]` (see below), not
// `diagnosticMix[attemptIndex]`. The original array order is preserved
// only because per-sub-type grouping is the most readable layout for
// authoring and review; it carries no served-order semantic.
//
// docs/plans/phase-3-polish-practice-surface-features.md §3.3 / §4.1
// document the reversal of the implicit Phase 3 array-order contract.
const diagnosticMix: ReadonlyArray<DiagnosticEntry> = [
	// verbal.antonyms — 4 items (3 floor + 1 proportional; empirical 30/204)
	{ subTypeId: "verbal.antonyms", difficulty: "easy" },
	{ subTypeId: "verbal.antonyms", difficulty: "medium" },
	{ subTypeId: "verbal.antonyms", difficulty: "medium" },
	{ subTypeId: "verbal.antonyms", difficulty: "hard" },
	// verbal.analogies — 4 items (3 floor + 1 proportional; empirical 25/204)
	{ subTypeId: "verbal.analogies", difficulty: "easy" },
	{ subTypeId: "verbal.analogies", difficulty: "medium" },
	{ subTypeId: "verbal.analogies", difficulty: "medium" },
	{ subTypeId: "verbal.analogies", difficulty: "hard" },
	// verbal.sentence_completion — 4 items (3 floor + 1 proportional; empirical 26/204)
	{ subTypeId: "verbal.sentence_completion", difficulty: "easy" },
	{ subTypeId: "verbal.sentence_completion", difficulty: "medium" },
	{ subTypeId: "verbal.sentence_completion", difficulty: "medium" },
	{ subTypeId: "verbal.sentence_completion", difficulty: "hard" },
	// verbal.critical_reasoning — 4 items (3 floor + 1 proportional; empirical 18/204)
	{ subTypeId: "verbal.critical_reasoning", difficulty: "easy" },
	{ subTypeId: "verbal.critical_reasoning", difficulty: "medium" },
	{ subTypeId: "verbal.critical_reasoning", difficulty: "medium" },
	{ subTypeId: "verbal.critical_reasoning", difficulty: "hard" },
	// verbal.letter_series — 3 items (floor only; empirical 10/204)
	{ subTypeId: "verbal.letter_series", difficulty: "easy" },
	{ subTypeId: "verbal.letter_series", difficulty: "medium" },
	{ subTypeId: "verbal.letter_series", difficulty: "hard" },
	// numerical.number_series — 4 items (3 floor + 1 proportional; empirical 30/204)
	{ subTypeId: "numerical.number_series", difficulty: "easy" },
	{ subTypeId: "numerical.number_series", difficulty: "medium" },
	{ subTypeId: "numerical.number_series", difficulty: "medium" },
	{ subTypeId: "numerical.number_series", difficulty: "hard" },
	// numerical.word_problems — 4 items (3 floor + 1 proportional; empirical 12/204)
	{ subTypeId: "numerical.word_problems", difficulty: "easy" },
	{ subTypeId: "numerical.word_problems", difficulty: "medium" },
	{ subTypeId: "numerical.word_problems", difficulty: "medium" },
	{ subTypeId: "numerical.word_problems", difficulty: "hard" },
	// numerical.fractions — 3 items (floor only; empirical 7/204)
	{ subTypeId: "numerical.fractions", difficulty: "easy" },
	{ subTypeId: "numerical.fractions", difficulty: "medium" },
	{ subTypeId: "numerical.fractions", difficulty: "hard" },
	// numerical.percentages — 4 items (3 floor + 1 proportional; empirical 10/204)
	{ subTypeId: "numerical.percentages", difficulty: "easy" },
	{ subTypeId: "numerical.percentages", difficulty: "medium" },
	{ subTypeId: "numerical.percentages", difficulty: "medium" },
	{ subTypeId: "numerical.percentages", difficulty: "hard" },
	// numerical.averages — 3 items (floor only; empirical 4/204)
	{ subTypeId: "numerical.averages", difficulty: "easy" },
	{ subTypeId: "numerical.averages", difficulty: "medium" },
	{ subTypeId: "numerical.averages", difficulty: "hard" },
	// numerical.ratios — 3 items (floor only; empirical 5/204)
	{ subTypeId: "numerical.ratios", difficulty: "easy" },
	{ subTypeId: "numerical.ratios", difficulty: "medium" },
	{ subTypeId: "numerical.ratios", difficulty: "hard" },
	// numerical.workrate — 3 items (floor only; empirical 5/204).
	// Tier distribution adjusted: empirical dev-DB bank has 0 items at
	// easy tier (8 medium + 3 hard); mix substitutes a second medium for
	// the easy slot to keep the slot servable. Tagger improvement is a
	// future-round candidate (commit 4 finding #1).
	{ subTypeId: "numerical.workrate", difficulty: "medium" },
	{ subTypeId: "numerical.workrate", difficulty: "medium" },
	{ subTypeId: "numerical.workrate", difficulty: "hard" },
	// numerical.speed_distance_time — 3 items (floor only; empirical 4/204)
	{ subTypeId: "numerical.speed_distance_time", difficulty: "easy" },
	{ subTypeId: "numerical.speed_distance_time", difficulty: "medium" },
	{ subTypeId: "numerical.speed_distance_time", difficulty: "hard" },
	// numerical.lowest_values — 4 items (3 floor + 1 proportional; empirical 18/204).
	// Tier distribution adjusted: empirical dev-DB bank has 0 items at
	// hard tier (21 easy + 12 medium); mix substitutes a third medium for
	// the hard slot to keep the slot servable. Tagger improvement is a
	// future-round candidate (commit 4 finding #1).
	{ subTypeId: "numerical.lowest_values", difficulty: "easy" },
	{ subTypeId: "numerical.lowest_values", difficulty: "medium" },
	{ subTypeId: "numerical.lowest_values", difficulty: "medium" },
	{ subTypeId: "numerical.lowest_values", difficulty: "medium" }
]

// xmur3 — string → 32-bit hash. Canonical implementation; turns the
// sessionId UUID into a 32-bit integer the PRNG can consume. Pure,
// deterministic. Bitwise ops are intrinsic to the algorithm.
function xmur3(str: string): () => number {
	let h = 1779033703 ^ str.length
	for (let i = 0; i < str.length; i += 1) {
		h = Math.imul(h ^ str.charCodeAt(i), 3432918353)
		h = (h << 13) | (h >>> 19)
	}
	return function nextSeed(): number {
		h = Math.imul(h ^ (h >>> 16), 2246822507)
		h = Math.imul(h ^ (h >>> 13), 3266489909)
		h ^= h >>> 16
		return h >>> 0
	}
}

// mulberry32 — canonical seeded PRNG returning floats in [0, 1).
// Pure, deterministic for a fixed seed. The 32-bit period is more than
// enough for shuffling the diagnostic mix.
function mulberry32(seed: number): () => number {
	let s = seed >>> 0
	return function nextFloat(): number {
		s = (s + 0x6d2b79f5) >>> 0
		let t = s
		t = Math.imul(t ^ (t >>> 15), t | 1)
		t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296
	}
}

// shuffledDiagnosticOrder — pure function returning a deterministic
// permutation of the mix seeded by `sessionId`. Same sessionId always
// returns the same permutation; different sessionIds produce different
// permutations with overwhelming probability. The returned array
// contains EXACTLY the same multiset of (subTypeId, difficulty) tuples
// as `diagnosticMix` — only the order differs.
//
// Used by `getNextFixedCurve` in src/server/items/selection.ts as the
// only read path against the diagnostic mix in Phase 3 polish onward.
// docs/plans/phase-3-polish-practice-surface-features.md §4.1.
function shuffledDiagnosticOrder(sessionId: string): ReadonlyArray<DiagnosticEntry> {
	const seedFn = xmur3(sessionId)
	const rand = mulberry32(seedFn())
	const result: DiagnosticEntry[] = diagnosticMix.slice()
	// Fisher-Yates, in place on the local copy.
	for (let i = result.length - 1; i > 0; i -= 1) {
		const j = Math.floor(rand() * (i + 1))
		const tmp = result[i]
		const swap = result[j]
		// Both indices are in-range by construction; the guards keep
		// TypeScript narrowing happy without a non-null assertion (which
		// is banned per rules/no-nullish-coalescing.md §7).
		if (tmp === undefined || swap === undefined) continue
		result[i] = swap
		result[j] = tmp
	}
	return result
}

export type { DiagnosticEntry }
export { diagnosticMix, mulberry32, shuffledDiagnosticOrder, xmur3 }
