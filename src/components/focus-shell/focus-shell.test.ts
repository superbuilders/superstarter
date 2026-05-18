import { expect, test } from "bun:test"
import {
	buildTimingOverviewRect,
	buildTutorialPerQuestionAudioSchedule,
	combineTutorialRects
} from "@/components/focus-shell/focus-shell"

test("combineTutorialRects returns the bounding box across multiple regions", () => {
	const rect = combineTutorialRects([
		{ top: 20, left: 30, width: 100, height: 24 },
		{ top: 60, left: 40, width: 150, height: 12 }
	])
	expect(rect).toEqual({ top: 20, left: 30, width: 160, height: 52 })
})

test("buildTimingOverviewRect excludes the per-question timer by only combining progress and overall time", () => {
	const rect = buildTimingOverviewRect(
		{ top: 40, left: 24, width: 220, height: 36 },
		{ top: 92, left: 24, width: 220, height: 18 }
	)
	expect(rect).toEqual({ top: 40, left: 24, width: 220, height: 70 })
})

test("buildTutorialPerQuestionAudioSchedule matches the normal half-target and target thresholds", () => {
	const schedule = buildTutorialPerQuestionAudioSchedule(18000)
	expect(schedule).toEqual([
		{ kind: "tick", atMs: 10000 },
		{ kind: "tick", atMs: 11000 },
		{ kind: "tick", atMs: 12000 },
		{ kind: "tick", atMs: 13000 },
		{ kind: "tick", atMs: 14000 },
		{ kind: "tick", atMs: 15000 },
		{ kind: "tick", atMs: 16000 },
		{ kind: "tick", atMs: 17000 },
		{ kind: "warning", atMs: 18000 }
	])
})
