import * as React from "react"
import { loadNavChrome } from "@/server/nav/chrome"
import { loadExperimentalUserId } from "@/server/experimental/auth"
import { loadExperimentalAuditSessionDetail } from "@/server/experimental/review-data"
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
		return loadExperimentalAuditSessionDetail(userId, params.sessionId)
	})
	return (
		<React.Suspense fallback={<ExperimentalAuditDetailSkeleton />}>
			<AuditDetailPageBody chromePromise={chromePromise} detailPromise={detailPromise} />
		</React.Suspense>
	)
}

async function AuditDetailPageBody(props: {
	chromePromise: Promise<NavChrome>
	detailPromise: Promise<Awaited<ReturnType<typeof loadExperimentalAuditSessionDetail>>>
}) {
	const detail = await props.detailPromise
	return (
		<ExperimentalPageFrame
			chromePromise={props.chromePromise}
			eyebrow="Session audit detail"
			title="Experimental Audit Detail"
			description="Audit a completed Experimental session item by item. Structured feedback and edit proposals recorded here stay isolated from canonical practice and mastery data."
		>
			<ExperimentalReviewSessionDetailView detail={detail} mode="audit" />
		</ExperimentalPageFrame>
	)
}

function ExperimentalAuditDetailSkeleton() {
	return (
		<div className="min-h-screen bg-bg text-text-1">
			<main className="mx-auto max-w-[1100px] px-7 pt-12">
				<p className="text-sm text-text-3">Loading…</p>
			</main>
		</div>
	)
}

export default Page
