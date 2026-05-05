"use client"

// <TriageScoreLine> — per-session triage adherence renderer.
//
// Plan: docs/plans/phase5-post-session-review.md §7.
// SPEC: §9.7 (triage scoring shape).
//
// Three render branches, mapped from `TriageScore.{fired, taken, ratio}`:
//
//   - fired === 0
//       Positive copy. The user stayed under 18s on every question; no
//       prompt ever fired. This is the desired triage discipline.
//
//   - 0 < fired < 3
//       Small-sample copy. Not enough events for a stable ratio (per
//       SPEC §9.7's small-sample threshold). Render count, no ratio.
//
//   - fired >= 3
//       Ratio rendering with rounded integer percentage. The single
//       allowed percentage on the post-session surface (PRD §6.5's
//       no-percentages rule applies to <AccuracySummary>; the triage
//       adherence ratio's whole point is "did you take the prompt's
//       offered exit when you were spinning," and the ratio is the
//       directly meaningful signal).
//
// The Mastery Map's <TriageAdherenceLine> renders the 30-day rolling
// triage score; copy templates are distinct so the two surfaces aren't
// mistaken for each other:
//   - Mastery Map: "Triage adherence (30 d): …"
//   - Post-session (this component): "Triage adherence: …" (no window
//     suffix; current session implied)
//
// Alpha Style: editorial, calm, single line. No ornamentation. Per the
// .alpha-style.md "calm not motivational" principle, the zero-fired
// copy is acknowledging, not congratulatory.

import type { TriageScore } from "@/server/triage/score"

interface TriageScoreLineProps {
	score: TriageScore
}

function formatLine(score: TriageScore): string {
	if (score.fired === 0) {
		return "No triage events this session: you stayed under 18 s on every question."
	}
	if (score.ratio === null) {
		return `Triage adherence: small sample — ${score.fired} triage events.`
	}
	const pct = Math.round(score.ratio * 100)
	return `Triage adherence: ${score.taken} / ${score.fired} (${pct}%).`
}

function TriageScoreLine(props: TriageScoreLineProps) {
	const line = formatLine(props.score)
	// `text-foreground/80` rather than `/70` — at 70% opacity blended
	// against a light background, contrast against pure-white drops to
	// ~3.5:1 (sub-WCAG-AA for normal text). 80% blends to ~5.7:1, which
	// passes AA. The Mastery Map's <TriageAdherenceLine> deliberately
	// uses /40 because it's a peripheral low-contrast indicator; the
	// post-session triage score is a primary signal per plan §10, so
	// AA is the right bar. Found by commit 3's incremental Alpha Style
	// audit.
	return (
		<p className="text-foreground/80 text-sm" data-testid="post-session-triage-score-line">
			{line}
		</p>
	)
}

export type { TriageScoreLineProps }
export { formatLine, TriageScoreLine }
