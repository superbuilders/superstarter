"use client"

// /mistakes content — consumes the picked items + session id and
// mounts <FocusShell> walking through them. Each submit records an
// attempt server-side; the next item comes from the client-tracked
// queue (NOT from getNextItem, which would adaptive-pick from a single
// sub-type bank).
//
// After the last submit, endSession resolves and we route to
// /post-session/[sessionId] — same shape as a drill review.

import { useRouter } from "next/navigation"
import * as React from "react"
import { endSession, submitAttempt } from "@/app/(app)/actions"
import { FocusShell } from "@/components/focus-shell/focus-shell"
import type { ItemForRender, SubmitAttemptInput } from "@/components/focus-shell/types"

interface MistakesRunInit {
	sessionId: string
	firstItem: ItemForRender
	remaining: ItemForRender[]
	totalCount: number
}

interface MistakesRunContentProps {
	initPromise: Promise<MistakesRunInit>
}

function MistakesRunContent(props: MistakesRunContentProps) {
	const init = React.use(props.initPromise)
	const router = useRouter()

	const queueRef = React.useRef<ItemForRender[]>(init.remaining)

	const onSubmitAttempt = React.useCallback(async function onSubmitAttempt(
		input: SubmitAttemptInput
	) {
		await submitAttempt(input)
		const next = queueRef.current.shift()
		if (next === undefined) return {}
		return { nextItem: next }
	}, [])

	const onEndSession = React.useCallback(
		async function onEndSession() {
			await endSession(init.sessionId)
			router.push(`/post-session/${init.sessionId}`)
		},
		[init.sessionId, router]
	)

	const sessionDurationMs = init.totalCount * 18_000

	return (
		<FocusShell
			sessionId={init.sessionId}
			sessionType="drill"
			sessionDurationMs={sessionDurationMs}
			perQuestionTargetMs={18_000}
			targetQuestionCount={init.totalCount}
			paceTrackVisible
			initialItem={init.firstItem}
			strictMode={false}
			onSubmitAttempt={onSubmitAttempt}
			onEndSession={onEndSession}
		/>
	)
}

export type { MistakesRunInit }
export { MistakesRunContent }
