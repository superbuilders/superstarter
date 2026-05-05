"use client"

// /diagnostic/run content — consumes the startSession promise from
// page.tsx via React.use() and mounts the FocusShell with diagnostic
// config.
//
// Plan: docs/plans/phase3-diagnostic-flow.md §4 + §5.
//
// Diagnostic config (capacity-measurement framing, PRD §4.1):
//   - sessionDurationMs: null  (the diagnostic is untimed at the session
//     level — capacity, not triage. The chronometer and session-progress
//     bar do not render in the diagnostic flow.)
//   - paceTrackVisible: false  (the diagnostic is not paced)
//   - perQuestionTargetMs: 18000 (real-CCAT per-question target — drives
//     the per-question dual-bar timer and the 18s triage prompt)
//   - targetQuestionCount: 50  (matches diagnosticMix.length)
//
// On the last submit, the FocusShell's `onEndSession` callback fires the
// `endSession` action. That action triggers `masteryRecomputeWorkflow`
// from src/server/sessions/end.ts. After endSession resolves, we
// router.push to /post-session/<sessionId> for the onboarding capture.

import { useRouter } from "next/navigation"
import * as React from "react"
import { endSession, submitAttempt } from "@/app/(app)/actions"
import { FocusShell } from "@/components/focus-shell/focus-shell"
import type { ItemForRender, SubmitAttemptInput } from "@/components/focus-shell/types"

interface SessionPromise {
	sessionId: string
	firstItem: ItemForRender
}

interface DiagnosticContentProps {
	sessionPromise: Promise<SessionPromise>
}

function DiagnosticContent(props: DiagnosticContentProps) {
	const { sessionId, firstItem } = React.use(props.sessionPromise)
	const router = useRouter()

	const onSubmitAttempt = React.useCallback(
		function onSubmitAttempt(input: SubmitAttemptInput) {
			return submitAttempt(input)
		},
		[]
	)

	const onEndSession = React.useCallback(
		async function onEndSession() {
			await endSession(sessionId)
			router.push(`/post-session/${sessionId}`)
		},
		[sessionId, router]
	)

	return (
		<FocusShell
			sessionId={sessionId}
			sessionType="diagnostic"
			sessionDurationMs={null}
			perQuestionTargetMs={18_000}
			targetQuestionCount={50}
			paceTrackVisible={false}
			initialItem={firstItem}
			strictMode={false}
			onSubmitAttempt={onSubmitAttempt}
			onEndSession={onEndSession}
		/>
	)
}

export { DiagnosticContent }
