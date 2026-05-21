// <BeltIndicator> — post-session walker-tier readout for drill mode.
//
// Plan: docs/plans/phase5-dojo-belt-indicator.md §5.1, §5.2, §5.5,
// §5.6, §5.7; Round 2 §5.5 (per docs/plans/post-session-audit-fixes-and-
// wide-token-retrofit.md §0.5 + §5.5) refactored the inline SVG body to
// consume the canonical `<BeltGraphic>` primitive (Option β: visual
// unified with dashboard `<BeltStripe>` + `<BeltLegend>`; calibrating-
// label logic preserved). Closes Round 1 §8 residual #9 — post-session
// belt now consumes Layer-B `--belt-*` tokens (replacing the prior
// Layer-A `fill-card` / `fill-foreground` / `fill-foreground/30..40` /
// `fill-background/40` mix); visual parity with the dashboard belt.
//
// Pure presentational. Receives the walker's session-end tier (the
// REQUESTED tier, not the served tier — the upstream query in
// @/server/post-session/end-session-tier reads
// `(fallback_from_tier ?? served_at_tier)` per SPEC §9.2). Renders the
// `<BeltGraphic>` primitive in the tier color plus a text label.
//
// Color mapping per plan §5.2:
//   easy   → white
//   medium → blue
//   hard   → brown
//   brutal → black
// The 4-tier mapping returns `BeltLevel` (imported from
// `@/server/dashboard/types` — the canonical post-Round-1-dashboard
// type origin; Round 2 §5.5 retired the locally-duplicated `BeltColor`
// type union).
//
// Pre-floor branch (plan §5.5): when the walker's running window
// has fewer than 10 attempts (ADAPTIVE_FLOOR_ATTEMPTS), the belt
// reflects the INITIAL tier and labels itself "(calibrating)" so the
// user knows the walker hasn't stepped yet. The upstream query sets
// isPreFloor; the component renders the suffix unconditionally on
// that flag.
//
// Accessibility per plan §5.7:
//   - `<BeltGraphic>` carries `role="img"` + the full tier+calibrating
//     aria-label internally (passed via the `ariaLabel` prop). Outer
//     wrapper is a plain `<div>` — Round 2 §5.5 dropped the outer
//     `role="img"` + duplicate aria-label to avoid nested SR
//     announcements.
//   - The visible text label duplicates the SR phrasing so colorblind
//     users get the same signal in text. Color alone never carries
//     meaning per WCAG 1.4.1.
//   - All text uses text-foreground for full contrast (>=7:1 on the
//     light surface). Tier-color rides only on the SVG belt body, not
//     on text — avoids the sub-WCAG-AA contrast trap commit 4 and 5
//     of sub-phase 1 documented for text-destructive on body text.
//
// Reduced-motion: no animation in v1. Static render, satisfies
// .alpha-style.md "respect prefers-reduced-motion outside the focus
// shell" trivially.

import { BeltGraphic } from "@/components/dashboard/belt-graphic"
import type { Difficulty } from "@/config/sub-types"
import type { BeltLevel } from "@/server/dashboard/types"

function tierToBeltColor(tier: Difficulty): BeltLevel {
	if (tier === "easy") return "white"
	if (tier === "medium") return "blue"
	if (tier === "hard") return "brown"
	if (tier === "brutal") return "black"
	const _exhaustive: never = tier
	return _exhaustive
}

function beltColorDisplayName(color: BeltLevel): string {
	if (color === "white") return "White"
	if (color === "blue") return "Blue"
	if (color === "brown") return "Brown"
	if (color === "black") return "Black"
	const _exhaustive: never = color
	return _exhaustive
}

function tierDisplayName(tier: Difficulty): string {
	if (tier === "easy") return "Easy"
	if (tier === "medium") return "Medium"
	if (tier === "hard") return "Hard"
	if (tier === "brutal") return "Brutal"
	const _exhaustive: never = tier
	return _exhaustive
}

interface BeltIndicatorProps {
	tier: Difficulty
	subTypeDisplayName: string
	isPreFloor: boolean
}

function BeltIndicator(props: BeltIndicatorProps) {
	const color = tierToBeltColor(props.tier)
	const colorName = beltColorDisplayName(color)
	const tierName = tierDisplayName(props.tier)

	const calibratingSuffix = props.isPreFloor ? "; calibrating" : ""
	const ariaLabel = `${colorName} belt; ${tierName} tier${calibratingSuffix}.`

	const calibratingTag = props.isPreFloor ? (
		<span className="text-foreground/60 text-sm" data-testid="belt-indicator-calibrating">
			{" "}
			(calibrating)
		</span>
	) : null

	return (
		<div
			className="space-y-2"
			data-belt-color={color}
			data-testid="belt-indicator"
			data-tier={props.tier}
		>
			<BeltGraphic
				ariaLabel={ariaLabel}
				beltColor={color}
				className="h-5 w-full max-w-[12rem]"
			/>
			<p className="text-foreground text-sm">
				You reached the{" "}
				<span className="font-medium" data-testid="belt-indicator-color-name">
					{colorName.toLowerCase()} belt
				</span>{" "}
				on{" "}
				<span className="font-medium" data-testid="belt-indicator-sub-type">
					{props.subTypeDisplayName}
				</span>
				.{calibratingTag}
			</p>
		</div>
	)
}

export type { BeltIndicatorProps }
export { BeltIndicator, beltColorDisplayName, tierDisplayName, tierToBeltColor }
