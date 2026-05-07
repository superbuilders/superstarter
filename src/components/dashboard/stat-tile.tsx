// <StatTile> — generic small stat primitive. Dashboard PRD §10.5
// + `docs/plans/dashboard.md` §5 commit 6.
//
// Pure presentational: label on top, value below, optional delta
// underneath. The `value` slot is a ReactNode so callers can wrap
// numerals in `<span className="font-serif tabular …">` themselves
// — the tile doesn't impose typography on the value, only on the
// label and delta. The PRD's three uses (ScoreStrip's three columns
// per §10.6) all pass a font-serif tabular span as the value.
//
// Implementation choices for the under-specified parts (PRD §10.5
// said "implementation is straightforward; no need to spell out"):
//   - align="right" → vertical flex column with items-end + text-right
//     so each line of the tile right-aligns to the same edge.
//   - align="left" or undefined → items-start + default left-align.
//   - tone="accent" → wraps `value` in a text-cobalt span (cobalt
//     accent per ALPHA §3 60/30/10 rule, used sparingly).
//   - tone="default" or undefined → wraps in text-text-1.
//   - delta tones use the established pace/good token set:
//       good → text-good     (greens; in OKLCH 145°)
//       bad → text-pace-over (the warning red; in OKLCH 25°)
//       neutral → text-text-3
//   - Delta sits below the value with mt-1; small text-[11px] to
//     keep visual weight subordinate to the value itself.
// No inline styles. Tailwind only.

import type * as React from "react"
import { cn } from "@/lib/utils"

interface StatTileProps {
	label: string
	/** May contain a serif numeral as a `<span className="font-serif">` */
	value: React.ReactNode
	/** Optional trend hint, "↑ 2" / "↓ 1" / "= 0" */
	delta?: { text: string; tone: "good" | "neutral" | "bad" }
	/** "right" stacks values right-aligned; "left" left-aligns */
	align?: "left" | "right"
	/** "accent" colors the value cobalt — use sparingly */
	tone?: "default" | "accent"
}

const DELTA_TONE_CLASS: Record<NonNullable<StatTileProps["delta"]>["tone"], string> = {
	good: "text-good",
	bad: "text-pace-over",
	neutral: "text-text-3"
}

function StatTile({ label, value, delta, align, tone }: StatTileProps) {
	const isRight = align === "right"
	const itemsClass = isRight ? "items-end text-right" : "items-start"
	const valueClass = tone === "accent" ? "text-cobalt" : "text-text-1"
	const deltaClass = delta === undefined ? undefined : DELTA_TONE_CLASS[delta.tone]
	const deltaNode =
		delta === undefined ? null : (
			<p className={cn("mt-1 text-[11px]", deltaClass)}>{delta.text}</p>
		)
	return (
		<div className={cn("flex flex-col", itemsClass)}>
			<p className="mb-1 text-[11px] text-text-3 uppercase tracking-[0.06em]">{label}</p>
			<div className={valueClass}>{value}</div>
			{deltaNode}
		</div>
	)
}

export type { StatTileProps }
export { StatTile }
