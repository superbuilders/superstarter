"use client"

// <FocusShell> — the single load-bearing client primitive of the
// application. SPEC §6 / Plan §5.
//
// Phase 3 polish commit 2 restyle: layout matches
// data/example_ccat_formatting/*.png. Central column with a
// large MM:SS chronometer top-right, thin session-progress bar (FILL
// mode — grows left-to-right as the session elapses), small "Question
// N / 50" label, thin divider, large question text, optional
// per-question timer above the options, tall option buttons,
// full-width "Submit Answer" CTA. Triage prompt re-docked top-center
// per §5.4.
//
// Focus-shell overhaul commit 2 removed the 18-block per-question
// countdown depletion that previously sat above the question. The
// per-question time bar (overhaul commit 5) replaces that affordance.
//
// Owns:
// - the useReducer state (shell-reducer.ts)
// - the requestAnimationFrame tick loop (dispatches `tick` every frame)
// - the Space-key listener for triage-take (only fires when the triage
//   prompt is visible — see commit 3 / plan §3.2). The real CCAT has
//   NO keyboard shortcuts; the Space-on-triage shortcut survives only
//   because the triage prompt is our pedagogical layer, not CCAT
//   mechanics. Digit / letter / Enter shortcuts were stripped in
//   commit 3 / plan §3.0.
// - the async server-action calls (onSubmitAttempt, onEndSession)
//
// Renders:
// - chrome row: chronometer top-right + session-progress bar +
//   "Question N / 50" + cosmetic last-question indicator
// - content area: per-question timer above the <ItemSlot>
//   (latency-anchor host, KEYED on currentItem.id), then the
//   full-width Submit Answer CTA
// - overlays: <TriagePrompt> (top-center), <InterQuestionCard>,
//   <Heartbeat> (sibling to <ItemSlot>)
//
// The diagnostic overtime-note machinery was removed in this commit —
// the diagnostic now hard-stops at 15 minutes server-side
// (commit 1's `submitAttempt` cutoff). The cosmetic last-question
// indicator below replaces the soft note.

import * as errors from "@superbuilders/errors"
import { useRouter } from "next/navigation"
import * as React from "react"
import { playTick, startUrgencyLoop, stopUrgencyLoop, unlockAudio } from "@/components/focus-shell/audio-ticker"
import { Heartbeat } from "@/components/focus-shell/heartbeat"
import { InterQuestionCard } from "@/components/focus-shell/inter-question-card"
import { ItemSlot } from "@/components/focus-shell/item-slot"
import { QuestionProgressionBar } from "@/components/focus-shell/question-progression-bar"
import { QuestionTimerBarStack } from "@/components/focus-shell/question-timer-bar-stack"
import { SessionTimerBar, formatRemaining } from "@/components/focus-shell/session-timer-bar"
import {
	type TickContext,
	initShellState,
	makeReducer
} from "@/components/focus-shell/shell-reducer"
import { TriagePrompt } from "@/components/focus-shell/triage-prompt"
import type { FocusShellProps, SubmitAttemptInput } from "@/components/focus-shell/types"
import { logger } from "@/logger"
import { cn } from "@/lib/utils"

function FocusShell(props: FocusShellProps) {
	const tickCtx: TickContext = React.useMemo(
		function buildCtx() {
			return {
				perQuestionTargetMs: props.perQuestionTargetMs,
				sessionType: props.sessionType
			}
		},
		[props.perQuestionTargetMs, props.sessionType]
	)
	const reducer = React.useMemo(
		function buildReducer() {
			return makeReducer(tickCtx)
		},
		[tickCtx]
	)
	const [state, dispatch] = React.useReducer(reducer, null, function init() {
		return initShellState({
			initialItem: props.initialItem,
			targetQuestionCount: props.targetQuestionCount,
			startMs: performance.now()
		})
	})

	// requestAnimationFrame tick loop — drives elapsed values and
	// triage-prompt firing. The diagnostic-overtime-note check that
	// previously also lived here was removed in commit 2 (see file
	// header).
	React.useEffect(function startTickLoop() {
		let rafId = 0
		function tick() {
			dispatch({ kind: "tick", nowMs: performance.now() })
			rafId = requestAnimationFrame(tick)
		}
		rafId = requestAnimationFrame(tick)
		return function stopTickLoop() {
			cancelAnimationFrame(rafId)
		}
	}, [])

	const stateRef = React.useRef(state)
	// `useLayoutEffect` (not `useEffect`) so the ref syncs synchronously
	// after commit, before any browser-paint-or-event handler can read a
	// stale value. The Space-key listener and other event handlers read
	// `stateRef.current` to make decisions; with a regular `useEffect`,
	// a Space keypress in the microsecond window between commit and the
	// post-paint useEffect would read stale `triagePromptFired` /
	// `submitPending` flags. See docs/plans/focus-shell-post-overhaul-
	// fixes.md §2 candidate #3.
	React.useLayoutEffect(
		function syncStateRef() {
			stateRef.current = state
		},
		[state]
	)

	const onSubmitAttempt = props.onSubmitAttempt
	const onEndSession = props.onEndSession
	const sessionId = props.sessionId

	const performSubmit = React.useCallback(
		async function performSubmit(): Promise<void> {
			const snapshot = stateRef.current
			const submitNowMs = performance.now()
			const latencyMs = Math.max(
				0,
				Math.floor(submitNowMs - snapshot.questionStartedAtMs)
			)
			const input: SubmitAttemptInput = {
				sessionId,
				itemId: snapshot.currentItem.id,
				selectedAnswer: snapshot.selectedOptionId,
				latencyMs,
				triagePromptFired: snapshot.triagePromptFired,
				triageTaken: snapshot.triageTaken,
				selection: snapshot.currentItem.selection
			}
			dispatch({ kind: "submit_started" })
			const submitResult = await errors.try(onSubmitAttempt(input))
			if (submitResult.error) {
				logger.error(
					{ error: submitResult.error, sessionId, itemId: input.itemId },
					"focus-shell: onSubmitAttempt threw"
				)
				return
			}
			const result = submitResult.data
			if (result.nextItem === undefined) {
				const endResult = await errors.try(onEndSession())
				if (endResult.error) {
					logger.error(
						{ error: endResult.error, sessionId },
						"focus-shell: onEndSession threw"
					)
				}
				return
			}
			dispatch({
				kind: "advance",
				next: result.nextItem,
				nowMs: performance.now()
			})
		},
		[onSubmitAttempt, onEndSession, sessionId]
	)

	// Drive the async submit when submitPending flips true. We use a
	// flag-on-state-and-effect pattern so triage_take and the Submit
	// button funnel through the same path.
	React.useEffect(
		function runSubmitWhenPending() {
			if (!state.submitPending) return
			async function run() {
				const result = await errors.try(performSubmit())
				if (result.error) {
					logger.error(
						{ error: result.error, sessionId },
						"focus-shell: performSubmit threw"
					)
				}
			}
			void run()
		},
		[state.submitPending, performSubmit, sessionId]
	)

	// Space-key listener for triage-take. Per plan §3.2, this is the
	// only keyboard shortcut in the focus shell. Fires only when the
	// triage prompt is visible (`triagePromptFired === true`); when the
	// prompt is hidden, Space does nothing (no submit, no select). The
	// reducer's own `submitPending` guard is the secondary defense
	// against double-take.
	//
	// `event.code === "Space"` is layout-independent (Dvorak / AZERTY
	// users get the same physical key). `event.key === " "` is the
	// fallback for environments where `code` is unavailable.
	React.useEffect(function attachTriageKeyboard() {
		function onKey(event: KeyboardEvent) {
			const target = event.target
			if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) {
				return
			}
			// `event.code === "Space"` is layout-independent (Dvorak / AZERTY
			// users get the same physical key). `event.key === " "` is the
			// fallback for environments where `code` is unavailable. The
			// boolean OR sits inside an `if` test (allowed by
			// no-logical-or-fallback rule's "boolean conditionals" carve-out)
			// rather than being assigned to a const.
			if (event.code !== "Space" && event.key !== " ") return
			if (!stateRef.current.triagePromptFired) return
			event.preventDefault()
			if (stateRef.current.submitPending) return
			// User interaction — unlock audio (idempotent) so the
			// triage-take's potential dong-firing window has a live
			// AudioContext.
			unlockAudio()
			dispatch({ kind: "triage_take", nowMs: performance.now() })
		}
		window.addEventListener("keydown", onKey)
		return function detachTriageKeyboard() {
			window.removeEventListener("keydown", onKey)
		}
	}, [])

	// Three-layer audio-unlock defense for the FocusShell entry path.
	// All three layers stay; redundancy is the design (audio-unlock can
	// fail silently in browser-policy-specific ways, so we don't want
	// any single layer to be load-bearing on its own).
	//
	// LAYER 1 — `/diagnostic` page uses `<Link>` (not plain `<a>`) so the
	// click on "Start Diagnostic" stays an SPA navigation. Same-document
	// SPA navigation preserves the browser's transient user-activation
	// window (~5s) across the route change. (Source:
	// src/app/(diagnostic-flow)/diagnostic/page.tsx, BUG 2 commit 3.)
	//
	// LAYER 2 — this mount effect: consume the preserved user-activation
	// synchronously by calling `unlockAudio()` once at mount, no event
	// gating. The mount-effect runs during React's commit phase, well
	// within the ~5s window from the Link click that initiated the
	// navigation. `AudioContext` is created + resumed; threshold ticks
	// at sec 10/18 fire against a running context without requiring any
	// post-mount user interaction. (BUG 2 commit 3.5.)
	//
	// LAYER 3 — the listener below: defense-in-depth for entry paths
	// that DON'T have a same-document prior click (direct URL entry,
	// browser back/forward, future routes not yet converted to SPA).
	// One-shot pointerdown/keydown on `window`; fires `unlockAudio()`
	// the first time the user interacts with the new document. The
	// listener can't catch the Link click that initiated this mount
	// (the click already fired before the listener attached), so this
	// layer doesn't help the SPA-navigation case — that's why layer 2
	// exists. (BUG 2 commit 1, b02590a.)
	React.useEffect(function unlockAudioOnMount() {
		// Consume the user-activation window preserved by the SPA
		// navigation from `/diagnostic`. `unlockAudio()` is idempotent
		// (checks `audioCtx === undefined` before construction; checks
		// `state === "suspended"` before resume), so the post-mount
		// handlers (option-select, submit, triage Space, triage Take,
		// layer 3's listener) continue to call it as no-ops once the
		// context is open. Returns nothing — no cleanup needed because
		// the AudioContext lives at module scope in audio-ticker.ts and
		// outlives any single FocusShell mount.
		unlockAudio()
	}, [])

	React.useEffect(function attachAudioUnlockOnFirstInteraction() {
		function onFirstInteraction() {
			unlockAudio()
			window.removeEventListener("pointerdown", onFirstInteraction)
			window.removeEventListener("keydown", onFirstInteraction)
		}
		window.addEventListener("pointerdown", onFirstInteraction)
		window.addEventListener("keydown", onFirstInteraction)
		return function detach() {
			window.removeEventListener("pointerdown", onFirstInteraction)
			window.removeEventListener("keydown", onFirstInteraction)
		}
	}, [])

	// Audio: hybrid two-path model (post-overhaul-fixes round commit 2.5,
	// SPEC §6.12). Two distinct sounds per question:
	//   1. Pre-target synth ticks at integer seconds in the second half
	//      of perQuestionTargetMs. For an 18s target: ticks at seconds
	//      10, 11, 12, 13, 14, 15, 16, 17. 880Hz sine, ~50ms decay,
	//      0.12 peak gain.
	//   2. At second 18 (= perQuestionTargetMs), a randomly-picked MP3
	//      from data/sounds/ starts looping. Loop continues until item
	//      advance. The loop's first second of playback replaces the
	//      synth dong from the prior round's commit 6.
	//
	// The audio-ticker module picks the MP3 ONCE per session at unlock
	// time; the same file plays for every question that crosses target.
	// In v1 (post-cleanup-commit-2 2026-05-04) the per-question timer
	// bar is always visible, so audio is unconditional — the prior
	// `timerPrefs.questionTimerVisible` gate was removed alongside the
	// timer-toggle UX cut. The reducer's
	// `urgencyLoopStartedForCurrentQuestion` flag prevents double-starts
	// within a question; the synth ticks use a useRef-tracked
	// previous-integer-second value (no reducer state) to prevent
	// double-fires within a render batch.
	// Use `state.questionsRemaining` (NOT `state.currentItem.id`) as the
	// per-question reset signal. The id can be re-served by the server
	// when the recency / session-soft fallback chain exhausts uniqueness
	// in a small bank — see SPEC §6.14.5. `questionsRemaining` decrements
	// on EVERY advance regardless, so it's the more reliable trigger.
	const questionsRemaining = state.questionsRemaining
	const prevSecondRef = React.useRef<number>(-1)
	React.useEffect(
		function resetTickTrackingOnAdvance() {
			// Reset the cross-second-detection ref on advance so the next
			// item's tick window starts fresh from second 0.
			void questionsRemaining
			prevSecondRef.current = -1
		},
		[questionsRemaining]
	)
	React.useEffect(
		function maybePlayPreTargetTicks() {
			const secondsElapsed = Math.floor(state.elapsedQuestionMs / 1000)
			if (secondsElapsed === prevSecondRef.current) return
			const targetSec = props.perQuestionTargetMs / 1000
			const halfSec = targetSec / 2
			const start = prevSecondRef.current + 1
			for (let s = start; s <= secondsElapsed; s += 1) {
				if (s > halfSec && s < targetSec) {
					playTick()
				}
			}
			prevSecondRef.current = secondsElapsed
		},
		[state.elapsedQuestionMs, props.perQuestionTargetMs]
	)
	React.useEffect(
		function maybeStartUrgencyLoop() {
			if (state.elapsedQuestionMs < props.perQuestionTargetMs) return
			if (state.urgencyLoopStartedForCurrentQuestion) return
			startUrgencyLoop()
			dispatch({ kind: "urgency_loop_started" })
		},
		[
			state.elapsedQuestionMs,
			state.urgencyLoopStartedForCurrentQuestion,
			props.perQuestionTargetMs
		]
	)
	React.useEffect(
		function stopUrgencyLoopOnAdvance() {
			// Cleanup-on-questionsRemaining-change. Decrements on every
			// advance regardless of whether the server returned the same
			// item id (see SPEC §6.14.5 / "currentItemId vs
			// questionsRemaining" rationale above). Stops the urgency
			// loop uniformly across every advance path: Submit click,
			// Space-triage take, click-triage take, server-end. The
			// cleanup also fires on component unmount, which catches the
			// "user navigated away mid-question" case.
			void questionsRemaining
			return function cleanup() {
				stopUrgencyLoop()
			}
		},
		[questionsRemaining]
	)

	const sessionDurationMs = props.sessionDurationMs

	// Session auto-end (commit 7). When the session timer reaches zero,
	// fire onEndSession and navigate to /post-session/<sessionId>.
	// Diagnostic sessions pass `sessionDurationMs={null}` and skip this
	// branch — the diagnostic uses the server-side cutoff in
	// submitAttempt instead (polish-plan §3.1 / §4.2). Same
	// double-guard as commit 6's dong: reducer flag is canonical state,
	// useRef is the synchronous race-prevention.
	const router = useRouter()
	const sessionEndedRef = React.useRef<boolean>(false)
	React.useEffect(
		function maybeAutoEndSession() {
			if (sessionDurationMs === null) return
			if (state.elapsedSessionMs < sessionDurationMs) return
			if (sessionEndedRef.current) return
			sessionEndedRef.current = true
			dispatch({ kind: "session_ended" })
			// Verification-harness instrumentation: dispatch a
			// production-safe CustomEvent. No-op when nothing listens.
			// Mirrors the audio-ticker CustomEvent pattern from commit 6.
			if (typeof window !== "undefined") {
				const detail = { sessionId, elapsedMs: state.elapsedSessionMs }
				window.dispatchEvent(new CustomEvent("session-ended", { detail }))
			}
			async function runAutoEnd(): Promise<void> {
				const endResult = await errors.try(onEndSession())
				if (endResult.error) {
					logger.error(
						{ error: endResult.error, sessionId },
						"focus-shell: auto-end onEndSession threw — proceeding to navigation anyway"
					)
				}
				router.push(`/post-session/${sessionId}`)
			}
			void runAutoEnd()
		},
		[state.elapsedSessionMs, sessionDurationMs, sessionId, onEndSession, router]
	)

	// Cosmetic last-question indicator (plan §5.6). Server is the
	// source of truth for the cutoff; this is purely a UI hint flipped
	// when elapsedSessionMs crosses the threshold.
	const isLastQuestion =
		sessionDurationMs !== null &&
		props.sessionType === "diagnostic" &&
		state.elapsedSessionMs >= sessionDurationMs

	// Pace-deficit color (post-overhaul-fixes follow-up, SPEC §6.6):
	// the session-timer bar's fill is BLUE when within the cumulative
	// per-question budget for the current question, RED only after the
	// elapsed session time exceeds that budget. "Behind pace" is
	// computed here in the shell and threaded down as a prop so the
	// bar component stays a pure presenter. Diagnostic sessions
	// (`sessionDurationMs === null`) are exempt — the diagnostic isn't
	// paced at the session level — so behindPace is held false there.
	//
	// Threshold formula: `(currentQuestionIndex + 1) × perQuestionTargetMs`.
	// In words: "the cumulative time you've been allotted to STILL be
	// on the current question." For Q1 (currentQuestionIndex=0) of an
	// 18s-target session, behind starts at t=18s — being at t=10s on
	// Q1 is on-pace, not behind. For Q2 (currentQuestionIndex=1) of a
	// 50q × 18s session, behind starts at t=36s. For Q49 of 50, behind
	// starts at t=14:42 (882s) — at t=2 min the user is well ahead of
	// pace. The formula matches the "you should have moved past Q_K by
	// now" intuition rather than the earlier ratio-based formulation,
	// which fired red on Q1 the moment any time elapsed.
	const currentQuestionIndex = props.targetQuestionCount - state.questionsRemaining
	const behindPaceThresholdMs = (currentQuestionIndex + 1) * props.perQuestionTargetMs
	const behindPace =
		sessionDurationMs !== null && state.elapsedSessionMs > behindPaceThresholdMs

	// Build the peripheral nodes inside narrowed branches so we don't
	// have to re-check `sessionDurationMs !== null` when passing as a
	// prop. Hidden entirely when the session has no duration (diagnostic).
	// The user-facing timer-toggle UX was cut from v1 2026-05-04
	// (v1-code-cleanup commit 2); session-timer visibility is now static
	// per session type — visible iff `sessionDurationMs !== null`.
	let chronometerNode: React.ReactNode = null
	let sessionBarNode: React.ReactNode = null
	if (sessionDurationMs !== null) {
		const readout = formatRemaining(sessionDurationMs, state.elapsedSessionMs)
		chronometerNode = (
			<span className="font-bold text-5xl text-foreground tabular-nums tracking-tight md:text-6xl">
				{readout}
			</span>
		)
		sessionBarNode = (
			<SessionTimerBar
				sessionId={props.sessionId}
				durationMs={sessionDurationMs}
				behindPace={behindPace}
			/>
		)
	}

	// Question progression bar is unconditional — it's a "you're on
	// question K of N" indicator, not a session-pace measurement, so
	// it renders for every session type regardless of session-timer
	// visibility or the legacy `paceTrackVisible` flag (which is now
	// vestigial; commit 3 of the focus-shell overhaul leaves it on
	// the props shape for now to avoid disrupting the drill /
	// diagnostic content components, but no render path reads it).
	// Always blue — the pace-deficit color signal moved to the
	// session-timer bar in the post-overhaul-fixes follow-up.
	const progressionBarNode = (
		<QuestionProgressionBar
			totalQuestions={props.targetQuestionCount}
			questionsRemaining={state.questionsRemaining}
		/>
	)

	// Question-timer bar always visible in v1 (post-cleanup-commit-2
	// 2026-05-04). The prior `state.timerPrefs.questionTimerVisible`
	// gate was removed alongside the timer-toggle UX cut.
	const questionTimerNode = (
		<QuestionTimerBarStack
			itemId={state.currentItem.id}
			perQuestionTargetMs={props.perQuestionTargetMs}
		/>
	)

	const questionNumber = props.targetQuestionCount - state.questionsRemaining + 1
	const lastQuestionSuffix = isLastQuestion ? " — last question" : ""

	const strictModeAttr = String(props.strictMode)

	const submitDisabled = state.submitPending

	return (
		<div
			data-strict-mode={strictModeAttr}
			className={cn("flex min-h-dvh w-full flex-col px-6 py-8")}
		>
			<main className="mx-auto flex w-full max-w-3xl flex-1 flex-col">
				{/* chrome row — chronometer top-right, then progression
				    bar, then "Question N / M" label, then session
				    timer, then per-question timer stack, then divider.
				    The question label sits between the segmented count
				    indicator (progression) and the timed-pace indicator
				    (session) so the count signal reads first, paired
				    with its number. */}
				{chronometerNode !== null ? (
					<div className="mb-4 flex justify-end">{chronometerNode}</div>
				) : null}
				{progressionBarNode}
				<div className="mt-2 text-foreground/70 text-sm">
					Question <strong className="text-foreground">{questionNumber}</strong>
					{" / "}
					{props.targetQuestionCount}
					{lastQuestionSuffix}
				</div>
				{sessionBarNode !== null ? <div className="mt-2">{sessionBarNode}</div> : null}
				<div className="mt-2">{questionTimerNode}</div>
				<hr className="mt-3 border-foreground/10" />

				{/* content area — question text + options inside <ItemSlot>,
				    then the full-width Submit Answer CTA. The per-question
				    timer bar moved to the chrome row above (commit 5 of
				    the focus-shell overhaul) so all three bars (question
				    progression, per-question, session) stack together. */}
				<div className="mt-8 flex flex-col gap-6">
					{/*
					 * LOAD-BEARING: do not remove the `key={state.currentItem.id}`
					 * prop. The keyed mount is what re-runs <ItemSlot>'s mount
					 * effect, which captures `performance.now()` at first paint
					 * of every new item and dispatches `set_question_started` —
					 * the latency anchor. The 5-minute tripwire in
					 * src/server/sessions/submit.ts is the safety net; this key
					 * is the contract.
					 * See docs/plans/phase-3-practice-surface.md §9.1 +
					 * docs/plans/phase-3-polish-practice-surface-features.md §5.5.
					 */}
					<ItemSlot
						key={state.currentItem.id}
						item={state.currentItem}
						selectedOptionId={state.selectedOptionId}
						onSelectOption={function selectOption(optionId: string) {
							// User interaction — unlock audio (idempotent) so any
							// subsequent tick / dong fires can produce sound.
							unlockAudio()
							dispatch({ kind: "select", optionId })
						}}
						onMounted={function onItemMounted(nowMs: number) {
							dispatch({ kind: "set_question_started", nowMs })
						}}
					/>
					<button
						type="button"
						onClick={function clickSubmit() {
							if (state.submitPending) return
							// User interaction — unlock audio (idempotent). The
							// blank-submit path (no option selected) is the only
							// FocusShell entry where neither <ItemPrompt> nor the
							// triage Space-press has fired first, so this is the
							// late-binding unlock for that flow.
							unlockAudio()
							dispatch({ kind: "submit", nowMs: performance.now() })
						}}
						disabled={submitDisabled}
						className={cn(
							// Solid blue per the target screenshots (the indigo-ish tone in
							// example_03/04). `bg-blue-600` matches the closest Tailwind token.
							// Disabled state collapses to neutral gray via opacity-50.
							"w-full rounded-md bg-blue-600 px-6 py-4 font-medium text-base text-white transition-colors",
							"hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600",
							"disabled:cursor-not-allowed disabled:opacity-50"
						)}
					>
						Submit Answer
					</button>
				</div>
			</main>

			{/* overlays — outside the central column. */}
			<TriagePrompt
				visible={state.triagePromptFired}
				onTake={function takeTriage() {
					// User interaction — unlock audio (idempotent). The
					// click path through <TriagePrompt> didn't previously
					// call unlock; without it, a triage take from a
					// suspended-AudioContext state would never resume the
					// context and subsequent ticks/loops would silently
					// fail. The Space-key path already unlocks.
					unlockAudio()
					dispatch({ kind: "triage_take", nowMs: performance.now() })
				}}
			/>
			<InterQuestionCard visible={state.interQuestionVisible} />
			<Heartbeat sessionId={props.sessionId} />
		</div>
	)
}

export type { FocusShellProps }
export { FocusShell }
