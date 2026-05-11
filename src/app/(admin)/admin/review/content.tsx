"use client"

// <AdminReviewContent> — client wrapper that consumes the AdminQueueData
// promise from the /admin/review page mount and renders the queue UI.
//
// "use client" because of React.use(dataPromise). The page mount owns the
// <React.Suspense> boundary; this component suspends inside that boundary
// while the data resolves, then renders <QueueStatusTabs> + <QueueList>.
//
// The page header copy varies by the active cohort (candidate / live /
// rejected) so admins can tell at a glance which slice of the bank they
// are looking at. The cohort itself is selected via the <QueueStatusTabs>
// links, which navigate to /admin/review?status=… and trigger a
// server-side reload via the page's searchParams promise.
//
// No nav chrome — /admin routes don't render <TopNav> (admin convention,
// see /admin/ingest/page.tsx). The (admin)/layout.tsx gate-wraps the entire
// group via <AdminGateClient>, so this content only renders when the admin
// gate has resolved allowed.

import * as React from "react"
import { BulkRevalidateButton } from "@/components/admin-review/bulk-revalidate-button"
import { QueueList } from "@/components/admin-review/queue-list"
import { QueueStatusTabs } from "@/components/admin-review/queue-status-tabs"
import type { AdminQueueData, QueueStatusFilter } from "@/server/admin/queue-data"

interface AdminReviewContentProps {
	dataPromise: Promise<AdminQueueData>
}

interface CohortCopy {
	readonly title: string
	readonly description: string
	readonly listHeading: string
	readonly emptyMessage: string
}

const COHORT_COPY: Readonly<Record<QueueStatusFilter, CohortCopy>> = {
	candidate: {
		title: "Candidate review queue",
		description:
			"Validator-flagged candidate items awaiting admin disposition. Sort by flag count to triage the most-flagged first; filter to a pressure cell or sub-type to drive a focused cohort review.",
		listHeading: "Candidate queue",
		emptyMessage: "No candidates match the current filters."
	},
	live: {
		title: "Live items",
		description:
			"Items currently live in the production bank — both seeded items and candidates promoted via admin approval. Use sub-type and difficulty filters to inspect a slice of what learners are actually seeing.",
		listHeading: "Live items",
		emptyMessage: "No live items match the current filters."
	},
	rejected: {
		title: "Rejected items",
		description:
			"Items an admin marked as bad. Rejection is terminal: these never re-enter the candidate queue and never go live. Open an item to read its rejection reason in the audit history.",
		listHeading: "Rejected items",
		emptyMessage: "No rejected items match the current filters."
	}
}

function AdminReviewContent({ dataPromise }: AdminReviewContentProps) {
	const data = React.use(dataPromise)
	const copy = COHORT_COPY[data.statusFilter]
	const showBulkRevalidate = data.statusFilter === "candidate" && data.staleCount > 0
	return (
		<div className="min-h-screen bg-bg text-text-1">
			<main className="mx-auto max-w-[1200px] px-7 pt-10 pb-12">
				<header className="mb-6 flex flex-col gap-1 border-border-soft border-b pb-3">
					<p className="text-[11px] text-text-3 uppercase tracking-[0.06em]">Admin</p>
					<h2 className="font-medium font-serif text-[22px] text-text-1 leading-[1.15] tracking-[-0.015em]">
						{copy.title}
					</h2>
					<p className="max-w-[72ch] text-sm text-text-2">{copy.description}</p>
				</header>
				<div className="mb-4">
					<QueueStatusTabs active={data.statusFilter} counts={data.statusCounts} />
				</div>
				{showBulkRevalidate ? (
					<div className="mb-4">
						<BulkRevalidateButton staleCount={data.staleCount} />
					</div>
				) : null}
				<QueueList
					key={data.statusFilter}
					data={data}
					listHeading={copy.listHeading}
					emptyMessage={copy.emptyMessage}
				/>
			</main>
		</div>
	)
}

export type { AdminReviewContentProps }
export { AdminReviewContent }
