import type { Difficulty, SubTypeId } from "@/config/sub-types"

interface DiagnosticEntry {
	subTypeId: SubTypeId
	difficulty: Exclude<Difficulty, "brutal">
}

// PROVISIONAL allocation pending the testbank-re-extraction round.
//
// This mix updates sub-type ids to the new 14-sub-type taxonomy
// (synonyms cut, logic→critical_reasoning, letter_series moved to
// verbal, averages_ratios split into averages+ratios) but DEFERS the
// full re-balance to a later round per Q1 of the taxonomy-restructuring
// redline. The current shape is "old shape minus synonyms" — synonyms'
// 4 entries are gone with no replacement, three new numerical sub-types
// (workrate, speed_distance_time, lowest_values) are absent until
// testbank re-extraction provides the empirical anchor for a confident
// 50-item allocation. Length is currently 46.
//
// Brutal-tier items remain excluded (no diagnostic should produce a
// 0%-accuracy band that contaminates the mastery computation). Within
// each sub-type the tier mix favors medium with one easy and one hard
// (4-item blocks) or one easy and one hard with three mediums (5-item
// blocks).
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
	// verbal.antonyms — 4 items
	{ subTypeId: "verbal.antonyms", difficulty: "easy" },
	{ subTypeId: "verbal.antonyms", difficulty: "medium" },
	{ subTypeId: "verbal.antonyms", difficulty: "medium" },
	{ subTypeId: "verbal.antonyms", difficulty: "hard" },
	// verbal.analogies — 4 items
	{ subTypeId: "verbal.analogies", difficulty: "easy" },
	{ subTypeId: "verbal.analogies", difficulty: "medium" },
	{ subTypeId: "verbal.analogies", difficulty: "medium" },
	{ subTypeId: "verbal.analogies", difficulty: "hard" },
	// verbal.sentence_completion — 4 items
	{ subTypeId: "verbal.sentence_completion", difficulty: "easy" },
	{ subTypeId: "verbal.sentence_completion", difficulty: "medium" },
	{ subTypeId: "verbal.sentence_completion", difficulty: "medium" },
	{ subTypeId: "verbal.sentence_completion", difficulty: "hard" },
	// verbal.critical_reasoning — 4 items
	{ subTypeId: "verbal.critical_reasoning", difficulty: "easy" },
	{ subTypeId: "verbal.critical_reasoning", difficulty: "medium" },
	{ subTypeId: "verbal.critical_reasoning", difficulty: "medium" },
	{ subTypeId: "verbal.critical_reasoning", difficulty: "hard" },
	// verbal.letter_series — 5 items
	{ subTypeId: "verbal.letter_series", difficulty: "easy" },
	{ subTypeId: "verbal.letter_series", difficulty: "medium" },
	{ subTypeId: "verbal.letter_series", difficulty: "medium" },
	{ subTypeId: "verbal.letter_series", difficulty: "medium" },
	{ subTypeId: "verbal.letter_series", difficulty: "hard" },
	// numerical.number_series — 5 items
	{ subTypeId: "numerical.number_series", difficulty: "easy" },
	{ subTypeId: "numerical.number_series", difficulty: "medium" },
	{ subTypeId: "numerical.number_series", difficulty: "medium" },
	{ subTypeId: "numerical.number_series", difficulty: "medium" },
	{ subTypeId: "numerical.number_series", difficulty: "hard" },
	// numerical.word_problems — 5 items
	{ subTypeId: "numerical.word_problems", difficulty: "easy" },
	{ subTypeId: "numerical.word_problems", difficulty: "medium" },
	{ subTypeId: "numerical.word_problems", difficulty: "medium" },
	{ subTypeId: "numerical.word_problems", difficulty: "medium" },
	{ subTypeId: "numerical.word_problems", difficulty: "hard" },
	// numerical.fractions — 5 items
	{ subTypeId: "numerical.fractions", difficulty: "easy" },
	{ subTypeId: "numerical.fractions", difficulty: "medium" },
	{ subTypeId: "numerical.fractions", difficulty: "medium" },
	{ subTypeId: "numerical.fractions", difficulty: "medium" },
	{ subTypeId: "numerical.fractions", difficulty: "hard" },
	// numerical.percentages — 5 items
	{ subTypeId: "numerical.percentages", difficulty: "easy" },
	{ subTypeId: "numerical.percentages", difficulty: "medium" },
	{ subTypeId: "numerical.percentages", difficulty: "medium" },
	{ subTypeId: "numerical.percentages", difficulty: "medium" },
	{ subTypeId: "numerical.percentages", difficulty: "hard" },
	// numerical.averages — 3 items (split from former averages_ratios block)
	{ subTypeId: "numerical.averages", difficulty: "easy" },
	{ subTypeId: "numerical.averages", difficulty: "medium" },
	{ subTypeId: "numerical.averages", difficulty: "hard" },
	// numerical.ratios — 2 items (split from former averages_ratios block)
	{ subTypeId: "numerical.ratios", difficulty: "easy" },
	{ subTypeId: "numerical.ratios", difficulty: "medium" }
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
export { diagnosticMix, shuffledDiagnosticOrder }
