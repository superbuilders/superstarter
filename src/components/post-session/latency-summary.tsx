"use client"

// <LatencySummary> — per-sub-type median latency with threshold mark.
//
// Plan: docs/plans/phase5-post-session-review.md §6.
// PRD §6.5 mandates "Median latency by sub-type, with the threshold
// marked." The threshold mark is the diagnostic signal — without it,
// the user sees a number devoid of context.
//
// Visual: each row carries a horizontal SVG mini-track. The track's
// horizontal range is 0 to 2× the row's threshold; the threshold tick
// sits at the 50% mark; the median marker sits at proportional
// position `(median / (2 × threshold)) * 100`, clamped to [0, 100].
// Median > threshold → marker is on the right half of the track AND
// renders in the destructive (red-equivalent) color token; median ≤
// threshold → marker is on the left half AND renders in a neutral
// foreground tone. Equality lands at-or-below per plan §6's contract.
//
// Sort: same as <AccuracySummary> (verbal first, alphabetical by
// displayName within section) so the two summaries align row-for-row
// when both are on screen.
//
// SVG (not styled <div>s) is used for the track because the marker's
// horizontal position is per-row dynamic and the project's
// rules/no-inline-style.md bans the `style={{}}` prop. SVG attributes
// (cx, x1, etc.) are JSX attributes, not CSS, and accept dynamic
// values cleanly. Color state is applied via Tailwind on
// `currentColor`-bound SVG primitives.
//
// PRD §6.5's no-percentages constraint applies here: no `%` characters
// anywhere in the rendered output. The track is absolute milliseconds
// against an absolute threshold; the percent-based positioning is an
// internal proportion, never surfaced as text.

import type { PerSubTypeLatency } from "@/app/(diagnostic-flow)/post-session/[sessionId]/page"
import { type SubTypeId, subTypes } from "@/config/sub-types"

interface LatencySummaryProps {
	rows: ReadonlyArray<PerSubTypeLatency>
}

interface DisplayRow {
	subTypeId: SubTypeId
	displayName: string
	section: "verbal" | "numerical"
	medianLatencyMs: number
	thresholdMs: number
}

const SUB_TYPE_BY_ID = new Map(
	subTypes.map(function entry(t) {
		return [t.id, t]
	})
)

function compareRows(a: DisplayRow, b: DisplayRow): number {
	if (a.section !== b.section) {
		return a.section === "verbal" ? -1 : 1
	}
	return a.displayName.localeCompare(b.displayName)
}

function buildDisplayRows(rows: ReadonlyArray<PerSubTypeLatency>): DisplayRow[] {
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
			medianLatencyMs: r.medianLatencyMs,
			thresholdMs: meta.latencyThresholdMs
		})
	}
	display.sort(compareRows)
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
	const markerClass = isAbove
		? "text-destructive"
		: "text-foreground/60"
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
			<circle
				className={markerClass}
				cx={x}
				cy="4"
				fill="currentColor"
				r="2.5"
			/>
		</svg>
	)
}

function LatencySummary(props: LatencySummaryProps) {
	const display = buildDisplayRows(props.rows)
	if (display.length === 0) {
		return null
	}
	return (
		<section
			aria-labelledby="post-session-latency-heading"
			className="space-y-3"
			data-testid="post-session-latency-summary-section"
		>
			<h2
				className="font-medium text-foreground text-sm tracking-tight"
				id="post-session-latency-heading"
			>
				Latency by sub-type
			</h2>
			<dl className="space-y-3">
				{display.map(function renderRow(row) {
					// Value text stays neutral regardless of above-/below-
					// threshold state. The above-threshold signal is
					// carried solely by the SVG marker's destructive
					// color (in <LatencyTrack>). Per Alpha Style
					// "accents earn placement," dual-encoding the same
					// signal in both the marker AND the text color
					// over-states it. Also: `text-destructive` on text
					// drops contrast to ~2.6:1 (sub-WCAG-AA) — the
					// destructive token is button/border-grade, not
					// body-text-grade. Found by commit 4's incremental
					// Alpha Style audit.
					return (
						<div
							key={row.subTypeId}
							className="space-y-1"
							data-testid={`post-session-latency-row-${row.subTypeId}`}
						>
							<div className="flex items-baseline justify-between gap-3">
								<dt className="text-foreground text-sm">{row.displayName}</dt>
								<dd className="font-mono text-foreground/80 text-sm tabular-nums">
									{formatSeconds(row.medianLatencyMs)}
								</dd>
							</div>
							<LatencyTrack
								medianMs={row.medianLatencyMs}
								thresholdMs={row.thresholdMs}
							/>
						</div>
					)
				})}
			</dl>
		</section>
	)
}

export type { LatencySummaryProps }
export { buildDisplayRows, compareRows, formatSeconds, LatencySummary, markerPosition }
