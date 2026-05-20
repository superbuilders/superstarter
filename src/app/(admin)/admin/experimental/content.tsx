"use client"

import * as React from "react"
import Link from "next/link"
import { ExperimentalAdminQueueList } from "@/components/experimental/experimental-admin-queue-list"
import type { ExperimentalAdminQueueData } from "@/server/experimental/admin-data"

interface AdminExperimentalQueueContentProps {
	dataPromise: Promise<ExperimentalAdminQueueData>
}

function AdminExperimentalQueueContent({ dataPromise }: AdminExperimentalQueueContentProps) {
	const data = React.use(dataPromise)
	return (
		<div className="min-h-screen bg-bg text-text-1">
			<main className="mx-auto max-w-[1200px] px-7 pt-10 pb-12">
				<header className="mb-6 flex flex-col gap-1 border-border-soft border-b pb-3">
					<p className="text-[11px] text-text-3 uppercase tracking-[0.06em]">Admin</p>
					<h2 className="font-medium font-serif text-[22px] text-text-1 leading-[1.15] tracking-[-0.015em]">
						Experimental moderation
					</h2>
					<p className="max-w-[72ch] text-sm text-text-2">
						Separate moderation surface for Experimental items, audits, and edit proposals. Canonical candidate review remains unchanged at /admin/review.
					</p>
				</header>
				<div className="mb-4">
					<Link href="/admin/review" className="text-[12px] text-cobalt hover:underline">
						← Back to canonical candidate review
					</Link>
				</div>
				<ExperimentalAdminQueueList data={data} />
			</main>
		</div>
	)
}

function AdminExperimentalQueueSkeleton() {
	return (
		<div className="min-h-screen bg-bg text-text-1">
			<main className="mx-auto max-w-[1200px] px-7 pt-10 pb-12">
				<p className="text-sm text-text-3">Loading experimental moderation queue…</p>
			</main>
		</div>
	)
}

export type { AdminExperimentalQueueContentProps }
export { AdminExperimentalQueueContent, AdminExperimentalQueueSkeleton }
