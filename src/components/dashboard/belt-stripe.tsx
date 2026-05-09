// <BeltStripe> — dashboard belt-row primitive. Dashboard PRD §10.1
// + `docs/plans/dashboard.md` §5 commit 6 + Round 1 commit 4 per
// `docs/plans/dashboard-drill-diagnostic-bug-fixes-and-design-
// retrofit.md` §5.4 + §0.13 + commit-4 follow-up (sizing).
//
// Thin layout wrapper around <BeltGraphic>: provides the dashboard's
// 40×12 dimensions + 1px-border-radius-clipped frame, plus ARIA
// context-prefixing for the belt-row's category label (e.g.
// "Antonyms: white belt"). The visual primitive itself — body +
// offset tip + body sliver — lives in <BeltGraphic>.
//
// Container sizing: bumped from 22×6 to 40×12 in commit-4 follow-up
// for BJJ-belt recognition (the 22×6 size made the tip block too
// small to read as a rank tip). The aspect ratio (40:12 ≈ 3.3:1) is
// flatter than <BeltGraphic>'s natural viewBox (100:22 ≈ 4.5:1);
// preserveAspectRatio="none" on the SVG absorbs the difference. The
// paired <BeltRow> grid first column was bumped 24px → 44px to fit
// (4px slack).
//
// Pre-§0.13: this file owned an inline-block <span> with a "cap" via
// a second absolute-positioned <span> using `bg-bg`. The cap created
// an optical illusion of a tipped belt edge against the page surface.
// Post-§0.13: the SVG carries the canonical body+tip+sliver structure
// directly; the cap-illusion technique is no longer needed.
//
// NOT to be confused with <BeltIndicator> at
// src/components/post-session/belt-indicator.tsx (Phase 5 sub-phase
// 5, `b31d8cb`): different visual primitive (heading-attached SVG
// belt body), different semantic axis (session-end tier mapping),
// different file. The naming-collision discipline is captured in
// `docs/plans/dashboard.md` §2.10. The post-session indicator is
// untouched by the dashboard round.

import { BeltGraphic } from "@/components/dashboard/belt-graphic"
import { cn } from "@/lib/utils"
import type { BeltLevel } from "@/server/dashboard/types"

interface BeltStripeProps {
	belt: BeltLevel
	/** Sentence-cased category name for the aria-label, e.g. "Antonyms" */
	ariaContext?: string
	className?: string
}

function BeltStripe({ belt, ariaContext, className }: BeltStripeProps) {
	const label = ariaContext === undefined ? `${belt} belt` : `${ariaContext}: ${belt} belt`
	return (
		<span
			className={cn(
				"inline-block h-[12px] w-[40px] overflow-hidden rounded-[1px]",
				className
			)}
		>
			<BeltGraphic beltColor={belt} ariaLabel={label} className="block h-full w-full" />
		</span>
	)
}

export type { BeltStripeProps }
export { BeltStripe }
