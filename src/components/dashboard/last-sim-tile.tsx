// <LastSimTile> — bottom-row tile linking to the most recent full
// sim's post-session review (or to /full-length/configure when no
// sim has been taken). Dashboard PRD §10.9 +
// `docs/plans/dashboard.md` §5 commit 8.
//
// Two render branches:
//   - data === undefined → empty-state CTA "Take your first sim →"
//     linking to /full-length/configure with sub-text "Establishes
//     your baseline".
//   - data defined → tabular-serif "{score} / {outOf}" with sub-
//     line "{dayLabel} · {formatDuration(durationSeconds)}".
//     dayLabel is "today" / "yesterday" / "{N} days ago".
//
// Anchor (NOT next/link): data.href is `string` from the data
// contract; typedRoutes: true requires a Route literal for <Link>.
// Empty-state uses /full-length/configure (a literal that COULD
// resolve under typedRoutes), but for consistency both branches use
// plain <a> per commit 7's reconciliation pattern.

import { formatDuration } from "@/server/dashboard/helpers"
import type { DashboardData } from "@/server/dashboard/types"

interface LastSimTileProps {
	data?: DashboardData["lastSim"]
}

const TILE_CLASS =
	"block rounded-md bg-surface-2 px-4 py-[14px] transition-colors hover:bg-lavender focus-visible:outline focus-visible:outline-2 focus-visible:outline-cobalt focus-visible:outline-offset-2"

function LastSimTile({ data }: LastSimTileProps) {
	if (data === undefined) {
		return (
			<a href="/full-length/configure" className={TILE_CLASS}>
				<p className="mb-1 text-[12px] text-text-3 uppercase tracking-[0.05em]">
					Last full sim
				</p>
				<p className="font-medium font-serif text-[16px] text-text-1 leading-tight">
					Take your first sim →
				</p>
				<p className="mt-1 text-[12px] text-text-2">Establishes your baseline</p>
			</a>
		)
	}
	let dayLabel = `${data.daysAgo} days ago`
	if (data.daysAgo === 0) dayLabel = "today"
	else if (data.daysAgo === 1) dayLabel = "yesterday"
	return (
		<a href={data.href} className={TILE_CLASS}>
			<p className="mb-1 text-[12px] text-text-3 uppercase tracking-[0.05em]">
				Last full sim
			</p>
			<p className="tabular font-medium font-serif text-[22px] text-text-1 leading-none">
				{data.score}
				<span className="ml-1 font-normal text-[13px] text-text-3">/ {data.outOf}</span>
			</p>
			<p className="mt-1 text-[12px] text-text-2">
				{dayLabel} · {formatDuration(data.durationSeconds)}
			</p>
		</a>
	)
}

export type { LastSimTileProps }
export { LastSimTile }
