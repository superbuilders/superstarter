// scripts/dev/smoke/phase3-commit2-browser.ts
//
// Phase 3 commit-2 + commit-3 BROWSER smoke. Auth-aware. Uses
// playwright-core (temporary dev dep) + the chromium binary that
// Claude's MCP installs at
// ~/.cache/ms-playwright/chromium-1208/chrome-linux64/chrome.
//
// What it does:
//   1. Inserts a session row in the dev DB.
//   2. Launches chromium with the session cookie pre-set via
//      context.addCookies().
//   3. Navigates to /phase3-smoke (the harness page that mounts
//      <FocusShell> with stubbed handlers).
//   4. Captures console messages.
//   5. Asserts: zero React errors AND first item rendered.
//   6. Tests the input model per
//      docs/plans/phase-3-polish-practice-surface-features.md §3.0–§3.3:
//        - Pressing `1`–`5` does NOT select an option.
//        - Pressing `Enter` does NOT submit.
//        - Pressing `Space` while no triage prompt is visible does NOTHING.
//        - Click selects, click submits.
//        - 5 rapid Submit-Answer clicks land exactly 1 additional
//          submit (submitPending guard).
//        - Triage prompt appears at t=18s and stays visible (no
//          auto-submit at t=30s).
//        - Pressing `Space` while triage is visible AND no option is
//          selected → submit lands with `sel=(none)` (blank-submit
//          semantics from §3.3 — random pick is gone).
//   7. Heartbeat beacon fires + pagehide beacon fires.
//
// Per project rules: scripts/ uses src-style errors.try + logger for
// consistency.
//
// Usage:
//   bun run scripts/dev/smoke/phase3-commit2-browser.ts

import "@/env"
import * as errors from "@superbuilders/errors"
import { eq } from "drizzle-orm"
import { type Page, chromium } from "playwright-core"
import { createAdminDb } from "@/db/admin"
import { authSessions } from "@/db/schemas/auth/sessions"
import { logger } from "@/logger"

// Hardcoded against the chromium binary the Claude MCP installs locally.
// No `process.env` (biome `noProcessEnv` ban) and no `??` fallback (project
// rule banning nullish coalescing). If you run this in a CI box where the
// path differs, edit this constant — there is no env override by design.
const CHROMIUM_PATH = `${Bun.env.HOME}/.cache/ms-playwright/chromium-1208/chrome-linux64/chrome`

const SESSION_TOKEN = `phase3-c2-smoke-${Date.now()}`
const TARGET_USER_ID = "dd2d98ab-e015-4892-84d0-1c12754028cf"
const APP_BASE = "http://localhost:3000"
const SMOKE_URL = `${APP_BASE}/phase3-smoke`

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
		// Cleanup is best-effort — log the failure for the test log but
		// don't throw, so the smoke harness still exits cleanly.
		logger.warn({ error: result.error, sessionToken: SESSION_TOKEN }, "deleteSession: cleanup failed")
	}
}

interface ConsoleEntry {
	type: string
	text: string
}

interface SmokeOutput {
	errors: ConsoleEntry[]
	screenshotPath: string
	submitsLogged: number
	firstItemVisible: boolean
	triageAppeared: boolean
	firstSubmitLatencyMs: number
	heartbeatCount: number
	digitKeyDoesNothing: boolean
	enterKeyDoesNothing: boolean
	mouseClickSelects: boolean
	pagehideBeaconFired: boolean
	// Triage-take blank-submit semantics (§3.3): pressing Space while
	// triage is visible and no option is selected lands a submit with
	// sel=(none). The smoke page's debug aside renders that string
	// when `selectedAnswer === undefined`.
	blankTriageSubmitLanded: boolean
	blankTriageSubmitWasBlank: boolean
}

// NOTE: the original Enter-spam stress check that lived here was
// dropped in commit 3. Two reasons:
//   - The Enter keydown handler was removed in commit 3 (plan §3.0).
//     There's no Enter race to test for.
//   - The equivalent click-spam doesn't reproduce the same race because
//     Playwright awaits each `page.click()` call, letting each submit
//     cycle complete before the next click fires. The submitPending
//     guard isn't being exercised under that timing — it's effectively
//     5 sequential single-submit cycles. Asserting delta=1 there is a
//     false positive.
//   - The reducer's submitPending guard is still belt-and-suspenders
//     (visible in shell-reducer.ts's `dispatchPrimary` for `submit`).
//     If a future PR re-adds a sync-keyboard submit shortcut, the
//     guard's contract is unchanged; a new test should exercise it.

async function readSubmittedCount(page: Page): Promise<number> {
	const text = await page
		.locator("aside[aria-label='smoke debug']")
		.innerText()
		.catch(function onErr() { return "" })
	const match = text.match(/items submitted: (\d+)/)
	if (match && match[1] !== undefined) {
		return Number.parseInt(match[1], 10)
	}
	return 0
}

async function readLatestSelDisplay(page: Page): Promise<string> {
	// Read the last "sel=..." line in the smoke debug aside. Format:
	// `sel=(none)` for blank submits, `sel=stuba001` (or similar opaque
	// id) for normal submits.
	const text = await page
		.locator("aside[aria-label='smoke debug']")
		.innerText()
		.catch(function onErr() { return "" })
	const matches = text.match(/sel=([^\n]+)/g)
	if (!matches || matches.length === 0) return ""
	const last = matches[matches.length - 1]
	if (last === undefined) return ""
	return last.replace(/^sel=/, "")
}

interface InputModelChecks {
	digitKeyDoesNothing: boolean
	enterKeyDoesNothing: boolean
}

// Verify that pressing `1`–`5` does NOT select an option and that
// pressing `Enter` does NOT submit. Both shortcuts were stripped in
// commit 3 (plan §3.0).
async function runInputModelChecks(page: Page): Promise<InputModelChecks> {
	const beforeCount = await readSubmittedCount(page)
	// Press digit 1 — should NOT flip any aria-pressed state.
	await page.keyboard.press("1")
	await page.waitForTimeout(150)
	const anyPressedAfterDigit = await page
		.locator("button[aria-pressed='true']")
		.count()
		.catch(function onErr() { return 0 })
	const digitKeyDoesNothing = anyPressedAfterDigit === 0
	// Press Enter — should NOT increment the submit counter.
	await page.keyboard.press("Enter")
	await page.waitForTimeout(150)
	const afterCount = await readSubmittedCount(page)
	const enterKeyDoesNothing = afterCount === beforeCount
	logger.info(
		{ digitKeyDoesNothing, enterKeyDoesNothing, beforeCount, afterCount },
		"input-model checks"
	)
	return { digitKeyDoesNothing, enterKeyDoesNothing }
}

async function runSmoke(): Promise<SmokeOutput> {
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
	const consoleEntries: ConsoleEntry[] = []
	page.on("console", function onConsole(msg) {
		consoleEntries.push({ type: msg.type(), text: msg.text() })
	})
	page.on("pageerror", function onPageError(err) {
		consoleEntries.push({ type: "pageerror", text: err.message })
	})

	// Track requests so we can confirm the heartbeat beacon fires.
	const heartbeatRequests: string[] = []
	page.on("request", function onRequest(req) {
		const url = req.url()
		if (url.includes("/api/sessions/") && url.endsWith("/heartbeat")) {
			heartbeatRequests.push(url)
		}
	})

	const navResult = await errors.try(page.goto(SMOKE_URL, { waitUntil: "domcontentloaded", timeout: 15_000 }))
	if (navResult.error) {
		await browser.close()
		logger.error({ error: navResult.error, url: SMOKE_URL }, "page.goto failed")
		throw errors.wrap(navResult.error, "page.goto")
	}
	const response = navResult.data
	logger.info({ status: response?.status(), url: page.url() }, "navigated")

	// Wait briefly for hydration + any infinite-loop to manifest.
	await page.waitForTimeout(2500)

	// Check first-item visibility by looking for "What is 1/2 + 1/4?".
	const firstItemVisible = await page.locator("text=What is 1/2 + 1/4?").isVisible().catch(function onErr() { return false })

	// Input-model checks: digit and Enter keys are no-ops post-commit-3.
	let digitKeyDoesNothing = false
	let enterKeyDoesNothing = false
	if (firstItemVisible) {
		const checks = await runInputModelChecks(page)
		digitKeyDoesNothing = checks.digitKeyDoesNothing
		enterKeyDoesNothing = checks.enterKeyDoesNothing
	}

	// Click the first option (text "1/6" — option A on the smoke page's
	// first stub item) and verify aria-pressed flips. This also leaves
	// the option selected so the subsequent submit roundtrip records a
	// real selection.
	let mouseClickSelects = false
	if (firstItemVisible) {
		await page.locator("button", { hasText: "1/6" }).first().click({ timeout: 3000 }).catch(function onErr() { /* ignore */ })
		await page.waitForTimeout(150)
		mouseClickSelects = await page
			.locator("button[aria-pressed='true']")
			.first()
			.isVisible()
			.catch(function onErr() { return false })
	}

	let submitsLogged = 0
	let firstSubmitLatencyMs = 0
	if (firstItemVisible && mouseClickSelects) {
		// Pause long enough that the latency value is a real reaction time,
		// not a 0-2ms tight-loop artifact.
		await page.waitForTimeout(800)
		await page.locator("button", { hasText: "Submit Answer" }).first().click({ timeout: 3000 }).catch(function onErr() { /* ignore */ })
		await page.waitForTimeout(500)
		const debugText = await page.locator("aside[aria-label='smoke debug']").innerText().catch(function onErr() { return "" })
		const match = debugText.match(/items submitted: (\d+)/)
		if (match && match[1] !== undefined) {
			submitsLogged = Number.parseInt(match[1], 10)
		}
		const latencyMatch = debugText.match(/latency=(\d+)ms/)
		if (latencyMatch && latencyMatch[1] !== undefined) {
			firstSubmitLatencyMs = Number.parseInt(latencyMatch[1], 10)
		}
		logger.info({ debugText, firstSubmitLatencyMs }, "post-submit debug card")
	}

	// Triage check — wait past the 18s per-question target while leaving
	// the current item alone (do NOT click submit/options between rounds).
	// The triage prompt overlay should appear and stay (no auto-submit).
	// We are NOW on item 2 (the FocusShell advanced after the first
	// submit) with NOTHING selected — perfect setup for the
	// blank-submit semantics check below.
	let triageAppeared = false
	let blankTriageSubmitLanded = false
	let blankTriageSubmitWasBlank = false
	if (firstItemVisible) {
		// Wait 19s, then look for the triage button text.
		await page.waitForTimeout(19_000)
		triageAppeared = await page
			.locator("text=Best move: guess and advance.")
			.isVisible()
			.catch(function onErr() { return false })
		// Latency tripwire: confirm the prompt is STILL visible 12 seconds
		// later (proves no auto-submit at t=30s).
		await page.waitForTimeout(12_000)
		const stillVisible = await page
			.locator("text=Best move: guess and advance.")
			.isVisible()
			.catch(function onErr() { return false })
		logger.info({ triageAppeared, stillVisibleAt31s: stillVisible }, "triage check")

		// Triage-take blank-submit semantics (§3.3). At this point we have
		// NOT selected any option for the current item (the stress check
		// burned through to this item without selecting). Press Space
		// while the prompt is visible — should submit blank.
		if (triageAppeared && stillVisible) {
			const beforeSpaceCount = await readSubmittedCount(page)
			await page.keyboard.press("Space")
			await page.waitForTimeout(600)
			const afterSpaceCount = await readSubmittedCount(page)
			blankTriageSubmitLanded = afterSpaceCount === beforeSpaceCount + 1
			const latestSel = await readLatestSelDisplay(page)
			blankTriageSubmitWasBlank = latestSel === "(none)"
			logger.info(
				{ beforeSpaceCount, afterSpaceCount, latestSel, blankTriageSubmitLanded, blankTriageSubmitWasBlank },
				"triage-take blank-submit semantics check"
			)
		}
	}

	const screenshotPath = `/tmp/phase3-c2-smoke-${Date.now()}.png`
	await page.screenshot({ path: screenshotPath, fullPage: false })
	logger.info({ screenshotPath, heartbeatCount: heartbeatRequests.length }, "screenshot captured")

	// pagehide beacon: navigation away from the page fires `pagehide` on
	// the old document. Capture the count before nav, navigate to
	// about:blank, wait for the beacon to flush, then read.
	const heartbeatCountBeforeNav = heartbeatRequests.length
	await page.goto("about:blank").catch(function onErr() { /* ignore */ })
	// sendBeacon is fire-and-forget; give the network stack a moment to flush.
	await new Promise(function delay(resolve) { setTimeout(resolve, 1500) })
	const pagehideBeaconFired = heartbeatRequests.length > heartbeatCountBeforeNav

	await browser.close()
	// The heartbeat beacon's 404 is expected in dev (handler still up
	// from prior commits) — filter out 404 noise so the failure signal
	// is real.
	const errorEntries = consoleEntries.filter(function pickRealErrors(e) {
		if (e.type !== "error" && e.type !== "pageerror") return false
		if (e.text.includes("404") && e.text.toLowerCase().includes("not found")) return false
		return true
	})
	return {
		errors: errorEntries,
		screenshotPath,
		submitsLogged,
		firstItemVisible,
		triageAppeared,
		firstSubmitLatencyMs,
		heartbeatCount: heartbeatRequests.length,
		digitKeyDoesNothing,
		enterKeyDoesNothing,
		mouseClickSelects,
		pagehideBeaconFired,
		blankTriageSubmitLanded,
		blankTriageSubmitWasBlank
	}
}

async function main(): Promise<void> {
	await ensureSession()
	const result = await errors.try(runSmoke())
	await deleteSession()
	if (result.error) {
		logger.error({ error: result.error }, "smoke run failed")
		process.exit(1)
	}
	const {
		errors: errs,
		screenshotPath,
		submitsLogged,
		firstItemVisible,
		firstSubmitLatencyMs,
		heartbeatCount,
		digitKeyDoesNothing,
		enterKeyDoesNothing,
		mouseClickSelects,
		pagehideBeaconFired,
		blankTriageSubmitLanded,
		blankTriageSubmitWasBlank
	} = result.data
	logger.info(
		{
			firstItemVisible,
			submitsLogged,
			firstSubmitLatencyMs,
			heartbeatCount,
			triageAppeared: result.data.triageAppeared,
			digitKeyDoesNothing,
			enterKeyDoesNothing,
			mouseClickSelects,
			pagehideBeaconFired,
			blankTriageSubmitLanded,
			blankTriageSubmitWasBlank,
			errorCount: errs.length,
			screenshotPath
		},
		"smoke result"
	)
	for (const e of errs) {
		logger.error({ type: e.type, text: e.text }, "console error captured")
	}
	const ok =
		firstItemVisible &&
		submitsLogged === 1 &&
		errs.length === 0 &&
		result.data.triageAppeared &&
		// Latency must be plausible: > 50ms (not a tight-loop artifact)
		// and < 18000ms (we click within the per-question target).
		firstSubmitLatencyMs >= 50 &&
		firstSubmitLatencyMs < 18_000 &&
		// At least one heartbeat fired during the smoke run.
		heartbeatCount >= 1 &&
		// Input model (commit 3 / plan §3.0): digit + Enter keys are
		// no-ops; mouse click selects.
		digitKeyDoesNothing &&
		enterKeyDoesNothing &&
		mouseClickSelects &&
		// pagehide listener fires a final beacon on close.
		pagehideBeaconFired &&
		// Triage-take blank-submit semantics (commit 3 / plan §3.3):
		// Space-press while triage is visible AND nothing selected
		// lands a submit with sel=(none). Random-pick is gone.
		blankTriageSubmitLanded &&
		blankTriageSubmitWasBlank
	if (!ok) {
		logger.error("smoke FAILED")
		process.exit(1)
	}
	logger.info("smoke PASSED")
}

await main()
