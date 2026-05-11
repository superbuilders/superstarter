// Client-side store for "lesson mastered" flags. Persists across
// sessions in localStorage so the lessons index can show a sticky
// "Mastered" badge on cards the user has already cleared, even
// though the in-lesson score counter itself resets every refresh.
//
// Also tracks "lesson done today" — the dashboard's daily mission
// fills its lesson segment once the user has solved at least one
// problem in any lesson on the current UTC date. The flag is a
// single UTC date string in YYYY-MM-DD form; a new day rolls the
// flag back to "not done" automatically.
//
// Shape on disk:
//   - `18sec:lessons:mastered` — string[] of stable lesson slugs
//     (e.g. "balance-point", "butterfly", "percent-flip", "benchmarks")
//   - `18sec:lessons:done-date` — YYYY-MM-DD UTC date string of the
//     most recent day the user solved a problem in any lesson

import * as errors from "@superbuilders/errors"
import { z } from "zod"
import { logger } from "@/logger"

const STORAGE_KEY = "18sec:lessons:mastered"
const DONE_DATE_KEY = "18sec:lessons:done-date"
const TOTAL_LESSONS = 4

function todayUtcDate(): string {
	const now = new Date()
	const yyyy = now.getUTCFullYear()
	const mm = String(now.getUTCMonth() + 1).padStart(2, "0")
	const dd = String(now.getUTCDate()).padStart(2, "0")
	return `${yyyy}-${mm}-${dd}`
}

const masteredArraySchema = z.array(z.string())

function getMasteredSlugs(): Set<string> {
	if (typeof window === "undefined") return new Set()
	const raw = window.localStorage.getItem(STORAGE_KEY)
	if (raw === null) return new Set()
	const parseResult = errors.trySync(function parse() {
		return JSON.parse(raw)
	})
	if (parseResult.error) {
		logger.warn(
			{ error: parseResult.error, raw },
			"lesson-mastery-store: localStorage payload not valid JSON"
		)
		return new Set()
	}
	const schemaResult = masteredArraySchema.safeParse(parseResult.data)
	if (!schemaResult.success) {
		logger.warn(
			{ error: schemaResult.error, raw },
			"lesson-mastery-store: localStorage payload failed schema"
		)
		return new Set()
	}
	return new Set(schemaResult.data)
}

function markMastered(slug: string): void {
	if (typeof window === "undefined") return
	const current = getMasteredSlugs()
	if (current.has(slug)) return
	current.add(slug)
	const writeResult = errors.trySync(function write() {
		window.localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(current)))
	})
	if (writeResult.error) {
		logger.warn(
			{ error: writeResult.error, slug },
			"lesson-mastery-store: failed to write to localStorage"
		)
	}
}

function isLessonDoneToday(): boolean {
	if (typeof window === "undefined") return false
	const raw = window.localStorage.getItem(DONE_DATE_KEY)
	if (raw === null) return false
	return raw === todayUtcDate()
}

function markLessonDoneToday(): void {
	if (typeof window === "undefined") return
	const today = todayUtcDate()
	const existing = window.localStorage.getItem(DONE_DATE_KEY)
	if (existing === today) return
	const writeResult = errors.trySync(function write() {
		window.localStorage.setItem(DONE_DATE_KEY, today)
	})
	if (writeResult.error) {
		logger.warn(
			{ error: writeResult.error, today },
			"lesson-mastery-store: failed to write lesson-done-today to localStorage"
		)
	}
}

function areAllLessonsMastered(): boolean {
	return getMasteredSlugs().size >= TOTAL_LESSONS
}

export {
	areAllLessonsMastered,
	getMasteredSlugs,
	isLessonDoneToday,
	markLessonDoneToday,
	markMastered,
	TOTAL_LESSONS
}
