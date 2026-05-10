import { expect, test } from "bun:test"
import { computeStreakFromDays, previousDayStr, utcDateStr } from "@/server/dashboard/streak"

// ---------- previousDayStr ----------

test("previousDayStr: subtracts one UTC day from a mid-month date", () => {
	expect(previousDayStr("2026-05-10")).toBe("2026-05-09")
})

test("previousDayStr: rolls back across the start of a month", () => {
	expect(previousDayStr("2026-05-01")).toBe("2026-04-30")
})

test("previousDayStr: rolls back across the start of a year", () => {
	expect(previousDayStr("2026-01-01")).toBe("2025-12-31")
})

test("previousDayStr: rolls back across a leap-day boundary", () => {
	expect(previousDayStr("2024-03-01")).toBe("2024-02-29")
})

test("previousDayStr: throws on a malformed date string", () => {
	expect(function bad() {
		previousDayStr("not-a-date")
	}).toThrow()
})

// ---------- utcDateStr ----------

test("utcDateStr: formats epoch ms in UTC, ignoring local tz", () => {
	const ms = Date.UTC(2026, 4, 10, 23, 59, 59) // 2026-05-10T23:59:59Z
	expect(utcDateStr(ms)).toBe("2026-05-10")
})

test("utcDateStr: returns the next UTC day at the midnight rollover", () => {
	const ms = Date.UTC(2026, 4, 11, 0, 0, 0) // 2026-05-11T00:00:00Z
	expect(utcDateStr(ms)).toBe("2026-05-11")
})

test("utcDateStr: throws on a non-finite ms input", () => {
	expect(function bad() {
		utcDateStr(Number.NaN)
	}).toThrow()
})

// ---------- computeStreakFromDays ----------

test("streak: empty input returns 0", () => {
	expect(computeStreakFromDays([], "2026-05-10")).toBe(0)
})

test("streak: most-recent = today, single day, returns 1", () => {
	expect(computeStreakFromDays(["2026-05-10"], "2026-05-10")).toBe(1)
})

test("streak: most-recent = yesterday, single day, returns 1 (grace day preserves streak)", () => {
	expect(computeStreakFromDays(["2026-05-09"], "2026-05-10")).toBe(1)
})

test("streak: most-recent = 2 days ago returns 0 (broken)", () => {
	expect(computeStreakFromDays(["2026-05-08"], "2026-05-10")).toBe(0)
})

test("streak: 5 consecutive days ending today returns 5", () => {
	const days = ["2026-05-10", "2026-05-09", "2026-05-08", "2026-05-07", "2026-05-06"]
	expect(computeStreakFromDays(days, "2026-05-10")).toBe(5)
})

test("streak: 4 consecutive days ending yesterday returns 4 (grace day preserves streak)", () => {
	const days = ["2026-05-09", "2026-05-08", "2026-05-07", "2026-05-06"]
	expect(computeStreakFromDays(days, "2026-05-10")).toBe(4)
})

test("streak: gap in middle truncates at the gap", () => {
	// today, yesterday, then a gap (2 days ago missing), then 3 days ago
	const days = ["2026-05-10", "2026-05-09", "2026-05-07", "2026-05-06"]
	expect(computeStreakFromDays(days, "2026-05-10")).toBe(2)
})

test("streak: gap immediately after most-recent yields 1", () => {
	const days = ["2026-05-10", "2026-05-08"]
	expect(computeStreakFromDays(days, "2026-05-10")).toBe(1)
})

test("streak: most-recent older than yesterday returns 0 even with prior consecutive run", () => {
	const days = ["2026-05-07", "2026-05-06", "2026-05-05"]
	expect(computeStreakFromDays(days, "2026-05-10")).toBe(0)
})

test("streak: walks across a month boundary correctly", () => {
	// 2026-05-01, 2026-04-30, 2026-04-29, today = 2026-05-01
	const days = ["2026-05-01", "2026-04-30", "2026-04-29"]
	expect(computeStreakFromDays(days, "2026-05-01")).toBe(3)
})

test("streak: walks across a year boundary correctly", () => {
	// 2026-01-02 today, with practice on 01-02, 01-01, 12-31, 12-30
	const days = ["2026-01-02", "2026-01-01", "2025-12-31", "2025-12-30"]
	expect(computeStreakFromDays(days, "2026-01-02")).toBe(4)
})

test("streak: walks across a leap-day boundary correctly", () => {
	// today = 2024-03-01, practice on 03-01, 02-29, 02-28
	const days = ["2024-03-01", "2024-02-29", "2024-02-28"]
	expect(computeStreakFromDays(days, "2024-03-01")).toBe(3)
})

test("streak: defensive — duplicate days are tolerated and don't inflate the count", () => {
	// Caller's contract bans duplicates (SELECT DISTINCT), but if one
	// slipped through the helper still returns the right value.
	const days = ["2026-05-10", "2026-05-10", "2026-05-09"]
	expect(computeStreakFromDays(days, "2026-05-10")).toBe(2)
})

test("streak: only-today, with a far-past day, returns 1", () => {
	const days = ["2026-05-10", "2025-01-01"]
	expect(computeStreakFromDays(days, "2026-05-10")).toBe(1)
})

test("streak: long unbroken run resolves correctly", () => {
	// Build a 14-day run ending 2026-05-10
	const days: string[] = []
	for (let i = 0; i < 14; i++) {
		const ms = Date.UTC(2026, 4, 10) - i * 86_400_000
		days.push(new Date(ms).toISOString().slice(0, 10))
	}
	expect(computeStreakFromDays(days, "2026-05-10")).toBe(14)
})
