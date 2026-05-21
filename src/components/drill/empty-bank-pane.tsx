// <EmptyBankPane> — rendered on /drill/[subTypeId]/run when the
// requested sub-type has fewer live items than the drill default
// requires (DEFAULT_DRILL_QUESTIONS = 5). Plan:
// docs/plans/phase3-drill-mode.md §6 + §11.1 + practice round
// commit 2 (`docs/plans/practice-round.md` §5 commit 2).
//
// Copy uses the user's frame ("this drill isn't ready for me to use")
// rather than implementation framing about content workstreams. Single
// CTA back to the dashboard; no retry button (the bank doesn't fill
// on user request); no auto-poll (the testbank workstream is async
// authoring, not a workflow this page can wait on).
//
// Link target: `/` (the dashboard, where the dojo cards now serve as
// the practice picker since practice round commit 1 deleted the
// Mastery Map at /drill — see `docs/plans/practice-round.md` §5
// commit 1 + ask 1). Pre-practice-round target was /drill (the
// Mastery Map picker, dashboard round commit 3); pre-dashboard-round
// target was / (the dashboard's predecessor). The double-rewrite is
// intentional: the link's semantic intent ("go to the picker") has
// been preserved across both rounds; the picker's mount point moved.
//
// Threshold note: pre-practice-round the empty-bank check fired only
// on `liveCount === 0`. Post-round, the check fires on `liveCount <
// DEFAULT_DRILL_QUESTIONS` (5) — a sub-type with 1-4 live items is
// also "not ready" because a 5-question drill cannot start with <5
// items. The copy "No questions available for {displayName} yet" is
// technically imprecise for the 1-4 case (some questions exist) but
// the user-facing intent ("can't drill this sub-type yet") is
// correct. If a future round wants pixel-precise copy, branch on
// `liveCount` and surface "1 of 5 needed" or similar.

import type * as React from "react"
import { Button } from "@/components/ui/button"

interface EmptyBankPaneProps {
	displayName: string
}

function EmptyBankPane(props: EmptyBankPaneProps) {
	const Anchor: React.ElementType = "a"
	return (
		<main
			className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-6 px-6 py-12"
			data-testid="drill-empty-bank-pane"
		>
			<header className="space-y-2">
				<h1 className="font-semibold text-2xl tracking-tight">
					No questions available for {props.displayName} yet.
				</h1>
				<p className="text-muted-foreground text-sm">
					Try a different sub-type from the dashboard.
				</p>
			</header>
			<div>
				<Button asChild size="lg">
					<Anchor href="/">Back to dashboard</Anchor>
				</Button>
			</div>
		</main>
	)
}

export { EmptyBankPane }
