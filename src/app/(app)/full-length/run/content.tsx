"use client"

// /full-length/run content — consumes the startSession promise and
// mounts <FocusShell> with full-length config.
// docs/plans/phase5-full-length-test.md §4 + §5 + §7.
//
// Full-length config (per SPEC §10.3 + plan §4):
//   - sessionDurationMs: 900_000 (15 minutes — time-boxed)
//   - perQuestionTargetMs: 18_000 (standard 18-second per-question
//     target; Q12.4 — same target as drill / diagnostic; the 15min/50q
//     math coincides with this by design)
//   - paceTrackVisible: true (50 blocks at first render)
//   - targetQuestionCount: 50 (fixed; Q12.6 — no length picker)
//   - strictMode: false (simulation Phase 6 is the strict variant)
//
// Auto-end: <FocusShell>'s session-timer effect fires onEndSession()
// when state.elapsedSessionMs >= sessionDurationMs (focus-shell.tsx
// :376-405). Either: (a) user submits 50 attempts before the 15min
// timer expires → submitAttempt returns nextItem: undefined → shell
// calls onEndSession → router.push to /post-session/[sessionId];
// (b) timer expires → auto-end fires → onEndSession → same nav. Both
// paths land on the existing post-session shell with the non-
// diagnostic render path (no belt indicator per sub-phase 5's drill-
// only guard; no onboarding form / pacing line per the diagnostic-
// only guards).

import { useRouter } from "next/navigation"
import * as React from "react"
import { endSession, submitAttempt } from "@/app/(app)/actions"
import type { RunInit } from "@/app/(app)/full-length/run/page"
import { FocusShell } from "@/components/focus-shell/focus-shell"
import type { SubmitAttemptInput } from "@/components/focus-shell/types"

const FULL_LENGTH_DURATION_MS = 900_000
const FULL_LENGTH_PER_QUESTION_TARGET_MS = 18_000
const FULL_LENGTH_TARGET_QUESTION_COUNT = 50

interface FullLengthRunContentProps {
	initPromise: Promise<RunInit>
}

function FullLengthRunContent(props: FullLengthRunContentProps) {
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

	return (
		<FocusShell
			sessionId={init.sessionId}
			sessionType="full_length"
			sessionDurationMs={FULL_LENGTH_DURATION_MS}
			perQuestionTargetMs={FULL_LENGTH_PER_QUESTION_TARGET_MS}
			targetQuestionCount={FULL_LENGTH_TARGET_QUESTION_COUNT}
			paceTrackVisible
			initialItem={init.firstItem}
			strictMode={false}
			onSubmitAttempt={onSubmitAttempt}
			onEndSession={onEndSession}
		/>
	)
}

export { FullLengthRunContent }
