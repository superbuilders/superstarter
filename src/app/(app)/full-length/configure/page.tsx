// /full-length/configure — full-length test configure pane.
// docs/plans/phase5-full-length-test.md §5 + Q12.6.
//
// Server component, NOT async per rules/rsc-data-fetching-patterns.md.
// Bare primer pane (no length-picker, no sub-type-picker — v1 ships
// fixed at 50 questions × 15 minutes cross-sub-type-interleaved per
// PRD §4.5). The page is a thin commitment-confirmation layer: the
// user clicks a CTA, lands here, reads the test framing, then
// explicitly chooses to start.
//
// Carries the dashboard-style <TopNav> chrome above the configure
// content so the surface reads as a peer of the dashboard / review /
// lessons / stats routes.
//
// Inherits the (app) layout's auth + diagnostic-completed gate; full-
// length is post-onboarding by definition (cannot be reached before
// the diagnostic completes).

import { redirect } from "next/navigation"
import * as React from "react"
import { auth } from "@/auth"
import { PageNav } from "@/components/nav/page-nav"
import { Button } from "@/components/ui/button"
import { loadNavChrome } from "@/server/nav/chrome"

const RUN_PATH = "/full-length/run"

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
			<main className="mx-auto max-w-[1100px] px-7 pb-6">
				<header className="mb-3 flex flex-col gap-1 border-border-soft border-b pt-6 pb-3">
					<h1 className="font-medium font-serif text-2xl text-text-1 tracking-tight">
						Full-length test
					</h1>
					<p className="max-w-[60ch] text-sm text-text-2">
						50 questions in 15 minutes. Real-test difficulty mix, randomized across verbal and
						numerical sub-types. Lands on the post-session review on completion or timeout.
					</p>
				</header>
				<form action={RUN_PATH} method="get" className="flex justify-end">
					<Button type="submit" size="lg">
						Start full-length test
					</Button>
				</form>
			</main>
		</div>
	)
}

export default Page
