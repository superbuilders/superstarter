// <ExplanationTab> — read-only explanation surface for the admin
// item-detail page.
//
// Two display branches:
//   1. metadata_json.structuredExplanation present → render the parsed
//      recognition / elimination / tie-breaker parts as three labeled
//      paragraphs. Re-uses parseStructuredExplanation from the Round 3
//      <StructuredExplanation> component, but renders without the
//      toggle-strike / toggle-highlight interactivity — admin is reading,
//      not clicking. Reusing the parser keeps Zod shape parity with the
//      live post-session surface (no separate admin schema for the same
//      payload).
//   2. structuredExplanation missing → fall back to candidate.explanation
//      prose. Pre-batch seed items use this branch.
//
// Both branches degrade gracefully when content is missing.

import type * as React from "react"
import { parseStructuredExplanation } from "@/components/post-session/structured-explanation"
import type { AdminCandidateRow } from "@/server/admin/item-detail-data"

interface ExplanationTabProps {
	readonly candidate: AdminCandidateRow
}

function partLabelFor(kind: "recognition" | "elimination" | "tie-breaker"): string {
	if (kind === "recognition") return "Recognition"
	if (kind === "elimination") return "Elimination"
	return "Tie-breaker"
}

function ExplanationTab({ candidate }: ExplanationTabProps) {
	const raw = candidate.metadata.structuredExplanation
	const parsed = raw === undefined ? null : parseStructuredExplanation(raw)

	let body: React.ReactNode
	if (parsed !== null) {
		const tieBreakerNode =
			parsed.tieBreaker === undefined ? null : (
				<article className="flex flex-col gap-1">
					<span className="text-[11px] text-text-3 uppercase tracking-[0.06em]">
						{partLabelFor("tie-breaker")}
					</span>
					<p className="text-[14px] text-text-1 leading-relaxed">
						{parsed.tieBreaker.text}
					</p>
				</article>
			)
		body = (
			<div className="flex flex-col gap-4">
				<article className="flex flex-col gap-1">
					<span className="text-[11px] text-text-3 uppercase tracking-[0.06em]">
						{partLabelFor("recognition")}
					</span>
					<p className="text-[14px] text-text-1 leading-relaxed">
						{parsed.recognition.text}
					</p>
				</article>
				<article className="flex flex-col gap-1">
					<span className="text-[11px] text-text-3 uppercase tracking-[0.06em]">
						{partLabelFor("elimination")}
					</span>
					<p className="text-[14px] text-text-1 leading-relaxed">
						{parsed.elimination.text}
					</p>
				</article>
				{tieBreakerNode}
			</div>
		)
	} else if (candidate.explanation !== undefined) {
		body = (
			<p className="text-[14px] text-text-1 leading-relaxed">{candidate.explanation}</p>
		)
	} else {
		body = (
			<p className="text-[13px] text-text-3 italic">
				No explanation recorded for this candidate.
			</p>
		)
	}

	return (
		<section className="overflow-hidden rounded-lg border border-border-soft bg-surface">
			<header className="flex items-baseline justify-between border-border-soft border-b px-4 pt-2 pb-1">
				<h3 className="font-medium font-serif text-[15px] text-text-1 tracking-[-0.005em]">
					Explanation
				</h3>
				<span className="text-[11px] text-text-3 uppercase tracking-[0.06em]">
					Generator output
				</span>
			</header>
			<div className="px-4 py-4">{body}</div>
		</section>
	)
}

export type { ExplanationTabProps }
export { ExplanationTab }
