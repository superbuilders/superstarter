// <PaceMetric> — pace-this-week tile. Dashboard PRD §10.7 +
// `docs/plans/dashboard.md` §5 commit 8.
//
// Renders: "Pace this week" eyebrow + median seconds value (one
// decimal) + "Median per question · target {targetSeconds}s" sub-
// text + 7-bar mini chart. Today's bar (last entry, oldest first)
// uses bg-cobalt; the rest use bg-pale. Bar height is normalized
// against max(medianSeconds across the week, 1) so the chart scales
// without going to zero in the all-empty stub case.
//
// Bar rendering: SVG <rect> elements with dynamic `height` /
// `y` attributes (NOT CSS `style={{ height: ... }}`). Project's
// gritql/no-inline-style.grit bans the inline-style prop;
// src/components/post-session/latency-summary.tsx is the canonical
// precedent for dynamic-dimension bars; src/components/dashboard/
// belt-row.tsx (commit 7) adopted the same pattern. Same trade-off:
// SVG attributes (height, y, x, width) accept dynamic JSX values
// without going through CSS.
//
// Stub-default (commit 5 returns medianMs: 0, perDayMs: [0…]):
// every bar renders at minimum height (1px) and the value reads
// "0.0s". Acceptable empty-state per PRD §10.7.

import type { DashboardData } from "@/server/dashboard/types"

const CHART_VIEW_HEIGHT = 22
const CHART_VIEW_WIDTH = 100
const BAR_GAP = 1
const BAR_COUNT = 7
const BAR_WIDTH = (CHART_VIEW_WIDTH - BAR_GAP * (BAR_COUNT - 1)) / BAR_COUNT

interface PaceMetricProps {
	pace: DashboardData["pace"]
}

function PaceMetric({ pace }: PaceMetricProps) {
	const seconds = pace.last7Days.map(function toSeconds(d) {
		return d.medianSeconds
	})
	const max = Math.max(...seconds, 1)
	return (
		<section className="rounded-md bg-surface-2 px-4 py-[14px]">
			<p className="mb-1 text-[12px] text-text-3 uppercase tracking-[0.05em]">
				Pace this week
			</p>
			<p className="tabular font-medium font-serif text-[22px] text-text-1 leading-none">
				{pace.medianSeconds.toFixed(1)}s
			</p>
			<p className="mt-1 text-[12px] text-text-2">
				Median per question · target {pace.targetSeconds}s
			</p>
			<svg
				viewBox={`0 0 ${CHART_VIEW_WIDTH} ${CHART_VIEW_HEIGHT}`}
				preserveAspectRatio="none"
				aria-hidden="true"
				className="mt-2 h-[22px] w-full"
			>
				{pace.last7Days.map(function renderBar(d, i) {
					const proportion = max === 0 ? 0 : d.medianSeconds / max
					const minHeight = 1
					const fullBar = proportion * CHART_VIEW_HEIGHT
					const barHeight = fullBar < minHeight ? minHeight : fullBar
					const x = i * (BAR_WIDTH + BAR_GAP)
					const y = CHART_VIEW_HEIGHT - barHeight
					const fillClass = d.isToday ? "fill-cobalt" : "fill-pale"
					const aria = d.isToday
						? `${d.medianSeconds.toFixed(1)}s (today)`
						: `${d.medianSeconds.toFixed(1)}s`
					return (
						<rect
							key={i}
							x={x}
							y={y}
							width={BAR_WIDTH}
							height={barHeight}
							rx={1}
							className={fillClass}
							aria-label={aria}
						/>
					)
				})}
			</svg>
		</section>
	)
}

export type { PaceMetricProps }
export { PaceMetric }
