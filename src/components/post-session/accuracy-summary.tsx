"use client"

// <AccuracySummary> — per-sub-type categorical accuracy renderer.
//
// Plan: docs/plans/phase5-post-session-review.md §5.
// PRD §6.5 explicitly mandates "categorical: ✓ / ✗ counts, no
// percentages on this screen." The renderer obeys this — no percentage
// anywhere in the rendered output.
//
// Sort: verbal first (matches the Mastery Map's section ordering),
// then by displayName within section. Stable; aligns row-for-row with
// <LatencySummary> (commit 4) when both render.
//
// Empty rows array → empty section (nothing to render). Each touched
// sub-type renders one row; sub-types not touched in the session are
// absent. Sub-types with all-correct render "✓ N / ✗ 0"; all-wrong
// render "✓ 0 / ✗ N" — no zero suppression.
//
// Alpha Style: editorial, dl-style two-column layout, generous
// whitespace, no decoration. Section heading sets up the row context;
// counts use a tabular feature so rows align vertically.

import type { PerSubTypeAccuracy } from "@/app/(diagnostic-flow)/post-session/[sessionId]/page"
import { SUB_TYPE_BY_ID, compareBySubTypeDisplay } from "@/components/post-session/_lib/sub-type-display"
import type { SubTypeId } from "@/config/sub-types"

interface AccuracySummaryProps {
	rows: ReadonlyArray<PerSubTypeAccuracy>
}

interface DisplayRow {
	subTypeId: SubTypeId
	displayName: string
	section: "verbal" | "numerical"
	correct: number
	total: number
}

function buildDisplayRows(rows: ReadonlyArray<PerSubTypeAccuracy>): DisplayRow[] {
	const display: DisplayRow[] = []
	for (const r of rows) {
		const meta = SUB_TYPE_BY_ID.get(r.subTypeId)
		// FK on attempts → items → sub_types guarantees this; defensive
		// continue for any future drift.
		if (meta === undefined) continue
		display.push({
			subTypeId: r.subTypeId,
			displayName: meta.displayName,
			section: meta.section,
			correct: r.correct,
			total: r.total
		})
	}
	display.sort(compareBySubTypeDisplay)
	return display
}

function AccuracySummary(props: AccuracySummaryProps) {
	const display = buildDisplayRows(props.rows)
	if (display.length === 0) {
		return null
	}
	return (
		<section
			aria-labelledby="post-session-accuracy-heading"
			className="space-y-3"
			data-testid="post-session-accuracy-summary-section"
		>
			<h2
				className="font-medium text-foreground text-sm tracking-tight"
				id="post-session-accuracy-heading"
			>
				Accuracy by sub-type
			</h2>
			<dl className="divide-y divide-border/40">
				{display.map(function renderRow(row) {
					const wrong = row.total - row.correct
					return (
						<div
							key={row.subTypeId}
							className="flex items-baseline justify-between py-2"
							data-testid={`post-session-accuracy-row-${row.subTypeId}`}
						>
							<dt className="text-foreground text-sm">{row.displayName}</dt>
							<dd className="font-mono text-foreground/80 text-sm tabular-nums">
								<span aria-hidden="true">✓ </span>
								<span className="sr-only">correct: </span>
								{row.correct}
								<span aria-hidden="true" className="text-foreground/30"> · </span>
								<span aria-hidden="true">✗ </span>
								<span className="sr-only">incorrect: </span>
								{wrong}
							</dd>
						</div>
					)
				})}
			</dl>
		</section>
	)
}

export type { AccuracySummaryProps }
export { AccuracySummary, buildDisplayRows }
