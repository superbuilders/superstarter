import { expect, test } from "bun:test"
import { formatRelativePast } from "@/lib/relative-time"

const NOW = 1_700_000_000_000

test("under 1 minute returns 'Just now'", () => {
	expect(formatRelativePast(NOW - 0, NOW)).toBe("Just now")
	expect(formatRelativePast(NOW - 30_000, NOW)).toBe("Just now")
	expect(formatRelativePast(NOW - 59_999, NOW)).toBe("Just now")
})

test("minutes are singularized at 1", () => {
	expect(formatRelativePast(NOW - 60_000, NOW)).toBe("1 min ago")
	expect(formatRelativePast(NOW - 2 * 60_000, NOW)).toBe("2 min ago")
	expect(formatRelativePast(NOW - 59 * 60_000, NOW)).toBe("59 min ago")
})

test("hours are singularized at 1", () => {
	expect(formatRelativePast(NOW - 60 * 60_000, NOW)).toBe("1 hour ago")
	expect(formatRelativePast(NOW - 5 * 60 * 60_000, NOW)).toBe("5 hours ago")
	expect(formatRelativePast(NOW - 23 * 60 * 60_000, NOW)).toBe("23 hours ago")
})

test("days are singularized at 1", () => {
	const day = 24 * 60 * 60_000
	expect(formatRelativePast(NOW - day, NOW)).toBe("1 day ago")
	expect(formatRelativePast(NOW - 3 * day, NOW)).toBe("3 days ago")
	expect(formatRelativePast(NOW - 6 * day, NOW)).toBe("6 days ago")
})

test("weeks are singularized at 1", () => {
	const week = 7 * 24 * 60 * 60_000
	expect(formatRelativePast(NOW - week, NOW)).toBe("1 week ago")
	expect(formatRelativePast(NOW - 3 * week, NOW)).toBe("3 weeks ago")
})

test("months are singularized at 1", () => {
	const month = 30 * 24 * 60 * 60_000
	expect(formatRelativePast(NOW - month, NOW)).toBe("1 month ago")
	expect(formatRelativePast(NOW - 6 * month, NOW)).toBe("6 months ago")
})

test("years are singularized at 1", () => {
	const year = 365 * 24 * 60 * 60_000
	expect(formatRelativePast(NOW - year, NOW)).toBe("1 year ago")
	expect(formatRelativePast(NOW - 5 * year, NOW)).toBe("5 years ago")
})
