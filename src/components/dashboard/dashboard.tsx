"use client"

// <Dashboard> — client wrapper that consumes the data promise from
// the page mount and renders the full dashboard composition.
// Dashboard PRD §11 + `docs/plans/dashboard.md` §5 commit 9.
//
// "use client" because of React.use(dataPromise). The page mount at
// commit 10 owns the <React.Suspense> boundary; this component
// suspends inside that boundary while the data resolves, then
// renders the assembled DashboardData payload.
//
// Sort state (added with the dashboard-belt-sort-and-last-drilled
// redirect): one global sort key + reverse toggle drives both
// <DojoCard>s. Default is "recent" + reversed — Never/oldest at the
// top, newest-drilled at the bottom — so the strip surfaces the
// least-touched sub-types on first paint. The reverse toggle (added
// with the asc/desc follow-up) flips whatever the active sort
// produces wholesale; see subtype-sort.ts for the per-key semantics.
// State is component-local (not URL params), so the dashboard's
// revalidatePath('/') after a drill keeps the user's chosen sort
// intact.
//
// `nowMs` is resolved once per render at the dashboard root and
// threaded down to <DojoCard>'s rows so every <BeltRow>'s
// relative-time label in a single render agrees on a single clock.
// Re-evaluated on every render (cheap; no useMemo) so the labels
// freshen naturally when the user re-sorts or the data revalidates.
//
// Practice round commit 10: the bottom three-tile strip
// (<PaceMetric> + <MistakesTile> + <LastSimTile>) was removed
// atomically. Previous Pace + Mistakes moved into <ScoreStrip>'s
// 5-stat top panel at commit 9; "last sim" is no longer a
// dashboard-surface concern (covered by /post-session).

import * as React from "react"
import { BeltLegend } from "@/components/dashboard/belt-legend"
import { DojoCard } from "@/components/dashboard/dojo-card"
import { MissionCard } from "@/components/dashboard/mission-card"
import { ScoreStrip } from "@/components/dashboard/score-strip"
import { sortSubtypes, type SubtypeSortKey } from "@/components/dashboard/subtype-sort"
import { SubtypeSortSelector } from "@/components/dashboard/subtype-sort-selector"
import { TopNav } from "@/components/dashboard/top-nav"
import type { DashboardData } from "@/server/dashboard/types"

interface DashboardProps {
	dataPromise: Promise<DashboardData>
}

function Dashboard({ dataPromise }: DashboardProps) {
	const data = React.use(dataPromise)
	const [sortKey, setSortKey] = React.useState<SubtypeSortKey>("recent")
	const [reversed, setReversed] = React.useState<boolean>(true)
	const nowMs = Date.now()
	const sortedVerbal = React.useMemo(function sortVerbal() {
		return sortSubtypes(data.verbal, sortKey, reversed)
	}, [data.verbal, sortKey, reversed])
	const sortedNumerical = React.useMemo(function sortNumerical() {
		return sortSubtypes(data.numerical, sortKey, reversed)
	}, [data.numerical, sortKey, reversed])
	function toggleReversed() {
		setReversed(function flip(prev) {
			return !prev
		})
	}
	return (
		<div className="min-h-screen bg-bg text-text-1">
			<TopNav streakDays={data.user.streakDays} initials={data.user.initials} />
			<main className="mx-auto max-w-[1100px] px-7 pb-6">
				<h1 className="sr-only">Dashboard</h1>
				<ScoreStrip
					firstName={data.user.firstName}
					greeting={data.greeting}
					score={data.score}
					pace={data.pace}
					mistakesQueue={data.mistakesQueue}
				/>
				<MissionCard mission={data.mission} />
				<div className="mb-2 flex flex-wrap items-center justify-between gap-3">
					<SubtypeSortSelector
						value={sortKey}
						reversed={reversed}
						onChange={setSortKey}
						onToggleReverse={toggleReversed}
					/>
					<BeltLegend />
				</div>
				<div className="grid grid-cols-1 gap-3 md:grid-cols-2">
					<DojoCard
						title="Verbal dojo"
						meta={`${sortedVerbal.length} sub-types`}
						rows={sortedVerbal}
						nowMs={nowMs}
					/>
					<DojoCard
						title="Numerical dojo"
						meta={`${sortedNumerical.length} sub-types`}
						rows={sortedNumerical}
						nowMs={nowMs}
					/>
				</div>
			</main>
		</div>
	)
}

export type { DashboardProps }
export { Dashboard }
