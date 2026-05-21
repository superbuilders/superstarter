"use client"

// Benchmark Anchor lesson body.
//
// Four stacked panels:
//   1. <RevealPanel> — the canonical CCAT fraction–decimal–percent
//      table, surfaced behind a tap so the page can be scanned
//      without scrolling past the reference grid.
//   2. <FamilyTree>  — three roots (1/4, 1/3, 1/5) with a tap-to-
//      halve mechanic that builds out each lineage one step at a time.
//      Teaches that 1/16, 1/12, and 1/20 are derived, not memorized.
//   3. <LegoBuilder> — snap anchor "bricks" together to construct
//      odd-multiple fractions like 3/8, 5/6, and 7/8 in exact rational
//      arithmetic.
//   4. <SpeedDrill>  — match-the-pair drill (5 s/prompt, 19-row
//      mastery) with three new in-flight hints: Show lineage,
//      Halve it, and Close enough. Hints pause the timer.

import { BENCHMARKS, rowFraction } from "@/components/lessons/benchmarks/benchmarks-data"
import { FamilyTree } from "@/components/lessons/benchmarks/family-tree"
import { LegoBuilder } from "@/components/lessons/benchmarks/lego-builder"
import { SpeedDrill } from "@/components/lessons/benchmarks/speed-drill"
import { LessonShell } from "@/components/lessons/shared/lesson-shell"
import { RevealPanel } from "@/components/lessons/shared/reveal-panel"

function BenchmarkLesson() {
	return (
		<LessonShell
			eyebrow="Lesson 04 · Memory"
			eyebrowClass="text-good"
			title="Anchor Drill"
			blurb="Memorize three roots — 1/4, 1/3, 1/5 — then derive the rest by halving and stacking. Twenty rows of recall, but only three to truly memorize."
		>
			<RevealPanel label="Reveal the anchor table">
				<p className="mb-3">
					Memorize cold:{" "}
					<strong>
						halves, thirds, quarters, fifths, sixths, eighths, tenths, twelfths, sixteenths
					</strong>
					. These cover ≈85% of the CCAT's quantitative fractions.
				</p>
				<div className="overflow-x-auto">
					<table className="w-full min-w-[360px] border-collapse text-[12px]">
						<thead>
							<tr className="border-border-soft border-b text-text-3">
								<th className="px-2 py-1.5 text-left font-semibold">Fraction</th>
								<th className="px-2 py-1.5 text-left font-semibold">Decimal</th>
								<th className="px-2 py-1.5 text-left font-semibold">Percent</th>
							</tr>
						</thead>
						<tbody>
							{BENCHMARKS.map(function renderRow(row) {
								const key = `${row.num}-${row.den}`
								return (
									<tr key={key} className="border-border-soft/60 border-b">
										<td className="px-2 py-1 font-mono text-text-1">{rowFraction(row)}</td>
										<td className="px-2 py-1 font-mono text-text-2">{row.decimal}</td>
										<td className="px-2 py-1 font-mono text-text-2">{row.percent}</td>
									</tr>
								)
							})}
						</tbody>
					</table>
				</div>
			</RevealPanel>
			<FamilyTree />
			<LegoBuilder />
			<SpeedDrill />
		</LessonShell>
	)
}

export { BenchmarkLesson }
