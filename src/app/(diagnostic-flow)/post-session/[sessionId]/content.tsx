"use client"

// /post-session/[sessionId] content — consumes the loadSession promise
// from page.tsx and renders <PostSessionShell>.
//
// Plan: docs/plans/phase5-post-session-review.md §3 + §4 + §12 commit 2.
//
// Forwards `sessionType`, `pacingMinutes`, and the five new review-data
// fields (accuracy, latency, wrongItems, triageScore, surfacedStrategies)
// to the shell. The shell currently ignores the new fields — slots 2-6
// stay placeholder; this commit only adds the data flow. Visible
// behavior is unchanged from commit 1.

import * as React from "react"
import type { SessionInfo } from "@/app/(diagnostic-flow)/post-session/[sessionId]/page"
import { PostSessionShell } from "@/components/post-session/post-session-shell"

interface PostSessionContentProps {
	sessionPromise: Promise<SessionInfo>
}

function PostSessionContent(props: PostSessionContentProps) {
	const info = React.use(props.sessionPromise)
	return (
		<PostSessionShell
			sessionType={info.sessionType}
			pacingMinutes={info.pacingMinutes}
			accuracy={info.accuracy}
			latency={info.latency}
			wrongItems={info.wrongItems}
			triageScore={info.triageScore}
			surfacedStrategies={info.surfacedStrategies}
		/>
	)
}

export { PostSessionContent }
