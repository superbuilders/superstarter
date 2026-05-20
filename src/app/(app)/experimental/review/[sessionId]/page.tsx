import * as React from "react"
import { loadNavChrome } from "@/server/nav/chrome"
import { loadExperimentalUserId } from "@/server/experimental/auth"
import { loadExperimentalReviewSessionDetail } from "@/server/experimental/review-data"
import { ExperimentalPageFrame } from "@/components/experimental/experimental-page-frame"
import { ExperimentalReviewSessionDetailView } from "@/components/experimental/experimental-review-session-detail"
import type { NavChrome } from "@/server/nav/chrome"

interface PageProps {
	params: Promise<{ sessionId: string }>
}

function Page(props: PageProps) {
	const userIdPromise = loadExperimentalUserId()
	const chromePromise = userIdPromise.then(function load(userId) {
		return loadNavChrome(userId)
	})
	const detailPromise = Promise.all([userIdPromise, props.params]).then(function load([userId, params]) {
		return loadExperimentalReviewSessionDetail(userId, params.sessionId)
	})
	return (
		<React.Suspense fallback={<ExperimentalReviewDetailSkeleton />}>
			<ReviewDetailPageBody chromePromise={chromePromise} detailPromise={detailPromise} />
		</React.Suspense>
	)
}

async function ReviewDetailPageBody(props: {
	chromePromise: Promise<NavChrome>
	detailPromise: Promise<Awaited<ReturnType<typeof loadExperimentalReviewSessionDetail>>>
}) {
	const detail = await props.detailPromise
	return (
		<ExperimentalPageFrame
			chromePromise={props.chromePromise}
			eyebrow="Optional audit detail"
			title="Experimental Review Detail"
			description="This route is the session-detail half of the MVP Experimental Review flow. It shows completed experimental session history and optional item-level audit submission only: no edit proposals or admin actions yet."
		>
			<ExperimentalReviewSessionDetailView detail={detail} />
		</ExperimentalPageFrame>
	)
}

function ExperimentalReviewDetailSkeleton() {
	return (
		<div className="min-h-screen bg-bg text-text-1">
			<main className="mx-auto max-w-[1100px] px-7 pt-12">
				<p className="text-sm text-text-3">Loading…</p>
			</main>
		</div>
	)
}

export default Page
