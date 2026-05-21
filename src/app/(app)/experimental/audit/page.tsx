import * as React from "react"
import { loadNavChrome } from "@/server/nav/chrome"
import { loadExperimentalUserId } from "@/server/experimental/auth"
import { loadExperimentalAuditPageData } from "@/server/experimental/review-data"
import { ExperimentalPageFrame } from "@/components/experimental/experimental-page-frame"
import { ExperimentalReviewList } from "@/components/experimental/experimental-review-list"
import type { NavChrome } from "@/server/nav/chrome"

function Page() {
	const userIdPromise = loadExperimentalUserId()
	const chromePromise = userIdPromise.then(function load(userId) {
		return loadNavChrome(userId)
	})
	const dataPromise = userIdPromise.then(function load(userId) {
		return loadExperimentalAuditPageData(userId)
	})
	return (
		<React.Suspense fallback={<ExperimentalAuditSkeleton />}>
			<AuditPageBody chromePromise={chromePromise} dataPromise={dataPromise} />
		</React.Suspense>
	)
}

async function AuditPageBody(props: {
	chromePromise: Promise<NavChrome>
	dataPromise: Promise<Awaited<ReturnType<typeof loadExperimentalAuditPageData>>>
}) {
	const data = await props.dataPromise
	return (
		<ExperimentalPageFrame
			chromePromise={props.chromePromise}
			eyebrow="Audit queue"
			title="Experimental Audit"
			description="Completed Experimental sessions ready for question-quality auditing. Open a session to record structured audit feedback or propose edits for generated questions."
		>
			<ExperimentalReviewList
				sessions={data.sessions}
				detailBasePath="/experimental/audit"
				emptyTitle="No Experimental sessions ready to audit"
				emptyBody="Completed Experimental sessions will appear here after you finish a practice test or drill. Use the Review tab for read-only history once sessions start landing."
				rowTitle="Experimental session audit"
			/>
		</ExperimentalPageFrame>
	)
}

function ExperimentalAuditSkeleton() {
	return (
		<div className="min-h-screen bg-bg text-text-1">
			<main className="mx-auto max-w-[1100px] px-7 pt-12">
				<p className="text-sm text-text-3">Loading…</p>
			</main>
		</div>
	)
}

export default Page
