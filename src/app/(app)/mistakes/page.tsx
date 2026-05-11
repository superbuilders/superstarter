// /mistakes — picks 5 random items the user has gotten wrong (and not
// since gotten right) and drills them. After completion, the user
// lands on the post-session review surface (same shape as a drill).

import * as errors from "@superbuilders/errors"
import { redirect } from "next/navigation"
import * as React from "react"
import { auth } from "@/auth"
import { MistakesRunContent, type MistakesRunInit } from "@/app/(app)/mistakes/content"
import { MistakesEmptyPane } from "@/components/mistakes/mistakes-empty-pane"
import { logger } from "@/logger"
import { startMistakesSession, type MistakesSessionInit } from "@/server/mistakes/start"

const ErrEmptyPickedItems = errors.new(
	"mistakes session ready but picked items list is empty"
)

async function loadInit(): Promise<MistakesSessionInit> {
	const session = await auth()
	if (!session?.user?.id) {
		logger.debug({}, "/mistakes: no auth, redirect /login")
		redirect("/login")
	}
	return startMistakesSession(session.user.id)
}

function Page() {
	const initPromise = loadInit()
	return (
		<React.Suspense fallback={<MistakesSkeleton />}>
			<MistakesGate initPromise={initPromise} />
		</React.Suspense>
	)
}

async function MistakesGate(props: { initPromise: Promise<MistakesSessionInit> }) {
	const init = await props.initPromise
	if (init.kind === "empty") {
		return <MistakesEmptyPane />
	}
	const firstItem = init.items[0]
	if (firstItem === undefined) {
		logger.error({ sessionId: init.sessionId }, "/mistakes: ready init has empty items")
		throw errors.wrap(ErrEmptyPickedItems, `session id '${init.sessionId}'`)
	}
	const readyPromise: Promise<MistakesRunInit> = Promise.resolve({
		sessionId: init.sessionId,
		firstItem,
		remaining: init.items.slice(1),
		totalCount: init.items.length
	})
	return <MistakesRunContent initPromise={readyPromise} />
}

function MistakesSkeleton() {
	return (
		<main className="mx-auto flex min-h-dvh max-w-xl items-center justify-center px-6">
			<p className="text-muted-foreground text-sm">Picking your mistakes…</p>
		</main>
	)
}

export default Page
