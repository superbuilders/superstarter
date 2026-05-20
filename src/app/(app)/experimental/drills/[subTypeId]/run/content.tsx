"use client"

import * as React from "react"
import { FocusShell } from "@/components/focus-shell/focus-shell"
import { endExperimentalDrillSessionAction, submitExperimentalDrillAttempt } from "@/app/(app)/experimental/actions"
import type { ExperimentalDrillRunInit } from "@/server/experimental/drill-session"
import type { SubmitAttemptInput } from "@/components/focus-shell/types"

interface ExperimentalDrillRunContentProps {
	initPromise: Promise<ExperimentalDrillRunInit>
}

function ExperimentalDrillRunContent(props: ExperimentalDrillRunContentProps) {
	const init = React.use(props.initPromise)
	const completionHref = `/experimental/review/${init.sessionId}`

	const onSubmitAttempt = React.useCallback(function onSubmitAttempt(input: SubmitAttemptInput) {
		return submitExperimentalDrillAttempt(input)
	}, [])

	const onEndSession = React.useCallback(
		async function onEndSession() {
			await endExperimentalDrillSessionAction(init.sessionId)
			window.location.assign(completionHref)
		},
		[completionHref, init.sessionId]
	)

	return (
		<FocusShell
			sessionId={init.sessionId}
			sessionType="drill"
			subTypeId={init.subTypeId}
			sessionDurationMs={init.drillLength * 18_000}
			perQuestionTargetMs={18_000}
			targetQuestionCount={init.drillLength}
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

export { ExperimentalDrillRunContent }
