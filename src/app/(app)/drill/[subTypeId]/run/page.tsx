// /drill/[subTypeId]/run — drill run page. Plan §6.4.
//
// Server component. Validates subTypeId + length searchParam, kicks off
// startSession({ type: 'drill', subTypeId, timerMode: 'standard',
// drillLength }), passes the resulting promise to DrillRunContent.
//
// startSession materializes the recency-excluded set and returns the
// first item server-rendered into the response.

import { notFound, redirect } from "next/navigation"
import * as React from "react"
import { auth } from "@/auth"
import { type SubTypeId, subTypeIds } from "@/config/sub-types"
import { logger } from "@/logger"
import { DrillRunContent } from "@/app/(app)/drill/[subTypeId]/run/content"
import { startSession } from "@/server/sessions/start"

const subTypeIdSet: ReadonlySet<string> = new Set<string>(subTypeIds)
function asSubTypeId(s: string): SubTypeId | undefined {
	if (!subTypeIdSet.has(s)) return undefined
	return subTypeIds.find(function eq(known) {
		return known === s
	})
}

type DrillLength = 5 | 10 | 20
function asDrillLength(s: string | undefined): DrillLength {
	if (s === "5") return 5
	if (s === "20") return 20
	// Default to 10 (matches the configure page's default radio).
	return 10
}

interface PageProps {
	params: Promise<{ subTypeId: string }>
	searchParams: Promise<{ length?: string }>
}

interface RunInit {
	sessionId: string
	firstItem: Awaited<ReturnType<typeof startSession>>["firstItem"]
	drillLength: DrillLength
	subTypeId: SubTypeId
}

async function startDrill(
	paramsPromise: Promise<{ subTypeId: string }>,
	searchParamsPromise: Promise<{ length?: string }>
): Promise<RunInit> {
	const session = await auth()
	if (!session?.user?.id) {
		logger.debug({}, "/drill/run: no auth, redirect /login")
		redirect("/login")
	}
	const userId = session.user.id

	const params = await paramsPromise
	const subTypeId = asSubTypeId(params.subTypeId)
	if (subTypeId === undefined) notFound()

	const searchParams = await searchParamsPromise
	const drillLength = asDrillLength(searchParams.length)

	const result = await startSession({
		userId,
		type: "drill",
		subTypeId,
		timerMode: "standard",
		drillLength
	})
	logger.info(
		{ userId, subTypeId, drillLength, sessionId: result.sessionId },
		"/drill/run: startSession returned"
	)
	return { sessionId: result.sessionId, firstItem: result.firstItem, drillLength, subTypeId }
}

function Page(props: PageProps) {
	const initPromise = startDrill(props.params, props.searchParams)
	return (
		<React.Suspense fallback={<RunSkeleton />}>
			<DrillRunContent initPromise={initPromise} />
		</React.Suspense>
	)
}

function RunSkeleton() {
	return (
		<main className="mx-auto flex min-h-dvh max-w-xl items-center justify-center px-6">
			<p className="text-muted-foreground text-sm">Preparing your dojo session…</p>
		</main>
	)
}

export type { RunInit }
export default Page
