import * as React from "react"
import { loadNavChrome } from "@/server/nav/chrome"
import { loadExperimentalUserId } from "@/server/experimental/auth"
import { loadExperimentalReviewPageData } from "@/server/experimental/review-data"
import { ExperimentalPageFrame } from "@/components/experimental/experimental-page-frame"
import { ExperimentalReviewHistory } from "@/components/experimental/experimental-review-history"
import type { NavChrome } from "@/server/nav/chrome"

function Page() {
	const userIdPromise = loadExperimentalUserId()
	const chromePromise = userIdPromise.then(function load(userId) {
		return loadNavChrome(userId)
	})
	const dataPromise = userIdPromise.then(function load(userId) {
		return loadExperimentalReviewPageData(userId)
	})
	return (
		<React.Suspense fallback={<ExperimentalReviewSkeleton />}>
			<ReviewPageBody chromePromise={chromePromise} dataPromise={dataPromise} />
		</React.Suspense>
	)
}

async function ReviewPageBody(props: {
	chromePromise: Promise<NavChrome>
	dataPromise: Promise<Awaited<ReturnType<typeof loadExperimentalReviewPageData>>>
}) {
	const data = await props.dataPromise
	return (
		<ExperimentalPageFrame
			chromePromise={props.chromePromise}
			eyebrow="Session history"
			title="Experimental Review"
			description="Completed Experimental practice tests and drills, organized as a read-only history surface. Open any session to revisit answers, outcomes, and explanations without entering the audit workflow."
		>
			<ExperimentalReviewHistory sessions={data.sessions} />
		</ExperimentalPageFrame>
	)
}

function ExperimentalReviewSkeleton() {
	return (
		<div className="min-h-screen bg-bg text-text-1">
			<main className="mx-auto max-w-[1100px] px-7 pt-12">
				<p className="text-sm text-text-3">Loading…</p>
			</main>
		</div>
	)
}

export default Page
