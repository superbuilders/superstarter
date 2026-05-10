"use client"

// /post-session/[sessionId] content — consumes the loadSession promise
// from page.tsx and renders <PostSessionShell>.
//
// Plan: docs/plans/phase5-post-session-review.md §3 + §4 + §12 commit 2;
// post-Round-2-§5.4 the per-sub-type accuracy + latency fields collapsed
// into a single `performance: PerSubTypePerformance[]` field consumed by
// the shell's `<PerformanceSummary>` slot.

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
			performance={info.performance}
			wrongItems={info.wrongItems}
			surfacedStrategies={info.surfacedStrategies}
			endSessionTier={info.endSessionTier}
		/>
	)
}

export { PostSessionContent }
