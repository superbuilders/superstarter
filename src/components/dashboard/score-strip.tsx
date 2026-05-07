// <ScoreStrip> — greeting + 3-stat row directly below the TopNav.
// Dashboard PRD §10.6 + `docs/plans/dashboard.md` §5 commit 8.
//
// Renders editorial date eyebrow, headline (with italic emphasis),
// and three right-aligned <StatTile>s: estimated score (with optional
// delta), goal (cobalt-accented), days to test.
//
// Empty-state behavior (stub default at v1):
//   - score.current === undefined → value renders em-dash (—). The
//     delta tile is omitted entirely (no "= last sim" implication
//     when there's no sim history at all).
//   - score.daysToTest === undefined → value renders em-dash (—).
//
// Goal renders as a raw integer (e.g. "40"), NEVER with a "%" suffix
// — Goal is a target raw score out of 50, not a target percentile.
// Decision-resolved at `docs/plans/dashboard.md` §3 + Dashboard PRD
// §6.1 + §10.6.
//
// Server component. No "use client", no state, no effects.

import { StatTile } from "@/components/dashboard/stat-tile"
import { formatToday } from "@/server/dashboard/helpers"
import type { DashboardData } from "@/server/dashboard/types"

type DeltaTone = "good" | "neutral" | "bad"

function deriveDeltaTone(delta: number | undefined): DeltaTone {
	if (delta === undefined) return "neutral"
	if (delta > 0) return "good"
	if (delta < 0) return "bad"
	return "neutral"
}

interface ScoreStripProps {
	firstName: string
	greeting: DashboardData["greeting"]
	score: DashboardData["score"]
}

function ScoreStrip({ firstName, greeting, score }: ScoreStripProps) {
	const hasDelta = score.delta !== undefined
	const deltaTone = deriveDeltaTone(score.delta)
	let deltaText = "= last sim"
	if (score.delta !== undefined) {
		if (score.delta > 0) deltaText = `↑ ${score.delta} vs last sim`
		else if (score.delta < 0) deltaText = `↓ ${Math.abs(score.delta)} vs last sim`
	}
	const currentDisplay = score.current === undefined ? "—" : score.current
	const daysDisplay = score.daysToTest === undefined ? "—" : score.daysToTest
	const deltaProp = hasDelta ? { text: deltaText, tone: deltaTone } : undefined
	return (
		<section className="mb-5 grid grid-cols-[1fr_auto_auto_auto] items-end gap-6 border-border-soft border-b pb-5">
			<div>
				<p className="mb-1 text-[11px] text-text-3 uppercase tracking-[0.06em]">
					{formatToday(greeting.today)}
				</p>
				<h2 className="font-medium font-serif text-[22px] text-text-1 leading-[1.15] tracking-[-0.015em]">
					Good morning, {firstName}.{" "}
					<em className="font-normal text-cobalt italic">{greeting.headline}</em>
				</h2>
			</div>
			<StatTile
				label="Est. score"
				value={
					<span className="tabular font-medium font-serif text-[22px] leading-none">
						{currentDisplay}
					</span>
				}
				delta={deltaProp}
				align="right"
			/>
			<StatTile
				label="Goal"
				value={
					<span className="tabular font-medium font-serif text-[22px] leading-none">
						{score.goal}
					</span>
				}
				align="right"
				tone="accent"
			/>
			<StatTile
				label="Days to test"
				value={
					<span className="tabular font-medium font-serif text-[22px] leading-none">
						{daysDisplay}
					</span>
				}
				align="right"
			/>
		</section>
	)
}

export type { ScoreStripProps }
export { ScoreStrip }
