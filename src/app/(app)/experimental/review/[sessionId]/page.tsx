import * as React from "react"
import { redirect } from "next/navigation"
import { loadNavChrome } from "@/server/nav/chrome"
import { loadExperimentalUserId } from "@/server/experimental/auth"
import { loadExperimentalPostSessionInfo } from "@/server/experimental/review-shell-data"
import { PageNav } from "@/components/nav/page-nav"
import { PostSessionShell } from "@/components/post-session/post-session-shell"

interface PageProps {
	params: Promise<{ sessionId: string }>
}

function Page(props: PageProps) {
	const userIdPromise = loadExperimentalUserId()
	const chromePromise = userIdPromise.then(function load(userId) {
		return loadNavChrome(userId)
	})
	const sessionPromise = Promise.all([userIdPromise, props.params]).then(function load([
		userId,
		params
	]) {
		return loadExperimentalPostSessionInfo(userId, params.sessionId)
	})
	return (
		<div className="min-h-screen bg-bg text-text-1">
			<React.Suspense fallback={null}>
				<PageNav chromePromise={chromePromise} />
			</React.Suspense>
			<React.Suspense fallback={<ExperimentalReviewDetailSkeleton />}>
				<ReviewDetailPageBody sessionPromise={sessionPromise} />
			</React.Suspense>
		</div>
	)
}

async function ReviewDetailPageBody(props: {
	sessionPromise: Promise<Awaited<ReturnType<typeof loadExperimentalPostSessionInfo>>>
}) {
	const session = await props.sessionPromise
	if (session === null) {
		redirect("/experimental/review")
	}
	return (
		<PostSessionShell
			sessionId={session.sessionId}
			sessionType={session.sessionType}
			pacingMinutes={session.pacingMinutes}
			performance={session.performance}
			wrongItems={session.wrongItems}
			surfacedStrategies={session.surfacedStrategies}
			endSessionTier={session.endSessionTier}
		/>
	)
}

function ExperimentalReviewDetailSkeleton() {
	return (
		<main className="mx-auto flex min-h-dvh max-w-xl items-center justify-center px-6">
			<p className="text-muted-foreground text-sm">Loading session…</p>
		</main>
	)
}

export default Page
