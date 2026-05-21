"use client"

// /drill/[subTypeId]/run content — consumes the startSession promise
// and mounts <FocusShell> with drill config. Plan §6.4.
//
// Drill config:
//   - sessionDurationMs: drillLength * 18000
//     (matches one of the timer-bar Map entries: 90000 / 180000 / 360000)
//   - paceTrackVisible: true
//   - perQuestionTargetMs: 18000  (per-question target — drives the
//     per-question timer bar + warning sound)
//   - targetQuestionCount: drillLength
//
// After the last submit, `endSession` resolves and we route to
// `/post-session/[sessionId]`. Phase 5 sub-phase 1 commit 1
// (docs/plans/phase5-post-session-review.md §3 + §12 commit 1) flipped
// the drill landing from `/` to `/post-session/[sessionId]` so drills
// land on the same review surface as diagnostic + (sub-phase 3)
// full-length sessions. SPEC §10.2 line-5 marker rewrites past-tense
// in commit 7 of this sub-phase.

import { useRouter } from "next/navigation"
import * as React from "react"
import { endSession, submitAttempt } from "@/app/(app)/actions"
import type { RunInit } from "@/app/(app)/drill/[subTypeId]/run/page"
import { FocusShell } from "@/components/focus-shell/focus-shell"
import type { SubmitAttemptInput } from "@/components/focus-shell/types"

interface DrillRunContentProps {
	initPromise: Promise<RunInit>
}

function DrillRunContent(props: DrillRunContentProps) {
	const init = React.use(props.initPromise)
	const router = useRouter()

	const onSubmitAttempt = React.useCallback(function onSubmitAttempt(input: SubmitAttemptInput) {
		return submitAttempt(input)
	}, [])

	const onEndSession = React.useCallback(
		async function onEndSession() {
			await endSession(init.sessionId)
			router.push(`/post-session/${init.sessionId}`)
		},
		[init.sessionId, router]
	)

	const sessionDurationMs = init.drillLength * 18_000

	return (
		<FocusShell
			sessionId={init.sessionId}
			sessionType="drill"
			subTypeId={init.subTypeId}
			sessionDurationMs={sessionDurationMs}
			perQuestionTargetMs={18_000}
			targetQuestionCount={init.drillLength}
			paceTrackVisible
			initialItem={init.firstItem}
			strictMode={false}
			onSubmitAttempt={onSubmitAttempt}
			onEndSession={onEndSession}
		/>
	)
}

export { DrillRunContent }
