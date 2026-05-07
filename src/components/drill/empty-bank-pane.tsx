// <EmptyBankPane> — rendered on /drill/[subTypeId] when the sub-type
// has zero live items in the DB. Plan: docs/plans/phase3-drill-mode.md
// §6 + §11.1.
//
// Copy uses the user's frame ("this drill isn't ready for me to use")
// rather than implementation framing about content workstreams. Single
// CTA back to the Mastery Map; no retry button (the bank doesn't fill
// on user request); no auto-poll (the testbank workstream is async
// authoring, not a workflow this page can wait on).
//
// Link target: `/drill` (the Mastery Map sub-type picker, mounted at
// the /drill index since dashboard round commit 3 — see
// `docs/plans/dashboard.md` §5 commit 3 + Dashboard PRD §11.5). Was
// `/` pre-migration; rewritten because the link semantically meant
// "go to the picker," and the picker now lives at /drill.

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
					Try a different sub-type from the Mastery Map.
				</p>
			</header>
			<div>
				<Button asChild size="lg">
					<Anchor href="/drill">Back to Mastery Map</Anchor>
				</Button>
			</div>
		</main>
	)
}

export { EmptyBankPane }
