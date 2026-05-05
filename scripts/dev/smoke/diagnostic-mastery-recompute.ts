// scripts/dev/smoke/diagnostic-mastery-recompute.ts
//
// Next-tier-side-effect smoke for the mastery recompute workflow.
// Plan: docs/plans/phase3-diagnostic-flow.md §5.2 (folded into commit 4
// of sub-phase 1; lifted to smoke in commit 5 since it requires a
// running dev environment, not a hermetic test surface).
//
// Why this is a smoke and not a `bun test`:
//
//   The Vercel workflow runtime (`workflow/api`'s `start()`) is wired
//   via the `withWorkflow` Next.js plugin in next.config.ts. It only
//   runs inside the Next.js server process. Calling endSession or
//   reading the workflow trigger from outside that process throws
//   "invalid workflow function." `bun test` is outside that process.
//
//   This smoke uses the only HTTP-accessible workflow trigger surface
//   in the codebase: POST /api/cron/abandon-sweep, which fires the same
//   `start(masteryRecomputeWorkflow, [{sessionId}])` call shape as
//   endSession. Per SPEC §7.3 both writers commit identical row state;
//   workflow-fires-from-cron implies workflow-fires-from-endSession by
//   call-shape equivalence. (If endSession's call site is ever modified,
//   re-verify the equivalence via this smoke.)
//
// Pre-conditions:
//   - Local docker postgres reachable (createAdminDb works).
//   - `bun dev` running on http://localhost:3000.
//   - Items table seeded with at least one live item in each of the
//     three target sub-types: verbal.antonyms, numerical.fractions,
//     numerical.percentages.
//
// What this smoke asserts:
//
//   1. After cron POST, mastery_state contains exactly one row per
//      distinct sub-type touched in the finalized session.
//   2. Each row's updated_at_ms is within the cron-POST → poll-timeout
//      window. The poll budget is 30s (the dev workflow runtime queues
//      async; in practice the trigger→upsert path completes in ~1.1s).
//
// Usage:
//   bun run scripts/dev/smoke/diagnostic-mastery-recompute.ts

import "@/env"
import * as errors from "@superbuilders/errors"
import { and, eq, sql } from "drizzle-orm"
import { createAdminDb } from "@/db/admin"
import { attempts } from "@/db/schemas/practice/attempts"
import { items } from "@/db/schemas/catalog/items"
import { masteryState } from "@/db/schemas/practice/mastery-state"
import { practiceSessions } from "@/db/schemas/practice/practice-sessions"
import { users } from "@/db/schemas/auth/users"
import { env } from "@/env"
import { logger } from "@/logger"

const DEV_SERVER_URL = "http://localhost:3000"
const POLL_INTERVAL_MS = 500
const POLL_TIMEOUT_MS = 30_000

const ErrUserInsertEmpty = errors.new("smoke: user insert returned no rows")
const ErrSessionInsertEmpty = errors.new("smoke: session insert returned no rows")
const ErrLiveItemMissing = errors.new("smoke: dev DB missing a required live item")
const ErrPollTimeout = errors.new("smoke: timed out waiting for mastery_state rows")

interface SetupResult {
	userId: string
	sessionId: string
	touchedSubTypes: string[]
}

async function setupStaleSessionWithAttempts(): Promise<SetupResult> {
	await using adminDb = await createAdminDb()

	const userInsert = await errors.try(
		adminDb.db
			.insert(users)
			.values({
				email: `mastery-recompute-smoke-${Date.now()}@local.dev`,
				name: "Mastery Recompute Smoke"
			})
			.returning({ id: users.id })
	)
	if (userInsert.error) {
		logger.error({ error: userInsert.error }, "smoke: user insert failed")
		throw errors.wrap(userInsert.error, "user insert")
	}
	const u = userInsert.data[0]
	if (!u) {
		logger.error({}, "smoke: user insert returned no rows")
		throw ErrUserInsertEmpty
	}
	const userId = u.id

	// Stale (last_heartbeat 6 min ago, > the 5-minute abandon threshold).
	const sessionInsert = await errors.try(
		adminDb.db
			.insert(practiceSessions)
			.values({
				userId,
				type: "diagnostic",
				targetQuestionCount: 50,
				startedAtMs: sql`(extract(epoch from now()) * 1000)::bigint - (10 * 60 * 1000)`,
				lastHeartbeatMs: sql`(extract(epoch from now()) * 1000)::bigint - (6 * 60 * 1000)`,
				recencyExcludedItemIds: []
			})
			.returning({ id: practiceSessions.id })
	)
	if (sessionInsert.error) {
		logger.error({ error: sessionInsert.error, userId }, "smoke: session insert failed")
		throw errors.wrap(sessionInsert.error, "session insert")
	}
	const sess = sessionInsert.data[0]
	if (!sess) {
		logger.error({ userId }, "smoke: session insert returned no rows")
		throw ErrSessionInsertEmpty
	}
	const sessionId = sess.id

	// 3 attempts, each from a different sub-type. Hand-pick three
	// sub-types and fetch one live item from each — typed Drizzle query,
	// no need for raw SQL DISTINCT ON.
	const targetSubTypes = [
		"verbal.antonyms",
		"numerical.fractions",
		"numerical.percentages"
	] as const
	const touchedSubTypes: string[] = []
	for (const subTypeId of targetSubTypes) {
		const itemRows = await errors.try(
			adminDb.db
				.select({ id: items.id })
				.from(items)
				.where(and(eq(items.subTypeId, subTypeId), eq(items.status, "live")))
				.limit(1)
		)
		if (itemRows.error) {
			logger.error({ error: itemRows.error, subTypeId }, "smoke: item pick failed")
			throw errors.wrap(itemRows.error, "item pick")
		}
		const item = itemRows.data[0]
		if (!item) {
			logger.error({ subTypeId }, "smoke: dev DB has no live item in target sub-type")
			throw ErrLiveItemMissing
		}
		touchedSubTypes.push(subTypeId)
		const insertAttempt = await errors.try(
			adminDb.db.insert(attempts).values({
				sessionId,
				itemId: item.id,
				selectedAnswer: "A",
				correct: true,
				latencyMs: 5000,
				servedAtTier: "easy"
			})
		)
		if (insertAttempt.error) {
			logger.error(
				{ error: insertAttempt.error, sessionId, subTypeId },
				"smoke: attempt insert failed"
			)
			throw errors.wrap(insertAttempt.error, "attempt insert")
		}
	}

	return { userId, sessionId, touchedSubTypes }
}

async function pollMasteryStateUntilStable(
	userId: string,
	expectedRowCount: number
): Promise<{ rowCount: number; subTypes: string[]; latestUpdatedAtMs: number }> {
	await using adminDb = await createAdminDb()
	const t0 = Date.now()
	while (Date.now() - t0 < POLL_TIMEOUT_MS) {
		const result = await errors.try(
			adminDb.db
				.select({
					subTypeId: masteryState.subTypeId,
					updatedAtMs: masteryState.updatedAtMs
				})
				.from(masteryState)
				.where(eq(masteryState.userId, userId))
		)
		if (result.error) {
			logger.error({ error: result.error, userId }, "smoke: mastery_state read failed")
			throw errors.wrap(result.error, "mastery_state read")
		}
		if (result.data.length >= expectedRowCount) {
			let latestUpdatedAtMs = 0
			for (const row of result.data) {
				if (row.updatedAtMs > latestUpdatedAtMs) latestUpdatedAtMs = row.updatedAtMs
			}
			const subTypes = result.data.map(function pickSubType(r) { return r.subTypeId })
			return { rowCount: result.data.length, subTypes, latestUpdatedAtMs }
		}
		await Bun.sleep(POLL_INTERVAL_MS)
	}
	logger.error(
		{ userId, expectedRowCount, timeoutMs: POLL_TIMEOUT_MS },
		"smoke: poll timed out before reaching expected row count"
	)
	throw ErrPollTimeout
}

async function main(): Promise<void> {
	const setup = await setupStaleSessionWithAttempts()
	const expectedSubTypeCount = setup.touchedSubTypes.length
	logger.info(
		{ userId: setup.userId, sessionId: setup.sessionId, touchedSubTypes: setup.touchedSubTypes },
		"smoke: setup complete"
	)

	const cronPostMs = Date.now()
	const fetchResult = await errors.try(
		fetch(`${DEV_SERVER_URL}/api/cron/abandon-sweep`, {
			method: "POST",
			headers: { authorization: `Bearer ${env.CRON_SECRET}` }
		})
	)
	if (fetchResult.error) {
		logger.error(
			{ error: fetchResult.error },
			"smoke: cron POST failed — is the dev server running on localhost:3000?"
		)
		throw errors.wrap(fetchResult.error, "cron POST")
	}
	if (fetchResult.data.status !== 204) {
		logger.error(
			{ status: fetchResult.data.status },
			"smoke: cron POST returned non-204 status"
		)
		throw errors.new("smoke: cron POST returned non-204 status")
	}

	const observed = await pollMasteryStateUntilStable(setup.userId, expectedSubTypeCount)
	const observedSet = new Set(observed.subTypes)
	const expectedSet = new Set(setup.touchedSubTypes)

	let allExpectedPresent = true
	for (const subType of expectedSet) {
		if (!observedSet.has(subType)) {
			allExpectedPresent = false
			break
		}
	}
	if (!allExpectedPresent || observed.rowCount !== expectedSubTypeCount) {
		logger.error(
			{
				expected: setup.touchedSubTypes.sort(),
				observed: observed.subTypes.sort(),
				expectedRowCount: expectedSubTypeCount,
				observedRowCount: observed.rowCount
			},
			"smoke: mastery_state row set does not match touched sub-types"
		)
		throw errors.new("smoke: mastery_state row set mismatch")
	}

	const updateAgeMs = observed.latestUpdatedAtMs - cronPostMs
	if (updateAgeMs < -1000) {
		logger.error(
			{ updateAgeMs, cronPostMs, latestUpdatedAtMs: observed.latestUpdatedAtMs },
			"smoke: latest updated_at_ms is implausibly older than cron POST"
		)
		throw errors.new("smoke: updated_at_ms older than cron POST")
	}
	if (updateAgeMs > POLL_TIMEOUT_MS) {
		logger.error(
			{ updateAgeMs, timeoutMs: POLL_TIMEOUT_MS },
			"smoke: latest updated_at_ms is older than the poll-timeout window"
		)
		throw errors.new("smoke: updated_at_ms older than poll-timeout window")
	}

	logger.info(
		{
			userId: setup.userId,
			sessionId: setup.sessionId,
			rowCount: observed.rowCount,
			subTypes: observed.subTypes.sort(),
			updateAgeMs
		},
		"smoke PASSED — mastery_state populated within poll-timeout budget"
	)
}

const result = await errors.try(main())
if (result.error) {
	logger.error({ error: result.error }, "smoke run failed")
	process.exit(1)
}
