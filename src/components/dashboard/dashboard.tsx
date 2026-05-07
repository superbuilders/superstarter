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
// Pure render composition over already-shipped components — zero
// state, zero effects, zero data fetching. The eight component
// types it composes (TopNav + ScoreStrip + MissionCard + 2×
// DojoCard + PaceMetric + MistakesTile + LastSimTile) are all
// self-contained presentational; Dashboard is just a layout
// container plus the React.use unwrap.
//
// Bottom three-tile strip uses md:grid-cols-[1.4fr_1fr_1fr] —
// PaceMetric gets 1.4× width because its 7-bar chart needs
// horizontal room; the other two tiles are equal-width.

import * as React from "react"
import { DojoCard } from "@/components/dashboard/dojo-card"
import { LastSimTile } from "@/components/dashboard/last-sim-tile"
import { MissionCard } from "@/components/dashboard/mission-card"
import { MistakesTile } from "@/components/dashboard/mistakes-tile"
import { PaceMetric } from "@/components/dashboard/pace-metric"
import { ScoreStrip } from "@/components/dashboard/score-strip"
import { TopNav } from "@/components/dashboard/top-nav"
import type { DashboardData } from "@/server/dashboard/types"

interface DashboardProps {
	dataPromise: Promise<DashboardData>
}

function Dashboard({ dataPromise }: DashboardProps) {
	const data = React.use(dataPromise)
	return (
		<div className="min-h-screen bg-bg text-text-1">
			<TopNav streakDays={data.user.streakDays} initials={data.user.initials} />
			<main className="mx-auto max-w-[1100px] px-7 pb-12">
				<h1 className="sr-only">Dashboard</h1>
				<ScoreStrip
					firstName={data.user.firstName}
					greeting={data.greeting}
					score={data.score}
				/>
				<MissionCard mission={data.mission} />
				<div className="mb-[14px] grid grid-cols-1 gap-3 md:grid-cols-2">
					<DojoCard
						title="Verbal dojo"
						meta={`${data.verbal.length} sub-types`}
						rows={data.verbal}
					/>
					<DojoCard
						title="Numerical dojo"
						meta={`${data.numerical.length} sub-types`}
						rows={data.numerical}
					/>
				</div>
				<div className="grid grid-cols-1 gap-3 md:grid-cols-[1.4fr_1fr_1fr]">
					<PaceMetric pace={data.pace} />
					<MistakesTile data={data.mistakesQueue} />
					<LastSimTile data={data.lastSim} />
				</div>
			</main>
		</div>
	)
}

export type { DashboardProps }
export { Dashboard }
