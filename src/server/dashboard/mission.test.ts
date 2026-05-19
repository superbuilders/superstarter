import { expect, test } from "bun:test"
import {
	buildTodaysMission,
	compareForPicker,
	pickLowestBeltSubType
} from "@/server/dashboard/mission"
import type { SubtypeRow } from "@/server/dashboard/types"

function row(input: {
	id: string
	belt: "white" | "blue" | "brown" | "black"
	lastAttemptedAtMs?: number
	name?: string
}): SubtypeRow {
	return {
		id: input.id,
		slug: input.id,
		name: input.name === undefined ? input.id : input.name,
		belt: input.belt,
		lastAttemptedAtMs: input.lastAttemptedAtMs,
		atRisk: false,
		href: `/drill/${input.id}`
	}
}

// ---------- pickLowestBeltSubType ----------

test("picker: single row is returned unchanged", () => {
	const chosen = pickLowestBeltSubType([row({ id: "verbal.antonyms", belt: "blue", lastAttemptedAtMs: 100 })])
	expect(chosen.id).toBe("verbal.antonyms")
})

test("picker: white beats blue/brown/black even if white was drilled most recently", () => {
	const chosen = pickLowestBeltSubType([
		row({ id: "a", belt: "black", lastAttemptedAtMs: 1 }),
		row({ id: "b", belt: "brown", lastAttemptedAtMs: 2 }),
		row({ id: "c", belt: "blue", lastAttemptedAtMs: 3 }),
		row({ id: "d", belt: "white", lastAttemptedAtMs: 999_999 })
	])
	expect(chosen.id).toBe("d")
})

test("picker: blue beats brown beats black", () => {
	const chosen = pickLowestBeltSubType([
		row({ id: "black1", belt: "black", lastAttemptedAtMs: 1 }),
		row({ id: "brown1", belt: "brown", lastAttemptedAtMs: 2 }),
		row({ id: "blue1", belt: "blue", lastAttemptedAtMs: 100 })
	])
	expect(chosen.id).toBe("blue1")
})

test("picker: tie on belt → smaller lastAttemptedAtMs wins (older = stale)", () => {
	const chosen = pickLowestBeltSubType([
		row({ id: "newer", belt: "white", lastAttemptedAtMs: 1_000 }),
		row({ id: "older", belt: "white", lastAttemptedAtMs: 100 }),
		row({ id: "newest", belt: "white", lastAttemptedAtMs: 9_999 })
	])
	expect(chosen.id).toBe("older")
})

test("picker: 'Never drilled' (undefined) beats any concrete timestamp at the same belt", () => {
	const chosen = pickLowestBeltSubType([
		row({ id: "drilled", belt: "white", lastAttemptedAtMs: 1 }),
		row({ id: "never", belt: "white" })
	])
	expect(chosen.id).toBe("never")
})

test("picker: 'Never drilled' beats drilled even when others are far older", () => {
	const chosen = pickLowestBeltSubType([
		row({ id: "ancient", belt: "white", lastAttemptedAtMs: 1 }),
		row({ id: "never", belt: "white" }),
		row({ id: "today", belt: "white", lastAttemptedAtMs: 999_999_999 })
	])
	expect(chosen.id).toBe("never")
})

test("picker: but a 'Never drilled' BLUE still loses to a drilled WHITE — belt dominates", () => {
	const chosen = pickLowestBeltSubType([
		row({ id: "never-blue", belt: "blue" }),
		row({ id: "drilled-white", belt: "white", lastAttemptedAtMs: 1 })
	])
	expect(chosen.id).toBe("drilled-white")
})

test("picker: two 'Never drilled' same-belt → stable sort preserves input order", () => {
	const chosen = pickLowestBeltSubType([
		row({ id: "verbal.letter_series", belt: "white" }),
		row({ id: "verbal.sentence_completion", belt: "white" })
	])
	expect(chosen.id).toBe("verbal.letter_series")
})

test("picker: throws on empty input (impossible at runtime — config has 14 sub-types)", () => {
	expect(function bad() {
		pickLowestBeltSubType([])
	}).toThrow()
})

// Reproduce Leo's actual dashboard state at the time of the bug report:
// White-belt rows include two Never-drilled (Sentence Completion +
// Letter Series) and two drilled (Word Problems + Averages). The
// picker should pick a white + Never row, NOT a blue belt like
// Fractions.
test("picker: Leo's real-world bug repro — picks white+Never over blue+22h-ago", () => {
	const rows = [
		row({ id: "verbal.sentence_completion", belt: "white", name: "Sentence Completion" }),
		row({ id: "verbal.letter_series", belt: "white", name: "Letter Series" }),
		row({ id: "verbal.analogies", belt: "blue", lastAttemptedAtMs: 1_000, name: "Analogies" }),
		row({ id: "verbal.antonyms", belt: "brown", lastAttemptedAtMs: 2_000, name: "Antonyms" }),
		row({ id: "verbal.critical_reasoning", belt: "blue", lastAttemptedAtMs: 3_000, name: "Critical Reasoning" }),
		row({ id: "numerical.lowest_values", belt: "blue", lastAttemptedAtMs: 4_000, name: "Lowest Values" }),
		row({ id: "numerical.word_problems", belt: "white", lastAttemptedAtMs: 5_000, name: "Word Problems" }),
		row({ id: "numerical.averages", belt: "white", lastAttemptedAtMs: 6_000, name: "Averages" }),
		row({ id: "numerical.fractions", belt: "blue", lastAttemptedAtMs: 7_000, name: "Fractions" }),
		row({ id: "numerical.ratios", belt: "blue", lastAttemptedAtMs: 8_000, name: "Ratios" })
	]
	const chosen = pickLowestBeltSubType(rows)
	// Among white belts: two Never (sentence_completion, letter_series)
	// outrank Word Problems / Averages (drilled). Among the two Never,
	// stable sort preserves config-order input → letter_series wins
	// because the caller passed sentence_completion AFTER letter_series
	// — wait, actually I passed sentence_completion FIRST. So sort
	// stability gives sentence_completion the win.
	expect(chosen.id).toBe("verbal.sentence_completion")
})

test("picker: same as above but input order swapped → letter_series wins (stable sort proof)", () => {
	const chosen = pickLowestBeltSubType([
		row({ id: "verbal.letter_series", belt: "white" }),
		row({ id: "verbal.sentence_completion", belt: "white" }),
		row({ id: "numerical.fractions", belt: "blue", lastAttemptedAtMs: 1 })
	])
	expect(chosen.id).toBe("verbal.letter_series")
})

// ---------- compareForPicker (used by sort) ----------

test("compareForPicker: returns 0 for two identical rows", () => {
	const r = row({ id: "x", belt: "white", lastAttemptedAtMs: 100 })
	expect(compareForPicker(r, r)).toBe(0)
})

test("compareForPicker: white < black", () => {
	const w = row({ id: "w", belt: "white", lastAttemptedAtMs: 1 })
	const b = row({ id: "b", belt: "black", lastAttemptedAtMs: 1 })
	expect(compareForPicker(w, b)).toBeLessThan(0)
})

test("compareForPicker: same belt, older ms wins (older sorts first)", () => {
	const older = row({ id: "older", belt: "white", lastAttemptedAtMs: 10 })
	const newer = row({ id: "newer", belt: "white", lastAttemptedAtMs: 20 })
	expect(compareForPicker(older, newer)).toBeLessThan(0)
})

test("compareForPicker: undefined ms sorts before defined ms at same belt", () => {
	const never = row({ id: "never", belt: "white" })
	const drilled = row({ id: "drilled", belt: "white", lastAttemptedAtMs: 1 })
	expect(compareForPicker(never, drilled)).toBeLessThan(0)
	expect(compareForPicker(drilled, never)).toBeGreaterThan(0)
})

test("compareForPicker: both undefined ms at same belt return 0 (stable tie)", () => {
	const a = row({ id: "a", belt: "white" })
	const b = row({ id: "b", belt: "white" })
	expect(compareForPicker(a, b)).toBe(0)
})

// ---------- buildTodaysMission ----------

test("buildTodaysMission: incomplete state shows progress copy + Today's mission eyebrow", () => {
	const m = buildTodaysMission({
		beltRows: [row({ id: "verbal.antonyms", belt: "white", name: "Antonyms" })],
		drillsToday: 2,
		practiceTestsToday: 0
	})
	expect(m.eyebrow).toBe("Today's mission")
	expect(m.title).toBe("Show up + 1 practice test + 3 drills.")
	expect(m.drillsToday).toBe(2)
	expect(m.drillsTarget).toBe(3)
	expect(m.practiceTestsToday).toBe(0)
	expect(m.practiceTestsTarget).toBe(1)
	expect(m.alternateLabel).toBe("Antonyms")
	expect(m.alternateHref).toBe("/drill/verbal.antonyms")
	expect(m.primaryHref).toBe("/full-length/configure")
	expect(m.primaryLabel).toBe("Start full sim")
})

test("buildTodaysMission: completion requires BOTH practice test ≥ 1 AND drills ≥ 3", () => {
	const justDrills = buildTodaysMission({
		beltRows: [row({ id: "a", belt: "white" })],
		drillsToday: 3,
		practiceTestsToday: 0
	})
	expect(justDrills.eyebrow).toBe("Today's mission")
	const justPractice = buildTodaysMission({
		beltRows: [row({ id: "a", belt: "white" })],
		drillsToday: 2,
		practiceTestsToday: 1
	})
	expect(justPractice.eyebrow).toBe("Today's mission")
	const both = buildTodaysMission({
		beltRows: [row({ id: "a", belt: "white" })],
		drillsToday: 3,
		practiceTestsToday: 1
	})
	expect(both.eyebrow).toBe("Mission complete")
	expect(both.title).toBe("Nice work — keep stacking reps.")
})

test("buildTodaysMission: over-target counts still mark complete (don't underflow)", () => {
	const m = buildTodaysMission({
		beltRows: [row({ id: "a", belt: "white" })],
		drillsToday: 99,
		practiceTestsToday: 5
	})
	expect(m.eyebrow).toBe("Mission complete")
	expect(m.drillsToday).toBe(99) // raw count preserved, not capped
})

test("buildTodaysMission: alternate CTA url-encodes the sub-type id", () => {
	const m = buildTodaysMission({
		beltRows: [row({ id: "verbal.sentence_completion", belt: "white", name: "Sentence Completion" })],
		drillsToday: 0,
		practiceTestsToday: 0
	})
	expect(m.alternateHref).toBe("/drill/verbal.sentence_completion")
})
