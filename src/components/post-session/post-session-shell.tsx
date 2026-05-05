"use client"

// <PostSessionShell> — session-type-aware dispatch with locked §10
// component ordering.
//
// Plan: docs/plans/phase5-post-session-review.md §10 + §12 commits 1-6.
//
// - Commit 1 established the locked nine-slot ordering with empty
//   placeholder divs in slots 2-6.
// - Commit 2 widened the prop boundary to carry the review-data
//   fields (accuracy, latency, wrongItems, triageScore,
//   surfacedStrategies); slots stayed placeholder.
// - Commit 3 filled slot 2 (<TriageScoreLine>) and slot 3
//   (<AccuracySummary>) into their locked positions.
// - Commit 4 (this commit) fills slot 4 (<LatencySummary>) into its
//   locked position. Slots 5, 6 remain placeholder; commits 5-6 fill
//   them.
//
// Render order (top to bottom), per §10:
//   1. Heading + brief one-line summary.
//   2. <TriageScoreLine>           — filled (commit 3, plan §7).
//   3. <AccuracySummary>           — filled (commit 3, plan §5).
//   4. <LatencySummary>            — filled (commit 4, plan §6).
//   5. <WrongItemsBrowser>         — fills in commit 5 (plan §8).
//   6. <StrategySurface>           — fills in commit 6 (plan §9).
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
	PerSubTypeAccuracy,
	PerSubTypeLatency,
	SurfacedStrategy,
	WrongItem
} from "@/app/(diagnostic-flow)/post-session/[sessionId]/page"
import { AccuracySummary } from "@/components/post-session/accuracy-summary"
import { LatencySummary } from "@/components/post-session/latency-summary"
import { OnboardingTargets } from "@/components/post-session/onboarding-targets"
import { TriageScoreLine } from "@/components/post-session/triage-score-line"
import { Button } from "@/components/ui/button"
import type { TriageScore } from "@/server/triage/score"

type SessionTypeForShell = "diagnostic" | "drill" | "full_length" | "simulation"

interface PostSessionShellProps {
	sessionType: SessionTypeForShell
	pacingMinutes?: number
	accuracy: PerSubTypeAccuracy[]
	latency: PerSubTypeLatency[]
	wrongItems: WrongItem[]
	triageScore: TriageScore
	surfacedStrategies: SurfacedStrategy[]
}

function PostSessionShell(props: PostSessionShellProps) {
	const isDiagnostic = props.sessionType === "diagnostic"
	const heading = isDiagnostic ? "Diagnostic complete" : "Session complete"

	let subhead: React.ReactNode = null
	if (isDiagnostic) {
		subhead = (
			<p className="text-muted-foreground text-sm">
				Tell us what you're aiming for so we can pace your practice.
			</p>
		)
	}

	let pacingLine: React.ReactNode = null
	if (isDiagnostic && props.pacingMinutes !== undefined) {
		pacingLine = (
			<p
				className="text-muted-foreground text-sm"
				data-testid="post-session-pacing-line"
			>
				Your diagnostic took {props.pacingMinutes} minutes. The real CCAT is 15 minutes for 50 questions.
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

	return (
		<main className="mx-auto flex min-h-dvh w-full max-w-2xl flex-col gap-8 px-6 py-12">
			<header className="space-y-2" data-testid="post-session-heading">
				<h1 className="font-semibold text-2xl tracking-tight">{heading}</h1>
				{subhead}
			</header>

			{/* Slot 2: <TriageScoreLine> — filled in commit 3 (plan §7). */}
			<div data-testid="post-session-slot-triage-score">
				<TriageScoreLine score={props.triageScore} />
			</div>

			{/* Slot 3: <AccuracySummary> — filled in commit 3 (plan §5). */}
			<div data-testid="post-session-slot-accuracy-summary">
				<AccuracySummary rows={props.accuracy} />
			</div>

			{/* Slot 4: <LatencySummary> — filled in commit 4 (plan §6). */}
			<div data-testid="post-session-slot-latency-summary">
				<LatencySummary rows={props.latency} />
			</div>

			{/* Slot 5: <WrongItemsBrowser> — fills in commit 5 (plan §8). */}
			<div data-testid="post-session-slot-wrong-items" />

			{/* Slot 6: <StrategySurface> — fills in commit 6 (plan §9). */}
			<div data-testid="post-session-slot-strategy-surface" />

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
				Continue
			</Button>
		</div>
	)
}

export type { SessionTypeForShell }
export { PostSessionShell }
