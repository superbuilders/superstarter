// Pure-function unit tests for <StructuredExplanation>'s exported
// helpers (sub-phase 4 commit 3). Plan: docs/plans/phase5-click-to-
// highlight.md §7.1.
//
// Audit-against-actual-artifact (SPEC §6.14.18): the codebase has no
// component-test infrastructure (no DOM shim, no React Testing
// Library, no per-component .test.tsx files). All existing tests are
// pure-function or server-integration — sub-phase 5 commit 3 set the
// precedent (belt-indicator.test.ts). Component-render integration
// shifts to commit 4's real-DB harness + Playwright spot-check per
// plan §9. Commit 3 ships only the pure-function helpers + their
// tests, plus the component file itself (compiled by typecheck +
// biome lint).
//
// Six scenarios per plan §7.1: 2-part shape parses, 3-part shape
// parses, out-of-order fails, empty referencedOptions parses,
// recognition with non-empty refs parses, wholly-malformed input
// returns null. Plus three small aria-label helper tests covering
// the singular/plural/zero-ref branches.

import { expect, test } from "bun:test"
import {
	ariaLabelForElimination,
	ariaLabelForTieBreaker,
	classForInteractive,
	parseStructuredExplanation
} from "@/components/post-session/structured-explanation"

const TWO_PART_FIXTURE = {
	parts: [
		{
			kind: "recognition",
			text: "Pattern: pick the synonym pair that matches the prompt's tone.",
			referencedOptions: []
		},
		{
			kind: "elimination",
			text: "Cut 'replace' and 'place' immediately — both miss the tone register.",
			referencedOptions: ["aaaaaaaa", "bbbbbbbb"]
		}
	]
}

const THREE_PART_FIXTURE = {
	parts: [
		{
			kind: "recognition",
			text: "Mixed-form comparison: convert fractions to decimals before summing.",
			referencedOptions: []
		},
		{
			kind: "elimination",
			text: "Cut all four sums under 0.71 immediately.",
			referencedOptions: ["11111111", "22222222", "33333333", "44444444"]
		},
		{
			kind: "tie-breaker",
			text: "Between 0.71 and 0.71+, the larger second decimal wins.",
			referencedOptions: ["55555555", "66666666"]
		}
	]
}

const RECOGNITION_WITH_REFS_FIXTURE = {
	parts: [
		{
			kind: "recognition",
			text: "Recognition with explicit option callouts.",
			referencedOptions: ["aaaaaaaa"]
		},
		{
			kind: "elimination",
			text: "Cut the obvious wrong one.",
			referencedOptions: ["bbbbbbbb"]
		}
	]
}

test("parseStructuredExplanation: 2-part shape parses cleanly", function twoPart() {
	const parsed = parseStructuredExplanation(TWO_PART_FIXTURE)
	expect(parsed).not.toBeNull()
	if (parsed === null) return
	expect(parsed.recognition.kind).toBe("recognition")
	expect(parsed.elimination.kind).toBe("elimination")
	expect(parsed.tieBreaker).toBeUndefined()
	expect(parsed.elimination.referencedOptions).toEqual(["aaaaaaaa", "bbbbbbbb"])
})

test("parseStructuredExplanation: 3-part shape parses cleanly", function threePart() {
	const parsed = parseStructuredExplanation(THREE_PART_FIXTURE)
	expect(parsed).not.toBeNull()
	if (parsed === null) return
	expect(parsed.recognition.kind).toBe("recognition")
	expect(parsed.elimination.kind).toBe("elimination")
	expect(parsed.tieBreaker?.kind).toBe("tie-breaker")
	expect(parsed.elimination.referencedOptions).toHaveLength(4)
	expect(parsed.tieBreaker?.referencedOptions).toEqual(["55555555", "66666666"])
})

test("parseStructuredExplanation: out-of-order parts fail parse", function outOfOrder() {
	const outOfOrder = {
		parts: [
			{
				kind: "elimination",
				text: "elimination first is invalid",
				referencedOptions: ["aaaaaaaa"]
			},
			{
				kind: "recognition",
				text: "recognition second is invalid",
				referencedOptions: []
			}
		]
	}
	expect(parseStructuredExplanation(outOfOrder)).toBeNull()
})

test("parseStructuredExplanation: empty referencedOptions parses cleanly", function emptyRefs() {
	const emptyRefsFixture = {
		parts: [
			{
				kind: "recognition",
				text: "recognition with no refs",
				referencedOptions: []
			},
			{
				kind: "elimination",
				text: "elimination with no refs is permitted by the schema",
				referencedOptions: []
			}
		]
	}
	const parsed = parseStructuredExplanation(emptyRefsFixture)
	expect(parsed).not.toBeNull()
	if (parsed === null) return
	expect(parsed.elimination.referencedOptions).toEqual([])
})

test("parseStructuredExplanation: recognition with non-empty refs parses cleanly", function recognitionWithRefs() {
	const parsed = parseStructuredExplanation(RECOGNITION_WITH_REFS_FIXTURE)
	expect(parsed).not.toBeNull()
	if (parsed === null) return
	expect(parsed.recognition.referencedOptions).toEqual(["aaaaaaaa"])
})

test("parseStructuredExplanation: wholly-malformed input returns null", function malformed() {
	expect(parseStructuredExplanation(null)).toBeNull()
	expect(parseStructuredExplanation(undefined)).toBeNull()
	expect(parseStructuredExplanation("not an object")).toBeNull()
	expect(parseStructuredExplanation({})).toBeNull()
	expect(parseStructuredExplanation({ parts: [] })).toBeNull()
	expect(parseStructuredExplanation({ parts: [{ kind: "recognition", text: "only one part", referencedOptions: [] }] })).toBeNull()
})

test("ariaLabelForElimination: zero / one / many refs", function ariaElimination() {
	expect(ariaLabelForElimination(0)).toBe("Toggle elimination explanation")
	expect(ariaLabelForElimination(1)).toBe("Toggle elimination explanation — strikes through 1 option")
	expect(ariaLabelForElimination(3)).toBe("Toggle elimination explanation — strikes through 3 options")
})

test("ariaLabelForTieBreaker: zero / one / many refs", function ariaTieBreaker() {
	expect(ariaLabelForTieBreaker(0)).toBe("Toggle tie-breaker explanation")
	expect(ariaLabelForTieBreaker(1)).toBe("Toggle tie-breaker explanation — highlights 1 option")
	expect(ariaLabelForTieBreaker(2)).toBe("Toggle tie-breaker explanation — highlights 2 options")
})

test("classForInteractive: active vs inactive class identity", function classToggle() {
	const inactive = classForInteractive(false)
	const active = classForInteractive(true)
	expect(inactive).not.toBe(active)
	expect(inactive).toContain("hover:bg-foreground/5")
	expect(active).toContain("bg-foreground/5")
	expect(active).toContain("ring-1")
})
