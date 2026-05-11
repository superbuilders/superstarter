// /stats — aggregate Pacing matrix + topic-proficiency radars across
// every completed practice test + drill the user has taken. Mirrors the
// per-session post-session surface but rolls multiple sessions into one
// view, with a chip-based test picker at the top.
//
// Server component, NOT async per rules/rsc-data-fetching-patterns.md
// (Pattern 2 — per-page Suspense; no ViewTransition layout above this
// route). Initiates two promises from the resolved userId — chrome for
// <PageNav> and the bulk attempts payload for <StatsView> — and hands
// each to its own client component via React.use().

import { redirect } from "next/navigation"
import * as React from "react"
import { auth } from "@/auth"
import { PageNav } from "@/components/nav/page-nav"
import { StatsView } from "@/components/stats/stats-view"
import { loadNavChrome } from "@/server/nav/chrome"
import { loadStatsData } from "@/server/stats/data"

async function loadUserId(): Promise<string> {
	const session = await auth()
	if (!session?.user?.id) {
		redirect("/login")
	}
	return session.user.id
}

function StatsPage() {
	const userIdPromise = loadUserId()
	const dataPromise = userIdPromise.then(function load(userId) {
		return loadStatsData(userId)
	})
	const chromePromise = userIdPromise.then(function load(userId) {
		return loadNavChrome(userId)
	})
	return (
		<div className="min-h-screen bg-bg text-text-1">
			<React.Suspense fallback={null}>
				<PageNav chromePromise={chromePromise} />
			</React.Suspense>
			<React.Suspense fallback={<StatsSkeleton />}>
				<StatsView dataPromise={dataPromise} />
			</React.Suspense>
		</div>
	)
}

function StatsSkeleton() {
	return (
		<main className="mx-auto max-w-[1100px] px-7 pt-12">
			<p className="text-sm text-text-3">Loading…</p>
		</main>
	)
}

export default StatsPage
