"use client"

// Phase 3 commit-2 manual smoke page.
//
// Plan §10 commit 2 specified `_phase3-smoke` but underscore-prefix
// folders are non-routable in Next.js (private folder convention), so
// the smoke route lives at /phase3-smoke. Delete this file at the end
// of Phase 3.
//
// What it does:
// - Mounts <FocusShell> with hand-crafted props.
// - `onSubmitAttempt` is stubbed: returns the next item from a fixed
//   in-memory list (or `{}` after the 5th item).
// - `onEndSession` logs and resolves.
// - The auth proxy still gates this route. Sign in via Google OAuth
//   first.
//
// Manual checks (per plan §10 commit 2):
// 1. First-item paint visible immediately.
// 2. Selection by mouse click; submission via the Submit Answer button.
// 3. The displayed latency value is plausible after submission.
// 4. DevTools Network tab: <Heartbeat> fires sendBeacon at the 30s mark
//    (the route handler lands in commit 3, so the request 404s — that's
//    expected for this smoke).

import * as React from "react"
import { FocusShell } from "@/components/focus-shell/focus-shell"
import type {
	FocusShellProps,
	ItemForRender,
	SubmitAttemptInput,
	SubmitAttemptResult
} from "@/components/focus-shell/types"

const STUB_ITEMS: ReadonlyArray<ItemForRender> = [
	{
		id: "00000000-0000-7000-8000-000000000001",
		body: { kind: "text", text: "What is 1/2 + 1/4?" },
		options: [
			{ id: "stuba001", text: "1/6" },
			{ id: "stuba002", text: "2/6" },
			{ id: "stuba003", text: "3/4" },
			{ id: "stuba004", text: "1/3" }
		],
		selection: { servedAtTier: "easy", fallbackLevel: "fresh" }
	},
	{
		id: "00000000-0000-7000-8000-000000000002",
		body: { kind: "text", text: "Which is the opposite of 'procure'?" },
		options: [
			{ id: "stubb001", text: "replace" },
			{ id: "stubb002", text: "pass" },
			{ id: "stubb003", text: "sell" },
			{ id: "stubb004", text: "place" }
		],
		selection: { servedAtTier: "medium", fallbackLevel: "fresh" }
	},
	{
		id: "00000000-0000-7000-8000-000000000003",
		body: { kind: "text", text: "What is the next number? 2, 4, 8, 16, ?" },
		options: [
			{ id: "stubc001", text: "20" },
			{ id: "stubc002", text: "24" },
			{ id: "stubc003", text: "32" },
			{ id: "stubc004", text: "64" }
		],
		selection: { servedAtTier: "medium", fallbackLevel: "fresh" }
	},
	{
		id: "00000000-0000-7000-8000-000000000004",
		body: { kind: "text", text: "Synonym of 'rapid'?" },
		options: [
			{ id: "stubd001", text: "slow" },
			{ id: "stubd002", text: "swift" },
			{ id: "stubd003", text: "loud" },
			{ id: "stubd004", text: "small" }
		],
		selection: { servedAtTier: "easy", fallbackLevel: "fresh" }
	},
	{
		id: "00000000-0000-7000-8000-000000000005",
		body: { kind: "text", text: "30% of 200 = ?" },
		options: [
			{ id: "stube001", text: "30" },
			{ id: "stube002", text: "60" },
			{ id: "stube003", text: "90" },
			{ id: "stube004", text: "120" }
		],
		selection: { servedAtTier: "hard", fallbackLevel: "fresh" }
	}
]

interface SubmitLogEntry {
	idx: number
	itemId: string
	selectedAnswer: string | undefined
	latencyMs: number
}

// `?qt=` query-string flag dropped 2026-05-04 (v1-code-cleanup
// commit 2) — the timer-toggle UX was cut from v1, so the
// verification harness no longer needs to exercise the
// `questionTimerVisible: false` branch (it's unreachable). The bar
// renders unconditionally in v1.

// Read a one-shot query-string flag for sessionDurationMs override.
// Used by the focus-shell-overhaul commit-7 verification harness to
// drive the session-end auto-redirect without waiting 90s of wall
// clock. Default 90000 (the original 5-question drill length); if
// `?sd=<positive integer>` is present and parses, that value is used.
function readSessionDurationMs(): number {
	const defaultMs = 90_000
	if (typeof window === "undefined") return defaultMs
	const url = new URL(window.location.href)
	const sd = url.searchParams.get("sd")
	if (sd === null) return defaultMs
	const parsed = Number.parseInt(sd, 10)
	if (!Number.isFinite(parsed) || parsed <= 0) return defaultMs
	return parsed
}

function PhaseThreeSmokePage() {
	const [submitLog, setSubmitLog] = React.useState<SubmitLogEntry[]>([])
	const itemIndexRef = React.useRef<number>(0)
	const [sessionDurationMs] = React.useState<number>(readSessionDurationMs)

	const onSubmitAttempt = React.useCallback(async function onSubmitAttempt(
		input: SubmitAttemptInput
	): Promise<SubmitAttemptResult> {
		const idx = itemIndexRef.current
		setSubmitLog(function append(prev) {
			return [
				...prev,
				{
					idx,
					itemId: input.itemId,
					selectedAnswer: input.selectedAnswer,
					latencyMs: input.latencyMs
				}
			]
		})
		itemIndexRef.current = idx + 1
		const next = STUB_ITEMS[idx + 1]
		if (next === undefined) return {}
		return { nextItem: next }
	}, [])

	const onEndSession = React.useCallback(async function onEndSession(): Promise<void> {
		// Smoke-only — production wiring lands in commit 4.
		return undefined
	}, [])

	const firstItem = STUB_ITEMS[0]
	if (!firstItem) {
		return <div>smoke: no items configured</div>
	}

	const props: FocusShellProps = {
		sessionId: "00000000-0000-7000-8000-000000000099",
		sessionType: "drill",
		// Defaults to 90_000 (5q × 18s — one of the enumerated
		// durations the timer-bar duration map supports). The
		// `?sd=<ms>` query-string flag (added in focus-shell overhaul
		// commit 7) overrides for fast verification of the
		// session-timer auto-redirect path without 90s of wall clock.
		sessionDurationMs,
		perQuestionTargetMs: 18_000,
		targetQuestionCount: STUB_ITEMS.length,
		paceTrackVisible: true,
		initialItem: firstItem,
		strictMode: false,
		tutorialExitHref: "/",
		onSubmitAttempt,
		onEndSession
	}

	return (
		<div className="relative">
			<FocusShell {...props} />
			<aside
				aria-label="smoke debug"
				className="fixed top-2 right-2 max-h-96 w-72 overflow-auto rounded border border-foreground/20 bg-background/90 p-2 text-xs shadow"
			>
				<div className="mb-1 font-mono font-semibold">phase3-smoke debug</div>
				<div className="mb-2 text-foreground/70">items submitted: {submitLog.length}</div>
				<ul className="space-y-1">
					{submitLog.map(function renderEntry(entry) {
						let selectedDisplay = "(none)"
						if (entry.selectedAnswer !== undefined) {
							selectedDisplay = entry.selectedAnswer
						}
						return (
							<li key={entry.idx} className="font-mono">
								<div>
									#{entry.idx} latency={entry.latencyMs}ms
								</div>
								<div>sel={selectedDisplay}</div>
							</li>
						)
					})}
				</ul>
			</aside>
		</div>
	)
}

export default PhaseThreeSmokePage
