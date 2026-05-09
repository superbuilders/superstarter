// <BeltRow> — one sub-type row in a <DojoCard>. Dashboard PRD §10.2
// + `docs/plans/dashboard.md` §5 commit 7.
//
// Renders: belt + name (+ optional at-risk dot) + thin progress bar
// + chevron. The whole row is a Next.js <Link>; hover lightens the
// surface; focus-visible shows a cobalt 2px inset outline (so the
// row's grid can't shift sibling rows when focus lands on one).
//
// Inset focus ring (PRD §10.2 + ALPHA §7 + plan §4 reconciliation):
// ALPHA prefers outside focus rings, but the row's grid layout
// can't accommodate an outside ring without geometric shift; the
// inset cobalt-on-lavender contrast clears 3:1 per ALPHA's "≥3:1
// against neighbors" requirement, so the deviation is sound.
//
// Progress-bar shape: SVG (NOT a styled <div> with style={{ width:
// `${pct}%` }}). The project's gritql/no-inline-style.grit bans the
// style={{}} prop; latency-summary.tsx (sub-phase 1) is the canonical
// precedent — SVG attributes (x, y, width, height) accept dynamic
// JSX values cleanly without violating the rule. PRD §10.2's listing
// uses style={{ width: ... }}; we adapt to project convention here.
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
import { clamp01 } from "@/server/dashboard/helpers"
import type { SubtypeRow } from "@/server/dashboard/types"

const PROGRESS_TRACK_WIDTH = 64
const PROGRESS_TRACK_HEIGHT = 3
const PROGRESS_TRACK_RADIUS = 2

interface BeltRowProps {
	row: SubtypeRow
}

function BeltRow({ row }: BeltRowProps) {
	const fillFraction = clamp01(row.progressToNext)
	const fillWidth = fillFraction * PROGRESS_TRACK_WIDTH
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
			className="grid grid-cols-[44px_1fr_64px_16px] items-center gap-[10px] border-border-soft border-b px-4 py-[9px] text-sm transition-colors duration-150 ease-out last:border-b-0 hover:bg-lavender focus-visible:outline focus-visible:outline-2 focus-visible:outline-cobalt focus-visible:-outline-offset-2"
		>
			<BeltStripe belt={row.belt} ariaContext={row.name} />
			<span className="flex items-center gap-[6px] font-medium text-text-1">
				<span>{row.name}</span>
				{atRiskDot}
			</span>
			<svg
				viewBox={`0 0 ${PROGRESS_TRACK_WIDTH} ${PROGRESS_TRACK_HEIGHT}`}
				preserveAspectRatio="none"
				aria-hidden="true"
				className="h-[3px] w-full"
			>
				<rect
					x={0}
					y={0}
					width={PROGRESS_TRACK_WIDTH}
					height={PROGRESS_TRACK_HEIGHT}
					rx={PROGRESS_TRACK_RADIUS}
					className="fill-surface-2"
				/>
				<rect
					x={0}
					y={0}
					width={fillWidth}
					height={PROGRESS_TRACK_HEIGHT}
					rx={PROGRESS_TRACK_RADIUS}
					className="fill-alpha-accent"
				/>
			</svg>
			<ChevronRightIcon aria-hidden="true" className="h-[14px] w-[14px] text-text-3" />
		</a>
	)
}

export type { BeltRowProps }
export { BeltRow }
