// /admin/review — admin queue surface (Phase 4 sub-phase b §2.1 commit 0).
//
// Server component, NOT async per rules/rsc-data-fetching-patterns.md
// (Pattern 2 — per-page Suspense; no ViewTransition layout above this
// route). Initiates the data promise via loadAdminQueueData() and passes
// the promise to <AdminReviewContent> inside a <React.Suspense> boundary.
//
// Admin gate is enforced one level up at (admin)/layout.tsx via
// <AdminGateClient gatePromise={requireAdminEmail()...}> — NO per-page
// requireAdminEmail() call here (matches /admin/ingest/page.tsx
// convention). The layout's gate-promise is also wrapped in its own
// <Suspense> so this page only renders inside an allowed gate.
//
// Status tab routing: the queue cohort (candidate / live / rejected) is
// driven by the `?status=` search param. The page parses + validates it
// (defaulting to "candidate" on missing/invalid input) before chaining
// the loader call. Search params are themselves a Promise per Next 15+
// conventions (rules/rsc-data-fetching-patterns.md), so the queue data
// promise is composed via params.then(...).

import * as React from "react"
import { AdminReviewContent } from "@/app/(admin)/admin/review/content"
import {
	loadAdminQueueData,
	type QueueStatusFilter
} from "@/server/admin/queue-data"

interface AdminReviewPageProps {
	searchParams: Promise<{ status?: string | string[] }>
}

function coerceStatusFilter(raw: string | string[] | undefined): QueueStatusFilter {
	const value = Array.isArray(raw) ? raw[0] : raw
	if (value === "candidate" || value === "live" || value === "rejected") return value
	return "candidate"
}

function AdminReviewPage(props: AdminReviewPageProps) {
	const dataPromise = props.searchParams.then(function withStatus(params) {
		const statusFilter = coerceStatusFilter(params.status)
		return loadAdminQueueData(statusFilter)
	})
	return (
		<React.Suspense fallback={<AdminReviewSkeleton />}>
			<AdminReviewContent dataPromise={dataPromise} />
		</React.Suspense>
	)
}

function AdminReviewSkeleton() {
	return (
		<div className="min-h-screen bg-bg text-text-1">
			<main className="mx-auto max-w-[1200px] px-7 pt-10 pb-12">
				<p className="text-sm text-text-3">Loading queue…</p>
			</main>
		</div>
	)
}

export default AdminReviewPage
