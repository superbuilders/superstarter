// <DojoCard> — outer card wrapping a header (title + meta eyebrow)
// and a list of <BeltRow>s. Dashboard PRD §10.3 +
// `docs/plans/dashboard.md` §5 commit 7.
//
// No nested cards (PRD §3 + ALPHA §5): the rows are list items
// inside <ul>, not Card primitives. The card surface itself
// (border-border-soft + bg-surface + rounded-lg + overflow-hidden)
// is the only "card" boundary in this composition.
//
// Used twice in the Dashboard (commit 9): once for "Verbal dojo"
// (5 rows) and once for "Numerical dojo" (9 rows). Stub helper
// loadAllBelts (commit 5) returns these counts; meta string is
// computed off rows.length so the verbal/numerical 5/9 split stays
// in sync if the helper's shape ever changes.

import { BeltRow } from "@/components/dashboard/belt-row"
import type { SubtypeRow } from "@/server/dashboard/types"

interface DojoCardProps {
	title: string
	meta: string
	rows: ReadonlyArray<SubtypeRow>
	/** Unix-ms snapshot of "now" — threaded through to every <BeltRow>'s
	 * relative-time formatter so all rows in the card agree on a single
	 * clock per render (resolved once at the dashboard root). */
	nowMs: number
}

function DojoCard({ title, meta, rows, nowMs }: DojoCardProps) {
	return (
		<section className="overflow-hidden rounded-lg border border-border-soft bg-surface">
			<header className="flex items-baseline justify-between border-border-soft border-b px-4 pt-2 pb-1">
				<h3 className="font-medium font-serif text-[15px] text-text-1 tracking-[-0.005em]">
					{title}
				</h3>
				<span className="text-[11px] text-text-3 uppercase tracking-[0.06em]">{meta}</span>
			</header>
			<ul className="divide-none">
				{rows.map(function renderRow(row) {
					return (
						<li key={row.id}>
							<BeltRow row={row} nowMs={nowMs} />
						</li>
					)
				})}
			</ul>
		</section>
	)
}

export type { DojoCardProps }
export { DojoCard }
