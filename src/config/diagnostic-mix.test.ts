import { expect, test } from "bun:test"
import { type DiagnosticEntry, diagnosticMix, shuffledDiagnosticOrder } from "@/config/diagnostic-mix"

function tupleKey(e: DiagnosticEntry): string {
	return `${e.subTypeId}|${e.difficulty}`
}

function sortedTupleKeys(entries: ReadonlyArray<DiagnosticEntry>): string[] {
	const keys: string[] = []
	for (const e of entries) {
		keys.push(tupleKey(e))
	}
	keys.sort()
	return keys
}

test("shuffledDiagnosticOrder: same sessionId → identical permutation", function determinism() {
	const a = shuffledDiagnosticOrder("11111111-1111-1111-1111-111111111111")
	const b = shuffledDiagnosticOrder("11111111-1111-1111-1111-111111111111")
	expect(a).toEqual(b)
})

test("shuffledDiagnosticOrder: different sessionIds → non-identical permutations", function distinctness() {
	const a = shuffledDiagnosticOrder("11111111-1111-1111-1111-111111111111")
	const b = shuffledDiagnosticOrder("22222222-2222-2222-2222-222222222222")
	let differs = false
	for (let i = 0; i < a.length; i += 1) {
		const ai = a[i]
		const bi = b[i]
		if (!ai || !bi) continue
		if (ai.subTypeId !== bi.subTypeId || ai.difficulty !== bi.difficulty) {
			differs = true
			break
		}
	}
	expect(differs).toBe(true)
})

test("shuffledDiagnosticOrder: multiset invariance — every permutation is the same multiset of (subTypeId, difficulty) as diagnosticMix", function multisetInvariance() {
	const baseline = sortedTupleKeys(diagnosticMix)
	const seeds = [
		"00000000-0000-0000-0000-000000000001",
		"11111111-1111-1111-1111-111111111111",
		"22222222-2222-2222-2222-222222222222",
		"deadbeef-dead-beef-dead-beefdeadbeef",
		"feedface-feed-face-feed-facefeedface"
	]
	for (const seed of seeds) {
		const permuted = shuffledDiagnosticOrder(seed)
		expect(sortedTupleKeys(permuted)).toEqual(baseline)
	}
})

// Length is 46 under the provisional taxonomy-restructuring allocation
// (synonyms cut, three new sub-types not yet allocated). The session
// quota of 50 is not enforced here; selection.ts handles bank
// fallback when the mix runs out. The full re-balance to 50 is a
// separate round.
test("shuffledDiagnosticOrder: permutation length === 46 (provisional)", function lengthCheck() {
	const a = shuffledDiagnosticOrder("00000000-0000-0000-0000-000000000001")
	expect(a.length).toBe(46)
	expect(diagnosticMix.length).toBe(46)
})

test("shuffledDiagnosticOrder: pinned-output regression for sessionId '00000000-0000-0000-0000-000000000001'", function pinnedOutput() {
	// This test pins the PRNG choice (xmur3 + mulberry32 + Fisher-Yates).
	// A future swap of the PRNG or shuffle algorithm fails this test
	// rather than silently changing user-visible diagnostic order.
	const result = shuffledDiagnosticOrder("00000000-0000-0000-0000-000000000001")
	const expectedFirstFive: DiagnosticEntry[] = [
		{ subTypeId: "numerical.word_problems", difficulty: "medium" },
		{ subTypeId: "verbal.antonyms", difficulty: "hard" },
		{ subTypeId: "numerical.word_problems", difficulty: "hard" },
		{ subTypeId: "numerical.number_series", difficulty: "medium" },
		{ subTypeId: "verbal.analogies", difficulty: "medium" }
	]
	expect(result.slice(0, 5)).toEqual(expectedFirstFive)
})
