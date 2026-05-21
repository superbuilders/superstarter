// (app)/page.tsx — Dashboard home. Dashboard PRD §11 +
// `docs/plans/dashboard.md` §5 commit 10.
//
// Server component, NOT async per
// rules/rsc-data-fetching-patterns.md. Initiates the dashboard data
// promise via loadUserId() chained into getDashboardData(userId), and
// passes the promise through to the <Dashboard> client wrapper inside
// a <React.Suspense> boundary. This is Pattern 2 from the rules
// document (per-page Suspense) — there's no ViewTransition layout
// above this route.
//
// Auth model:
//   - The (app)/layout.tsx gate already enforces both auth() and
//     "diagnostic completed" before this page renders. The auth()
//     call here is for the userId only; redirect-on-null is a
//     defensive belt-and-suspenders.
//   - Auth.js v5 with database session strategy attaches user.id to
//     session.user.id automatically (per the audit at
//     `docs/plans/dashboard.md` §2.11). No custom session callback
//     needed.
//
// Mastery Map migration: until commit 9 of this round, this file
// rendered the Mastery Map's data-fetching shape. The Mastery Map
// content moved to (app)/drill/page.tsx at commit 3; this commit
// replaces this file's content with the dashboard server component.
// `/` now renders the dashboard; `/drill` renders the Mastery Map
// sub-type picker.

import { redirect } from "next/navigation"
import * as React from "react"
import { auth } from "@/auth"
import { Dashboard } from "@/components/dashboard/dashboard"
import { getDashboardData } from "@/server/dashboard/data"

async function loadUserId(): Promise<string> {
	const session = await auth()
	if (!session?.user?.id) {
		redirect("/login")
	}
	return session.user.id
}

function DashboardPage() {
	const dataPromise = loadUserId().then(function load(userId) {
		return getDashboardData(userId)
	})
	return (
		<React.Suspense fallback={<DashboardSkeleton />}>
			<Dashboard dataPromise={dataPromise} />
		</React.Suspense>
	)
}

function DashboardSkeleton() {
	return (
		<div className="min-h-screen bg-bg text-text-1">
			<main className="mx-auto max-w-[1100px] px-7 pt-12">
				<p className="text-sm text-text-3">Loading…</p>
			</main>
		</div>
	)
}

export default DashboardPage
