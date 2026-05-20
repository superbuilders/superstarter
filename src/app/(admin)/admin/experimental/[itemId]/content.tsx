"use client"

import * as React from "react"
import { ExperimentalAdminItemDetailView } from "@/components/experimental/experimental-admin-item-detail"
import type { ExperimentalAdminItemDetail } from "@/server/experimental/admin-data"

interface AdminExperimentalItemDetailContentProps {
	detailPromise: Promise<ExperimentalAdminItemDetail | null>
}

function AdminExperimentalItemDetailContent({
	detailPromise
}: AdminExperimentalItemDetailContentProps) {
	const detail = React.use(detailPromise)
	return <ExperimentalAdminItemDetailView detail={detail} />
}

function AdminExperimentalItemDetailSkeleton() {
	return (
		<div className="min-h-screen bg-bg text-text-1">
			<main className="mx-auto max-w-[1200px] px-7 pt-10 pb-12">
				<p className="text-sm text-text-3">Loading experimental moderation detail…</p>
			</main>
		</div>
	)
}

export type { AdminExperimentalItemDetailContentProps }
export { AdminExperimentalItemDetailContent, AdminExperimentalItemDetailSkeleton }
