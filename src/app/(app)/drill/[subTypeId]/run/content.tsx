"use client"

// /drill/[subTypeId]/run content — consumes the startSession promise
// and mounts <FocusShell> with drill config. Plan §6.4.
//
// Drill config:
//   - sessionDurationMs: drillLength * 18000
//     (matches one of the timer-bar Map entries: 90000 / 180000 / 360000)
//   - paceTrackVisible: true
//   - perQuestionTargetMs: 18000  (triage prompt fires)
//   - targetQuestionCount: drillLength
//
// After the last submit `endSession` resolves and we router.push('/').
// No detour through /post-session/[sessionId] — drill post-session UI
// is Phase 5.

import { useRouter } from "next/navigation"
import * as React from "react"
import { endSession, submitAttempt } from "@/app/(app)/actions"
import { FocusShell } from "@/components/focus-shell/focus-shell"
import type { SubmitAttemptInput } from "@/components/focus-shell/types"
import type { RunInit } from "@/app/(app)/drill/[subTypeId]/run/page"

interface DrillRunContentProps {
	initPromise: Promise<RunInit>
}

function DrillRunContent(props: DrillRunContentProps) {
	const init = React.use(props.initPromise)
	const router = useRouter()

	const onSubmitAttempt = React.useCallback(
		function onSubmitAttempt(input: SubmitAttemptInput) {
			return submitAttempt(input)
		},
		[]
	)

	const onEndSession = React.useCallback(
		async function onEndSession() {
			await endSession(init.sessionId)
			router.push("/")
		},
		[init.sessionId, router]
	)

	const sessionDurationMs = init.drillLength * 18_000

	return (
		<FocusShell
			sessionId={init.sessionId}
			sessionType="drill"
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
