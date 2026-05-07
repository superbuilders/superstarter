// <MissionCard> — "today's mission" card. Two-column grid: text
// block on the left (eyebrow → serif title → body), CTAs on the
// right. Dashboard PRD §10.4 + `docs/plans/dashboard.md` §5 commit 7.
//
// CTAs: primary is a filled dark pill (bg-text-1 + text-bg, with a
// border in the same color so the geometry matches the alternate
// CTA's bordered shape — see PRD §10.4). Alternate is a quiet
// outlined button. Both are <Link>s with cobalt focus rings.
//
// The pickTodaysMission stub (commit 5) returns the static
// "Take your baseline simulation" mission with primary →
// /full-length/configure and alternate → /drill (the picker mounted
// at commit 3 of this round). Future Mission Picker PRD swaps the
// content; the component layout is mission-content-agnostic.
//
// No `<h-anything>` for the eyebrow per PRD §10.4 — it's a <p> with
// uppercase tracking. The mission's serif title is the <h3>.
//
// Anchor (NOT next/link): mission.primaryHref + mission.alternateHref
// are dynamic (DashboardData["mission"] types them as `string`), and
// Next.js's typedRoutes config requires <Link> hrefs to be Route
// literals or typed Routes. Plain <a> with a string href satisfies
// the type checker without an `as Route` cast (banned by
// gritql/no-as-type-assertion). Same trade-off as <BeltRow>: loss
// of soft-nav prefetch, gained type-safety + rule-compliance.

import type { DashboardData } from "@/server/dashboard/types"

interface MissionCardProps {
	mission: DashboardData["mission"]
}

function MissionCard({ mission }: MissionCardProps) {
	return (
		<section className="mb-[14px] grid grid-cols-[1fr_auto] items-center gap-4 rounded-lg border border-border-soft bg-surface px-5 py-4">
			<div>
				<p className="mb-1 font-semibold text-[11px] text-cobalt uppercase tracking-[0.06em]">
					{mission.eyebrow}
				</p>
				<h3 className="mb-1 font-medium font-serif text-[16px] text-text-1 tracking-[-0.005em]">
					{mission.title}
				</h3>
				<p className="text-[13px] text-text-2 leading-relaxed">{mission.body}</p>
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
		</section>
	)
}

export type { MissionCardProps }
export { MissionCard }
