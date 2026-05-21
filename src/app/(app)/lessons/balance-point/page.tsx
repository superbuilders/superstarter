// /lessons/balance-point — "Sum of deviations = 0" lesson.
//
// Server component, NOT async per rules/rsc-data-fetching-patterns.md
// (Pattern 2 — per-page Suspense; no ViewTransition layout above). Only
// loads nav chrome; the interactive surface is a client component that
// owns all state.

import { redirect } from "next/navigation"
import * as React from "react"
import { auth } from "@/auth"
import { BalancePointLesson } from "@/components/lessons/balance-point/balance-point-lesson"
import { PageNav } from "@/components/nav/page-nav"
import { loadNavChrome } from "@/server/nav/chrome"

async function loadUserId(): Promise<string> {
	const session = await auth()
	if (!session?.user?.id) {
		redirect("/login")
	}
	return session.user.id
}

function Page() {
	const chromePromise = loadUserId().then(function load(userId) {
		return loadNavChrome(userId)
	})
	return (
		<div className="min-h-screen bg-bg text-text-1">
			<React.Suspense fallback={null}>
				<PageNav chromePromise={chromePromise} />
			</React.Suspense>
			<BalancePointLesson />
		</div>
	)
}

export default Page
