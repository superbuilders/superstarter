// <BeltRow> — one sub-type row in a <DojoCard>. Dashboard PRD §10.2
// + `docs/plans/dashboard.md` §5 commit 7.
//
// Renders: belt + name (+ optional at-risk dot) + last-drilled
// relative time + chevron. The whole row is a Next.js <Link>; hover
// lightens the surface; focus-visible shows a cobalt 2px inset
// outline (so the row's grid can't shift sibling rows when focus
// lands on one).
//
// Inset focus ring (PRD §10.2 + ALPHA §7 + plan §4 reconciliation):
// ALPHA prefers outside focus rings, but the row's grid layout
// can't accommodate an outside ring without geometric shift; the
// inset cobalt-on-lavender contrast clears 3:1 per ALPHA's "≥3:1
// against neighbors" requirement, so the deviation is sound.
//
// Last-drilled column: replaced the original thin progress bar
// (SVG) with right-aligned dim text reading "<Coarse interval>
// ago" (e.g., "1 day ago") or "Never" for sub-types the user has
// never drilled. The column is also the dashboard's last-worked-on
// sort key (computed off SubtypeRow.lastAttemptedAtMs in
// <Dashboard>).
//
// Time shown is computed from a single `nowMs` prop the parent
// resolves once per render. Reading the clock in the parent (not
// per-row) keeps every row in the dojo card consistent and makes
// the formatter pure-function-of-(past,now), which the unit test at
// src/lib/relative-time.test.ts depends on.
//
// At-risk semantics: a 6px cobalt-warning dot with role="img" so
// the aria-label="at risk" is valid per ARIA spec. Title attribute
// adds hover context. Pure color is not the only signal — the dot's
// existence is the load-bearing indicator.
//
// Anchor (NOT next/link): the row's href is dynamic
// (`/drill/${subTypeId}`) and Next.js's typedRoutes config requires
// <Link> hrefs to be Route literals or typed Routes. Plain <a> with
// a string href satisfies the type checker without an `as Route`
// cast (banned by gritql/no-as-type-assertion). Project precedent
// at src/components/mastery-map/start-session-button.tsx is the
// same: dynamic-href anchor, not Link. The trade-off (loss of
// soft-nav prefetch) is acceptable for a dashboard row that won't
// be hovered before the user makes a click decision.

import { ChevronRightIcon } from "lucide-react"
import { BeltStripe } from "@/components/dashboard/belt-stripe"
import { formatRelativePast } from "@/lib/relative-time"
import type { SubtypeRow } from "@/server/dashboard/types"

interface BeltRowProps {
	row: SubtypeRow
	/** Unix-ms snapshot of "now" for the relative-time formatter.
	 * Resolved once per render by the parent dojo so all rows agree. */
	nowMs: number
}

function BeltRow({ row, nowMs }: BeltRowProps) {
	const lastDrilledLabel =
		row.lastAttemptedAtMs === undefined
			? "Never"
			: formatRelativePast(row.lastAttemptedAtMs, nowMs)
	const atRiskDot = row.atRisk ? (
		<span
			role="img"
			aria-label="at risk"
			title="Recent accuracy or pace has slipped — refresher recommended"
			className="h-[6px] w-[6px] rounded-full bg-pace-over"
		/>
	) : null
	return (
		<a
			href={row.href}
			className="grid grid-cols-[44px_1fr_auto_16px] items-center gap-[10px] border-border-soft border-b px-4 py-[9px] text-sm transition-colors duration-150 ease-out last:border-b-0 hover:bg-lavender focus-visible:outline focus-visible:outline-2 focus-visible:outline-cobalt focus-visible:-outline-offset-2"
		>
			<BeltStripe belt={row.belt} ariaContext={row.name} />
			<span className="flex items-center gap-[6px] font-medium text-text-1">
				<span>{row.name}</span>
				{atRiskDot}
			</span>
			<span className="whitespace-nowrap text-[12px] text-text-3 tabular-nums">
				{lastDrilledLabel}
			</span>
			<ChevronRightIcon aria-hidden="true" className="h-[14px] w-[14px] text-text-3" />
		</a>
	)
}

export type { BeltRowProps }
export { BeltRow }
