import { describe, expect, test } from "bun:test"
import { generateFullLengthSlots } from "@/config/difficulty-curves"
import type { Difficulty, SubTypeId } from "@/config/sub-types"
import {
	allocateExperimentalPracticeTestQueue,
	buildExperimentalPracticeTestTargetSlots
} from "@/server/experimental/practice-test-mix"

const SESSION_ID = "01971c80-d812-73e3-b55f-1c6fcd7a9e21"

function difficultyCounts(rows: ReadonlyArray<{ difficulty: Difficulty }>): Record<Difficulty, number> {
	const counts: Record<Difficulty, number> = { easy: 0, medium: 0, hard: 0, brutal: 0 }
	for (const row of rows) {
		counts[row.difficulty] += 1
	}
	return counts
}

function alternateSubTypeFor(slotSubTypeId: SubTypeId): SubTypeId {
	if (slotSubTypeId === "numerical.word_problems") {
		return "verbal.antonyms"
	}
	return "numerical.word_problems"
}

describe("buildExperimentalPracticeTestTargetSlots", () => {
	test("matches the canonical 50-question difficulty distribution exactly", () => {
		const canonical = generateFullLengthSlots(SESSION_ID)
		const experimental = buildExperimentalPracticeTestTargetSlots(SESSION_ID, 50)
		expect(experimental).toHaveLength(canonical.length)
		expect(difficultyCounts(experimental)).toEqual(difficultyCounts(canonical))
	})

	test("resizes the canonical decile curve for non-50 counts", () => {
		const slots = buildExperimentalPracticeTestTargetSlots(SESSION_ID, 12)
		expect(slots).toHaveLength(12)
		expect(difficultyCounts(slots)).toEqual({ easy: 3, medium: 4, hard: 4, brutal: 1 })
	})
})

describe("allocateExperimentalPracticeTestQueue", () => {
	test("uses exact matches when the pool can satisfy the target plan", () => {
		const targetSlots = buildExperimentalPracticeTestTargetSlots(SESSION_ID, 12)
		const rows = targetSlots.map(function toRow(slot, index) {
			return { id: `row-${index}`, subTypeId: slot.subTypeId, difficulty: slot.difficulty }
		})
		const result = allocateExperimentalPracticeTestQueue({
			sessionId: SESSION_ID,
			questionCount: 12,
			rows,
			recencyExcludedIds: []
		})
		expect(result.queue).toHaveLength(12)
		expect(result.diagnostics.fallbackRedistributionUsed).toBe(false)
		expect(result.diagnostics.actualDistribution.difficulty).toEqual(
			result.diagnostics.targetDistribution.difficulty
		)
	})

	test("redistributes gracefully when one difficulty band is missing", () => {
		const targetSlots = buildExperimentalPracticeTestTargetSlots(SESSION_ID, 12)
		const rows = targetSlots.map(function toRow(slot, index) {
			const difficulty = slot.difficulty === "brutal" ? "hard" : slot.difficulty
			return { id: `row-${index}`, subTypeId: slot.subTypeId, difficulty }
		})
		const result = allocateExperimentalPracticeTestQueue({
			sessionId: SESSION_ID,
			questionCount: 12,
			rows,
			recencyExcludedIds: []
		})
		expect(result.queue).toHaveLength(12)
		expect(result.diagnostics.fallbackRedistributionUsed).toBe(true)
		expect(result.diagnostics.actualDistribution.difficulty.brutal).toBe(0)
		expect(result.diagnostics.actualDistribution.difficulty.hard).toBeGreaterThan(
			result.diagnostics.targetDistribution.difficulty.hard
		)
	})

	test("uses recency-soft exact matches before distorting the mix when needed", () => {
		const targetSlots = buildExperimentalPracticeTestTargetSlots(SESSION_ID, 1)
		expect(targetSlots).toHaveLength(1)
		const slot = targetSlots[0]
		if (slot === undefined) return
		const rows = [
			{ id: "recency-exact", subTypeId: slot.subTypeId, difficulty: slot.difficulty },
			{ id: "fresh-fallback", subTypeId: alternateSubTypeFor(slot.subTypeId), difficulty: "easy" as const }
		]
		const result = allocateExperimentalPracticeTestQueue({
			sessionId: SESSION_ID,
			questionCount: 1,
			rows,
			recencyExcludedIds: ["recency-exact"]
		})
		expect(result.queue).toHaveLength(1)
		expect(result.queue[0]?.id).toBe("recency-exact")
		expect(result.diagnostics.recencyFallbackUsed).toBe(true)
	})
})
