import { describe, expect, test } from "bun:test"
import {
	parseExperimentalPracticeTestConfig,
	type ExperimentalPracticeTestPrimerData
} from "@/server/experimental/practice-test-data"

const BASE_PRIMER: ExperimentalPracticeTestPrimerData = {
	availableCount: 80,
	availableSubTypeCount: 4,
	readyToStart: true,
	minimumReadyCount: 10,
	minimumSubTypeCount: 2,
	startHref: "/experimental/practice-test/run",
	standardDefaultConfig: { questionCount: 50, durationMinutes: 15 },
	defaultConfig: { questionCount: 50, durationMinutes: 15 },
	questionCountBounds: { min: 10, max: 80 },
	durationBounds: { min: 5, max: 60 }
}

describe("parseExperimentalPracticeTestConfig", () => {
	test("uses defaults when query params are omitted", () => {
		const result = parseExperimentalPracticeTestConfig({ primer: { ...BASE_PRIMER } })
		expect(result.ok).toBe(true)
		if (result.ok) {
			expect(result.config).toEqual({ questionCount: 50, durationMinutes: 15 })
		}
	})

	test("rejects question counts above the currently available pool", () => {
		const result = parseExperimentalPracticeTestConfig({
			questionCount: "81",
			durationMinutes: "15",
			primer: { ...BASE_PRIMER }
		})
		expect(result.ok).toBe(false)
		if (!result.ok) {
			expect(result.reason).toContain("Only 80 eligible experimental questions")
		}
	})

	test("rejects when the pool is not ready", () => {
		const result = parseExperimentalPracticeTestConfig({
			questionCount: "10",
			durationMinutes: "15",
			primer: { ...BASE_PRIMER, readyToStart: false, availableCount: 8, availableSubTypeCount: 1 }
		})
		expect(result.ok).toBe(false)
		if (!result.ok) {
			expect(result.reason).toContain("need at least 10 items across 2 subtypes")
		}
	})
})
