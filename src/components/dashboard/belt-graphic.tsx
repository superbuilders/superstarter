// <BeltGraphic> — first-party inline SVG of the BJJ-canonical rank
// belt visual. Round 1 commit 4 per `docs/plans/dashboard-drill-
// diagnostic-bug-fixes-and-design-retrofit.md` §5.4 + §0.13 (mid-
// round redirect from the original Wikimedia CC BY-SA 3.0 SVG
// approach to a first-party token-driven SVG).
//
// Structure (per BJJ reference):
//   - Body: full-width rectangle in rank color (`--belt-{white,blue,
//     brown,black}`); white belt carries a hairline border via
//     `--belt-white-line` for visibility against light surfaces.
//   - Tip: offset rectangle near the right (x=74..88 of 100), in
//     `--belt-black` for white/blue/brown ranks, `--belt-tip-red` for
//     the black-belt rank (BJJ canon).
//   - Sliver: body color shows through from x=88..100 (12% of belt
//     length) because the tip rect doesn't reach the right edge.
//     12% sliver matches Leo's reference imagery (commit-4
//     follow-up-2 calibration; the original 6% from commit 4 placed
//     the tip too close to the edge).
//
// viewBox 100×22 with preserveAspectRatio="none" — caller controls
// the rendered aspect via `className`. Stroke uses
// vector-effect="non-scaling-stroke" so the white-belt border stays
// crisp regardless of how the consumer stretches the SVG.
//
// Token consumption (Tailwind v4 utilities, all backed by
// `--color-belt-*` aliases at globals.css): `fill-belt-{white,blue,
// brown,black}`, `fill-belt-tip-red`, `stroke-belt-white-line`.
//
// Design-system note: the black-belt body uses the existing
// `--belt-black` token (tinted near-black, hue 270) per
// ALPHA_DESIGN.md §3 "no pure black for large areas". The body
// reads as Alpha-coherent dark rather than literal BJJ #000; the
// contrasting red tip carries the black-belt recognition.
//
// NOT to be confused with the post-session `<BeltIndicator>` at
// `src/components/post-session/belt-indicator.tsx` — different
// surface, different semantic axis. See `docs/plans/dashboard.md`
// §2.10 for the naming-collision discipline.

import { cn } from "@/lib/utils"
import type { BeltLevel } from "@/server/dashboard/types"

interface BeltGraphicProps {
	beltColor: BeltLevel
	className?: string
	/** Override the default `${beltColor} belt` aria-label, e.g. for
	 * context-prefixed labels from a wrapping component. */
	ariaLabel?: string
}

const BELT_BODY_FILL_CLASS: Record<BeltLevel, string> = {
	white: "fill-belt-white",
	blue: "fill-belt-blue",
	brown: "fill-belt-brown",
	black: "fill-belt-black"
}

function BeltGraphic({ beltColor, className, ariaLabel }: BeltGraphicProps) {
	const bodyFillClass = BELT_BODY_FILL_CLASS[beltColor]
	const tipFillClass = beltColor === "black" ? "fill-belt-tip-red" : "fill-belt-black"
	const strokeClass = beltColor === "white" ? "stroke-belt-white-line" : ""
	const label = ariaLabel === undefined ? `${beltColor} belt` : ariaLabel
	return (
		<svg
			viewBox="0 0 100 22"
			preserveAspectRatio="none"
			className={className}
			role="img"
			aria-label={label}
		>
			<rect
				x={0}
				y={0}
				width={100}
				height={22}
				className={cn(bodyFillClass, strokeClass)}
				strokeWidth={0.5}
				vectorEffect="non-scaling-stroke"
			/>
			<rect x={74} y={0} width={14} height={22} className={tipFillClass} />
		</svg>
	)
}

export type { BeltGraphicProps }
export { BeltGraphic }
