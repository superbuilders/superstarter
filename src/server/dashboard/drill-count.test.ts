import { expect, test } from "bun:test"
import { utcDayWindowMs } from "@/server/dashboard/drill-count"

test("utcDayWindowMs: returns [00:00Z, 24:00Z) for a mid-day instant", () => {
	const ms = Date.UTC(2026, 4, 11, 12, 34, 56) // 2026-05-11T12:34:56Z
	const window = utcDayWindowMs(ms)
	expect(window.startMs).toBe(Date.UTC(2026, 4, 11))
	expect(window.endMs).toBe(Date.UTC(2026, 4, 12))
})

test("utcDayWindowMs: returns same-day window at 00:00:00 exactly", () => {
	const ms = Date.UTC(2026, 4, 11, 0, 0, 0)
	const window = utcDayWindowMs(ms)
	expect(window.startMs).toBe(ms)
	expect(window.endMs).toBe(ms + 86_400_000)
})

test("utcDayWindowMs: returns next-day-start at 23:59:59.999", () => {
	const ms = Date.UTC(2026, 4, 11, 23, 59, 59, 999)
	const window = utcDayWindowMs(ms)
	expect(window.startMs).toBe(Date.UTC(2026, 4, 11))
	expect(window.endMs).toBe(Date.UTC(2026, 4, 12))
})

test("utcDayWindowMs: window length is exactly 24h (86_400_000 ms)", () => {
	const ms = Date.UTC(2026, 4, 11, 17, 0, 0)
	const window = utcDayWindowMs(ms)
	expect(window.endMs - window.startMs).toBe(86_400_000)
})

test("utcDayWindowMs: throws on non-finite ms", () => {
	expect(function bad() {
		utcDayWindowMs(Number.NaN)
	}).toThrow()
	expect(function bad() {
		utcDayWindowMs(Number.POSITIVE_INFINITY)
	}).toThrow()
})
