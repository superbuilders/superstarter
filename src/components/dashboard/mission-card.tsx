"use client"

// <MissionCard> — "today's mission" card.
//
// Single-row header (eyebrow + serif title) over a 5-segment progress
// strip. Each segment carries a label beneath it naming what it
// represents (e.g. "Show up", "Practice test", "1 lesson", "Letter
// Series", "Word Problems"); the segment + label are wrapped in a
// single anchor that navigates to the matching assignment, with a
// hover/focus color shift signaling the affordance.
//
// Per-segment destinations:
//   • Show up      — no link (the user already showed up by viewing
//                    the dashboard; static segment)
//   • Practice test — /full-length/configure
//   • 1 lesson     — /lessons
//   • Drill 1..N   — /drill/<sub-type-id>/run (from mission.recommendedDrills)
//
// Segment composition:
//
//   • Default — "Show up + 1 practice test + 1 lesson + 2 drills"
//     when there is at least one lesson the user has NOT yet
//     mastered. Lesson localStorage is the source of truth (per
//     `lesson-mastery-store.ts`).
//
//   • All-mastered — "Show up + 1 practice test + 3 drills" (the
//     original composition) once every lesson slug appears in the
//     mastery store. The user no longer needs the daily lesson
//     reminder, so the bar reverts to three drill segments.
//
// In both cases the bar carries five segments so the visual length
// stays stable. The mission is "complete" when:
//   - practiceTestsToday >= 1 AND drillsToday >= drillTarget AND
//   - (allLessonsMastered OR lessonDoneToday).
//
// `mastered` and `lessonDoneToday` live in localStorage; we mount in
// "default" mode (not all mastered, lesson not done) so SSR + first
// client render match exactly, then a useEffect hydrates the real
// values from localStorage. Layout shift is limited to the per-
// segment labels — the bar geometry stays a 5-segment row.

import * as React from "react"
import {
	areAllLessonsMastered,
	isLessonDoneToday
} from "@/components/lessons/shared/lesson-mastery-store"
import type { DashboardData } from "@/server/dashboard/types"

interface MissionCardProps {
	mission: DashboardData["mission"]
}

const DRILL_TARGET_WITH_LESSON = 2
const PRACTICE_TEST_HREF = "/full-length/configure"
const LESSONS_INDEX_HREF = "/lessons"

interface SegmentSpec {
	label: string
	filled: boolean
	href?: string
}

function buildSegments(input: {
	mission: DashboardData["mission"]
	includeLesson: boolean
	lessonDoneToday: boolean
}): ReadonlyArray<SegmentSpec> {
	const { mission, includeLesson, lessonDoneToday } = input
	const drillsTarget = includeLesson ? DRILL_TARGET_WITH_LESSON : mission.drillsTarget
	const segments: SegmentSpec[] = [{ label: "Show up", filled: true }]
	const practiceFilled = mission.practiceTestsToday >= mission.practiceTestsTarget
	segments.push({ label: "Practice test", filled: practiceFilled, href: PRACTICE_TEST_HREF })
	if (includeLesson) {
		segments.push({ label: "1 lesson", filled: lessonDoneToday, href: LESSONS_INDEX_HREF })
	}
	const drillsFilledCount = Math.min(mission.drillsToday, drillsTarget)
	for (let i = 0; i < drillsTarget; i++) {
		const rec = mission.recommendedDrills[i]
		const label = rec === undefined ? `Drill ${i + 1}` : rec.name
		const href = rec === undefined ? undefined : rec.href
		segments.push({
			label,
			filled: i < drillsFilledCount,
			href
		})
	}
	return segments
}

function MissionCard({ mission }: MissionCardProps) {
	const [allMastered, setAllMastered] = React.useState(false)
	const [lessonDoneToday, setLessonDoneToday] = React.useState(false)

	React.useEffect(function hydrate() {
		setAllMastered(areAllLessonsMastered())
		setLessonDoneToday(isLessonDoneToday())
	}, [])

	const includeLesson = !allMastered
	const segments = buildSegments({ mission, includeLesson, lessonDoneToday })
	const totalSegments = segments.length
	const filledSegments = segments.filter(function isFilled(s) {
		return s.filled
	}).length
	const isComplete = filledSegments >= totalSegments
	const dynamicTitle = includeLesson
		? "Show up + 1 practice test + 1 lesson + 2 drills."
		: "Show up + 1 practice test + 3 drills."
	const titleToShow = isComplete ? "Nice work — keep stacking reps." : dynamicTitle
	const dynamicEyebrow = isComplete ? "Mission complete" : "Today's mission"
	const progressLabel = isComplete
		? `${filledSegments}/${totalSegments} · more is always good`
		: `${filledSegments}/${totalSegments} today`
	const eyebrowColor = isComplete ? "text-good" : "text-cobalt"
	const eyebrowIcon = isComplete ? <CheckIcon /> : null
	return (
		<section className="mb-2 rounded-lg border border-border-soft bg-surface px-5 py-[10px]">
			<div>
				<p
					className={`mb-[2px] flex items-center gap-1 font-semibold text-[11px] uppercase tracking-[0.06em] ${eyebrowColor}`}
				>
					{eyebrowIcon}
					<span>{dynamicEyebrow}</span>
				</p>
				<h3 className="font-medium font-serif text-[16px] text-text-1 tracking-[-0.005em]">
					{titleToShow}
				</h3>
			</div>
			<MissionProgressBar
				segments={segments}
				complete={isComplete}
				progressLabel={progressLabel}
			/>
		</section>
	)
}

interface MissionProgressBarProps {
	segments: ReadonlyArray<SegmentSpec>
	complete: boolean
	progressLabel: string
}

function MissionProgressBar({ segments, complete, progressLabel }: MissionProgressBarProps) {
	const filled = segments.filter(function isFilled(s) {
		return s.filled
	}).length
	return (
		<div
			className="mt-2"
			role="progressbar"
			aria-valuemin={0}
			aria-valuemax={segments.length}
			aria-valuenow={filled}
			aria-label="Today's mission progress"
		>
			<div className="flex items-stretch gap-1">
				{segments.map(function renderSegment(segment, i) {
					const key = `seg-${i}-${segment.label}`
					return (
						<MissionSegment
							key={key}
							segment={segment}
							complete={complete}
						/>
					)
				})}
			</div>
			<p className="tabular mt-1 text-[11px] text-text-3 tracking-[0.02em]">
				{progressLabel}
			</p>
		</div>
	)
}

interface MissionSegmentProps {
	segment: SegmentSpec
	complete: boolean
}

function MissionSegment({ segment, complete }: MissionSegmentProps) {
	const filledBarColor = complete ? "bg-good" : "bg-cobalt"
	const barFillClass = segment.filled ? filledBarColor : "bg-border-soft"
	const baseLabelTone = segment.filled
		? complete
			? "text-good"
			: "text-text-2"
		: "text-text-3"
	const isInteractive = segment.href !== undefined
	const barHoverClass = isInteractive && !segment.filled
		? "group-hover:bg-cobalt group-focus-visible:bg-cobalt"
		: ""
	const labelHoverClass = isInteractive
		? "group-hover:text-cobalt group-focus-visible:text-cobalt"
		: ""
	const bar = (
		<span
			className={`block h-1.5 w-full rounded-full transition-colors ${barFillClass} ${barHoverClass}`}
			aria-hidden="true"
		/>
	)
	const label = (
		<span
			className={`mt-1 block w-full truncate text-center font-medium text-[10px] tracking-[0.01em] transition-colors ${baseLabelTone} ${labelHoverClass}`}
			title={segment.label}
		>
			{segment.label}
		</span>
	)
	if (segment.href === undefined) {
		return (
			<div className="flex flex-1 flex-col">
				{bar}
				{label}
			</div>
		)
	}
	return (
		<a
			href={segment.href}
			aria-label={`Go to ${segment.label}`}
			className="group flex flex-1 flex-col rounded-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-cobalt focus-visible:outline-offset-2"
		>
			{bar}
			{label}
		</a>
	)
}

function CheckIcon() {
	return (
		<svg
			width="12"
			height="12"
			viewBox="0 0 16 16"
			fill="none"
			xmlns="http://www.w3.org/2000/svg"
			aria-hidden="true"
		>
			<title>Mission complete checkmark</title>
			<path
				d="M3 8.5L6.5 12L13 5"
				stroke="currentColor"
				strokeWidth="2"
				strokeLinecap="round"
				strokeLinejoin="round"
			/>
		</svg>
	)
}

export type { MissionCardProps }
export { MissionCard }
