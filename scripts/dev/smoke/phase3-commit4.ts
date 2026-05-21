// scripts/dev/smoke/phase3-commit4.ts
//
// Phase 3 commit-4 BROWSER smoke. Drives the diagnostic flow + the
// (app) gate end-to-end through a real browser session.
//
// Per the project ruleset, scripts/ uses src/-style idioms (errors.try
// + logger; logger before throw; no nullish coalescing). The pattern
// matches scripts/dev/smoke/phase3-commit1.ts.
//
// What it does:
//   1. Inserts a fresh test user.
//   2. Inserts a NextAuth session row pointing at that user.
//   3. Launches chromium with the session cookie pre-set.
//   4. Navigates to /. Asserts redirect to /diagnostic (gate works).
//   5. Asserts the FocusShell mounts; clicks through 50 items by
//      pressing 1 + Enter, waiting for the question to advance.
//   6. After the 50th submit, asserts redirect to /post-session/<id>.
//   7. Asserts the OnboardingTargets form is present.
//   8. Selects target percentile + date, clicks "Save and continue".
//   9. Asserts redirect to /; asserts the (app) layout's gate now passes.
//  10. SQL spot-checks: 50 attempts, completion_reason='completed',
//      tier-degraded count ≤ 6 per plan §8.
//
// Usage: bun run scripts/dev/smoke/phase3-commit4.ts

import "@/env"
import * as errors from "@superbuilders/errors"
import { eq, sql } from "drizzle-orm"
import { type Browser, chromium, type Page } from "playwright-core"
import { createAdminDb } from "@/db/admin"
import { authSessions } from "@/db/schemas/auth/sessions"
import { attempts } from "@/db/schemas/practice/attempts"
import { practiceSessions } from "@/db/schemas/practice/practice-sessions"
import { users } from "@/db/schemas/auth/users"
import { logger } from "@/logger"

const CHROMIUM_PATH = `${Bun.env.HOME}/.cache/ms-playwright/chromium-1208/chrome-linux64/chrome`
const APP_BASE = "http://localhost:3000"
const SESSION_TOKEN = `phase3-c4-smoke-${Date.now()}`

interface SmokeContext {
	userId: string
	email: string
}

interface CheckResult {
	step: string
	ok: boolean
	detail: Record<string, unknown>
}

interface BrowserHandle {
	browser: Browser
	page: Page
	consoleErrors: string[]
}

async function setup(): Promise<SmokeContext> {
	await using adminDb = await createAdminDb()
	const email = `phase3-c4-smoke-${Date.now()}@local.dev`
	const userInsert = await errors.try(
		adminDb.db
			.insert(users)
			.values({ email, name: "Phase 3 C4 Smoke" })
			.returning({ id: users.id })
	)
	if (userInsert.error) {
		logger.error({ error: userInsert.error, email }, "smoke: user insert failed")
		throw errors.wrap(userInsert.error, "user insert")
	}
	const u = userInsert.data[0]
	if (!u) {
		logger.error({ email }, "smoke: user insert returning empty")
		throw errors.new("user insert returned no rows")
	}
	const sessionInsert = await errors.try(
		adminDb.db
			.insert(authSessions)
			.values({
				sessionToken: SESSION_TOKEN,
				userId: u.id,
				expiresMs: Date.now() + 7 * 86_400_000
			})
			.returning({ token: authSessions.sessionToken })
	)
	if (sessionInsert.error) {
		logger.error({ error: sessionInsert.error }, "smoke: session insert failed")
		throw errors.wrap(sessionInsert.error, "session insert")
	}
	logger.info({ userId: u.id, email }, "smoke: setup complete")
	return { userId: u.id, email }
}

async function cleanupSession(): Promise<void> {
	await using adminDb = await createAdminDb()
	const cleanupResult = await errors.try(
		adminDb.db.delete(authSessions).where(eq(authSessions.sessionToken, SESSION_TOKEN))
	)
	if (cleanupResult.error) {
		logger.warn({ error: cleanupResult.error }, "smoke: session cleanup non-fatal failure")
	}
}

async function openBrowser(): Promise<BrowserHandle> {
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
	const consoleErrors: string[] = []
	page.on("pageerror", function onErr(e) {
		consoleErrors.push(e.message)
	})
	page.on("console", function onConsole(msg) {
		if (msg.type() !== "error") return
		const text = msg.text()
		if (text.includes("404") && text.toLowerCase().includes("not found")) return
		consoleErrors.push(text)
	})
	return { browser, page, consoleErrors }
}

async function checkGateRedirect(page: Page): Promise<CheckResult> {
	const gotoResult = await errors.try(
		page.goto(`${APP_BASE}/`, { waitUntil: "domcontentloaded" })
	)
	if (gotoResult.error) {
		logger.error({ error: gotoResult.error }, "smoke: page.goto / failed")
		throw errors.wrap(gotoResult.error, "page.goto /")
	}
	const redirected = await page
		.waitForURL(`${APP_BASE}/diagnostic`, { timeout: 8000 })
		.then(function onOk() {
			return true
		})
		.catch(function onErr() {
			return false
		})
	return {
		step: "gate: / redirects to /diagnostic for new user",
		ok: redirected,
		detail: { finalUrl: page.url() }
	}
}

async function checkFocusShellMount(page: Page): Promise<CheckResult> {
	const visible = await page
		.locator("button", { hasText: "Submit" })
		.first()
		.waitFor({ state: "visible", timeout: 10_000 })
		.then(function onOk() {
			return true
		})
		.catch(function onErr() {
			return false
		})
	return { step: "diagnostic: FocusShell mounted", ok: visible, detail: { url: page.url() } }
}

async function submitOneItem(page: Page): Promise<"advanced" | "post-session" | "timeout"> {
	const currentBody = await page
		.locator(".prose, p.font-serif, p.whitespace-pre-wrap")
		.first()
		.innerText()
		.catch(function onErr() {
			return ""
		})
	await page.keyboard.press("1").catch(function onErr() {})
	await page.keyboard.press("Enter").catch(function onErr() {})
	const advancedPromise = page
		.waitForFunction(
			function check(prev: string) {
				const el = document.querySelector("p.whitespace-pre-wrap, p.font-serif")
				let text = ""
				if (el instanceof HTMLElement) text = el.innerText
				return text.length > 0 && text !== prev
			},
			currentBody,
			{ timeout: 8000 }
		)
		.then(function onOk(): "advanced" {
			return "advanced"
		})
		.catch(function onErr(): "timeout" {
			return "timeout"
		})
	const postSessionPromise = page
		.waitForURL(/\/post-session\//, { timeout: 8000 })
		.then(function onOk(): "post-session" {
			return "post-session"
		})
		.catch(function onErr(): "timeout" {
			return "timeout"
		})
	return Promise.race([advancedPromise, postSessionPromise])
}

async function submitDiagnosticItems(page: Page): Promise<number> {
	let submittedCount = 0
	const submitDeadline = Date.now() + 180_000
	while (submittedCount < 50 && Date.now() < submitDeadline) {
		const settled = await submitOneItem(page)
		submittedCount += 1
		if (settled === "post-session" || page.url().includes("/post-session/")) break
		if (settled === "timeout") break
	}
	return submittedCount
}

async function checkPostSessionRedirect(page: Page, submittedCount: number): Promise<CheckResult> {
	const navigated = await page
		.waitForURL(/\/post-session\//, { timeout: 15_000 })
		.then(function onOk() {
			return true
		})
		.catch(function onErr() {
			return false
		})
	return {
		step: "diagnostic: redirected to /post-session/<id>",
		ok: navigated,
		detail: { submittedCount, url: page.url() }
	}
}

async function fillOnboardingAndSave(page: Page): Promise<void> {
	await page.selectOption("select#onboarding-percentile", "10").catch(function onErr() {})
	await page.fill("input#onboarding-date", "2027-01-15").catch(function onErr() {})
	await page
		.locator("button", { hasText: "Save and continue" })
		.first()
		.click()
		.catch(function onErr() {})
}

async function checkOnboardingFormVisible(page: Page, sessionId: string): Promise<CheckResult> {
	const visible = await page
		.locator("text=Target percentile")
		.isVisible()
		.catch(function onErr() {
			return false
		})
	return {
		step: "post-session: onboarding form visible",
		ok: visible,
		detail: { sessionId }
	}
}

async function checkSaveAndContinueRedirect(page: Page): Promise<CheckResult> {
	const navigated = await page
		.waitForURL(`${APP_BASE}/`, { timeout: 15_000 })
		.then(function onOk() {
			return true
		})
		.catch(function onErr() {
			return false
		})
	return {
		step: "post-session: Save and continue → /",
		ok: navigated,
		detail: { url: page.url() }
	}
}

async function checkPlaceholderHome(page: Page): Promise<CheckResult> {
	const visible = await page
		.locator("h1", { hasText: "Diagnostic complete" })
		.first()
		.waitFor({ state: "visible", timeout: 10_000 })
		.then(function onOk() {
			return true
		})
		.catch(function onErr() {
			return false
		})
	return {
		step: "(app)/ gate now passes; placeholder home renders",
		ok: visible,
		detail: { url: page.url() }
	}
}

async function checkSession(sessionId: string): Promise<CheckResult> {
	await using adminDb = await createAdminDb()
	const result = await errors.try(
		adminDb.db
			.select({
				endedAtMs: practiceSessions.endedAtMs,
				completionReason: practiceSessions.completionReason
			})
			.from(practiceSessions)
			.where(eq(practiceSessions.id, sessionId))
			.limit(1)
	)
	if (result.error) {
		logger.error({ error: result.error, sessionId }, "smoke: session row read failed")
		return {
			step: "sql: read session row",
			ok: false,
			detail: { error: String(result.error) }
		}
	}
	const row = result.data[0]
	const ok = row !== undefined && row.endedAtMs !== null && row.completionReason === "completed"
	return {
		step: "sql: session finalized as completed",
		ok,
		detail: { endedAtMs: row?.endedAtMs, completionReason: row?.completionReason }
	}
}

async function checkAttemptCount(sessionId: string): Promise<CheckResult> {
	await using adminDb = await createAdminDb()
	const result = await errors.try(
		adminDb.db.select({ id: attempts.id }).from(attempts).where(eq(attempts.sessionId, sessionId))
	)
	if (result.error) {
		logger.error({ error: result.error, sessionId }, "smoke: attempts count failed")
		return {
			step: "sql: count attempts",
			ok: false,
			detail: { error: String(result.error) }
		}
	}
	const n = result.data.length
	return { step: "sql: 50 attempts", ok: n === 50, detail: { count: n } }
}

async function checkTierDegradedCount(sessionId: string): Promise<CheckResult> {
	await using adminDb = await createAdminDb()
	const result = await errors.try(
		adminDb.db
			.select({ count: sql<number>`count(*)::int` })
			.from(attempts)
			.where(
				sql`${attempts.sessionId} = ${sessionId} AND ${attempts.metadataJson} ->> 'fallback_level' = 'tier-degraded'`
			)
	)
	if (result.error) {
		logger.error({ error: result.error, sessionId }, "smoke: tier-degraded count failed")
		return {
			step: "sql: tier-degraded count",
			ok: false,
			detail: { error: String(result.error) }
		}
	}
	const row = result.data[0]
	const n = row === undefined ? 0 : row.count
	return {
		step: "sql: tier-degraded count ≤ 6 (plan §8)",
		ok: n <= 6,
		detail: { count: n }
	}
}

async function runDiagnosticPhase(page: Page): Promise<{ checks: CheckResult[]; sessionId: string | null }> {
	const checks: CheckResult[] = []
	checks.push(await checkGateRedirect(page))
	const mountCheck = await checkFocusShellMount(page)
	checks.push(mountCheck)
	if (!mountCheck.ok) return { checks, sessionId: null }
	const submittedCount = await submitDiagnosticItems(page)
	logger.info({ submittedCount, url: page.url() }, "submit loop exited")
	const postSessionCheck = await checkPostSessionRedirect(page, submittedCount)
	checks.push(postSessionCheck)
	if (!postSessionCheck.ok) return { checks, sessionId: null }
	const match = page.url().match(/\/post-session\/([^/?]+)/)
	const sessionId = match?.[1]
	if (!sessionId) {
		checks.push({
			step: "could not parse sessionId from url",
			ok: false,
			detail: { url: page.url() }
		})
		return { checks, sessionId: null }
	}
	return { checks, sessionId }
}

async function runOnboardingPhase(page: Page, sessionId: string): Promise<CheckResult[]> {
	const checks: CheckResult[] = []
	checks.push(await checkOnboardingFormVisible(page, sessionId))
	await fillOnboardingAndSave(page)
	checks.push(await checkSaveAndContinueRedirect(page))
	checks.push(await checkPlaceholderHome(page))
	return checks
}

async function runSqlChecks(sessionId: string): Promise<CheckResult[]> {
	return [
		await checkSession(sessionId),
		await checkAttemptCount(sessionId),
		await checkTierDegradedCount(sessionId)
	]
}

function buildErrorCheck(consoleErrors: string[]): CheckResult {
	const noErrors = consoleErrors.length === 0
	const detail = noErrors ? {} : { errors: consoleErrors.slice(0, 5) }
	return { step: "no unexpected page errors", ok: noErrors, detail }
}

async function runFlow(_ctx: SmokeContext): Promise<CheckResult[]> {
	const handle = await openBrowser()
	const { browser, page, consoleErrors } = handle
	const diag = await runDiagnosticPhase(page)
	const checks: CheckResult[] = [...diag.checks]
	if (diag.sessionId !== null) {
		const onboarding = await runOnboardingPhase(page, diag.sessionId)
		checks.push(...onboarding)
		await browser.close()
		const sqlChecks = await runSqlChecks(diag.sessionId)
		checks.push(...sqlChecks)
	} else {
		await browser.close()
	}
	checks.push(buildErrorCheck(consoleErrors))
	return checks
}

async function main(): Promise<void> {
	const ctx = await setup()
	const result = await errors.try(runFlow(ctx))
	await cleanupSession()
	if (result.error) {
		logger.error({ error: result.error }, "smoke: runFlow threw")
		process.exit(1)
	}
	let allOk = true
	for (const c of result.data) {
		if (!c.ok) allOk = false
		logger.info({ step: c.step, ok: c.ok, detail: c.detail }, "phase3-commit4: check")
	}
	if (!allOk) {
		logger.error("phase3-commit4 smoke: one or more checks failed")
		process.exit(1)
	}
	logger.info("phase3-commit4 smoke: all checks passed")
}

await main()
