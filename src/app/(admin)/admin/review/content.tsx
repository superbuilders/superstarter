"use client"

// <AdminReviewContent> — client wrapper that consumes the AdminQueueData
// promise from the /admin/review page mount and renders the queue UI.
//
// "use client" because of React.use(dataPromise). The page mount owns the
// <React.Suspense> boundary; this component suspends inside that boundary
// while the data resolves, then renders <QueueList>.
//
// No nav chrome — /admin routes don't render <TopNav> (admin convention,
// see /admin/ingest/page.tsx). The (admin)/layout.tsx gate-wraps the entire
// group via <AdminGateClient>, so this content only renders when the admin
// gate has resolved allowed.

import * as React from "react"
import type { AdminQueueData } from "@/server/admin/queue-data"
import { QueueList } from "@/components/admin-review/queue-list"

interface AdminReviewContentProps {
	dataPromise: Promise<AdminQueueData>
}

function AdminReviewContent({ dataPromise }: AdminReviewContentProps) {
	const data = React.use(dataPromise)
	return (
		<div className="min-h-screen bg-bg text-text-1">
			<main className="mx-auto max-w-[1200px] px-7 pt-10 pb-12">
				<header className="mb-6 flex flex-col gap-1 border-border-soft border-b pb-3">
					<p className="text-[11px] text-text-3 uppercase tracking-[0.06em]">Admin</p>
					<h2 className="font-medium font-serif text-[22px] text-text-1 leading-[1.15] tracking-[-0.015em]">
						Candidate review queue
					</h2>
					<p className="max-w-[72ch] text-sm text-text-2">
						Validator-flagged candidate items awaiting admin disposition. Sort by flag
						count to triage the most-flagged first; filter to a pressure cell or
						sub-type to drive a focused cohort review.
					</p>
				</header>
				<QueueList data={data} />
			</main>
		</div>
	)
}

export type { AdminReviewContentProps }
export { AdminReviewContent }
