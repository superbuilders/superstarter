// /lessons — placeholder route. Dashboard plan §5 commit 4 +
// Dashboard PRD §4.3.
//
// Server component, NOT async per rules/rsc-data-fetching-patterns.md.
// Carries the dashboard-style <TopNav> chrome above the placeholder
// copy so the surface reads as a peer of the dashboard / review /
// stats / practice-test routes.

import Link from "next/link"
import { redirect } from "next/navigation"
import * as React from "react"
import { auth } from "@/auth"
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
			<main className="mx-auto max-w-[1100px] px-7 pb-6">
				<header className="mb-3 flex flex-col gap-1 border-border-soft border-b pt-6 pb-3">
					<h1 className="font-medium font-serif text-2xl text-text-1 tracking-tight">Lessons</h1>
					<p className="max-w-[60ch] text-sm text-text-2">
						Lessons are coming soon. We'll add them once the practice surface is dialed in.
					</p>
				</header>
				<Link
					href="/"
					className="inline-block text-cobalt text-sm hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-cobalt focus-visible:outline-offset-2"
				>
					Back to dashboard
				</Link>
			</main>
		</div>
	)
}

export default Page
