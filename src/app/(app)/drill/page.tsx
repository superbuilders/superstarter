// (app)/drill/page.tsx — Mastery Map sub-type picker. Plan §6.3
// (phase3-mastery-map) + dashboard plan §5 commit 3 (`docs/plans/
// dashboard.md`) + Dashboard PRD §11.5.
//
// This is the new mount point for the Mastery Map content that
// previously lived at `(app)/page.tsx`. Migration is a same-file COPY
// during commits 3-10 of the dashboard round: BOTH `/` and `/drill`
// render the Mastery Map until commit 11 replaces `(app)/page.tsx`'s
// content with the dashboard. This duplication is intentional — it
// keeps `/` a stable known-good surface while the dashboard accretes
// at the page-mount and component-tree level.
//
// Server component (NOT async per rules/rsc-data-fetching-patterns.md).
// Initiates four parallel promises and passes them through to the
// `<MasteryMap>` client component which consumes them via React.use().
//
// The four promises:
//   - masteryStatesPromise: SELECT sub_type_id, current_state FROM
//     mastery_state WHERE user_id = $1.
//   - userTargetsPromise: SELECT target_percentile, target_date_ms FROM
//     users WHERE id = $1.  (passed into nearGoalPromise; not surfaced
//     directly to the client.)
//   - nearGoalPromise: derived from masteryStates + targetDate via
//     deriveNearGoal().
//   - triagePromise: triageRolling30d(userId).
//   - recommendedSubTypePromise: lowest-mastery sub-type with
//     deterministic tie-break.
//
// The (app)/layout.tsx gate ensures `auth()` already passed before this
// page renders, so the auth() call here is for the userId only —
// redirect-on-null is a defensive belt-and-suspenders.

import { eq } from "drizzle-orm"
import { redirect } from "next/navigation"
import * as React from "react"
import { auth } from "@/auth"
import { type SubTypeId, subTypeIds } from "@/config/sub-types"
import { db } from "@/db"
import { masteryState } from "@/db/schemas/practice/mastery-state"
import { users } from "@/db/schemas/auth/users"
import { logger } from "@/logger"
import { MasteryMap } from "@/components/mastery-map/mastery-map"
import type { MasteryLevel } from "@/server/mastery/compute"
import { deriveNearGoal } from "@/server/mastery/near-goal"
import { recommendedNextSubType } from "@/server/mastery/recommended-next"
import { triageRolling30d } from "@/server/triage/score"

const subTypeIdSet: ReadonlySet<string> = new Set<string>(subTypeIds)
function asSubTypeId(s: string): SubTypeId | undefined {
	if (!subTypeIdSet.has(s)) return undefined
	const matched = subTypeIds.find(function eq(known) {
		return known === s
	})
	return matched
}

async function loadUserId(): Promise<string> {
	const session = await auth()
	if (!session?.user?.id) {
		logger.debug({}, "(app)/drill/page: no auth session, redirect /login")
		redirect("/login")
	}
	return session.user.id
}

async function loadMasteryStates(
	userIdPromise: Promise<string>
): Promise<ReadonlyMap<SubTypeId, MasteryLevel>> {
	const userId = await userIdPromise
	const rows = await db
		.select({ subTypeId: masteryState.subTypeId, currentState: masteryState.currentState })
		.from(masteryState)
		.where(eq(masteryState.userId, userId))
	const map = new Map<SubTypeId, MasteryLevel>()
	for (const row of rows) {
		const id = asSubTypeId(row.subTypeId)
		if (id === undefined) {
			logger.warn(
				{ subTypeId: row.subTypeId },
				"(app)/drill/page: unknown sub_type_id in mastery_state, skipping"
			)
			continue
		}
		map.set(id, row.currentState)
	}
	return map
}

async function loadTargetDateMs(userIdPromise: Promise<string>): Promise<number | undefined> {
	const userId = await userIdPromise
	const rows = await db
		.select({ targetDateMs: users.targetDateMs })
		.from(users)
		.where(eq(users.id, userId))
		.limit(1)
	const row = rows[0]
	if (!row || row.targetDateMs === null) return undefined
	return row.targetDateMs
}

function Page() {
	const userIdPromise = loadUserId()
	const masteryStatesPromise = loadMasteryStates(userIdPromise)
	const targetDatePromise = loadTargetDateMs(userIdPromise)

	// Date.now() must be called AFTER an uncached / Request data access
	// when `cacheComponents: true` is on (next.config.ts). Awaiting
	// userIdPromise (which calls auth() → cookies()) and chaining off of
	// it satisfies the gate; the actual current time is captured inside
	// the .then() callback so the read happens after the cookies()
	// dependency is registered with the framework.
	const nearGoalPromise = userIdPromise.then(function gate() {
		const nowMs = Date.now()
		return Promise.all([masteryStatesPromise, targetDatePromise]).then(
			function derive([states, targetDateMs]) {
				return deriveNearGoal({ masteryStates: states, targetDateMs, nowMs })
			}
		)
	})

	const triagePromise = userIdPromise.then(function callTriage(userId) {
		return triageRolling30d(userId)
	})
	const recommendedSubTypePromise = masteryStatesPromise.then(function pickRecommended(states) {
		return recommendedNextSubType(states)
	})

	return (
		<React.Suspense fallback={<MasteryMapSkeleton />}>
			<MasteryMap
				masteryStatesPromise={masteryStatesPromise}
				nearGoalPromise={nearGoalPromise}
				triagePromise={triagePromise}
				recommendedSubTypePromise={recommendedSubTypePromise}
			/>
		</React.Suspense>
	)
}

function MasteryMapSkeleton() {
	return (
		<main className="mx-auto flex min-h-dvh max-w-2xl items-center justify-center px-6">
			<p className="text-muted-foreground text-sm">Loading…</p>
		</main>
	)
}

export default Page
