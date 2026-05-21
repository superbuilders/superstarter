// /full-length/run — full-length test run page.
// docs/plans/phase5-full-length-test.md §5 + §4.
//
// Server component. Resolves auth, kicks off
// startSession({ type: 'full_length' }), passes the resulting promise
// to FullLengthRunContent. startSession materializes the recency-
// excluded set and returns the first item server-rendered into the
// response. No params, no searchParams — full-length is fixed at 50
// questions × 15 minutes per Q12.6.

import { redirect } from "next/navigation"
import * as React from "react"
import { auth } from "@/auth"
import { logger } from "@/logger"
import { FullLengthRunContent } from "@/app/(app)/full-length/run/content"
import { startSession } from "@/server/sessions/start"

interface RunInit {
	sessionId: string
	firstItem: Awaited<ReturnType<typeof startSession>>["firstItem"]
}

async function startFullLength(): Promise<RunInit> {
	const session = await auth()
	if (!session?.user?.id) {
		logger.debug({}, "/full-length/run: no auth, redirect /login")
		redirect("/login")
	}
	const userId = session.user.id

	const result = await startSession({
		userId,
		type: "full_length"
	})
	logger.info(
		{ userId, sessionId: result.sessionId },
		"/full-length/run: startSession returned"
	)
	return { sessionId: result.sessionId, firstItem: result.firstItem }
}

function Page() {
	const initPromise = startFullLength()
	return (
		<React.Suspense fallback={<RunSkeleton />}>
			<FullLengthRunContent initPromise={initPromise} />
		</React.Suspense>
	)
}

function RunSkeleton() {
	return (
		<main className="mx-auto flex min-h-dvh max-w-xl items-center justify-center px-6">
			<p className="text-muted-foreground text-sm">Preparing your full-length test…</p>
		</main>
	)
}

export type { RunInit }
export default Page
