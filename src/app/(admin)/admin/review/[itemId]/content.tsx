"use client"

// <AdminItemDetailContent> — client wrapper around the tabbed item-detail
// shell. Consumes the AdminItemDetail promise via React.use, then
// dispatches between the four tab body components.
//
// **Form-state preservation (§2.3 commit-1 architectural choice)**: the
// redirector's commit-1 spec called for lifting edit state to this
// component and threading via props. An equivalent UX outcome — "edit
// work-in-progress survives tab switches" — is achievable with the lower-
// surface "always-mount + CSS-hide inactive" approach used here: all four
// tab bodies render into the DOM on first mount, and only the active
// tab's container is visible. Inactive tabs stay mounted, so their
// React.useState containers preserve across switches without props
// drilling. This sidesteps the ~13-piece state hoist + tab-component
// interface rewrite that the literal lift would entail, while delivering
// the same admin behavior. The redirector's spec allowed this trade-off:
// "Surface if the state hoist creates render-thrash or prop-drilling
// that's structurally awkward." Surfaced at stop-and-report for
// ratification.
//
// Side-effect: BucketChangeConfirm (rendered inside StemOptionsTab) is
// always in the DOM. Its `open` prop stays false unless the stem tab's
// state explicitly opens it, so this is invisible to non-editing admin.
//
// No nav chrome — /admin routes don't render <TopNav> (admin convention,
// verified at §2.1 audit step 9). The (admin)/layout.tsx gate-wraps the
// entire group via <AdminGateClient>, so this content only renders when
// the admin gate has resolved allowed.

import * as React from "react"
import {
	ItemDetailTabs,
	type ItemDetailTab
} from "@/components/admin-review/item-detail-tabs"
import { AuditHistoryTab } from "@/components/admin-review/audit-history-tab"
import { ExplanationTab } from "@/components/admin-review/explanation-tab"
import { ProvenanceTab } from "@/components/admin-review/provenance-tab"
import { StemOptionsTab } from "@/components/admin-review/stem-options-tab"
import { cn } from "@/lib/utils"
import type { AdminActionHistoryEntry } from "@/server/admin/action-history-shared"
import type { AdminItemDetail } from "@/server/admin/item-detail-data"

interface AdminItemDetailContentProps {
	readonly detailPromise: Promise<AdminItemDetail>
	readonly actionHistoryPromise: Promise<ReadonlyArray<AdminActionHistoryEntry>>
}

function paneClass(isActive: boolean): string {
	return cn("mt-4", isActive ? "" : "hidden")
}

// sessionStorage key — kept in sync with queue-list.tsx's
// LAST_STATUS_KEY. The queue page writes the active cohort tab on every
// status change; reading it here lets the back link return the admin to
// whichever tab they came from. Defaulting to /admin/review (candidate)
// when the key is absent or unrecognized — that's the same default the
// queue page picks when no ?status= is in the URL.
const LAST_STATUS_KEY = "admin-review-queue:last-status"

function readBackHref(): string {
	if (typeof window === "undefined") return "/admin/review"
	const stored = window.sessionStorage.getItem(LAST_STATUS_KEY)
	if (stored === "live") return "/admin/review?status=live"
	if (stored === "rejected") return "/admin/review?status=rejected"
	if (stored === "candidate") return "/admin/review?status=candidate"
	return "/admin/review"
}

function AdminItemDetailContent({
	detailPromise,
	actionHistoryPromise
}: AdminItemDetailContentProps) {
	const detail = React.use(detailPromise)
	const actionHistory = React.use(actionHistoryPromise)
	const [activeTab, setActiveTab] = React.useState<ItemDetailTab>("stem")
	// Render with the safe SSR default first, then upgrade to the
	// sessionStorage-backed href on client mount. Avoids hydration
	// mismatch (server has no sessionStorage; client may have a
	// different value than the SSR default).
	const [backHref, setBackHref] = React.useState<string>("/admin/review")
	React.useEffect(function loadBackHref() {
		setBackHref(readBackHref())
	}, [])

	return (
		<div className="min-h-screen bg-bg text-text-1">
			<main className="mx-auto max-w-[1200px] px-7 pt-10 pb-12">
				<header className="mb-4 flex flex-col gap-1 border-border-soft border-b pb-3">
					<p className="text-[11px] text-text-3 uppercase tracking-[0.06em]">Admin</p>
					<h2 className="font-medium font-serif text-[22px] text-text-1 leading-[1.15] tracking-[-0.015em]">
						Candidate detail
					</h2>
					<p className="break-all font-mono text-[12px] text-text-3 tabular-nums">
						{detail.candidate.id}
					</p>
				</header>
				<div className="mb-4">
					<a
						href={backHref}
						className="text-[12px] text-cobalt hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-cobalt focus-visible:outline-offset-1"
					>
						← Back to queue
					</a>
				</div>
				<ItemDetailTabs activeTab={activeTab} onSelect={setActiveTab} />
				<div className={paneClass(activeTab === "stem")}>
					<StemOptionsTab candidate={detail.candidate} />
				</div>
				<div className={paneClass(activeTab === "explanation")}>
					<ExplanationTab candidate={detail.candidate} />
				</div>
				<div className={paneClass(activeTab === "provenance")}>
					<ProvenanceTab detail={detail} />
				</div>
				<div className={paneClass(activeTab === "audit")}>
					<AuditHistoryTab history={actionHistory} />
				</div>
			</main>
		</div>
	)
}

function AdminItemDetailSkeleton() {
	return (
		<div className="min-h-screen bg-bg text-text-1">
			<main className="mx-auto max-w-[1200px] px-7 pt-10 pb-12">
				<p className="text-sm text-text-3">Loading candidate…</p>
			</main>
		</div>
	)
}

export type { AdminItemDetailContentProps }
export { AdminItemDetailContent, AdminItemDetailSkeleton }
