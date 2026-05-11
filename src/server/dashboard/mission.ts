// Dashboard "today's mission" builder. Pure functions only — all DB
// reads happen in @/server/dashboard/data.ts. This module's job is
// to (a) pick the recommended alternate drill from already-loaded
// belt rows and (b) assemble the final DashboardData["mission"]
// payload from the picked row + today's completion counts.
//
// **Today's mission shape:**
//   - Title: "Show up + 1 practice test + 3 drills."
//   - Progress: 5 segments — segment 1 is "show up" (always filled
//     by virtue of viewing the dashboard), segment 2 is the practice
//     test, segments 3–5 are the three drills.
//   - Primary CTA: take a full-length practice test (always).
//   - Alternate CTA: drill the sub-type with the lowest visible
//     belt the user last drilled the longest time ago. "Never
//     drilled" beats any drilled timestamp; global across verbal
//     and numerical (no section alternation).
//   - Mission complete = practiceTestsToday >= 1 AND
//     drillsToday >= 3. Eyebrow + title flip on completion; both
//     CTAs stay visible because more practice is always
//     recommended.
//
// **Picker ordering for the alternate CTA's sub-type:**
//   - Sort by belt rank ASC (white < blue < brown < black). The
//     belt is derived from the user's most-recent drill attempt's
//     tier (`loadAllBelts` in @/server/dashboard/belts.ts) so it
//     matches what the user sees on the <DojoCard> rows; sub-types
//     the user has never drilled default to "white".
//   - Tie-break by `lastAttemptedAtMs` ASC, with `undefined`
//     (never drilled) treated as the smallest possible value —
//     "Never drilled" wins over any concrete timestamp at the same
//     belt.
//   - Final tie-break preserves input order via `Array.prototype
//     .sort` stability (V8 + Bun). Callers pass rows in
//     config-order (verbal then numerical, each filtered by
//     section), so ties resolve deterministically.

import * as errors from "@superbuilders/errors"
import { logger } from "@/logger"
import type { BeltLevel, DashboardData, SubtypeRow } from "@/server/dashboard/types"

const BELT_RANK: Record<BeltLevel, number> = {
	white: 0,
	blue: 1,
	brown: 2,
	black: 3
}

const DRILLS_TARGET = 3
const PRACTICE_TESTS_TARGET = 1

function compareForPicker(a: SubtypeRow, b: SubtypeRow): number {
	const rankDiff = BELT_RANK[a.belt] - BELT_RANK[b.belt]
	if (rankDiff !== 0) return rankDiff
	const aMs = a.lastAttemptedAtMs
	const bMs = b.lastAttemptedAtMs
	if (aMs === undefined && bMs === undefined) return 0
	if (aMs === undefined) return -1
	if (bMs === undefined) return 1
	return aMs - bMs
}

function pickLowestBeltSubType(rows: ReadonlyArray<SubtypeRow>): SubtypeRow {
	if (rows.length === 0) {
		logger.error({}, "pickLowestBeltSubType: empty rows (impossible — config has 14 sub-types)")
		throw errors.new("pickLowestBeltSubType: empty rows")
	}
	const sorted = [...rows].sort(compareForPicker)
	const chosen = sorted[0]
	if (chosen === undefined) {
		logger.error({}, "pickLowestBeltSubType: sorted[0] undefined (impossible)")
		throw errors.new("pickLowestBeltSubType: sorted[0] undefined")
	}
	return chosen
}

function pickTopSubTypes(rows: ReadonlyArray<SubtypeRow>, count: number): ReadonlyArray<SubtypeRow> {
	if (rows.length === 0) {
		logger.error({ count }, "pickTopSubTypes: empty rows (impossible — config has 14 sub-types)")
		throw errors.new("pickTopSubTypes: empty rows")
	}
	const sorted = [...rows].sort(compareForPicker)
	return sorted.slice(0, count)
}

interface BuildTodaysMissionInput {
	beltRows: ReadonlyArray<SubtypeRow>
	drillsToday: number
	practiceTestsToday: number
}

function buildTodaysMission(input: BuildTodaysMissionInput): DashboardData["mission"] {
	const { beltRows, drillsToday, practiceTestsToday } = input
	const topPicks = pickTopSubTypes(beltRows, DRILLS_TARGET)
	const chosen = topPicks[0]
	if (chosen === undefined) {
		logger.error({}, "buildTodaysMission: topPicks empty (impossible)")
		throw errors.new("buildTodaysMission: topPicks empty")
	}
	const recommendedDrills = topPicks.map(function toRecommendation(row) {
		return {
			id: row.id,
			name: row.name,
			href: `/drill/${encodeURIComponent(row.id)}/run`
		}
	})
	const isComplete =
		drillsToday >= DRILLS_TARGET && practiceTestsToday >= PRACTICE_TESTS_TARGET
	const eyebrow = isComplete ? "Mission complete" : "Today's mission"
	const title = isComplete
		? "Nice work — keep stacking reps."
		: "Show up + 1 practice test + 3 drills."
	logger.info(
		{
			chosenSubTypeId: chosen.id,
			chosenBelt: chosen.belt,
			chosenLastAttemptedAtMs: chosen.lastAttemptedAtMs,
			drillsToday,
			drillsTarget: DRILLS_TARGET,
			practiceTestsToday,
			practiceTestsTarget: PRACTICE_TESTS_TARGET,
			isComplete,
			recommendedDrillIds: recommendedDrills.map(function getId(d) {
				return d.id
			})
		},
		"buildTodaysMission: resolved"
	)
	return {
		eyebrow,
		title,
		primaryHref: "/full-length/configure",
		primaryLabel: "Start full sim",
		alternateHref: `/drill/${encodeURIComponent(chosen.id)}/run`,
		alternateLabel: chosen.name,
		drillsToday,
		drillsTarget: DRILLS_TARGET,
		practiceTestsToday,
		practiceTestsTarget: PRACTICE_TESTS_TARGET,
		recommendedDrills
	}
}

export type { BuildTodaysMissionInput }
export {
	BELT_RANK,
	buildTodaysMission,
	compareForPicker,
	DRILLS_TARGET,
	pickLowestBeltSubType,
	pickTopSubTypes,
	PRACTICE_TESTS_TARGET
}
