"use client"

// <PostSessionShell> — session-type-aware dispatch with locked §10
// component ordering.
//
// Plan: docs/plans/phase5-post-session-review.md §10 + §12 commits 1-6;
// Round 2 §5.4 combined slots 3 + 4 (<AccuracySummary> + <LatencySummary>)
// into a single <PerformanceSummary> renderer at the slot-3 position.
// Slot 4's data-testid wrapper is retired; the locked §10 ordering now has
// 8 visible slots after the merge (numbering preserved for cross-doc
// stability — slot 4 is empty-not-renumbered in the in-flight ledger).
//
// Render order (top to bottom), per §10 + Round 2 §5.4:
//   1. Heading + brief one-line summary.
//   2. <TriageScoreLine>           — filled (commit 3, plan §7).
//   3. <PerformanceSummary>        — filled (Round 2 §5.4; combined
//                                    accuracy + latency per sub-type;
//                                    replaces former slots 3 + 4).
//   5. <WrongItemsBrowser>         — filled (commit 5, plan §8).
//   6. <StrategySurface>           — filled (commit 6, plan §9).
//   7. <OnboardingTargets>         — diagnostic-only, already shipped.
//   8. Pacing-line sentence        — diagnostic-only, conditional on >15min.
//   9. Continue CTA                — non-diagnostic only (drill /
//                                    full-length / simulation).
//
// Slot data-testid markers stay on outer wrapper divs so DOM-order
// assertions across commits 1-6 keep working — components fill the
// wrappers, the wrappers stay anchored.

import { useRouter } from "next/navigation"
import type * as React from "react"
import type {
	EndSessionTierForRender,
	PerSubTypePerformance,
	SurfacedStrategy,
	WrongItem
} from "@/app/(diagnostic-flow)/post-session/[sessionId]/page"
import { BeltIndicator } from "@/components/post-session/belt-indicator"
import { OnboardingTargets } from "@/components/post-session/onboarding-targets"
import { PerformanceSummary } from "@/components/post-session/performance-summary"
import { ResultSoundFx } from "@/components/post-session/result-sound-fx"
import { StrategySurface } from "@/components/post-session/strategy-surface"
import { TriageScoreLine } from "@/components/post-session/triage-score-line"
import { WrongItemsBrowser } from "@/components/post-session/wrong-items-browser"
import { Button } from "@/components/ui/button"
import type { TriageScore } from "@/server/triage/score"

type SessionTypeForShell = "diagnostic" | "drill" | "full_length" | "simulation"

interface PostSessionShellProps {
	sessionType: SessionTypeForShell
	pacingMinutes?: number
	performance: PerSubTypePerformance[]
	wrongItems: WrongItem[]
	triageScore: TriageScore
	surfacedStrategies: SurfacedStrategy[]
	// Drill-mode adaptive walker tier reached at session end. Sub-phase
	// 5 commit 4 wires this; per plan §5.5 the value is null on:
	//   - non-drill sessions (page-level passes null defensively)
	//   - drill sessions with zero attempts (component renders nothing
	//     — heading falls back to the unchanged "Session complete"
	//     surface)
	// The shell guards on sessionType === "drill" AND endSessionTier
	// non-null before rendering the belt; either gate failing keeps
	// the heading bit-for-bit unchanged for diagnostic / full-length /
	// simulation render paths.
	endSessionTier: EndSessionTierForRender | null
}

function sumCorrectAttempts(sum: number, row: PerSubTypePerformance): number {
	return sum + row.correct
}

function PostSessionShell(props: PostSessionShellProps) {
	const isDiagnostic = props.sessionType === "diagnostic"
	const heading = isDiagnostic ? "Diagnostic complete" : "Session complete"

	// Subhead + pacing-line use `text-foreground/80` (~5.7:1 against
	// light bg) to inherit <TriageScoreLine>'s documented AA rationale.
	// Light-mode `--muted-foreground: oklch(0.556 0 0)` lands at ~4.0:1
	// — borderline below AA for normal text. Aligning peer single-line
	// statements on the post-session shell keeps the surface
	// consistent. Found by commit 6's full-surface audit.
	let subhead: React.ReactNode = null
	if (isDiagnostic) {
		subhead = (
			<p className="text-foreground/80 text-sm">
				Tell us what you're aiming for so we can pace your practice.
			</p>
		)
	}

	let pacingLine: React.ReactNode = null
	if (isDiagnostic && props.pacingMinutes !== undefined) {
		pacingLine = (
			<p className="text-foreground/80 text-sm" data-testid="post-session-pacing-line">
				Your diagnostic took {props.pacingMinutes} minutes. The real CCAT is 15 minutes for 50
				questions.
			</p>
		)
	}

	let trailingSection: React.ReactNode
	if (isDiagnostic) {
		trailingSection = (
			<div className="mx-auto w-full max-w-md">
				<OnboardingTargets />
			</div>
		)
	} else {
		trailingSection = <ContinueButton />
	}

	// Heading-area belt indicator (sub-phase 5 commit 4, plan §5.3).
	// Renders only when the session is drill-mode AND the walker has
	// produced a tier (non-null). Diagnostic / full-length / simulation
	// keep the unchanged heading; drill sessions with zero attempts
	// (endSessionTier === null per plan §5.5 zero-attempt branch) also
	// keep the unchanged heading. Per plan §2.6 / §5.3 audit (F)
	// recommendation, this is a heading expansion (slot 1), NOT a new
	// slot — the slot 2-9 ordering stays untouched.
	let beltSection: React.ReactNode = null
	if (props.sessionType === "drill" && props.endSessionTier !== null) {
		beltSection = (
			<BeltIndicator
				tier={props.endSessionTier.tier}
				subTypeDisplayName={props.endSessionTier.subTypeDisplayName}
				isPreFloor={props.endSessionTier.isPreFloor}
			/>
		)
	}

	// Practice-test-only result sound (mounts as a render-null sibling).
	// Gated to full_length / simulation so drill + diagnostic surfaces
	// stay silent. Score = sum of per-sub-type correct counts; tier
	// thresholds + bank routing live in <ResultSoundFx>.
	let resultSoundFx: React.ReactNode = null
	if (props.sessionType === "full_length" || props.sessionType === "simulation") {
		const totalCorrect = props.performance.reduce(sumCorrectAttempts, 0)
		resultSoundFx = <ResultSoundFx score={totalCorrect} />
	}

	return (
		<main className="mx-auto flex min-h-dvh w-full max-w-2xl flex-col gap-8 px-6 py-12">
			{resultSoundFx}
			<header className="space-y-3" data-testid="post-session-heading">
				<h1 className="font-semibold text-2xl tracking-tight">{heading}</h1>
				{subhead}
				{beltSection}
			</header>

			{/* Slot 2: <TriageScoreLine> — filled in commit 3 (plan §7). */}
			<div data-testid="post-session-slot-triage-score">
				<TriageScoreLine score={props.triageScore} />
			</div>

			{/* Slot 3: <PerformanceSummary> — Round 2 §5.4 combined accuracy
			    + latency renderer (replaces former slots 3 + 4). */}
			<div data-testid="post-session-slot-performance-summary">
				<PerformanceSummary rows={props.performance} />
			</div>

			{/* Slot 5: <WrongItemsBrowser> — filled in commit 5 (plan §8). */}
			<div data-testid="post-session-slot-wrong-items">
				<WrongItemsBrowser items={props.wrongItems} />
			</div>

			{/* Slot 6: <StrategySurface> — filled in commit 6 (plan §9). */}
			<div data-testid="post-session-slot-strategy-surface">
				<StrategySurface strategies={props.surfacedStrategies} />
			</div>

			{trailingSection}
			{pacingLine}
		</main>
	)
}

function ContinueButton() {
	const router = useRouter()
	return (
		<div className="flex justify-end">
			<Button
				onClick={function onContinue() {
					router.push("/")
				}}
				data-testid="post-session-continue"
			>
				Continue to dashboard
			</Button>
		</div>
	)
}

export type { SessionTypeForShell }
export { PostSessionShell }
