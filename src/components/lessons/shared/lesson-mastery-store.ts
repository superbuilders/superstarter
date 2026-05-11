// Client-side store for "lesson mastered" flags. Persists across
// sessions in localStorage so the lessons index can show a sticky
// "Mastered" badge on cards the user has already cleared, even
// though the in-lesson score counter itself resets every refresh.
//
// Shape on disk: `string[]` of stable lesson slugs (e.g.
// "balance-point", "butterfly", "percent-flip", "benchmarks").

import * as errors from "@superbuilders/errors"
import { z } from "zod"
import { logger } from "@/logger"

const STORAGE_KEY = "18sec:lessons:mastered"

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

export { getMasteredSlugs, markMastered }
