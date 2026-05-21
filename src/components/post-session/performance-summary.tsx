"use client"

// <PerformanceSummary> — combined per-sub-type accuracy + latency renderer.
//
// Plan: docs/plans/post-session-audit-fixes-and-wide-token-retrofit.md §5.4
// (Round 2 commit 5; Option 4 split — combined component + SQL consolidation
// + transient wrapper shims at page level. Commit §5.4b refactors
// strategy-selection.ts to consume the consolidated shape and deletes the
// shims). Replaces the deleted `<AccuracySummary>` + `<LatencySummary>`
// components in a single section.
//
// Closes audit doc §B.2 empty-state inconsistency for these two components
// (both previously returned null; combined component renders heading +
// empty-state copy `"No sub-type performance data this session."`). Closes
// audit doc §B.3 sort-DRY for these two via §5.4a's `_lib/sub-type-display`
// (consumed here for both `SUB_TYPE_BY_ID` meta lookup + sort).
//
// Layout: 3-column CSS grid per row inside a `<dl>` (sub-type label | ✓/✗
// counts | latency value + LatencyTrack SVG). `<dl>` semantic preserves the
// existing components' editorial feel; one `<dt>` paired with two `<dd>`s
// per row is valid HTML (multiple descriptions per term). Token usage is
// Layer-A only post-commit-2 retrofit (`text-foreground`, `text-foreground/80`,
// `text-destructive` on the SVG marker only).
//
// PRD §6.5 categorical-no-percentages: ✓/✗ counts, never percent. Latency
// rendered in seconds with one decimal (`12.5 s`); track range 0..2× threshold;
// percent-based marker positioning is internal-only, never surfaced as text.
//
// AA discipline: latency value text stays neutral (`text-foreground/80`,
// ~7.2:1 vs `--background` post-commit-2 retrofit) regardless of above-vs-
// below threshold. The above-threshold signal is carried solely by the SVG
// marker's destructive color in `<LatencyTrack>`. Per Alpha Style "accents
// earn placement," dual-encoding the same signal in both marker AND text
// over-states it; also `text-destructive` on body text would drop contrast
// to ~2.6:1 (sub-WCAG-AA — destructive token is button/border-grade per
// audit doc §A.3 + structured comment trail in the deleted
// `latency-summary.tsx:160-170`).

import type { PerSubTypePerformance } from "@/app/(app)/post-session/[sessionId]/page"
import { SUB_TYPE_BY_ID, compareBySubTypeDisplay } from "@/components/post-session/_lib/sub-type-display"
import type { SubTypeId } from "@/config/sub-types"

interface PerformanceSummaryProps {
	rows: ReadonlyArray<PerSubTypePerformance>
}

interface DisplayRow {
	subTypeId: SubTypeId
	displayName: string
	section: "verbal" | "numerical"
	correct: number
	total: number
	medianLatencyMs: number
	thresholdMs: number
}

function buildDisplayRows(rows: ReadonlyArray<PerSubTypePerformance>): DisplayRow[] {
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
			total: r.total,
			medianLatencyMs: r.medianLatencyMs,
			thresholdMs: meta.latencyThresholdMs
		})
	}
	display.sort(compareBySubTypeDisplay)
	return display
}

// Convert ms to a seconds string with one decimal: 12450 → "12.5 s".
function formatSeconds(ms: number): string {
	const s = ms / 1000
	return `${s.toFixed(1)} s`
}

// Marker position on the 0-100 SVG viewBox track. Track range is 0 to
// 2× threshold, so the threshold tick sits at 50 and proportional
// position is (median / (2 × threshold)) * 100, clamped to [0, 100].
// Preserved verbatim from the deleted <LatencySummary>.
function markerPosition(medianMs: number, thresholdMs: number): number {
	const range = thresholdMs * 2
	const raw = (medianMs / range) * 100
	if (raw < 0) return 0
	if (raw > 100) return 100
	return raw
}

interface LatencyTrackProps {
	medianMs: number
	thresholdMs: number
}

function LatencyTrack(props: LatencyTrackProps) {
	const x = markerPosition(props.medianMs, props.thresholdMs)
	const isAbove = props.medianMs > props.thresholdMs
	const markerClass = isAbove ? "text-destructive" : "text-foreground/60"
	const trackLabel = `Median ${formatSeconds(props.medianMs)}; threshold ${formatSeconds(props.thresholdMs)}; ${isAbove ? "above threshold" : "at or below threshold"}.`
	return (
		<svg
			aria-label={trackLabel}
			className="h-2 w-full overflow-visible"
			role="img"
			viewBox="0 0 100 8"
			xmlns="http://www.w3.org/2000/svg"
		>
			{/* Track */}
			<rect
				className="text-foreground/10"
				fill="currentColor"
				height="2"
				rx="1"
				width="100"
				x="0"
				y="3"
			/>
			{/* Threshold tick — vertical line at 50 (full track height
			    + a 1-unit overflow at top and bottom for visibility). */}
			<line
				className="text-foreground/40"
				stroke="currentColor"
				strokeLinecap="round"
				strokeWidth="1"
				x1="50"
				x2="50"
				y1="0"
				y2="8"
			/>
			{/* Median marker */}
			<circle className={markerClass} cx={x} cy="4" fill="currentColor" r="2.5" />
		</svg>
	)
}

interface PerformanceRowProps {
	row: DisplayRow
}

function PerformanceRow(props: PerformanceRowProps) {
	const wrong = props.row.total - props.row.correct
	return (
		<div
			className="grid grid-cols-[1fr_auto_8rem] items-baseline gap-x-6 py-2"
			data-testid={`post-session-performance-row-${props.row.subTypeId}`}
		>
			<dt className="text-foreground text-sm">{props.row.displayName}</dt>
			<dd className="text-right font-mono text-foreground/80 text-sm tabular-nums">
				<span aria-hidden="true">✓ </span>
				<span className="sr-only">correct: </span>
				{props.row.correct}
				<span aria-hidden="true" className="text-foreground/30">
					{" "}
					·{" "}
				</span>
				<span aria-hidden="true">✗ </span>
				<span className="sr-only">incorrect: </span>
				{wrong}
			</dd>
			<dd className="space-y-1">
				<span className="block text-right font-mono text-foreground/80 text-sm tabular-nums">
					{formatSeconds(props.row.medianLatencyMs)}
				</span>
				<LatencyTrack
					medianMs={props.row.medianLatencyMs}
					thresholdMs={props.row.thresholdMs}
				/>
			</dd>
		</div>
	)
}

function PerformanceSummary(props: PerformanceSummaryProps) {
	const display = buildDisplayRows(props.rows)
	return (
		<section
			aria-labelledby="post-session-performance-heading"
			className="space-y-3"
			data-testid="post-session-performance-summary-section"
		>
			<h2
				className="font-medium text-foreground text-sm tracking-tight"
				id="post-session-performance-heading"
			>
				Performance by sub-type
			</h2>
			{display.length === 0 ? (
				<p className="text-foreground/80 text-sm">No sub-type performance data this session.</p>
			) : (
				<dl className="divide-y divide-border/40">
					{display.map(function renderRow(row) {
						return <PerformanceRow key={row.subTypeId} row={row} />
					})}
				</dl>
			)}
		</section>
	)
}

export type { PerformanceSummaryProps }
export { buildDisplayRows, formatSeconds, markerPosition, PerformanceSummary }
