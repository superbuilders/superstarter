// <ScoreStrip> — rebuilt 5-stat top panel + greeting block.
// Practice round commit 9.
//
// Layout: greeting block on the left (eyebrow date + serif headline);
// 5 stats on the right at md+:
//   1. Mistakes to review — count from commit 8 (links to /review).
//   2. Days to test — editable popover (native date input) wired to
//      updateTargetDate.
//   3. Goal — editable popover (numeric input 1..50) wired to
//      updateGoal Server Action from commit 4.
//   4. Previous Score — last full-length sim's score (or em-dash if
//      no sims) + 5-bar sparkline of last 5 sim scores.
//   5. Previous Pace — last full-length sim's median seconds-per-Q
//      (or em-dash) + 5-bar sparkline of last 5 sim medians.
//
// At sm and below, the 5-stat row wraps responsively beneath the
// greeting (per ALPHA §8 + practice-round-plan §13's "doesn't break"
// constraint).
//
// Goal renders as a raw integer (e.g. "40"), NEVER with a "%" suffix
// — Goal is a target raw score out of 50, not a target percentile.
// Decision-resolved at `docs/plans/dashboard.md` §3 + Dashboard PRD
// §6.1 + §10.6 + practice-round-plan §3 decision 2.
//
// Server component for the outer composition; the popover wrappers
// (GoalEditor, DaysToTestEditor) are "use client" via the
// <ScoreStripPopover> wrapper. The Sparkline is also a server
// component (pure SVG, no state). The Mistakes tile uses plain <a>
// for the dynamic-href reconciliation already established at
// dashboard round commits 7+8.

import { GoalEditor } from "@/components/dashboard/goal-editor"
import { DaysToTestEditor } from "@/components/dashboard/days-to-test-editor"
import { ScoreStripPopover } from "@/components/dashboard/score-strip-popover"
import { Sparkline } from "@/components/dashboard/sparkline"
import { StatTile } from "@/components/dashboard/stat-tile"
import { formatToday } from "@/server/dashboard/helpers"
import type { DashboardData } from "@/server/dashboard/types"

interface ScoreStripProps {
	firstName: string
	greeting: DashboardData["greeting"]
	score: DashboardData["score"]
	pace: DashboardData["pace"]
	mistakesQueue: DashboardData["mistakesQueue"]
}

function formatSeconds(value: number | undefined): string {
	if (value === undefined) return "—"
	return `${value.toFixed(1)}s`
}

function formatNumber(value: number | undefined): string | number {
	if (value === undefined) return "—"
	return value
}

function ScoreStrip({ firstName, greeting, score, pace, mistakesQueue }: ScoreStripProps) {
	const currentDisplay = formatNumber(score.current)
	const daysDisplay = formatNumber(score.daysToTest)
	const paceDisplay = formatSeconds(pace.previousMedianSeconds)

	return (
		<section className="mb-5 flex flex-col gap-6 border-border-soft border-b pb-5 md:flex-row md:items-end md:justify-between">
			<div>
				<p className="mb-1 text-[11px] text-text-3 uppercase tracking-[0.06em]">
					{formatToday(greeting.today)}
				</p>
				<h2 className="font-medium font-serif text-[22px] text-text-1 leading-[1.15] tracking-[-0.015em]">
					Good morning, {firstName}.{" "}
					<em className="font-normal text-cobalt italic">{greeting.headline}</em>
				</h2>
			</div>
			<div className="flex flex-wrap items-end gap-6">
				<a
					href={mistakesQueue.href}
					className="flex flex-col items-end rounded-md text-right transition-colors hover:bg-lavender focus-visible:outline focus-visible:outline-2 focus-visible:outline-cobalt focus-visible:outline-offset-2"
				>
					<StatTile
						label="Mistakes"
						value={
							<span className="tabular font-medium font-serif text-[22px] leading-none">
								{mistakesQueue.count}
							</span>
						}
						align="right"
					/>
				</a>
				<ScoreStripPopover
					triggerLabel="Days to test"
					triggerValue={
						<span className="tabular font-medium font-serif text-[22px] leading-none">
							{daysDisplay}
						</span>
					}
					dialogLabel="Edit test date"
				>
					{(close) => <DaysToTestEditor currentMs={score.targetDateMs} onSaved={close} />}
				</ScoreStripPopover>
				<ScoreStripPopover
					triggerLabel="Goal"
					triggerValue={
						<span className="tabular font-medium font-serif text-[22px] text-cobalt leading-none">
							{score.goal}
						</span>
					}
					dialogLabel="Edit goal score"
				>
					{(close) => <GoalEditor initial={score.goal} onSaved={close} />}
				</ScoreStripPopover>
				<div className="flex w-[110px] flex-col items-end text-right">
					<StatTile
						label="Previous score"
						value={
							<span className="tabular font-medium font-serif text-[22px] leading-none">
								{currentDisplay}
							</span>
						}
						align="right"
					/>
					<Sparkline data={score.last5SimScores} label="Previous score history" />
				</div>
				<div className="flex w-[110px] flex-col items-end text-right">
					<StatTile
						label="Previous pace"
						value={
							<span className="tabular font-medium font-serif text-[22px] leading-none">
								{paceDisplay}
							</span>
						}
						align="right"
					/>
					<Sparkline data={pace.last5SimMedians} label="Previous pace history" />
				</div>
			</div>
		</section>
	)
}

export type { ScoreStripProps }
export { ScoreStrip }
