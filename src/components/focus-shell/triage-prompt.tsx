"use client"

// <TriagePrompt> — peripheral overlay rendered when the per-question
// elapsed time crosses the per-question target (18s in Phase 3) and
// the prompt has not yet fired this question. Plan §5.2 + SPEC §6.7.
//
// LOAD-BEARING: this prompt does NOT auto-submit. Its pedagogical
// value is exactly that the user has to make the decision to abandon.
// The session timer is the only hard cutoff.
//
// The user takes the prompt by clicking it OR pressing `Space` (the
// key listener lives in the parent FocusShell). The Space shortcut is
// the only kept keyboard shortcut in the focus shell — see plan §3.0
// / §3.2 for the rationale (the real CCAT has no keyboard shortcuts;
// the triage prompt is our pedagogical layer, not CCAT mechanics).
//
// Phase 3 polish commit 2 re-docked this from bottom-center to
// top-center per
// docs/plans/phase-3-polish-practice-surface-features.md §5.4. The new
// layout's full-width "Submit Answer" CTA at the bottom of the central
// column would have visually competed with the old bottom-center
// pill. The "Best move: guess and advance." prefix is preserved
// verbatim — BrainLift-load-bearing per parent-plan §5.2 and PRD §6.1.
// Only the hotkey-hint suffix was updated from `(T)` to `(Space)`.

import { cn } from "@/lib/utils"

interface TriagePromptProps {
	visible: boolean
	onTake: () => void
}

// `ifThenPlan` prop chain dropped 2026-05-04 (v1-code-cleanup commit 2)
// — NarrowingRamp protocol cut from v1 (PRD §5.3 + SPEC §10.6 markers).
// Triage prompt always renders the generic "Best move: guess and
// advance." message in v1; the if-then-plan rendering returns when (if)
// NarrowingRamp ships post-v1.
function TriagePrompt(props: TriagePromptProps) {
	if (!props.visible) return null
	return (
		<button
			type="button"
			aria-live="polite"
			onClick={props.onTake}
			className={cn(
				"fixed top-16 left-1/2 z-50 -translate-x-1/2",
				"rounded-full border border-foreground/20 bg-background/85 px-4 py-2 backdrop-blur",
				"text-foreground/80 text-sm shadow-md",
				"transition-opacity",
				"hover:bg-background"
			)}
		>
			<span>Best move: guess and advance.</span>
			<span className="ml-2 font-mono text-foreground/50 text-xs">(Space)</span>
		</button>
	)
}

export type { TriagePromptProps }
export { TriagePrompt }
