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

// Length is 50 post the testbank-re-extraction round commit 5
// rebalance: 14 sub-types × 3 floor + 8 proportional = 50 entries.
// targetQuestionCountFor in start.ts derives from this length per the
// data-wipe-round commit 2 fix; growing or shrinking diagnosticMix
// auto-updates the diagnostics session quota.
test("shuffledDiagnosticOrder: permutation length === 50", function lengthCheck() {
	const a = shuffledDiagnosticOrder("00000000-0000-0000-0000-000000000001")
	expect(a.length).toBe(50)
	expect(diagnosticMix.length).toBe(50)
})

// Mastery-reachability invariant (Q4 motivation made testable):
// every sub-type in the diagnostic mix must have >= 3 entries so the
// SPEC §9.3 mastery-computation per-sub-type-floor is reachable on
// the users first session. If a sub-type drops below 3,
// mastery state for that sub-type stays at unknown post-diagnostic —
// the failure mode the diagnostic exists to prevent.
test("diagnosticMix: every sub-type has at least 3 entries (mastery floor)", function masteryReachability() {
	const counts = new Map<string, number>()
	for (const e of diagnosticMix) {
		const prev = counts.get(e.subTypeId)
		let next: number
		if (prev === undefined) {
			next = 1
		} else {
			next = prev + 1
		}
		counts.set(e.subTypeId, next)
	}
	for (const [, n] of counts) {
		expect(n).toBeGreaterThanOrEqual(3)
	}
	expect(counts.size).toBe(14)
})

test("shuffledDiagnosticOrder: pinned-output regression for sessionId '00000000-0000-0000-0000-000000000001'", function pinnedOutput() {
	// This test pins the PRNG choice (xmur3 + mulberry32 + Fisher-Yates).
	// A future swap of the PRNG or shuffle algorithm fails this test
	// rather than silently changing user-visible diagnostic order.
	const result = shuffledDiagnosticOrder("00000000-0000-0000-0000-000000000001")
	const expectedFirstFive: DiagnosticEntry[] = [
		{ subTypeId: "verbal.analogies", difficulty: "hard" },
		{ subTypeId: "numerical.averages", difficulty: "easy" },
		{ subTypeId: "numerical.number_series", difficulty: "hard" },
		{ subTypeId: "numerical.lowest_values", difficulty: "medium" },
		{ subTypeId: "verbal.critical_reasoning", difficulty: "easy" }
	]
	expect(result.slice(0, 5)).toEqual(expectedFirstFive)
})
