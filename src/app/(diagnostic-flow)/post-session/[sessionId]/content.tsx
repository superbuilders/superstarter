"use client"

// /post-session/[sessionId] content — consumes the loadSession promise
// from page.tsx and renders <PostSessionShell>.
//
// Plan: docs/plans/phase5-post-session-review.md §3 + §12 commit 1.
//
// Forwards `sessionType` and `pacingMinutes` to the shell. The shell's
// session-type-aware dispatch decides what renders inside its locked
// nine-slot ordering.

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
		/>
	)
}

export { PostSessionContent }
