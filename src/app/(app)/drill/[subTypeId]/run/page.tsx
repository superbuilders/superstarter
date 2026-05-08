// /drill/[subTypeId]/run — drill run page. Plan §6.4 +
// `docs/plans/practice-round.md` §5 commit 2 (ask 7).
//
// Server component. Validates subTypeId, pre-checks live-item count
// for the requested sub-type, then kicks off startSession({type:'drill',
// subTypeId, timerMode:'standard', drillLength:DEFAULT_DRILL_QUESTIONS}).
//
// Practice round commit 2 changes vs pre-round shape:
//   - The drill configure surface at (app)/drill/[subTypeId]/page.tsx
//     was deleted in this same commit. Configure used to do TWO things:
//     (1) length picker (5/10/20, default 10) and (2) empty-bank
//     pre-check via items COUNT query. Both responsibilities migrate
//     here: (1) is replaced by a hardcoded DEFAULT_DRILL_QUESTIONS
//     constant from @/config/sub-types; (2) the same items COUNT
//     query lives here as a server-side gate before startSession.
//   - The previous ?length= searchParam is dropped; users coming from
//     the dashboard's BeltRow (or any other entry point) land directly
//     here with no choice of length.
//   - Empty-bank threshold widens from `liveCount === 0` to
//     `liveCount < DEFAULT_DRILL_QUESTIONS`. A drill of N questions
//     cannot start with a bank of <N items; pre-round this was masked
//     by the configure page's length-picker (user could pick 5
//     manually); post-round we gate up-front.
//
// startSession materializes the recency-excluded set and returns the
// first item server-rendered into the response.
//
// `RunInit` (exported) is the success shape consumed by
// <DrillRunContent>; an internal `DrillInit` discriminated union
// adds the empty-bank branch without leaking the discriminator into
// the client component contract.

import * as errors from "@superbuilders/errors"
import { and, count, eq } from "drizzle-orm"
import { notFound, redirect } from "next/navigation"
import * as React from "react"
import { auth } from "@/auth"
import { DEFAULT_DRILL_QUESTIONS, type SubTypeId, subTypeIds, subTypes } from "@/config/sub-types"
import { db } from "@/db"
import { items } from "@/db/schemas/catalog/items"
import { logger } from "@/logger"
import { EmptyBankPane } from "@/components/drill/empty-bank-pane"
import { DrillRunContent } from "@/app/(app)/drill/[subTypeId]/run/content"
import { startSession } from "@/server/sessions/start"

const ErrLiveCountReadFailed = errors.new("/drill/run: live-item count read failed")

const subTypeIdSet: ReadonlySet<string> = new Set<string>(subTypeIds)
function asSubTypeId(s: string): SubTypeId | undefined {
	if (!subTypeIdSet.has(s)) return undefined
	return subTypeIds.find(function eq(known) {
		return known === s
	})
}

interface PageProps {
	params: Promise<{ subTypeId: string }>
}

interface RunInit {
	sessionId: string
	firstItem: Awaited<ReturnType<typeof startSession>>["firstItem"]
	drillLength: number
	subTypeId: SubTypeId
}

type DrillInit = { kind: "ready"; init: RunInit } | { kind: "empty-bank"; displayName: string }

async function startDrill(
	paramsPromise: Promise<{ subTypeId: string }>
): Promise<DrillInit> {
	const session = await auth()
	if (!session?.user?.id) {
		logger.debug({}, "/drill/run: no auth, redirect /login")
		redirect("/login")
	}
	const userId = session.user.id

	const params = await paramsPromise
	const subTypeId = asSubTypeId(params.subTypeId)
	if (subTypeId === undefined) notFound()

	const config = subTypes.find(function byId(s) {
		return s.id === subTypeId
	})
	if (!config) notFound()

	// Empty-bank pre-check, migrated from the deleted configure page.
	// Threshold = DEFAULT_DRILL_QUESTIONS (5). Index: items_sub_type_status_idx.
	const countResult = await errors.try(
		db
			.select({ n: count() })
			.from(items)
			.where(and(eq(items.subTypeId, config.id), eq(items.status, "live")))
	)
	if (countResult.error) {
		logger.error(
			{ error: countResult.error, subTypeId: config.id },
			"/drill/run: live-item count read failed"
		)
		throw errors.wrap(countResult.error, "live-item count")
	}
	const row = countResult.data[0]
	if (!row) {
		logger.error(
			{ subTypeId: config.id },
			"/drill/run: live-item count returned no rows (impossible)"
		)
		throw ErrLiveCountReadFailed
	}
	if (row.n < DEFAULT_DRILL_QUESTIONS) {
		logger.info(
			{ subTypeId: config.id, liveCount: row.n, threshold: DEFAULT_DRILL_QUESTIONS },
			"/drill/run: empty-bank gate fired (insufficient live items)"
		)
		return { kind: "empty-bank", displayName: config.displayName }
	}

	const result = await startSession({
		userId,
		type: "drill",
		subTypeId,
		timerMode: "standard",
		drillLength: DEFAULT_DRILL_QUESTIONS
	})
	logger.info(
		{ userId, subTypeId, drillLength: DEFAULT_DRILL_QUESTIONS, sessionId: result.sessionId },
		"/drill/run: startSession returned"
	)
	return {
		kind: "ready",
		init: {
			sessionId: result.sessionId,
			firstItem: result.firstItem,
			drillLength: DEFAULT_DRILL_QUESTIONS,
			subTypeId
		}
	}
}

function Page(props: PageProps) {
	const drillInitPromise = startDrill(props.params)
	return (
		<React.Suspense fallback={<RunSkeleton />}>
			<DrillRunGate drillInitPromise={drillInitPromise} />
		</React.Suspense>
	)
}

async function DrillRunGate(props: { drillInitPromise: Promise<DrillInit> }) {
	const drillInit = await props.drillInitPromise
	if (drillInit.kind === "empty-bank") {
		return <EmptyBankPane displayName={drillInit.displayName} />
	}
	const initPromise = Promise.resolve(drillInit.init)
	return <DrillRunContent initPromise={initPromise} />
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
