"use client"

// <StructuredExplanation> — clickable per-part renderer for the
// canonical metadata_json.structuredExplanation form.
//
// Plan: docs/plans/phase5-click-to-highlight.md §3 (interaction
// model) + §5.1 (component shape) + §5.2 (Zod schema location).
//
// Renders the explanation as up to three editorial paragraphs —
// recognition (plain prose), elimination (clickable button-shaped
// paragraph), tie-breaker (clickable button-shaped paragraph, when
// present). Toggling elimination emits the part's referencedOptions
// via onActiveStrikeChange (or an empty array on toggle-off);
// toggling tie-breaker emits via onActiveHighlightChange. Recognition
// is uniformly non-interactive regardless of referencedOptions
// length per plan §3.1 + §11.9 — it names a pattern, not specific
// options. The two callbacks let the parent <WrongItemCard> compose
// the strike/highlight effects on the option list, which is sibling
// to this component inside the card.
//
// Shipped dormant at sub-phase 4 commit 3 (this commit). Commit 4
// wires the callbacks into <WrongItemCard>'s Set<string> state and
// extends <OptionLine> to honor isStruck / isHighlighted props.
// Until commit 4 the component is exported but not imported by
// wrong-items-browser.tsx.
//
// Zod schema duplicated locally per plan §5.2 + §11.10: the same
// shape lives at src/server/items/ingest.ts (ingest contract) and
// scripts/_lib/explain.ts (OCR pipeline output); centralization is
// a standing round candidate, not in scope for sub-phase 4.
//
// Visual treatment placeholder per plan §3.2: inactive interactive
// paragraph gets hover/focus affordance; active paragraph gets
// bg-foreground/5 + a subtle ring to disambiguate from <OptionLine>'s
// correct-option marker (also bg-foreground/5). Recognition reuses
// the existing prose tint. Final treatment lands at commit 4 audit
// per plan §11.5.
//
// Accessibility per plan §3.4: each clickable paragraph is a
// <button type="button"> with aria-pressed reflecting toggle state.
// Recognition renders as plain <p>. aria-label on each button
// describes the toggle action ("Toggle elimination explanation —
// strikes through 2 options"). aria-live="polite" region for
// screen-reader announcements lives at the <WrongItemCard> level
// in commit 4 — this commit only emits state via callbacks.

import * as React from "react"
import { z } from "zod"
import { logger } from "@/logger"

const explanationPartKind = z.enum(["recognition", "elimination", "tie-breaker"])

const structuredExplanation = z
	.object({
		parts: z
			.array(
				z.object({
					kind: explanationPartKind,
					text: z.string().min(1),
					referencedOptions: z.array(z.string())
				})
			)
			.min(2)
			.max(3)
	})
	.refine(
		(d) => {
			if (d.parts[0]?.kind !== "recognition") return false
			if (d.parts[1]?.kind !== "elimination") return false
			if (d.parts.length < 3) return true
			return d.parts[2]?.kind === "tie-breaker"
		},
		{
			message:
				"parts must be in order: recognition, elimination, optional tie-breaker"
		}
	)

type StructuredExplanationPart = {
	kind: "recognition" | "elimination" | "tie-breaker"
	text: string
	referencedOptions: ReadonlyArray<string>
}

interface ParsedStructuredExplanation {
	recognition: StructuredExplanationPart
	elimination: StructuredExplanationPart
	tieBreaker?: StructuredExplanationPart
}

// Pure helper. Parses unknown JSON and re-shapes the array into a
// named-part record so downstream renderers don't pay TypeScript
// narrowing cost on parts[0]/parts[1] indexing. Returns null on
// parse failure or on the (Zod-impossible) case where required parts
// are absent post-parse; logs the failure for observability.
function parseStructuredExplanation(raw: unknown): ParsedStructuredExplanation | null {
	const result = structuredExplanation.safeParse(raw)
	if (!result.success) {
		logger.error(
			{ error: result.error, raw },
			"structuredExplanation parse failed"
		)
		return null
	}
	const recognition = result.data.parts[0]
	const elimination = result.data.parts[1]
	if (recognition === undefined || elimination === undefined) {
		// Zod's .min(2) refinement makes this unreachable; the guard is
		// defensive against future refactors that loosen the schema.
		logger.error(
			{ raw },
			"structuredExplanation parse: required parts missing post-parse"
		)
		return null
	}
	const parsed: ParsedStructuredExplanation = {
		recognition,
		elimination
	}
	const tieBreaker = result.data.parts[2]
	if (tieBreaker !== undefined) {
		parsed.tieBreaker = tieBreaker
	}
	return parsed
}

// Class for the static recognition paragraph — neutral prose tone
// matching the existing prose render in <WrongItemCard>.
const recognitionClass = "text-foreground/80 text-sm leading-relaxed"

// Classes for the interactive (elimination / tie-breaker) paragraphs.
// Inactive: hover/focus affordance signals clickability. Active:
// bg-foreground/5 + ring distinguishes from <OptionLine>'s correct-
// option marker (also bg-foreground/5; ring carries the
// disambiguation). Negative horizontal margin keeps the prose flush
// with the card's left rule when active.
const interactiveBaseClass =
	"block w-full -mx-3 rounded-md px-3 py-2 text-left text-foreground/80 text-sm leading-relaxed cursor-pointer hover:bg-foreground/5 focus-visible:outline-2 focus-visible:outline-foreground/30 focus-visible:outline-offset-2"

const interactiveActiveClass =
	"block w-full -mx-3 rounded-md px-3 py-2 text-left text-foreground text-sm leading-relaxed cursor-pointer bg-foreground/5 ring-1 ring-foreground/15 focus-visible:outline-2 focus-visible:outline-foreground/30 focus-visible:outline-offset-2"

function classForInteractive(isActive: boolean): string {
	if (isActive) return interactiveActiveClass
	return interactiveBaseClass
}

function ariaLabelForElimination(refCount: number): string {
	if (refCount === 0) {
		return "Toggle elimination explanation"
	}
	if (refCount === 1) {
		return "Toggle elimination explanation — strikes through 1 option"
	}
	return `Toggle elimination explanation — strikes through ${refCount} options`
}

function ariaLabelForTieBreaker(refCount: number): string {
	if (refCount === 0) {
		return "Toggle tie-breaker explanation"
	}
	if (refCount === 1) {
		return "Toggle tie-breaker explanation — highlights 1 option"
	}
	return `Toggle tie-breaker explanation — highlights ${refCount} options`
}

interface StructuredExplanationProps {
	raw: unknown
	fallbackProse?: string
	onActiveStrikeChange: (referencedOptions: ReadonlyArray<string>) => void
	onActiveHighlightChange: (referencedOptions: ReadonlyArray<string>) => void
}

function StructuredExplanation(props: StructuredExplanationProps) {
	const parsed = parseStructuredExplanation(props.raw)
	const [eliminationActive, setEliminationActive] = React.useState(false)
	const [tieBreakerActive, setTieBreakerActive] = React.useState(false)

	if (parsed === null) {
		if (props.fallbackProse === undefined) {
			return null
		}
		return (
			<p
				className="text-foreground/70 text-sm leading-relaxed"
				data-testid="post-session-explanation-prose-fallback"
			>
				{props.fallbackProse}
			</p>
		)
	}

	// Extract narrowed locals so the toggle handlers don't fight
	// closed-over-narrowing limits on `parsed`. const-bound; safe to
	// capture from the handler closures.
	const recognition = parsed.recognition
	const elimination = parsed.elimination
	const tieBreaker = parsed.tieBreaker

	function handleEliminationToggle() {
		const next = !eliminationActive
		setEliminationActive(next)
		if (next) {
			props.onActiveStrikeChange(elimination.referencedOptions)
		} else {
			props.onActiveStrikeChange([])
		}
	}

	function handleTieBreakerToggle() {
		if (tieBreaker === undefined) return
		const next = !tieBreakerActive
		setTieBreakerActive(next)
		if (next) {
			props.onActiveHighlightChange(tieBreaker.referencedOptions)
		} else {
			props.onActiveHighlightChange([])
		}
	}

	const eliminationLabel = ariaLabelForElimination(elimination.referencedOptions.length)
	const eliminationClass = classForInteractive(eliminationActive)
	let tieBreakerLabel = ""
	if (tieBreaker !== undefined) {
		tieBreakerLabel = ariaLabelForTieBreaker(tieBreaker.referencedOptions.length)
	}
	const tieBreakerClass = classForInteractive(tieBreakerActive)

	return (
		<div
			className="space-y-2"
			data-testid="post-session-structured-explanation"
		>
			<p className={recognitionClass} data-testid="post-session-explanation-part-recognition">
				{recognition.text}
			</p>
			<button
				aria-label={eliminationLabel}
				aria-pressed={eliminationActive}
				className={eliminationClass}
				data-testid="post-session-explanation-part-elimination"
				onClick={handleEliminationToggle}
				type="button"
			>
				{elimination.text}
			</button>
			{tieBreaker === undefined ? null : (
				<button
					aria-label={tieBreakerLabel}
					aria-pressed={tieBreakerActive}
					className={tieBreakerClass}
					data-testid="post-session-explanation-part-tie-breaker"
					onClick={handleTieBreakerToggle}
					type="button"
				>
					{tieBreaker.text}
				</button>
			)}
		</div>
	)
}

export type { ParsedStructuredExplanation, StructuredExplanationPart, StructuredExplanationProps }
export {
	ariaLabelForElimination,
	ariaLabelForTieBreaker,
	classForInteractive,
	parseStructuredExplanation,
	StructuredExplanation
}
