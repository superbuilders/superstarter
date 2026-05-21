"use client"

import { useRouter } from "next/navigation"
import * as React from "react"
import {
	endExperimentalPracticeTestSessionAction,
	submitExperimentalPracticeTestAttempt
} from "@/app/(app)/experimental/actions"
import { FocusShell } from "@/components/focus-shell/focus-shell"
import type { SubmitAttemptInput } from "@/components/focus-shell/types"
import { markFreshPracticeTestLanding } from "@/components/post-session/fresh-practice-landing"
import type { ExperimentalPracticeTestRunInit } from "@/server/experimental/practice-test-session"

const EXPERIMENTAL_PRACTICE_TEST_DURATION_MS = 360_000
const EXPERIMENTAL_PRACTICE_TEST_PER_QUESTION_TARGET_MS = 18_000

interface ExperimentalPracticeTestRunContentProps {
	initPromise: Promise<ExperimentalPracticeTestRunInit>
}

function ExperimentalPracticeTestRunContent(props: ExperimentalPracticeTestRunContentProps) {
	const init = React.use(props.initPromise)
	const router = useRouter()

	const onSubmitAttempt = React.useCallback(function onSubmitAttempt(input: SubmitAttemptInput) {
		return submitExperimentalPracticeTestAttempt(input)
	}, [])

	const onEndSession = React.useCallback(
		async function onEndSession() {
			await endExperimentalPracticeTestSessionAction(init.sessionId)
			markFreshPracticeTestLanding(init.sessionId)
		},
		[init.sessionId]
	)

	const afterEndSessionNavigate = React.useCallback(
		function afterEndSessionNavigate() {
			router.push(`/experimental/review/${init.sessionId}`)
		},
		[init.sessionId, router]
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
			afterEndSessionNavigate={afterEndSessionNavigate}
			strictMode={false}
			onSubmitAttempt={onSubmitAttempt}
			onEndSession={onEndSession}
		/>
	)
}

export { ExperimentalPracticeTestRunContent }
