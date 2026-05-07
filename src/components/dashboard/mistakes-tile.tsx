// <MistakesTile> — bottom-row tile linking to /review. Dashboard
// PRD §10.8 + `docs/plans/dashboard.md` §5 commit 8.
//
// Two render branches:
//   - data.count === 0 → empty-state copy ("No mistakes to review"
//     + "Wrong answers from past sessions land here"). The tile is
//     STILL a link to data.href so the route is discoverable.
//   - data.count > 0 → tabular-serif count + sub-line
//     "Wrong answers · ~{estimatedMinutes} min".
//
// Copy avoids "spaced review", "due", and any scheduling-implying
// language: spaced review was cut from v1 (see
// `docs/plans/dashboard.md` §2.8). The tile's value is "you got
// these wrong; revisit them" — not "review schedule" or "interval".
// Decision-resolved at PRD §10.8.
//
// Anchor (NOT next/link): data.href is `string` from the data
// contract; typedRoutes: true requires a Route literal for <Link>.
// Same trade-off as commit 7's BeltRow / MissionCard reconciliation.

import type { DashboardData } from "@/server/dashboard/types"

interface MistakesTileProps {
	data: DashboardData["mistakesQueue"]
}

const TILE_CLASS =
	"block rounded-md bg-surface-2 px-4 py-[14px] transition-colors hover:bg-lavender focus-visible:outline focus-visible:outline-2 focus-visible:outline-cobalt focus-visible:outline-offset-2"

function MistakesTile({ data }: MistakesTileProps) {
	if (data.count === 0) {
		return (
			<a href={data.href} className={TILE_CLASS}>
				<p className="mb-1 text-[12px] text-text-3 uppercase tracking-[0.05em]">
					Mistakes to review
				</p>
				<p className="font-medium font-serif text-[16px] text-text-1 leading-tight">
					No mistakes to review
				</p>
				<p className="mt-1 text-[12px] text-text-2">
					Wrong answers from past sessions land here
				</p>
			</a>
		)
	}
	return (
		<a href={data.href} className={TILE_CLASS}>
			<p className="mb-1 text-[12px] text-text-3 uppercase tracking-[0.05em]">
				Mistakes to review
			</p>
			<p className="tabular font-medium font-serif text-[22px] text-text-1 leading-none">
				{data.count}
			</p>
			<p className="mt-1 text-[12px] text-text-2">
				Wrong answers · ~{data.estimatedMinutes} min
			</p>
		</a>
	)
}

export type { MistakesTileProps }
export { MistakesTile }
