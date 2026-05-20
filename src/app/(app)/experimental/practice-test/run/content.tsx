"use client"

import * as React from "react"
import {
	endExperimentalPracticeTestSessionAction,
	submitExperimentalPracticeTestAttempt
} from "@/app/(app)/experimental/actions"
import { FocusShell } from "@/components/focus-shell/focus-shell"
import type { SubmitAttemptInput } from "@/components/focus-shell/types"
import type { ExperimentalPracticeTestRunInit } from "@/server/experimental/practice-test-session"

const EXPERIMENTAL_PRACTICE_TEST_DURATION_MS = 360_000
const EXPERIMENTAL_PRACTICE_TEST_PER_QUESTION_TARGET_MS = 18_000

interface ExperimentalPracticeTestRunContentProps {
	initPromise: Promise<ExperimentalPracticeTestRunInit>
}

function ExperimentalPracticeTestRunContent(props: ExperimentalPracticeTestRunContentProps) {
	const init = React.use(props.initPromise)
	const completionHref = `/experimental/review/${init.sessionId}`

	const onSubmitAttempt = React.useCallback(function onSubmitAttempt(input: SubmitAttemptInput) {
		return submitExperimentalPracticeTestAttempt(input)
	}, [])

	const onEndSession = React.useCallback(
		async function onEndSession() {
			await endExperimentalPracticeTestSessionAction(init.sessionId)
			window.location.assign(completionHref)
		},
		[completionHref, init.sessionId]
	)

	return (
		<FocusShell
			sessionId={init.sessionId}
			sessionType="practice_test"
			sessionDurationMs={EXPERIMENTAL_PRACTICE_TEST_DURATION_MS}
			perQuestionTargetMs={EXPERIMENTAL_PRACTICE_TEST_PER_QUESTION_TARGET_MS}
			targetQuestionCount={init.targetQuestionCount}
			paceTrackVisible
			initialItem={init.firstItem}
			heartbeatHref={`/api/experimental/sessions/${init.sessionId}/heartbeat`}
			completionHref={completionHref}
			strictMode={false}
			onSubmitAttempt={onSubmitAttempt}
			onEndSession={onEndSession}
		/>
	)
}

export { ExperimentalPracticeTestRunContent }
