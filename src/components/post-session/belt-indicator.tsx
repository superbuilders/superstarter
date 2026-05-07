// <BeltIndicator> — post-session walker-tier readout for drill mode.
//
// Plan: docs/plans/phase5-dojo-belt-indicator.md §5.1, §5.2, §5.5,
// §5.6, §5.7.
//
// Pure presentational. Receives the walker's session-end tier (the
// REQUESTED tier, not the served tier — the upstream query in
// @/server/post-session/end-session-tier reads
// `(fallback_from_tier ?? served_at_tier)` per SPEC §9.2). Renders an
// SVG belt-shape colored per the 4-tier mapping plus a text label.
// Dormant: no consumer wires it in commit 3 — commit 4 wires the
// post-session shell + page query.
//
// Visual language follows <LatencyTrack> precedent (sub-phase 1
// commit 4): a viewBox-anchored SVG with currentColor-bound fills
// driven by Tailwind classes. The belt body is a single rounded
// rectangle in the tier color; a thin contrast stripe at the right
// end echoes the textile-stripe detail from real martial-arts belts
// without adding a second token (the stripe rides on the existing
// foreground-near-black token at varied opacity).
//
// Color mapping per plan §5.2:
//   easy   → white  (existing --card token; outlined for visibility)
//   medium → blue   (--belt-blue, net-new in commit 3)
//   hard   → brown  (--belt-brown, net-new in commit 3)
//   brutal → black  (existing --foreground token)
// Two reused tokens + two new = below the .alpha-style.md "below-3
// systemic-token" threshold per plan §6.3. The two new tokens are
// belt-namespaced; commit 3's globals.css change documents this.
//
// Pre-floor branch (plan §5.5): when the walker's running window
// has fewer than 10 attempts (ADAPTIVE_FLOOR_ATTEMPTS), the belt
// reflects the INITIAL tier and labels itself "(calibrating)" so the
// user knows the walker hasn't stepped yet. The upstream query sets
// isPreFloor; the component renders the suffix unconditionally on
// that flag.
//
// Accessibility per plan §5.7:
//   - role="img" on the outer wrapper so SR announces it as a single
//     image rather than narrating each SVG primitive.
//   - aria-label carries the full readable phrasing
//     ("{Color} belt; {Tier} tier{; calibrating}").
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

import type { Difficulty } from "@/config/sub-types"

type BeltColor = "white" | "blue" | "brown" | "black"

function tierToBeltColor(tier: Difficulty): BeltColor {
	if (tier === "easy") return "white"
	if (tier === "medium") return "blue"
	if (tier === "hard") return "brown"
	if (tier === "brutal") return "black"
	const _exhaustive: never = tier
	return _exhaustive
}

function beltColorDisplayName(color: BeltColor): string {
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

interface BeltStyle {
	bodyClass: string
	stripeClass: string
}

// White is the only color that needs an explicit outline because the
// belt body rides on the same near-white surface as the page; without
// a border the belt would visually disappear. The other three colors
// have intrinsic contrast against the surface; their stripe rides on
// the foreground color at low opacity.
const BELT_STYLE_BY_COLOR: Record<BeltColor, BeltStyle> = {
	white: {
		bodyClass: "fill-card stroke-foreground/30 [stroke-width:1]",
		stripeClass: "fill-foreground/40"
	},
	blue: {
		bodyClass: "fill-belt-blue",
		stripeClass: "fill-foreground/30"
	},
	brown: {
		bodyClass: "fill-belt-brown",
		stripeClass: "fill-foreground/40"
	},
	black: {
		bodyClass: "fill-foreground",
		stripeClass: "fill-background/40"
	}
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
	const style = BELT_STYLE_BY_COLOR[color]

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
			aria-label={ariaLabel}
			className="space-y-2"
			data-testid="belt-indicator"
			data-tier={props.tier}
			data-belt-color={color}
			role="img"
		>
			<svg
				aria-hidden="true"
				className="h-4 w-full max-w-[12rem] overflow-visible"
				viewBox="0 0 100 16"
				xmlns="http://www.w3.org/2000/svg"
			>
				{/* Belt body — rounded rectangle in the tier color. */}
				<rect
					className={style.bodyClass}
					height="14"
					rx="3"
					width="100"
					x="0"
					y="1"
				/>
				{/* Textile stripe — vertical band at the right end,
				    echoing the real martial-arts belt detail. */}
				<rect
					className={style.stripeClass}
					height="10"
					rx="1"
					width="3"
					x="82"
					y="3"
				/>
			</svg>
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

export type { BeltColor, BeltIndicatorProps }
export { BeltIndicator, beltColorDisplayName, tierDisplayName, tierToBeltColor }
