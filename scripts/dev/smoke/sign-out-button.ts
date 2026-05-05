// scripts/dev/smoke/sign-out-button.ts
//
// Sub-phase 3: smoke for the Mastery Map's sign-out button. Plan:
// docs/plans/phase3-drill-mode.md §7 verification scenarios 13–15.
//
// Four scenarios:
//
//   1. Button renders on / (Mastery Map). data-testid
//      "mastery-map-sign-out" is present.
//
//   2. Button does NOT render on focus-shell routes
//      (/diagnostic/run, /drill/[subTypeId]/run). The focus shell
//      strips chrome to maintain session focus.
//
//   3. Click triggers Auth.js logout — the auth_sessions row for
//      this session token is deleted from the DB; the post-logout
//      redirect lands on /login.
//
//   4. Post-logout, navigating to / triggers the (app) gate's auth
//      check — redirected to /login (not the diagnostic gate, the
//      auth gate; without an auth-session row, auth() returns null).
//
// Usage: bun run scripts/dev/smoke/sign-out-button.ts

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

const ErrUserInsertEmpty = errors.new("smoke: user insert returned no rows")

interface SetupResult {
	userId: string
	sessionToken: string
}

// Set up a user with a populated mastery_state so the Map renders the
// populated grid (not the computing-state pane). This lets the smoke
// observe the sign-out button in its normal context.
async function setupUserWithPopulatedMastery(label: string): Promise<SetupResult> {
	await using adminDb = await createAdminDb()

	const u = await errors.try(
		adminDb.db
			.insert(users)
			.values({
				email: `sp3-signout-${label}-${Date.now()}@local.dev`,
				name: "SP3 Sign-Out Smoke"
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

	// Seed mastery_state for one sub-type so size > 0 and the Map
	// renders the populated grid (not <ComputingState>).
	const masterySeed = await errors.try(
		adminDb.db
			.insert(masteryState)
			.values({
				userId,
				subTypeId: "verbal.antonyms",
				currentState: "learning",
				wasMastered: false,
				updatedAtMs: Date.now()
			})
			.onConflictDoNothing()
	)
	if (masterySeed.error) {
		logger.error({ error: masterySeed.error, userId }, "smoke: mastery seed failed")
		throw errors.wrap(masterySeed.error, "mastery seed")
	}

	const sessionToken = `sp3-signout-${label}-${Date.now()}`
	const expiresMs = Date.now() + 7 * 86_400_000
	const authResult = await errors.try(
		adminDb.db
			.insert(authSessions)
			.values({ sessionToken, userId, expiresMs })
			.returning({ token: authSessions.sessionToken })
	)
	if (authResult.error) {
		logger.error({ error: authResult.error, userId }, "smoke: auth-session insert failed")
		throw errors.wrap(authResult.error, "auth-session insert")
	}

	return { userId, sessionToken }
}

async function deleteUserAndSessions(userId: string, sessionToken: string): Promise<void> {
	await using adminDb = await createAdminDb()
	const r1 = await errors.try(
		adminDb.db.delete(authSessions).where(eq(authSessions.sessionToken, sessionToken))
	)
	if (r1.error) {
		logger.warn({ error: r1.error, sessionToken }, "smoke: auth-session cleanup failed")
	}
	void userId
}

async function readAuthSessionRow(sessionToken: string): Promise<{ exists: boolean }> {
	await using adminDb = await createAdminDb()
	const r = await errors.try(
		adminDb.db
			.select({ token: authSessions.sessionToken })
			.from(authSessions)
			.where(eq(authSessions.sessionToken, sessionToken))
	)
	if (r.error) {
		logger.error({ error: r.error, sessionToken }, "smoke: auth-session read failed")
		throw errors.wrap(r.error, "auth-session read")
	}
	return { exists: r.data.length > 0 }
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

// Scenario 1: button renders on /
async function scenario1ButtonRendersOnHome(): Promise<CheckResult> {
	const setup = await setupUserWithPopulatedMastery("s1")
	const { browser, page } = await newPageWithSession(setup.sessionToken)
	const result = await errors.try(
		(async function run(): Promise<CheckResult> {
			await page.goto(`${APP_BASE}/`, { waitUntil: "domcontentloaded", timeout: 30_000 })
			await page.waitForSelector('[data-testid="mastery-map-sign-out"]', { timeout: 10_000 })
			return {
				step: "scenario 1: sign-out button renders on /",
				ok: true,
				detail: { userId: setup.userId }
			}
		})()
	)
	await browser.close()
	await deleteUserAndSessions(setup.userId, setup.sessionToken)
	if (result.error) {
		logger.error({ error: result.error, setup }, "scenario 1 failed")
		return {
			step: "scenario 1: sign-out button renders on /",
			ok: false,
			detail: { error: String(result.error) }
		}
	}
	return result.data
}

// Scenario 2: button does NOT render on focus-shell routes.
// We exercise /diagnostic/run for a fresh user; the gate will
// not redirect (the user has a completed diagnostic from setup).
// Actually wait — /diagnostic/run is in (diagnostic-flow), not
// (app), and the (diagnostic-flow) layout gates only on auth, not
// on diagnostic-completed. So a user with a completed diagnostic
// can still visit /diagnostic/run; startSession's idempotency
// will return the existing in-progress diagnostic if any, OR
// start a fresh one. The button absence is what we check.
async function scenario2ButtonHiddenInFocusShell(): Promise<CheckResult> {
	const setup = await setupUserWithPopulatedMastery("s2")
	const { browser, page } = await newPageWithSession(setup.sessionToken)
	const result = await errors.try(
		(async function run(): Promise<CheckResult> {
			await page.goto(`${APP_BASE}/diagnostic/run`, {
				waitUntil: "domcontentloaded",
				timeout: 30_000
			})
			// FocusShell takes a moment to mount client-side; wait for any
			// stable element first.
			await page.waitForLoadState("networkidle", { timeout: 10_000 })
			const button = await page.$('[data-testid="mastery-map-sign-out"]')
			if (button !== null) {
				return {
					step: "scenario 2: sign-out button absent on /diagnostic/run (focus-shell route)",
					ok: false,
					detail: { unexpected: "sign-out button found inside focus shell" }
				}
			}
			return {
				step: "scenario 2: sign-out button absent on /diagnostic/run (focus-shell route)",
				ok: true,
				detail: { userId: setup.userId }
			}
		})()
	)
	await browser.close()
	await deleteUserAndSessions(setup.userId, setup.sessionToken)
	if (result.error) {
		logger.error({ error: result.error, setup }, "scenario 2 failed")
		return {
			step: "scenario 2: sign-out button absent on /diagnostic/run (focus-shell route)",
			ok: false,
			detail: { error: String(result.error) }
		}
	}
	return result.data
}

// Scenario 3: click triggers logout (auth_sessions row deleted, redirect to /login).
async function scenario3ClickLogsOut(): Promise<CheckResult> {
	const setup = await setupUserWithPopulatedMastery("s3")
	const { browser, page } = await newPageWithSession(setup.sessionToken)
	const result = await errors.try(
		(async function run(): Promise<CheckResult> {
			await page.goto(`${APP_BASE}/`, { waitUntil: "domcontentloaded", timeout: 30_000 })
			await page.waitForSelector('[data-testid="mastery-map-sign-out"]', { timeout: 10_000 })
			// Move mouse to corner before click (verification protocol).
			await page.mouse.move(10, 10)
			await page.click('[data-testid="mastery-map-sign-out"]')
			// Wait for the redirect to /login.
			await page.waitForURL(/\/login/, { timeout: 10_000 })
			const finalUrl = page.url()
			const onLoginPage = finalUrl.includes("/login")

			// Verify the auth-session row was deleted server-side.
			const row = await readAuthSessionRow(setup.sessionToken)
			return {
				step: "scenario 3: click triggers logout — auth_session deleted, redirect to /login",
				ok: onLoginPage && !row.exists,
				detail: { finalUrl, authSessionExistsAfterLogout: row.exists }
			}
		})()
	)
	await browser.close()
	await deleteUserAndSessions(setup.userId, setup.sessionToken)
	if (result.error) {
		logger.error({ error: result.error, setup }, "scenario 3 failed")
		return {
			step: "scenario 3: click triggers logout — auth_session deleted, redirect to /login",
			ok: false,
			detail: { error: String(result.error) }
		}
	}
	return result.data
}

// Scenario 4: post-logout, navigating to / redirects to /login (auth gate fires).
async function scenario4PostLogoutGate(): Promise<CheckResult> {
	const setup = await setupUserWithPopulatedMastery("s4")
	const { browser, page } = await newPageWithSession(setup.sessionToken)
	const result = await errors.try(
		(async function run(): Promise<CheckResult> {
			// Sign out first.
			await page.goto(`${APP_BASE}/`, { waitUntil: "domcontentloaded", timeout: 30_000 })
			await page.waitForSelector('[data-testid="mastery-map-sign-out"]', { timeout: 10_000 })
			await page.mouse.move(10, 10)
			await page.click('[data-testid="mastery-map-sign-out"]')
			await page.waitForURL(/\/login/, { timeout: 10_000 })

			// Now try to navigate back to /. The auth gate should redirect.
			await page.goto(`${APP_BASE}/`, { waitUntil: "domcontentloaded", timeout: 30_000 })
			const finalUrl = page.url()
			return {
				step: "scenario 4: post-logout, GET / redirects to /login (auth gate fires)",
				ok: finalUrl.includes("/login"),
				detail: { finalUrl }
			}
		})()
	)
	await browser.close()
	await deleteUserAndSessions(setup.userId, setup.sessionToken)
	if (result.error) {
		logger.error({ error: result.error, setup }, "scenario 4 failed")
		return {
			step: "scenario 4: post-logout, GET / redirects to /login (auth gate fires)",
			ok: false,
			detail: { error: String(result.error) }
		}
	}
	return result.data
}

async function main(): Promise<void> {
	const checks: CheckResult[] = []

	const c1 = await scenario1ButtonRendersOnHome()
	checks.push(c1)
	logger.info({ step: c1.step, ok: c1.ok, detail: c1.detail }, "smoke: scenario 1 result")

	const c2 = await scenario2ButtonHiddenInFocusShell()
	checks.push(c2)
	logger.info({ step: c2.step, ok: c2.ok, detail: c2.detail }, "smoke: scenario 2 result")

	const c3 = await scenario3ClickLogsOut()
	checks.push(c3)
	logger.info({ step: c3.step, ok: c3.ok, detail: c3.detail }, "smoke: scenario 3 result")

	const c4 = await scenario4PostLogoutGate()
	checks.push(c4)
	logger.info({ step: c4.step, ok: c4.ok, detail: c4.detail }, "smoke: scenario 4 result")

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
