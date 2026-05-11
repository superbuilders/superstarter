// <MissionCard> — "today's mission" card.
//
// Two-row layout: top row mirrors the previous design (eyebrow + serif
// title on the left, two CTAs on the right). Below that, a 5-segment
// progress strip:
//
//   [show up] [1 practice test] [drill 1] [drill 2] [drill 3]
//
// Segment 1 ("show up") is always filled — the user has already
// shown up by viewing the dashboard. Segment 2 fills when the user
// has finished at least one full-length practice test today (UTC).
// Segments 3–5 each fill per completed drill today, up to three.
//
// Mission complete = all 5 segments filled (practice test ≥ 1 AND
// drills ≥ 3). On completion the eyebrow flips to "Mission complete"
// with a checkmark, the title swaps to a celebratory phrase, and
// the segments turn green. Both CTAs stay visible because more
// practice is encouraged.
//
// CTAs: primary is a filled dark pill (bg-text-1 + text-bg, with a
// matching border so the geometry matches the bordered alternate
// CTA). Alternate is a quiet outlined button. Both are <a> tags with
// cobalt focus rings; we use plain <a> rather than <Link> because the
// hrefs are dynamic strings (DashboardData["mission"] types them as
// string) and Next.js's typedRoutes config requires <Link> hrefs to
// be Route literals or typed Routes.

import type { DashboardData } from "@/server/dashboard/types"

interface MissionCardProps {
	mission: DashboardData["mission"]
}

const SHOW_UP_SEGMENTS = 1

function MissionCard({ mission }: MissionCardProps) {
	const drillsCapped = Math.min(mission.drillsToday, mission.drillsTarget)
	const practiceCapped = Math.min(mission.practiceTestsToday, mission.practiceTestsTarget)
	const totalSegments = SHOW_UP_SEGMENTS + mission.practiceTestsTarget + mission.drillsTarget
	const filledSegments = SHOW_UP_SEGMENTS + practiceCapped + drillsCapped
	const isComplete = filledSegments >= totalSegments
	const progressLabel = isComplete
		? `${filledSegments}/${totalSegments} · more is always good`
		: `${filledSegments}/${totalSegments} today`
	const eyebrowColor = isComplete ? "text-good" : "text-cobalt"
	const eyebrowIcon = isComplete ? <CheckIcon /> : null
	return (
		<section className="mb-2 rounded-lg border border-border-soft bg-surface px-5 py-[10px]">
			<div className="grid grid-cols-[1fr_auto] items-center gap-4">
				<div>
					<p
						className={`mb-[2px] flex items-center gap-1 font-semibold text-[11px] uppercase tracking-[0.06em] ${eyebrowColor}`}
					>
						{eyebrowIcon}
						<span>{mission.eyebrow}</span>
					</p>
					<h3 className="font-medium font-serif text-[16px] text-text-1 tracking-[-0.005em]">
						{mission.title}
					</h3>
				</div>
				<div className="flex gap-2">
					<a
						href={mission.alternateHref}
						className="rounded-md border border-border-strong bg-surface px-3 py-[7px] font-medium text-[13px] text-text-1 transition-colors hover:bg-lavender focus-visible:outline focus-visible:outline-2 focus-visible:outline-cobalt focus-visible:outline-offset-2"
					>
						{mission.alternateLabel}
					</a>
					<a
						href={mission.primaryHref}
						className="rounded-md border border-text-1 bg-text-1 px-3 py-[7px] font-medium text-[13px] text-bg transition-opacity hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-cobalt focus-visible:outline-offset-2"
					>
						{mission.primaryLabel}
					</a>
				</div>
			</div>
			<div className="mt-2 flex items-center gap-2">
				<MissionProgressBar
					filled={filledSegments}
					total={totalSegments}
					complete={isComplete}
				/>
				<p className="tabular text-[11px] text-text-3 tracking-[0.02em]">{progressLabel}</p>
			</div>
		</section>
	)
}

interface MissionProgressBarProps {
	filled: number
	total: number
	complete: boolean
}

function MissionProgressBar({ filled, total, complete }: MissionProgressBarProps) {
	const segments: ReadonlyArray<number> = Array.from({ length: total }, function index(_, i) {
		return i
	})
	return (
		<div
			className="flex h-1.5 flex-1 gap-1"
			role="progressbar"
			aria-valuemin={0}
			aria-valuemax={total}
			aria-valuenow={filled}
			aria-label="Today's mission progress"
		>
			{segments.map(function renderSegment(i) {
				const isFilled = i < filled
				const segmentColor = complete ? "bg-good" : "bg-cobalt"
				const fillClass = isFilled ? segmentColor : "bg-border-soft"
				return (
					<span
						key={i}
						className={`block flex-1 rounded-full ${fillClass}`}
						aria-hidden="true"
					/>
				)
			})}
		</div>
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
