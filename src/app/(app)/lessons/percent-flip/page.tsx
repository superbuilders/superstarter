// /lessons/percent-flip — X% of Y = Y% of X lesson.
//
// Server component, NOT async per rules/rsc-data-fetching-patterns.md.

import { redirect } from "next/navigation"
import * as React from "react"
import { auth } from "@/auth"
import { PercentFlipLesson } from "@/components/lessons/percent-flip/percent-flip-lesson"
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
			<PercentFlipLesson />
		</div>
	)
}

export default Page
