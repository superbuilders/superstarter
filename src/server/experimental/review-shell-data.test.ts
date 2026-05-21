import { describe, expect, test } from "bun:test"
import { mapExperimentalSessionTypeToShell } from "@/server/experimental/review-shell-data"

describe("mapExperimentalSessionTypeToShell", () => {
	test("maps experimental practice tests to the practice-test review shell", () => {
		expect(mapExperimentalSessionTypeToShell("practice_test")).toBe("full_length")
	})

	test("preserves drill sessions for the drill review shell", () => {
		expect(mapExperimentalSessionTypeToShell("drill")).toBe("drill")
	})

	test("renders legacy experimental review sessions on the practice-test review shell", () => {
		expect(mapExperimentalSessionTypeToShell("review")).toBe("full_length")
	})
})
