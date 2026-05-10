"use client"

// <AdminItemDetailContent> — client wrapper around the tabbed item-detail
// shell. Consumes the AdminItemDetail promise via React.use, then dispatches
// to one of four tab body components based on the active tab key.
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
import type { AdminItemDetail } from "@/server/admin/item-detail-data"

interface AdminItemDetailContentProps {
	readonly detailPromise: Promise<AdminItemDetail>
}

function AdminItemDetailContent({ detailPromise }: AdminItemDetailContentProps) {
	const detail = React.use(detailPromise)
	const [activeTab, setActiveTab] = React.useState<ItemDetailTab>("stem")

	let panel: React.ReactNode
	if (activeTab === "stem") {
		panel = <StemOptionsTab candidate={detail.candidate} />
	} else if (activeTab === "explanation") {
		panel = <ExplanationTab candidate={detail.candidate} />
	} else if (activeTab === "provenance") {
		panel = <ProvenanceTab detail={detail} />
	} else {
		panel = <AuditHistoryTab />
	}

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
						href="/admin/review"
						className="text-[12px] text-cobalt hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-cobalt focus-visible:outline-offset-1"
					>
						← Back to queue
					</a>
				</div>
				<ItemDetailTabs activeTab={activeTab} onSelect={setActiveTab} />
				<div className="mt-4">{panel}</div>
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
