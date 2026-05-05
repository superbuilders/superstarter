// scripts/dev/smoke/mastery-map-empty-state.ts
//
// Sub-phase 2 commit 3: Playwright smoke for the Mastery Map's
// post-diagnostic race-window empty-state pane. Plan:
// docs/plans/phase3-mastery-map.md §3.
//
// Three scenarios:
//
//   1. Empty-state visible. A user with a completed-non-abandoned
//      diagnostic and zero mastery_state rows lands on /. The
//      <ComputingState> pane renders (data-testid
//      "mastery-map-computing-state").
//
//   2. Polling-driven transition. From scenario 1's state, mastery_state
//      rows are upserted manually. Within ~5 seconds the polling loop's
//      router.refresh() picks up the change and the page transitions to
//      the populated grid (the verbal + numerical sections become
//      visible, the empty-state pane is gone). No hard reload — the
//      transition is driven by router.refresh(), so the URL is unchanged
//      and the page never navigates.
//
//   3. 30s timeout fallback. Empty-state setup; never populate mastery
//      rows. After 30 seconds, the pane shows "Still computing — refresh
//      manually if this takes longer." This scenario takes ~32s by
//      design.
//
// Design note: the race window in real diagnostic completion is ~1.1s
// (per the §5.2 smoke's measurement). Catching it via DOM observation
// after a real completion is flaky-by-default — too short for reliable
// harness sampling. This smoke instead sets up the empty-state
// preconditions DIRECTLY (insert a completed diagnostic row WITHOUT
// firing the workflow, leaving mastery_state empty) so the pane is
// stable until we deliberately populate. This trades "reproducing the
// production race precisely" for "verifying the rendered behavior
// reliably." The branch condition under test (states.size === 0 →
// <ComputingState>) is identical between the natural race and the
// artificial setup, so behavior is the same.
//
// Pre-conditions:
//   - Local docker postgres reachable (createAdminDb works).
//   - `bun dev` running on http://localhost:3000.
//   - Items table seeded (the (app) gate query doesn't read items, but
//     the populated-grid render does pass through subTypes config).
//
// Usage: bun run scripts/dev/smoke/mastery-map-empty-state.ts

import "@/env"
import * as errors from "@superbuilders/errors"
import { eq, sql } from "drizzle-orm"
import { type Page, chromium } from "playwright-core"
import { createAdminDb } from "@/db/admin"
import { authSessions } from "@/db/schemas/auth/sessions"
import { masteryState } from "@/db/schemas/practice/mastery-state"
import { practiceSessions } from "@/db/schemas/practice/practice-sessions"
import { users } from "@/db/schemas/auth/users"
import { logger } from "@/logger"

const CHROMIUM_PATH = `${Bun.env.HOME}/.cache/ms-playwright/chromium-1208/chrome-linux64/chrome`
const APP_BASE = "http://localhost:3000"

// Scenario 3's wall-clock wait. The pane's POLL_BUDGET_MS is 30s; we
// allow a 5s grace beyond that for the timeout effect to fire.
const TIMEOUT_FALLBACK_WAIT_MS = 35_000

const ErrUserInsertEmpty = errors.new("smoke: user insert returned no rows")
const ErrSessionInsertEmpty = errors.new("smoke: session insert returned no rows")
const ErrPageTextMissing = errors.new("smoke: page textContent returned null")

interface SetupResult {
	userId: string
	sessionId: string
	sessionToken: string
}

async function setupUserWithEmptyMasteryState(label: string): Promise<SetupResult> {
	await using adminDb = await createAdminDb()

	const u = await errors.try(
		adminDb.db
			.insert(users)
			.values({
				email: `mastery-map-empty-state-${label}-${Date.now()}@local.dev`,
				name: "Mastery Map Empty-State Smoke"
			})
			.returning({ id: users.id })
	)
	if (u.error) {
		logger.error({ error: u.error, label }, "smoke: user insert failed")
		throw errors.wrap(u.error, "user insert")
	}
	const userRow = u.data[0]
	if (!userRow) {
		logger.error({ label }, "smoke: user insert empty")
		throw ErrUserInsertEmpty
	}
	const userId = userRow.id

	// Insert a completed-non-abandoned diagnostic row directly.
	// We do NOT fire masteryRecomputeWorkflow, leaving mastery_state
	// empty for this user — the simulated post-diagnostic race window.
	const sess = await errors.try(
		adminDb.db
			.insert(practiceSessions)
			.values({
				userId,
				type: "diagnostic",
				targetQuestionCount: 50,
				startedAtMs: sql`(extract(epoch from now()) * 1000)::bigint - (10 * 60 * 1000)`,
				lastHeartbeatMs: sql`(extract(epoch from now()) * 1000)::bigint`,
				endedAtMs: sql`(extract(epoch from now()) * 1000)::bigint`,
				completionReason: "completed",
				recencyExcludedItemIds: []
			})
			.returning({ id: practiceSessions.id })
	)
	if (sess.error) {
		logger.error({ error: sess.error, userId }, "smoke: session insert failed")
		throw errors.wrap(sess.error, "session insert")
	}
	const sessRow = sess.data[0]
	if (!sessRow) {
		logger.error({ userId }, "smoke: session insert empty")
		throw ErrSessionInsertEmpty
	}
	const sessionId = sessRow.id

	// Insert auth session for cookie-based login.
	const sessionToken = `mastery-map-empty-state-${label}-${Date.now()}`
	const expiresMs = Date.now() + 7 * 86_400_000
	const authResult = await errors.try(
		adminDb.db
			.insert(authSessions)
			.values({ sessionToken, userId, expiresMs })
			.returning({ token: authSessions.sessionToken })
	)
	if (authResult.error) {
		logger.error({ error: authResult.error, userId }, "smoke: auth session insert failed")
		throw errors.wrap(authResult.error, "auth session insert")
	}

	return { userId, sessionId, sessionToken }
}

async function upsertMasteryStateRows(userId: string): Promise<void> {
	await using adminDb = await createAdminDb()
	const targetSubTypes = [
		"verbal.antonyms",
		"numerical.fractions",
		"numerical.percentages"
	] as const
	for (const subTypeId of targetSubTypes) {
		const result = await errors.try(
			adminDb.db
				.insert(masteryState)
				.values({
					userId,
					subTypeId,
					currentState: "learning",
					wasMastered: false,
					updatedAtMs: Date.now()
				})
				.onConflictDoNothing()
		)
		if (result.error) {
			logger.error(
				{ error: result.error, userId, subTypeId },
				"smoke: mastery upsert failed"
			)
			throw errors.wrap(result.error, `mastery upsert ${subTypeId}`)
		}
	}
}

async function deleteAuthSession(sessionToken: string): Promise<void> {
	await using adminDb = await createAdminDb()
	const result = await errors.try(
		adminDb.db.delete(authSessions).where(eq(authSessions.sessionToken, sessionToken))
	)
	if (result.error) {
		logger.warn({ error: result.error, sessionToken }, "smoke: auth-session cleanup failed")
	}
}

async function newPageWithSession(sessionToken: string): Promise<{
	browser: Awaited<ReturnType<typeof chromium.launch>>
	page: Page
}> {
	const browser = await chromium.launch({ executablePath: CHROMIUM_PATH, headless: true })
	const context = await browser.newContext({ viewport: { width: 1280, height: 900 } })
	await context.addCookies([
		{
			name: "authjs.session-token",
			value: sessionToken,
			domain: "localhost",
			path: "/",
			httpOnly: false,
			secure: false,
			sameSite: "Lax",
			expires: Math.floor((Date.now() + 7 * 86_400_000) / 1000)
		}
	])
	const page = await context.newPage()
	return { browser, page }
}

interface CheckResult {
	step: string
	ok: boolean
	detail: Record<string, unknown>
}

// Scenario 1: empty-state visible.
async function scenario1EmptyStateVisible(): Promise<CheckResult> {
	const setup = await setupUserWithEmptyMasteryState("s1")
	const { browser, page } = await newPageWithSession(setup.sessionToken)
	const result = await errors.try(
		(async function run(): Promise<CheckResult> {
			await page.goto(`${APP_BASE}/`, { waitUntil: "domcontentloaded", timeout: 30_000 })
			// Wait for the test-id element. The <ComputingState> render is
			// the first thing the (app)/page.tsx renders for an
			// empty-mastery user, so this should resolve within the page's
			// initial render.
			await page.waitForSelector('[data-testid="mastery-map-computing-state"]', {
				timeout: 10_000
			})
			const text = await page.textContent('[data-testid="mastery-map-computing-state"]')
			if (text === null) {
				logger.error({ userId: setup.userId }, "scenario 1: textContent null after waitForSelector")
				throw ErrPageTextMissing
			}
			return {
				step: "scenario 1: empty-state pane visible for user with completed diagnostic + empty mastery_state",
				ok: text.includes("computing your mastery state"),
				detail: { textSnippet: text.slice(0, 120), userId: setup.userId }
			}
		})()
	)
	await browser.close()
	await deleteAuthSession(setup.sessionToken)
	if (result.error) {
		logger.error({ error: result.error, setup }, "scenario 1 failed")
		return {
			step: "scenario 1: empty-state pane visible for user with completed diagnostic + empty mastery_state",
			ok: false,
			detail: { error: String(result.error) }
		}
	}
	return result.data
}

// Scenario 2: polling-driven transition.
async function scenario2PollingTransition(): Promise<CheckResult> {
	const setup = await setupUserWithEmptyMasteryState("s2")
	const { browser, page } = await newPageWithSession(setup.sessionToken)
	const result = await errors.try(
		(async function run(): Promise<CheckResult> {
			const startUrl = `${APP_BASE}/`
			await page.goto(startUrl, { waitUntil: "domcontentloaded", timeout: 30_000 })
			// Wait for empty-state pane.
			await page.waitForSelector('[data-testid="mastery-map-computing-state"]', {
				timeout: 10_000
			})
			const initialUrl = page.url()

			// Now upsert mastery rows. The polling loop fires
			// router.refresh() every 2s; populated branch should appear
			// within ~3s.
			await upsertMasteryStateRows(setup.userId)

			// Wait for the populated grid. <MasteryMap>'s populated branch
			// renders an h1 "Mastery Map" — the empty-state pane's heading
			// is "We're computing…" instead. Detect the text swap.
			await page.waitForFunction(
				function checkSwap() {
					const h1 = document.querySelector("h1")
					return h1 !== null && h1.textContent === "Mastery Map"
				},
				undefined,
				{ timeout: 10_000 }
			)
			const finalUrl = page.url()
			const noNavigation = finalUrl === initialUrl
			return {
				step: "scenario 2: polling-driven transition from empty-state to populated grid (no hard reload)",
				ok: noNavigation,
				detail: { initialUrl, finalUrl, userId: setup.userId }
			}
		})()
	)
	await browser.close()
	await deleteAuthSession(setup.sessionToken)
	if (result.error) {
		logger.error({ error: result.error, setup }, "scenario 2 failed")
		return {
			step: "scenario 2: polling-driven transition from empty-state to populated grid (no hard reload)",
			ok: false,
			detail: { error: String(result.error) }
		}
	}
	return result.data
}

// Scenario 3: 30s timeout fallback.
async function scenario3TimeoutFallback(): Promise<CheckResult> {
	const setup = await setupUserWithEmptyMasteryState("s3")
	const { browser, page } = await newPageWithSession(setup.sessionToken)
	const result = await errors.try(
		(async function run(): Promise<CheckResult> {
			await page.goto(`${APP_BASE}/`, { waitUntil: "domcontentloaded", timeout: 30_000 })
			await page.waitForSelector('[data-testid="mastery-map-computing-state"]', {
				timeout: 10_000
			})
			// Don't populate mastery_state. Wait past the 30s budget for
			// the timeout effect to fire.
			logger.info(
				{ waitMs: TIMEOUT_FALLBACK_WAIT_MS },
				"scenario 3: waiting for 30s+ timeout fallback…"
			)
			await page.waitForFunction(
				function checkTimeoutText(): boolean {
					const main = document.querySelector('[data-testid="mastery-map-computing-state"]')
					if (!main) return false
					return main.textContent.includes("Still computing")
				},
				undefined,
				{ timeout: TIMEOUT_FALLBACK_WAIT_MS }
			)
			const text = await page.textContent('[data-testid="mastery-map-computing-state"]')
			if (text === null) {
				logger.error({ userId: setup.userId }, "scenario 3: textContent null after waitForFunction")
				throw ErrPageTextMissing
			}
			return {
				step: "scenario 3: 30s timeout fallback message renders after the polling budget",
				ok: text.includes("Still computing"),
				detail: { textSnippet: text.slice(0, 200), userId: setup.userId }
			}
		})()
	)
	await browser.close()
	await deleteAuthSession(setup.sessionToken)
	if (result.error) {
		logger.error({ error: result.error, setup }, "scenario 3 failed")
		return {
			step: "scenario 3: 30s timeout fallback message renders after the polling budget",
			ok: false,
			detail: { error: String(result.error) }
		}
	}
	return result.data
}

async function main(): Promise<void> {
	const checks: CheckResult[] = []

	const c1 = await scenario1EmptyStateVisible()
	checks.push(c1)
	logger.info({ step: c1.step, ok: c1.ok, detail: c1.detail }, "smoke: scenario 1 result")

	const c2 = await scenario2PollingTransition()
	checks.push(c2)
	logger.info({ step: c2.step, ok: c2.ok, detail: c2.detail }, "smoke: scenario 2 result")

	const c3 = await scenario3TimeoutFallback()
	checks.push(c3)
	logger.info({ step: c3.step, ok: c3.ok, detail: c3.detail }, "smoke: scenario 3 result")

	const failed = checks.filter(function pickFailed(c) { return !c.ok })
	if (failed.length > 0) {
		for (const f of failed) {
			logger.error({ step: f.step, detail: f.detail }, "smoke: check failed")
		}
		logger.error({ failedCount: failed.length, totalCount: checks.length }, "smoke FAILED")
		process.exit(1)
	}
	logger.info({ totalCount: checks.length }, "smoke PASSED — all scenarios green")
}

const result = await errors.try(main())
if (result.error) {
	logger.error({ error: result.error }, "smoke run failed")
	process.exit(1)
}
