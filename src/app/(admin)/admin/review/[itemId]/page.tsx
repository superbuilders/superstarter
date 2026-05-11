// /admin/review/[itemId] — admin item-detail surface (Phase 4 sub-phase b
// §2.2 commit 0).
//
// Server component, NOT async per rules/rsc-data-fetching-patterns.md
// (Pattern 2 — per-page Suspense; no ViewTransition layout above this
// route). Resolves the itemId from the params promise, chains into
// loadAdminItemDetail, passes the resulting promise to
// <AdminItemDetailContent> inside a <React.Suspense> boundary.
//
// Admin gate enforced one level up at (admin)/layout.tsx via
// <AdminGateClient gatePromise={requireAdminEmail()...}>. NO per-page
// requireAdminEmail() call (verified against /admin/ingest/page.tsx and
// /admin/review/page.tsx — same admin-convention layout-only gating).
//
// Drill's dynamic-route pattern (src/app/(app)/drill/[subTypeId]/run/
// page.tsx) was the anchor: params is Promise<...>, Page is NOT async,
// data fetch chains via .then. The notable difference: drill needs to
// branch on an empty-bank state, so its async gate component awaits and
// switches; item-detail has no such branch (errors throw from the
// loader; <Suspense> catches the promise) so the simpler "drill-style"
// shape collapses to the "/(app)/review/page.tsx" shape (sync Page →
// dataPromise → client React.use).

import * as React from "react"
import {
	AdminItemDetailContent,
	AdminItemDetailSkeleton
} from "@/app/(admin)/admin/review/[itemId]/content"
import { loadAdminActionHistory } from "@/server/admin/action-history-data"
import { loadAdminItemDetail } from "@/server/admin/item-detail-data"

interface PageProps {
	params: Promise<{ itemId: string }>
}

function AdminItemDetailPage(props: PageProps) {
	// Two parallel loads: the item detail (parent + siblings + provenance)
	// and the audit history (item_admin_actions ledger). Composing each as
	// its own promise lets <Suspense> resolve them concurrently inside the
	// client content component, instead of sequentially awaiting each.
	const detailPromise = props.params.then(function loadDetail(p) {
		return loadAdminItemDetail(p.itemId)
	})
	const actionHistoryPromise = props.params.then(function loadHistory(p) {
		return loadAdminActionHistory(p.itemId)
	})
	return (
		<React.Suspense fallback={<AdminItemDetailSkeleton />}>
			<AdminItemDetailContent
				detailPromise={detailPromise}
				actionHistoryPromise={actionHistoryPromise}
			/>
		</React.Suspense>
	)
}

export default AdminItemDetailPage
