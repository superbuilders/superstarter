// /review — past-sessions surface. Lists every completed practice
// test and drill the user has taken, ordered newest-first. Each row
// links to /post-session/<id> so the user can revisit the
// per-session review surface.
//
// Server component, NOT async per rules/rsc-data-fetching-patterns.md
// (Pattern 2 — per-page Suspense; no ViewTransition layout above this
// route). Initiates the data promise via loadUserId() chained into
// getReviewPageData(userId), and passes the promise to the client
// <ReviewView> wrapper inside a <React.Suspense> boundary.
//
// The (app)/layout.tsx gate already enforces auth + diagnostic-
// completed before this page renders; the auth() here is for the
// userId only and the redirect-on-null is defensive belt-and-
// suspenders, mirroring the dashboard page.

import { redirect } from "next/navigation"
import * as React from "react"
import { auth } from "@/auth"
import { ReviewView } from "@/components/review/review-view"
import { getReviewPageData } from "@/server/review/data"

async function loadUserId(): Promise<string> {
	const session = await auth()
	if (!session?.user?.id) {
		redirect("/login")
	}
	return session.user.id
}

function ReviewPage() {
	const dataPromise = loadUserId().then(function load(userId) {
		return getReviewPageData(userId)
	})
	return (
		<React.Suspense fallback={<ReviewSkeleton />}>
			<ReviewView dataPromise={dataPromise} />
		</React.Suspense>
	)
}

function ReviewSkeleton() {
	return (
		<div className="min-h-screen bg-bg text-text-1">
			<main className="mx-auto max-w-[1100px] px-7 pt-12">
				<p className="text-sm text-text-3">Loading…</p>
			</main>
		</div>
	)
}

export default ReviewPage
