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
// full-width "Submit Answer" CTA.
//
// Focus-shell overhaul commit 2 removed the 18-block per-question
// countdown depletion that previously sat above the question. The
// per-question time bar (overhaul commit 5) replaces that affordance.
//
// Owns:
// - the useReducer state (shell-reducer.ts)
// - the requestAnimationFrame tick loop (dispatches `tick` every frame)
// - the async server-action calls (onSubmitAttempt, onEndSession)
//
// The shell has NO keyboard shortcuts — the real CCAT is mouse-and-click
// only and we mirror that.
//
// Renders:
// - chrome row: chronometer top-right + session-progress bar +
//   "Question N / 50" + cosmetic last-question indicator
// - content area: per-question timer above the <ItemSlot>
//   (latency-anchor host, KEYED on currentItem.id), then the
//   full-width Submit Answer CTA
// - overlays: <InterQuestionCard>, <Heartbeat> (sibling to <ItemSlot>)

import * as errors from "@superbuilders/errors"
import { useRouter } from "next/navigation"
import * as React from "react"
import {
	playTick,
	startUrgencyLoop,
	stopUrgencyLoop,
	unlockAudio
} from "@/components/focus-shell/audio-ticker"
import { useFocusPrefs } from "@/components/focus-shell/focus-prefs"
import { Heartbeat } from "@/components/focus-shell/heartbeat"
import { InterQuestionCard } from "@/components/focus-shell/inter-question-card"
import { FocusTutorialOverlay } from "@/components/focus-shell/focus-tutorial-overlay"
import { ItemSlot } from "@/components/focus-shell/item-slot"
import { QuestionProgressionBar } from "@/components/focus-shell/question-progression-bar"
import { QuestionTimerBarStack } from "@/components/focus-shell/question-timer-bar-stack"
import { formatRemaining, SessionTimerBar } from "@/components/focus-shell/session-timer-bar"
import {
	initShellState,
	makeReducer,
	type TickContext
} from "@/components/focus-shell/shell-reducer"
import type { FocusShellProps, SubmitAttemptInput } from "@/components/focus-shell/types"
import { cn } from "@/lib/utils"
import { logger } from "@/logger"

function FocusShellRunning(props: FocusShellProps & { startMs: number; warningSoundEnabled: boolean }) {
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
			startMs: props.startMs
		})
	})

	// requestAnimationFrame tick loop — drives elapsed values for the
	// per-question and session timers + the inter-question card's
	// auto-clear deadline.
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
	// stale value. The submit handlers read `stateRef.current` to make
	// decisions; with a regular `useEffect`, a click in the microsecond
	// window between commit and the post-paint useEffect would read
	// stale `submitPending` / `selectedOptionId` flags.
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
			const latencyMs = Math.max(0, Math.floor(submitNowMs - snapshot.questionStartedAtMs))
			const input: SubmitAttemptInput = {
				sessionId,
				itemId: snapshot.currentItem.id,
				selectedAnswer: snapshot.selectedOptionId,
				latencyMs,
				selection: snapshot.currentItem.selection
			}
			dispatch({ kind: "submit_started" })
			const submitResult = await errors.try(onSubmitAttempt(input))
			if (submitResult.error) {
				logger.error(
					{ error: submitResult.error, sessionId, itemId: input.itemId },
					"focus-shell: onSubmitAttempt threw"
				)
				dispatch({ kind: "submit_failed" })
				return
			}
			const result = submitResult.data
			if (result.nextItem === undefined) {
				const endResult = await errors.try(onEndSession())
				if (endResult.error) {
					logger.error({ error: endResult.error, sessionId }, "focus-shell: onEndSession threw")
					dispatch({ kind: "submit_failed" })
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

	// Drive the async submit when submitPending flips true. The
	// `submit` action and the Submit button funnel through the same
	// flag-on-state-and-effect pattern.
	React.useEffect(
		function runSubmitWhenPending() {
			if (!state.submitPending) return
			async function run() {
				const result = await errors.try(performSubmit())
				if (result.error) {
					logger.error({ error: result.error, sessionId }, "focus-shell: performSubmit threw")
					dispatch({ kind: "submit_failed" })
				}
			}
			void run()
		},
		[state.submitPending, performSubmit, sessionId]
	)

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
		if (!props.warningSoundEnabled) return
		// Consume the user-activation window preserved by the SPA
		// navigation from `/diagnostic`. `unlockAudio()` is idempotent
		// (checks `audioCtx === undefined` before construction; checks
		// `state === "suspended"` before resume), so the post-mount
		// handlers (option-select, submit, layer 3's listener) continue
		// to call it as no-ops once the context is open. Returns nothing
		// — no cleanup needed because
		// the AudioContext lives at module scope in audio-ticker.ts and
		// outlives any single FocusShell mount.
		unlockAudio()
	}, [props.warningSoundEnabled])

	React.useEffect(function attachAudioUnlockOnFirstInteraction() {
		if (!props.warningSoundEnabled) return
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
	}, [props.warningSoundEnabled])

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
	// Round 1 §5.9 (Path C) — second cross-second-detection ref for the
	// post-target tick stream. Lives parallel to prevSecondRef so the
	// pre-target and post-target streams don't collide at the boundary
	// (otherwise a single ref would skip the warning second on the
	// transition). Reset together on advance.
	const prevPostTargetSecondRef = React.useRef<number>(-1)
	React.useEffect(
		function resetTickTrackingOnAdvance() {
			// Reset the cross-second-detection refs on advance so the next
			// item's tick windows (pre-target + post-target) both start
			// fresh from second 0.
			void questionsRemaining
			prevSecondRef.current = -1
			prevPostTargetSecondRef.current = -1
		},
		[questionsRemaining]
	)
	React.useEffect(function silenceWarningAudioWhenDisabled() {
		if (props.warningSoundEnabled) return
		stopUrgencyLoop()
	}, [props.warningSoundEnabled])
	React.useEffect(
		function maybePlayPreTargetTicks() {
			if (!props.warningSoundEnabled) return
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
		[state.elapsedQuestionMs, props.perQuestionTargetMs, props.warningSoundEnabled]
	)
	React.useEffect(
		function maybeStartUrgencyLoop() {
			if (!props.warningSoundEnabled) return
			if (state.elapsedQuestionMs < props.perQuestionTargetMs) return
			if (state.urgencyLoopStartedForCurrentQuestion) return
			// Per Round 1 §5.9 (Path C) + SPEC §6.12 amendment: the
			// "urgency loop" is now a one-shot warning sample (the
			// `source.loop = true` flag in audio-ticker was retired).
			// The reducer flag + action names retain "Loop" for blast-
			// radius reasons; the behavior they gate is the warning
			// sample firing once at target crossing.
			startUrgencyLoop()
			dispatch({ kind: "urgency_loop_started" })
		},
		[state.elapsedQuestionMs, state.urgencyLoopStartedForCurrentQuestion, props.perQuestionTargetMs, props.warningSoundEnabled]
	)
	React.useEffect(
		function maybePlayPostTargetTicks() {
			if (!props.warningSoundEnabled) return
			// Round 1 §5.9 (Path C) — sibling to maybePlayPreTargetTicks.
			// Mirrors that effect's strict-greater-than-target structure:
			// pre-target fires synth ticks at integer seconds in the
			// half-open range (halfSec, targetSec); this effect fires at
			// integer seconds strictly greater than targetSec, with no
			// upper bound (cleanup on advance via questionsRemaining is
			// the terminator). For an 18s target: pre-target = 10..17,
			// warning = at second 18, post-target ticks = 19, 20, 21, …
			// until the user submits or the server advances.
			if (state.elapsedQuestionMs < props.perQuestionTargetMs) return
			const secondsElapsed = Math.floor(state.elapsedQuestionMs / 1000)
			if (secondsElapsed === prevPostTargetSecondRef.current) return
			const targetSec = props.perQuestionTargetMs / 1000
			// First post-target tick fires at floor(targetSec) + 1 (so for
			// an 18s target, second 19). Math.max with the prev ref + 1
			// preserves the "haven't already fired this second" guard
			// across re-renders.
			const start = Math.max(prevPostTargetSecondRef.current + 1, Math.floor(targetSec) + 1)
			for (let s = start; s <= secondsElapsed; s += 1) {
				playTick()
			}
			prevPostTargetSecondRef.current = secondsElapsed
		},
		[state.elapsedQuestionMs, props.perQuestionTargetMs, props.warningSoundEnabled]
	)
	React.useEffect(
		function stopUrgencyLoopOnAdvance() {
			// Cleanup-on-questionsRemaining-change. Decrements on every
			// advance regardless of whether the server returned the same
			// item id (see SPEC §6.14.5 / "currentItemId vs
			// questionsRemaining" rationale above). Stops the urgency
			// loop uniformly across every advance path: Submit click and
			// server-end. The cleanup also fires on component unmount,
			// which catches the "user navigated away mid-question" case.
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
	// branch — the diagnostic is untimed at the session level per PRD
	// §4.1 capacity-measurement framing (the polish-round 15-min
	// server-side cutoff was reverted; see plan-doc §0.15). Same
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
	const behindPace = sessionDurationMs !== null && state.elapsedSessionMs > behindPaceThresholdMs

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
			className={cn(
				"flex min-h-dvh w-full flex-col px-6 pt-4 pb-8",
				// Question-page font scoped to <FocusShell>: override the global
				// Plus Jakarta Sans body font with a neutral system sans (Arial /
				// Helvetica look) so the live-test surface mirrors the reference
				// CCAT screenshots. Cascades via CSS inheritance to <ItemPrompt>,
				// <OptionButton>, and the question body — chronometer + timer
				// labels inherit too. Underscore is Tailwind's "space inside
				// arbitrary value" escape.
				"font-[ui-sans-serif,system-ui,-apple-system,Arial,sans-serif]"
			)}
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
				<div className="mt-6 flex flex-col gap-5">
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
						subTypeId={props.subTypeId}
						selectedOptionId={state.selectedOptionId}
						onSelectOption={function selectOption(optionId: string) {
							// User interaction — unlock audio (idempotent) so any
							// subsequent tick / dong fires can produce sound.
							if (props.warningSoundEnabled) {
								unlockAudio()
							}
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
							// FocusShell entry where <ItemPrompt> hasn't fired
							// first, so this is the late-binding unlock for that
							// flow.
							if (props.warningSoundEnabled) {
								unlockAudio()
							}
							dispatch({ kind: "submit", nowMs: performance.now() })
						}}
						disabled={submitDisabled}
						className={cn(
							// Solid blue per the target screenshots (the indigo-ish tone in
							// example_03/04). `bg-blue-600` matches the closest Tailwind token.
							// Disabled state collapses to neutral gray via opacity-50.
							"w-full rounded-md bg-blue-600 px-6 py-3 font-medium text-sm text-white transition-colors",
							"hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600",
							"disabled:cursor-not-allowed disabled:opacity-50"
						)}
					>
						Submit Answer
					</button>
				</div>
			</main>

			{/* overlays — outside the central column. */}
			<InterQuestionCard visible={state.interQuestionVisible} />
			<Heartbeat sessionId={props.sessionId} />
		</div>
	)
}

function FocusShell(props: FocusShellProps) {
	const { prefs, completeTutorialDismissal } = useFocusPrefs()
	const tutorialRequired = prefs.tutorialSeen ? prefs.tutorialReplayPending : true
	const [tutorialStepIndex, setTutorialStepIndex] = React.useState<number>(0)
	const [shellStartAtMs, setShellStartAtMs] = React.useState<number | null>(function initStartGate() {
		if (tutorialRequired) return null
		return performance.now()
	})

	React.useEffect(
		function syncStartGateWhenTutorialNotNeeded() {
			if (shellStartAtMs !== null) return
			if (tutorialRequired) return
			setShellStartAtMs(performance.now())
		},
		[shellStartAtMs, tutorialRequired]
	)

	React.useEffect(
		function resetTutorialStepWhenOpening() {
			if (shellStartAtMs !== null) return
			setTutorialStepIndex(0)
		},
		[shellStartAtMs]
	)

	const dismissTutorial = React.useCallback(function dismissTutorial() {
		completeTutorialDismissal()
		setShellStartAtMs(performance.now())
	}, [completeTutorialDismissal])

	if (shellStartAtMs === null) {
		return (
			<FocusTutorialOverlay
				stepIndex={tutorialStepIndex}
				warningSoundEnabled={prefs.warningSoundEnabled}
				onBack={function onBack() {
					setTutorialStepIndex(function previous(step) {
						return Math.max(0, step - 1)
					})
				}}
				onNext={function onNext() {
					setTutorialStepIndex(function advance(step) {
						return step + 1
					})
				}}
				onSkip={dismissTutorial}
				onFinish={dismissTutorial}
			/>
		)
	}

	return (
		<FocusShellRunning
			key={shellStartAtMs}
			{...props}
			startMs={shellStartAtMs}
			warningSoundEnabled={prefs.warningSoundEnabled}
		/>
	)
}

export type { FocusShellProps }
export { FocusShell }
