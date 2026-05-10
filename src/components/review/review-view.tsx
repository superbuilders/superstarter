"use client"

// <ReviewView> — client wrapper that consumes the data promise from
// the /review page mount and renders the past-sessions surface.
// Mirrors the dashboard's <Dashboard> shape (TopNav above a
// max-w-[1100px] main, two side-by-side cards on md+).
//
// "use client" because of React.use(dataPromise). The page mount owns
// the <React.Suspense> boundary; this component suspends inside that
// boundary while the data resolves, then renders the assembled
// ReviewPageData payload.
//
// `nowMs` is resolved once per render at the view root and threaded
// down to every <ReviewRow>'s relative-time formatter so all rows in
// a single render agree on a single clock.

import * as React from "react"
import { TopNav } from "@/components/dashboard/top-nav"
import { ReviewCard } from "@/components/review/review-card"
import type { ReviewPageData } from "@/server/review/data"

interface ReviewViewProps {
	dataPromise: Promise<ReviewPageData>
}

function pluralizeSessions(count: number): string {
	const suffix = count === 1 ? "" : "s"
	return `${count} session${suffix}`
}

function ReviewView({ dataPromise }: ReviewViewProps) {
	const data = React.use(dataPromise)
	const nowMs = Date.now()
	const practiceTestsMeta = pluralizeSessions(data.practiceTests.length)
	const drillsMeta = pluralizeSessions(data.drills.length)
	return (
		<div className="min-h-screen bg-bg text-text-1">
			<TopNav streakDays={data.user.streakDays} initials={data.user.initials} />
			<main className="mx-auto max-w-[1100px] px-7 pb-6">
				<h1 className="sr-only">Review</h1>
				<header className="mb-3 flex flex-col gap-1 border-border-soft border-b pb-3">
					<p className="text-[11px] text-text-3 uppercase tracking-[0.06em]">History</p>
					<h2 className="font-medium font-serif text-[22px] text-text-1 leading-[1.15] tracking-[-0.015em]">
						Past sessions
					</h2>
					<p className="max-w-[60ch] text-sm text-text-2">
						Every drill and practice test you've taken. Open one to revisit its post-session review.
					</p>
				</header>
				<div className="grid grid-cols-1 gap-3 md:grid-cols-2">
					<ReviewCard
						title="Practice tests"
						meta={practiceTestsMeta}
						sessions={data.practiceTests}
						nowMs={nowMs}
						emptyText="No practice tests yet. Start one from the dashboard."
					/>
					<ReviewCard
						title="Drills"
						meta={drillsMeta}
						sessions={data.drills}
						nowMs={nowMs}
						emptyText="No drills yet. Pick a sub-type from the dashboard's dojo cards."
					/>
				</div>
			</main>
		</div>
	)
}

export type { ReviewViewProps }
export { ReviewView }
