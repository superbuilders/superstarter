// scripts/dev/smoke/phase3-polish-commit3-routes.ts
//
// Phase 3 polish commit-3 ROUTE-MOVE smoke. Verifies the
// `/diagnostic` → explainer + `/diagnostic/run` → session split per
// docs/plans/phase-3-polish-practice-surface-features.md §6.1.
//
// Pattern matches phase3-commit2-browser.ts (auth-aware Playwright
// harness via context.addCookies). One-shot script — delete at end of
// Phase 3 polish round.
//
// Usage:
//   bun run scripts/dev/smoke/phase3-polish-commit3-routes.ts

import "@/env"
import * as errors from "@superbuilders/errors"
import { eq } from "drizzle-orm"
import { type Page, chromium } from "playwright-core"
import { createAdminDb } from "@/db/admin"
import { authSessions } from "@/db/schemas/auth/sessions"
import { practiceSessions } from "@/db/schemas/practice/practice-sessions"
import { logger } from "@/logger"

const CHROMIUM_PATH = `${Bun.env.HOME}/.cache/ms-playwright/chromium-1208/chrome-linux64/chrome`
const SESSION_TOKEN = `phase3-polish-routes-smoke-${Date.now()}`
const TARGET_USER_ID = "dd2d98ab-e015-4892-84d0-1c12754028cf"
const APP_BASE = "http://localhost:3000"

async function ensureSession(): Promise<void> {
	await using adminDb = await createAdminDb()
	const expiresMs = Date.now() + 7 * 86_400_000
	const result = await errors.try(
		adminDb.db
			.insert(authSessions)
			.values({
				sessionToken: SESSION_TOKEN,
				userId: TARGET_USER_ID,
				expiresMs
			})
			.returning({ token: authSessions.sessionToken })
	)
	if (result.error) {
		logger.error({ error: result.error }, "ensureSession: insert failed")
		throw errors.wrap(result.error, "ensureSession")
	}
	logger.info({ sessionToken: SESSION_TOKEN }, "ensureSession: row inserted")
}

async function deleteSession(): Promise<void> {
	await using adminDb = await createAdminDb()
	const result = await errors.try(
		adminDb.db.delete(authSessions).where(eq(authSessions.sessionToken, SESSION_TOKEN))
	)
	if (result.error) {
		logger.warn({ error: result.error }, "deleteSession: cleanup failed")
	}
}

// Clear out any existing diagnostic rows for the test user so the
// "fresh user, no diagnostic" gate-redirect path is exercised.
async function clearDiagnosticsForTestUser(): Promise<void> {
	await using adminDb = await createAdminDb()
	const result = await errors.try(
		adminDb.db
			.delete(practiceSessions)
			.where(eq(practiceSessions.userId, TARGET_USER_ID))
	)
	if (result.error) {
		logger.warn({ error: result.error }, "clearDiagnosticsForTestUser: failed")
	}
}

interface RouteCheck {
	step: string
	finalUrl: string
	ok: boolean
	detail: Record<string, unknown>
}

async function runRouteChecks(page: Page): Promise<RouteCheck[]> {
	const checks: RouteCheck[] = []

	// Test 1: GET / → redirect to /diagnostic (the explainer, NOT
	// /diagnostic/run). Authenticated user with no completed diagnostic.
	// Use `networkidle` so the Next.js soft-redirect (the (app) layout
	// throws redirect() inside a Suspense boundary, which signals the
	// client router rather than returning 302 — see parent-plan §11.1
	// for the cacheComponents/Suspense interaction) has time to land.
	await page.goto(`${APP_BASE}/`, { waitUntil: "networkidle", timeout: 15_000 })
	// Belt-and-suspenders: wait for the explainer headline before
	// reading page.url(). The explainer locator's wait is the real
	// settling signal.
	await page
		.locator("text=Welcome to the diagnostic")
		.waitFor({ state: "visible", timeout: 5_000 })
		.catch(function onErr() { /* explainer never appeared — let the assertion below report */ })
	const urlAfterRoot = page.url()
	const explainerHeadlineVisibleAfterRoot = await page
		.locator("text=Welcome to the diagnostic")
		.isVisible()
		.catch(function onErr() { return false })
	checks.push({
		step: "test 1: GET / → /diagnostic explainer (gate redirect)",
		finalUrl: urlAfterRoot,
		ok: urlAfterRoot === `${APP_BASE}/diagnostic` && explainerHeadlineVisibleAfterRoot,
		detail: { explainerHeadlineVisibleAfterRoot }
	})

	// Test 2: explainer renders all three bullet copy markers.
	const bullets = await Promise.all([
		page.locator("text=50 questions in 15 minutes").isVisible().catch(function onErr() { return false }),
		page.locator("text=triage discipline").isVisible().catch(function onErr() { return false }),
		page.locator("text=That's by design").isVisible().catch(function onErr() { return false }),
		page.locator("text=Start Diagnostic").isVisible().catch(function onErr() { return false })
	])
	checks.push({
		step: "test 2: explainer body renders all 3 bullets + Start CTA",
		finalUrl: page.url(),
		ok: bullets.every(function id(v) { return v }),
		detail: {
			bullet50q15m: bullets[0],
			bulletTriage: bullets[1],
			bulletByDesign: bullets[2],
			startCta: bullets[3]
		}
	})

	// Test 3: click Start Diagnostic → land on /diagnostic/run with the
	// FocusShell rendered (look for the "Submit Answer" CTA).
	await page.locator("a", { hasText: "Start Diagnostic" }).first().click({ timeout: 5_000 })
	await page.waitForLoadState("domcontentloaded", { timeout: 15_000 })
	// FocusShell mount + first-item paint takes a beat.
	await page.waitForTimeout(2000)
	const urlAfterStart = page.url()
	const submitButtonVisible = await page
		.locator("button", { hasText: "Submit Answer" })
		.first()
		.isVisible()
		.catch(function onErr() { return false })
	checks.push({
		step: "test 3: click Start Diagnostic → /diagnostic/run with FocusShell",
		finalUrl: urlAfterStart,
		ok: urlAfterStart === `${APP_BASE}/diagnostic/run` && submitButtonVisible,
		detail: { submitButtonVisible }
	})

	// Test 4: refresh /diagnostic/run mid-session — orphan-then-restart.
	// The previous in-progress session should be finalized as
	// 'abandoned' and a fresh session started.
	const sessionIdBeforeRefresh = await readMostRecentSessionId()
	await page.reload({ waitUntil: "domcontentloaded", timeout: 15_000 })
	await page.waitForTimeout(2000)
	const sessionIdAfterRefresh = await readMostRecentSessionId()
	const previousSessionAbandoned = await readSessionCompletionReason(sessionIdBeforeRefresh)
	checks.push({
		step: "test 4: refresh /diagnostic/run → previous session abandoned, fresh session started",
		finalUrl: page.url(),
		ok:
			sessionIdBeforeRefresh !== undefined &&
			sessionIdAfterRefresh !== undefined &&
			sessionIdBeforeRefresh !== sessionIdAfterRefresh &&
			previousSessionAbandoned === "abandoned",
		detail: {
			sessionIdBeforeRefresh,
			sessionIdAfterRefresh,
			previousSessionCompletionReason: previousSessionAbandoned
		}
	})

	return checks
}

async function readMostRecentSessionId(): Promise<string | undefined> {
	await using adminDb = await createAdminDb()
	const r = await errors.try(
		adminDb.db
			.select({ id: practiceSessions.id })
			.from(practiceSessions)
			.where(eq(practiceSessions.userId, TARGET_USER_ID))
			.orderBy(practiceSessions.id)
	)
	if (r.error) {
		logger.error({ error: r.error }, "readMostRecentSessionId: query failed")
		return undefined
	}
	const last = r.data[r.data.length - 1]
	return last?.id
}

async function readSessionCompletionReason(sessionId: string | undefined): Promise<string | undefined> {
	if (sessionId === undefined) return undefined
	await using adminDb = await createAdminDb()
	const r = await errors.try(
		adminDb.db
			.select({ completionReason: practiceSessions.completionReason })
			.from(practiceSessions)
			.where(eq(practiceSessions.id, sessionId))
			.limit(1)
	)
	if (r.error) {
		logger.error({ error: r.error }, "readSessionCompletionReason: query failed")
		return undefined
	}
	const row = r.data[0]
	if (!row) return undefined
	if (row.completionReason === null) return "in-progress"
	return row.completionReason
}

async function runUnauthChecks(): Promise<RouteCheck[]> {
	// Test 5 + 6: unauthenticated direct navigation to /diagnostic and
	// /diagnostic/run should both redirect to /login.
	const browser = await chromium.launch({ executablePath: CHROMIUM_PATH, headless: true })
	const context = await browser.newContext({ viewport: { width: 1280, height: 900 } })
	const page = await context.newPage()
	const checks: RouteCheck[] = []

	await page.goto(`${APP_BASE}/diagnostic`, { waitUntil: "domcontentloaded", timeout: 15_000 })
	checks.push({
		step: "test 5: unauthed GET /diagnostic → redirect /login",
		finalUrl: page.url(),
		ok: page.url() === `${APP_BASE}/login`,
		detail: {}
	})

	await page.goto(`${APP_BASE}/diagnostic/run`, { waitUntil: "domcontentloaded", timeout: 15_000 })
	checks.push({
		step: "test 6: unauthed GET /diagnostic/run → redirect /login",
		finalUrl: page.url(),
		ok: page.url() === `${APP_BASE}/login`,
		detail: {}
	})

	await browser.close()
	return checks
}

async function runAuthedSmoke(): Promise<RouteCheck[]> {
	const browser = await chromium.launch({ executablePath: CHROMIUM_PATH, headless: true })
	const context = await browser.newContext({ viewport: { width: 1280, height: 900 } })
	await context.addCookies([
		{
			name: "authjs.session-token",
			value: SESSION_TOKEN,
			domain: "localhost",
			path: "/",
			httpOnly: false,
			secure: false,
			sameSite: "Lax",
			expires: Math.floor((Date.now() + 7 * 86_400_000) / 1000)
		}
	])
	const page = await context.newPage()
	const checks = await runRouteChecks(page)
	await browser.close()
	return checks
}

async function main(): Promise<void> {
	await clearDiagnosticsForTestUser()
	await ensureSession()
	const authedResult = await errors.try(runAuthedSmoke())
	if (authedResult.error) {
		logger.error({ error: authedResult.error }, "authed route smoke failed")
		await deleteSession()
		process.exit(1)
	}
	const unauthedResult = await errors.try(runUnauthChecks())
	if (unauthedResult.error) {
		logger.error({ error: unauthedResult.error }, "unauthed route smoke failed")
		await deleteSession()
		process.exit(1)
	}
	await deleteSession()

	const allChecks = [...authedResult.data, ...unauthedResult.data]
	let allOk = true
	for (const c of allChecks) {
		if (!c.ok) allOk = false
		logger.info({ step: c.step, finalUrl: c.finalUrl, ok: c.ok, detail: c.detail }, "route smoke result")
	}
	if (!allOk) {
		logger.error("route smoke FAILED — see results above")
		process.exit(1)
	}
	logger.info("route smoke PASSED")
}

await main()
