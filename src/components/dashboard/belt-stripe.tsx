// <BeltStripe> — dashboard belt-row primitive. Dashboard PRD §10.1
// + `docs/plans/dashboard.md` §5 commit 6.
//
// 22×6 colored stripe with a 4px-wide light cap on the right edge,
// mirroring the martial-arts belt-tip motif. The cap is what makes
// it read as a belt rather than a generic colored bar — keep it.
//
// NOT to be confused with <BeltIndicator> at
// src/components/post-session/belt-indicator.tsx (Phase 5 sub-phase
// 5, `b31d8cb`): different visual primitive (heading-attached SVG
// belt body), different semantic axis (session-end tier mapping),
// different file. The naming-collision discipline is captured in
// `docs/plans/dashboard.md` §2.10. The post-session indicator is
// untouched by the dashboard round.
//
// Token consumption (commit-1-established): bg-belt-white,
// bg-belt-blue, bg-belt-brown, bg-belt-black, border-belt-white-line,
// bg-bg. The cap's `bg-bg` is intentional — it disappears against
// the page surface, creating the optical illusion of a wrapped belt
// edge. Don't substitute white or surface; they break in dark mode.

import { cn } from "@/lib/utils"
import type { BeltLevel } from "@/server/dashboard/types"

const BELT_BG: Record<BeltLevel, string> = {
	white: "bg-belt-white border border-belt-white-line",
	blue: "bg-belt-blue",
	brown: "bg-belt-brown",
	black: "bg-belt-black"
}

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
				"relative inline-block h-[6px] w-[22px] rounded-[1px]",
				BELT_BG[belt],
				className
			)}
			role="img"
			aria-label={label}
		>
			<span
				aria-hidden="true"
				className="absolute -top-[1.5px] -right-[1px] -bottom-[1.5px] w-[4px] rounded-[1px] bg-bg"
			/>
		</span>
	)
}

export type { BeltStripeProps }
export { BeltStripe }
