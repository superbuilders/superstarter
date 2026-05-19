"use client"

import * as errors from "@superbuilders/errors"
import { useRouter } from "next/navigation"
import * as React from "react"
import {
	playTick,
	startUrgencyLoop,
	stopUrgencyLoop,
	unlockAudio
} from "@/components/focus-shell/audio-ticker"
import {
	COMBINED_BARS_TUTORIAL_STEP_INDEX,
	FOCUS_TUTORIAL_STEPS,
	FocusTutorialOverlay,
	PER_QUESTION_TUTORIAL_STEP_INDEX,
	type TutorialRect,
	type TutorialTargetKey
} from "@/components/focus-shell/focus-tutorial-overlay"
import {
	shouldShowTutorialOnNextRunState,
	useFocusPrefs
} from "@/components/focus-shell/focus-prefs"
import { Heartbeat } from "@/components/focus-shell/heartbeat"
import { InterQuestionCard } from "@/components/focus-shell/inter-question-card"
import { ItemSlot } from "@/components/focus-shell/item-slot"
import { QuestionProgressionBar } from "@/components/focus-shell/question-progression-bar"
import { QuestionTimerBarStack } from "@/components/focus-shell/question-timer-bar-stack"
import { formatRemaining, SessionTimerBar } from "@/components/focus-shell/session-timer-bar"
import {
	initShellState,
	makeReducer,
	type ShellAction,
	type TickContext
} from "@/components/focus-shell/shell-reducer"
import type { FocusShellProps, ItemForRender, SubmitAttemptInput } from "@/components/focus-shell/types"
import { cn } from "@/lib/utils"
import { logger } from "@/logger"

const TUTORIAL_SESSION_DEMO_DURATION_MS = 900000
const TUTORIAL_SESSION_RED_STATE_DELAY_MS = 18000

type FocusShellState = ReturnType<typeof initShellState>
type TutorialRects = Partial<Record<TutorialTargetKey, TutorialRect>>
type AppRouter = ReturnType<typeof useRouter>

const TUTORIAL_TARGET_KEYS = [
	"session-clock",
	"timing-overview",
	"question-progress",
	"overall-time",
	"per-question-time",
	"question-prompt",
	"answer-choices",
	"submit-button"
] as const

type FocusShellRunningProps = FocusShellProps & {
	startMs: number
	warningSoundEnabled: boolean
	previewMode?: boolean
	tutorialStepIndex?: number
	onTutorialBack?: () => void
	onTutorialNext?: () => void
	onTutorialSkip?: () => void
	onTutorialFinish?: () => void
}

interface TutorialRegionRefs {
	rootRef: React.RefObject<HTMLDivElement | null>
	clockRef: React.RefObject<HTMLDivElement | null>
	questionProgressBarRef: React.RefObject<HTMLDivElement | null>
	overallTimeRef: React.RefObject<HTMLDivElement | null>
	questionTimeRef: React.RefObject<HTMLDivElement | null>
	submitButtonRef: React.RefObject<HTMLButtonElement | null>
}

interface ReplayTutorialControl {
	replayTutorialStepIndex: number | null
	openReplayTutorial: () => void
	replayBack: () => void
	replayNext: () => void
	closeReplayTutorial: () => void
}

interface TutorialOverlayControls {
	onBack: () => void
	onNext: () => void
	onSkip: () => void
	onFinish: () => void
}

interface FocusShellRuntimeEffectsArgs {
	dispatch: React.Dispatch<ShellAction>
	performSubmit: () => Promise<void>
	previewMode: boolean
	router: AppRouter
	sessionDurationMs: number | null
	sessionId: string
	state: FocusShellState
	stateRef: React.RefObject<FocusShellState>
	tutorialOverlayOpen: boolean
	warningSoundEnabled: boolean
	perQuestionTargetMs: number
	onEndSession: () => Promise<void>
}

interface FocusShellChromeState {
	behindPace: boolean
	chronometerNode: React.ReactNode
	currentQuestionIndex: number
	isLastQuestion: boolean
	questionNumber: number
	sessionBarNode: React.ReactNode
}

interface TutorialAudioEvent {
	kind: "tick" | "warning"
	atMs: number
}

const TUTORIAL_PREVIEW_ITEM: ItemForRender = {
	id: "tutorial-preview-item",
	body: { kind: "text", text: "What is 30% of 200?" },
	options: [
		{ id: "tutorial-a", text: "30" },
		{ id: "tutorial-b", text: "40" },
		{ id: "tutorial-c", text: "60" },
		{ id: "tutorial-d", text: "90" }
	],
	selection: { servedAtTier: "easy", fallbackLevel: "fresh" }
}

function readRect(node: Element | null): TutorialRect | undefined {
	if (!(node instanceof HTMLElement)) return undefined
	const rect = node.getBoundingClientRect()
	return {
		top: rect.top,
		left: rect.left,
		width: rect.width,
		height: rect.height
	}
}

function queryRegionRect(root: HTMLDivElement | null, region: string): TutorialRect | undefined {
	if (!root) return undefined
	const node = root.querySelector(`[data-focus-tutorial-region="${region}"]`)
	return readRect(node)
}

function combineTutorialRects(
	rects: ReadonlyArray<TutorialRect | undefined>
): TutorialRect | undefined {
	const definedRects = rects.filter(function isDefined(
		rect
	): rect is TutorialRect {
		return rect !== undefined
	})
	if (definedRects.length === 0) return undefined
	const firstRect = definedRects[0]
	if (firstRect === undefined) return undefined
	let top = firstRect.top
	let left = firstRect.left
	let right = firstRect.left + firstRect.width
	let bottom = firstRect.top + firstRect.height
	for (const rect of definedRects.slice(1)) {
		top = Math.min(top, rect.top)
		left = Math.min(left, rect.left)
		right = Math.max(right, rect.left + rect.width)
		bottom = Math.max(bottom, rect.top + rect.height)
	}
	return {
		top,
		left,
		width: right - left,
		height: bottom - top
	}
}

function buildTimingOverviewRect(
	questionProgressRect: TutorialRect | undefined,
	overallTimeRect: TutorialRect | undefined
): TutorialRect | undefined {
	return combineTutorialRects([questionProgressRect, overallTimeRect])
}

function buildTutorialPerQuestionAudioSchedule(
	perQuestionTargetMs: number
): ReadonlyArray<TutorialAudioEvent> {
	const targetSec = perQuestionTargetMs / 1000
	const halfSec = targetSec / 2
	const events: TutorialAudioEvent[] = []
	for (let second = 1; second < targetSec; second += 1) {
		if (second > halfSec) {
			events.push({ kind: "tick", atMs: second * 1000 })
		}
	}
	events.push({ kind: "warning", atMs: perQuestionTargetMs })
	return events
}

function isCombinedBarsTutorialStep(stepIndex: number | null): boolean {
	return stepIndex === COMBINED_BARS_TUTORIAL_STEP_INDEX
}

function isPerQuestionTutorialStep(stepIndex: number | null): boolean {
	return stepIndex === PER_QUESTION_TUTORIAL_STEP_INDEX
}

function isTimerDemoTutorialStep(stepIndex: number | null): boolean {
	return isCombinedBarsTutorialStep(stepIndex) || isPerQuestionTutorialStep(stepIndex)
}

function maybePrimeTutorialDemoAudio(stepIndex: number): void {
	if (!isTimerDemoTutorialStep(stepIndex)) return
	unlockAudio()
}

function resolvePreviewTutorialStepIndex(stepIndex: number | undefined): number {
	if (stepIndex === undefined) return 0
	return stepIndex
}

function resolveActiveTutorialStepIndex(
	previewMode: boolean | undefined,
	tutorialStepIndex: number | undefined,
	replayTutorialStepIndex: number | null
): number | null {
	if (previewMode) {
		return resolvePreviewTutorialStepIndex(tutorialStepIndex)
	}
	return replayTutorialStepIndex
}

function tutorialRectEquals(left: TutorialRect | undefined, right: TutorialRect | undefined): boolean {
	if (left === right) return true
	if (left === undefined || right === undefined) return false
	return (
		left.top === right.top &&
		left.left === right.left &&
		left.width === right.width &&
		left.height === right.height
	)
}

function tutorialRectsEqual(left: TutorialRects, right: TutorialRects): boolean {
	for (const key of TUTORIAL_TARGET_KEYS) {
		if (!tutorialRectEquals(left[key], right[key])) return false
	}
	return true
}

function useTutorialRects(enabled: boolean, refs: TutorialRegionRefs): TutorialRects {
	const [tutorialRects, setTutorialRects] = React.useState<TutorialRects>({})
	const { rootRef, clockRef, questionProgressBarRef, overallTimeRef, questionTimeRef, submitButtonRef } = refs

	React.useLayoutEffect(
		function syncTutorialRects() {
			if (!enabled) return
			function measureTutorialRects(): TutorialRects {
				const root = rootRef.current
				const questionProgressRect = readRect(questionProgressBarRef.current)
				const overallTimeRect = readRect(overallTimeRef.current)
				return {
					"session-clock": readRect(clockRef.current),
					"timing-overview": buildTimingOverviewRect(questionProgressRect, overallTimeRect),
					"question-progress": questionProgressRect,
					"overall-time": overallTimeRect,
					"per-question-time": readRect(questionTimeRef.current),
					"question-prompt": queryRegionRect(root, "question-prompt"),
					"answer-choices": queryRegionRect(root, "answer-choices"),
					"submit-button": readRect(submitButtonRef.current)
				}
			}
			function updateRects() {
				const nextRects = measureTutorialRects()
				setTutorialRects(function keepPreviousIfUnchanged(previousRects) {
					if (tutorialRectsEqual(previousRects, nextRects)) return previousRects
					return nextRects
				})
			}
			updateRects()
			window.addEventListener("resize", updateRects)
			window.addEventListener("scroll", updateRects, true)
			const observer = new ResizeObserver(function onResize() {
				updateRects()
			})
			const refNodes: ReadonlyArray<HTMLElement | null> = [
				rootRef.current,
				clockRef.current,
				questionProgressBarRef.current,
				overallTimeRef.current,
				questionTimeRef.current,
				submitButtonRef.current
			]
			for (const node of refNodes) {
				if (node) observer.observe(node)
			}
			const promptNode = rootRef.current?.querySelector(
				"[data-focus-tutorial-region='question-prompt']"
			)
			if (promptNode instanceof HTMLElement) observer.observe(promptNode)
			const choicesNode = rootRef.current?.querySelector(
				"[data-focus-tutorial-region='answer-choices']"
			)
			if (choicesNode instanceof HTMLElement) observer.observe(choicesNode)
			return function cleanup() {
				window.removeEventListener("resize", updateRects)
				window.removeEventListener("scroll", updateRects, true)
				observer.disconnect()
			}
		},
		[
			clockRef,
			enabled,
			overallTimeRef,
			questionProgressBarRef,
			questionTimeRef,
			rootRef,
			submitButtonRef
		]
	)

	return tutorialRects
}

function useTutorialDemoAudio(
	tutorialOverlayOpen: boolean,
	perQuestionAudioDemoActive: boolean,
	tutorialDemoCycle: number,
	perQuestionTargetMs: number
): void {
	const postTargetIntervalRef = React.useRef<number | null>(null)

	React.useEffect(
		function runTutorialPerQuestionDemoAudio() {
			void tutorialDemoCycle
			if (!tutorialOverlayOpen) return
			if (!perQuestionAudioDemoActive) return
			stopUrgencyLoop()
			unlockAudio()
			const schedule = buildTutorialPerQuestionAudioSchedule(perQuestionTargetMs)
			const eventTimeouts = schedule.map(function scheduleEvent(event) {
				if (event.kind === "tick") {
					return window.setTimeout(playTick, event.atMs)
				}
				return window.setTimeout(startUrgencyLoop, event.atMs)
			})
			const postTargetStartMs = (Math.floor(perQuestionTargetMs / 1000) + 1) * 1000
			const postTargetStartTimeout = window.setTimeout(function startPostTargetTicks() {
				playTick()
				const intervalId = window.setInterval(playTick, 1000)
				postTargetIntervalRef.current = intervalId
			}, postTargetStartMs)
			return function cleanup() {
				for (const timeoutId of eventTimeouts) {
					window.clearTimeout(timeoutId)
				}
				window.clearTimeout(postTargetStartTimeout)
				const postTargetIntervalId = postTargetIntervalRef.current
				if (postTargetIntervalId !== null) {
					window.clearInterval(postTargetIntervalId)
					postTargetIntervalRef.current = null
				}
				stopUrgencyLoop()
			}
		},
		[tutorialOverlayOpen, perQuestionAudioDemoActive, tutorialDemoCycle, perQuestionTargetMs]
	)
}

function useReplayTutorialControl(
	previewMode: boolean | undefined,
	dispatch: React.Dispatch<ShellAction>
): ReplayTutorialControl {
	const [replayTutorialStepIndex, setReplayTutorialStepIndex] = React.useState<number | null>(null)
	const pauseStartedAtRef = React.useRef<number | null>(null)

	function shiftTimersForReplayPause(): void {
		if (previewMode) return
		const pausedAtMs = pauseStartedAtRef.current
		if (pausedAtMs === null) return
		pauseStartedAtRef.current = null
		const durationMs = performance.now() - pausedAtMs
		if (durationMs <= 0) return
		dispatch({ kind: "pause_shift", durationMs })
	}

	function openReplayTutorial(): void {
		if (previewMode) return
		pauseStartedAtRef.current = performance.now()
		setReplayTutorialStepIndex(0)
	}

	function closeReplayTutorial(): void {
		setReplayTutorialStepIndex(null)
		shiftTimersForReplayPause()
	}

	function replayBack(): void {
		setReplayTutorialStepIndex(function update(step) {
			let current = 0
			if (typeof step === "number") current = step
			const next = Math.max(0, current - 1)
			maybePrimeTutorialDemoAudio(next)
			return next
		})
	}

	function replayNext(): void {
		setReplayTutorialStepIndex(function update(step) {
			let current = 0
			if (typeof step === "number") current = step
			const next = Math.min(current + 1, FOCUS_TUTORIAL_STEPS.length - 1)
			maybePrimeTutorialDemoAudio(next)
			return next
		})
	}

	return {
		replayTutorialStepIndex,
		openReplayTutorial,
		replayBack,
		replayNext,
		closeReplayTutorial
	}
}

function useTutorialStepDemoCycle(
	activeTutorialStepIndex: number | null,
	tutorialOverlayOpen: boolean
): number {
	const [tutorialDemoCycle, setTutorialDemoCycle] = React.useState(0)

	React.useEffect(
		function restartTutorialDemoCycle() {
			if (!tutorialOverlayOpen) return
			if (!isTimerDemoTutorialStep(activeTutorialStepIndex)) return
			setTutorialDemoCycle(function advance(current) {
				return current + 1
			})
		},
		[activeTutorialStepIndex, tutorialOverlayOpen]
	)

	return tutorialDemoCycle
}

function useTutorialSessionBarDemo(
	tutorialOverlayOpen: boolean,
	timerDemoActive: boolean,
	activeTutorialStepIndex: number | null
): { sessionBarDemoBehindPace: boolean; sessionBarDemoCycle: number } {
	const [sessionBarDemoCycle, setSessionBarDemoCycle] = React.useState(0)
	const [sessionBarDemoBehindPace, setSessionBarDemoBehindPace] = React.useState(false)

	React.useEffect(
		function runSessionBarDemo() {
			void activeTutorialStepIndex
			if (!tutorialOverlayOpen || !timerDemoActive) {
				setSessionBarDemoBehindPace(false)
				return
			}
			setSessionBarDemoCycle(function advance(current) {
				return current + 1
			})
			setSessionBarDemoBehindPace(false)
			const timeoutId = window.setTimeout(function flipBehindPace() {
				setSessionBarDemoBehindPace(true)
			}, TUTORIAL_SESSION_RED_STATE_DELAY_MS)
			return function cleanup() {
				window.clearTimeout(timeoutId)
			}
		},
		[activeTutorialStepIndex, timerDemoActive, tutorialOverlayOpen]
	)

	return { sessionBarDemoBehindPace, sessionBarDemoCycle }
}

function useTutorialSessionClockDemo(
	tutorialOverlayOpen: boolean,
	timerDemoActive: boolean,
	tutorialDemoCycle: number,
	sessionDurationMs: number | null
): number | null {
	const [elapsedMs, setElapsedMs] = React.useState<number | null>(null)

	React.useEffect(
		function runTutorialSessionClockDemo() {
			void tutorialDemoCycle
			if (!tutorialOverlayOpen || !timerDemoActive || sessionDurationMs === null) {
				setElapsedMs(null)
				return
			}
			const durationMs = sessionDurationMs
			const startedAtMs = performance.now()
			let rafId = 0
			function tick() {
				const nextElapsedMs = Math.min(durationMs, performance.now() - startedAtMs)
				setElapsedMs(nextElapsedMs)
				rafId = requestAnimationFrame(tick)
			}
			tick()
			return function cleanup() {
				cancelAnimationFrame(rafId)
			}
		},
		[sessionDurationMs, timerDemoActive, tutorialDemoCycle, tutorialOverlayOpen]
	)

	return elapsedMs
}

function useShellStateRef(state: FocusShellState): React.RefObject<FocusShellState> {
	const stateRef = React.useRef(state)

	React.useLayoutEffect(
		function syncStateRef() {
			stateRef.current = state
		},
		[state]
	)

	return stateRef
}

function useFocusShellRuntimeEffects(args: FocusShellRuntimeEffectsArgs): void {
	const prevSecondRef = React.useRef<number>(-1)
	const prevPostTargetSecondRef = React.useRef<number>(-1)
	const sessionEndedRef = React.useRef<boolean>(false)
	const questionsRemaining = args.state.questionsRemaining

	React.useEffect(
		function startTickLoop() {
			if (args.previewMode || args.tutorialOverlayOpen) return
			let rafId = 0
			function tick() {
				args.dispatch({ kind: "tick", nowMs: performance.now() })
				rafId = requestAnimationFrame(tick)
			}
			rafId = requestAnimationFrame(tick)
			return function stopTickLoop() {
				cancelAnimationFrame(rafId)
			}
		},
		[args.dispatch, args.previewMode, args.tutorialOverlayOpen]
	)

	React.useEffect(
		function runSubmitWhenPending() {
			if (args.previewMode || args.tutorialOverlayOpen) return
			if (!args.state.submitPending) return
			async function run() {
				const result = await errors.try(args.performSubmit())
				if (result.error) {
					logger.error(
						{ error: result.error, sessionId: args.sessionId },
						"focus-shell: performSubmit threw"
					)
					args.dispatch({ kind: "submit_failed" })
				}
			}
			void run()
		},
		[
			args.dispatch,
			args.performSubmit,
			args.previewMode,
			args.sessionId,
			args.state.submitPending,
			args.tutorialOverlayOpen
		]
	)

	React.useEffect(
		function unlockAudioOnMount() {
			if (args.previewMode) return
			if (!args.warningSoundEnabled) return
			unlockAudio()
		},
		[args.previewMode, args.warningSoundEnabled]
	)

	React.useEffect(
		function attachAudioUnlockOnFirstInteraction() {
			if (args.previewMode) return
			if (!args.warningSoundEnabled) return
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
		},
		[args.previewMode, args.warningSoundEnabled]
	)

	React.useEffect(
		function resetTickTrackingOnAdvance() {
			void questionsRemaining
			prevSecondRef.current = -1
			prevPostTargetSecondRef.current = -1
		},
		[questionsRemaining]
	)

	React.useEffect(
		function silenceWarningAudioWhenDisabled() {
			if (args.previewMode || args.tutorialOverlayOpen) {
				stopUrgencyLoop()
				return
			}
			if (args.warningSoundEnabled) return
			stopUrgencyLoop()
		},
		[args.previewMode, args.tutorialOverlayOpen, args.warningSoundEnabled]
	)

	React.useEffect(
		function maybePlayPreTargetTicks() {
			if (args.previewMode || args.tutorialOverlayOpen) return
			if (!args.warningSoundEnabled) return
			const secondsElapsed = Math.floor(args.state.elapsedQuestionMs / 1000)
			if (secondsElapsed === prevSecondRef.current) return
			const targetSec = args.perQuestionTargetMs / 1000
			const halfSec = targetSec / 2
			const start = prevSecondRef.current + 1
			for (let s = start; s <= secondsElapsed; s += 1) {
				if (s > halfSec && s < targetSec) {
					playTick()
				}
			}
			prevSecondRef.current = secondsElapsed
		},
		[
			args.perQuestionTargetMs,
			args.previewMode,
			args.state.elapsedQuestionMs,
			args.tutorialOverlayOpen,
			args.warningSoundEnabled
		]
	)

	React.useEffect(
		function maybeStartUrgencyLoop() {
			if (args.previewMode || args.tutorialOverlayOpen) return
			if (!args.warningSoundEnabled) return
			if (args.state.elapsedQuestionMs < args.perQuestionTargetMs) return
			if (args.state.urgencyLoopStartedForCurrentQuestion) return
			startUrgencyLoop()
			args.dispatch({ kind: "urgency_loop_started" })
		},
		[
			args.dispatch,
			args.perQuestionTargetMs,
			args.previewMode,
			args.state.elapsedQuestionMs,
			args.state.urgencyLoopStartedForCurrentQuestion,
			args.tutorialOverlayOpen,
			args.warningSoundEnabled
		]
	)

	React.useEffect(
		function maybePlayPostTargetTicks() {
			if (args.previewMode || args.tutorialOverlayOpen) return
			if (!args.warningSoundEnabled) return
			if (args.state.elapsedQuestionMs < args.perQuestionTargetMs) return
			const secondsElapsed = Math.floor(args.state.elapsedQuestionMs / 1000)
			if (secondsElapsed === prevPostTargetSecondRef.current) return
			const targetSec = args.perQuestionTargetMs / 1000
			const start = Math.max(prevPostTargetSecondRef.current + 1, Math.floor(targetSec) + 1)
			for (let s = start; s <= secondsElapsed; s += 1) {
				playTick()
			}
			prevPostTargetSecondRef.current = secondsElapsed
		},
		[
			args.perQuestionTargetMs,
			args.previewMode,
			args.state.elapsedQuestionMs,
			args.tutorialOverlayOpen,
			args.warningSoundEnabled
		]
	)

	React.useEffect(
		function stopUrgencyLoopOnAdvance() {
			void questionsRemaining
			return function cleanup() {
				stopUrgencyLoop()
			}
		},
		[questionsRemaining]
	)

	React.useEffect(
		function maybeAutoEndSession() {
			if (args.previewMode || args.tutorialOverlayOpen) return
			if (args.sessionDurationMs === null) return
			if (args.state.elapsedSessionMs < args.sessionDurationMs) return
			if (sessionEndedRef.current) return
			sessionEndedRef.current = true
			args.dispatch({ kind: "session_ended" })
			if (typeof window !== "undefined") {
				const detail = { sessionId: args.sessionId, elapsedMs: args.state.elapsedSessionMs }
				window.dispatchEvent(new CustomEvent("session-ended", { detail }))
			}
			async function runAutoEnd(): Promise<void> {
				const endResult = await errors.try(args.onEndSession())
				if (endResult.error) {
					logger.error(
						{ error: endResult.error, sessionId: args.sessionId },
						"focus-shell: auto-end onEndSession threw — proceeding to navigation anyway"
					)
				}
				args.router.push(`/post-session/${args.sessionId}`)
			}
			void runAutoEnd()
		},
		[
			args.dispatch,
			args.onEndSession,
			args.previewMode,
			args.router,
			args.sessionDurationMs,
			args.sessionId,
			args.state.elapsedSessionMs,
			args.tutorialOverlayOpen
		]
	)

	React.useEffect(
		function keepStateRefFresh() {
			args.stateRef.current = args.state
		},
		[args.state, args.stateRef]
	)
}

function buildFocusShellChromeState(
	props: FocusShellRunningProps,
	state: FocusShellState,
	tutorialOverlayOpen: boolean,
	timerDemoActive: boolean,
	sessionBarDemoBehindPace: boolean,
	sessionBarDemoCycle: number,
	tutorialSessionClockElapsedMs: number | null
): FocusShellChromeState {
	const sessionDurationMs = props.sessionDurationMs
	const sessionBarDemoActive = tutorialOverlayOpen && timerDemoActive
	const questionNumber = props.targetQuestionCount - state.questionsRemaining + 1
	const currentQuestionIndex = props.targetQuestionCount - state.questionsRemaining
	const behindPaceThresholdMs = (currentQuestionIndex + 1) * props.perQuestionTargetMs
	const behindPace = sessionBarDemoActive
		? sessionBarDemoBehindPace
		: sessionDurationMs !== null && state.elapsedSessionMs > behindPaceThresholdMs
	const isLastQuestion =
		sessionDurationMs !== null &&
		props.sessionType === "diagnostic" &&
		state.elapsedSessionMs >= sessionDurationMs
	let chronometerNode: React.ReactNode = null
	let sessionBarNode: React.ReactNode = null
	if (sessionDurationMs !== null) {
		const sessionElapsedMs =
			tutorialSessionClockElapsedMs === null
				? state.elapsedSessionMs
				: tutorialSessionClockElapsedMs
		const readout = formatRemaining(sessionDurationMs, sessionElapsedMs)
		const sessionBarSessionId = sessionBarDemoActive
			? `tutorial-session-${sessionBarDemoCycle}`
			: props.sessionId
		const sessionBarDurationMs = sessionBarDemoActive
			? TUTORIAL_SESSION_DEMO_DURATION_MS
			: sessionDurationMs
		const sessionBarPaused = tutorialOverlayOpen ? !sessionBarDemoActive : false
		const sessionBarAnimationDurationMs = sessionBarDemoActive
			? TUTORIAL_SESSION_DEMO_DURATION_MS
			: undefined
		chronometerNode = (
			<span className="font-bold text-5xl text-foreground tabular-nums tracking-tight md:text-6xl">
				{readout}
			</span>
		)
		sessionBarNode = (
			<SessionTimerBar
				sessionId={sessionBarSessionId}
				durationMs={sessionBarDurationMs}
				behindPace={behindPace}
				paused={sessionBarPaused}
				animationDurationMs={sessionBarAnimationDurationMs}
			/>
		)
	}
	return {
		behindPace,
		chronometerNode,
		currentQuestionIndex,
		isLastQuestion,
		questionNumber,
		sessionBarNode
	}
}

function resolveTutorialOverlayControls(
	previewMode: boolean | undefined,
	tutorialOverlayOpen: boolean,
	replayTutorial: ReplayTutorialControl,
	props: FocusShellRunningProps
): TutorialOverlayControls | null {
	if (!tutorialOverlayOpen) return null
	if (previewMode) {
		if (!props.onTutorialBack) return null
		if (!props.onTutorialNext) return null
		if (!props.onTutorialSkip) return null
		if (!props.onTutorialFinish) return null
		return {
			onBack: props.onTutorialBack,
			onNext: props.onTutorialNext,
			onSkip: props.onTutorialSkip,
			onFinish: props.onTutorialFinish
		}
	}
	return {
		onBack: replayTutorial.replayBack,
		onNext: replayTutorial.replayNext,
		onSkip: replayTutorial.closeReplayTutorial,
		onFinish: replayTutorial.closeReplayTutorial
	}
}

function FocusShellRunning(props: FocusShellRunningProps) {
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
	const stateRef = useShellStateRef(state)
	const replayTutorial = useReplayTutorialControl(
		props.previewMode,
		dispatch
	)
	const activeTutorialStepIndex = resolveActiveTutorialStepIndex(
		props.previewMode,
		props.tutorialStepIndex,
		replayTutorial.replayTutorialStepIndex
	)
	const tutorialOverlayOpen = activeTutorialStepIndex !== null
	const timerDemoActive = isTimerDemoTutorialStep(activeTutorialStepIndex)
	const perQuestionAudioDemoActive = isTimerDemoTutorialStep(activeTutorialStepIndex)
	const tutorialDemoCycle = useTutorialStepDemoCycle(activeTutorialStepIndex, tutorialOverlayOpen)
	const tutorialSessionClockElapsedMs = useTutorialSessionClockDemo(
		tutorialOverlayOpen,
		timerDemoActive,
		tutorialDemoCycle,
		props.sessionDurationMs
	)
	const rootRef = React.useRef<HTMLDivElement | null>(null)
	const clockRef = React.useRef<HTMLDivElement | null>(null)
	const questionProgressBarRef = React.useRef<HTMLDivElement | null>(null)
	const overallTimeRef = React.useRef<HTMLDivElement | null>(null)
	const questionTimeRef = React.useRef<HTMLDivElement | null>(null)
	const submitButtonRef = React.useRef<HTMLButtonElement | null>(null)
	const tutorialRects = useTutorialRects(tutorialOverlayOpen, {
		rootRef,
		clockRef,
		questionProgressBarRef,
		overallTimeRef,
		questionTimeRef,
		submitButtonRef
	})
	useTutorialDemoAudio(
		tutorialOverlayOpen,
		perQuestionAudioDemoActive,
		tutorialDemoCycle,
		props.perQuestionTargetMs
	)

	const performSubmit = React.useCallback(
		async function performSubmit(): Promise<void> {
			const snapshot = stateRef.current
			const submitNowMs = performance.now()
			const latencyMs = Math.max(0, Math.floor(submitNowMs - snapshot.questionStartedAtMs))
			const input: SubmitAttemptInput = {
				sessionId: props.sessionId,
				itemId: snapshot.currentItem.id,
				selectedAnswer: snapshot.selectedOptionId,
				latencyMs,
				selection: snapshot.currentItem.selection
			}
			dispatch({ kind: "submit_started" })
			const submitResult = await errors.try(props.onSubmitAttempt(input))
			if (submitResult.error) {
				logger.error(
					{ error: submitResult.error, sessionId: props.sessionId, itemId: input.itemId },
					"focus-shell: onSubmitAttempt threw"
				)
				dispatch({ kind: "submit_failed" })
				return
			}
			const result = submitResult.data
			if (result.nextItem === undefined) {
				const endResult = await errors.try(props.onEndSession())
				if (endResult.error) {
					logger.error(
						{ error: endResult.error, sessionId: props.sessionId },
						"focus-shell: onEndSession threw"
					)
					dispatch({ kind: "submit_failed" })
				}
				return
			}
			dispatch({ kind: "advance", next: result.nextItem, nowMs: performance.now() })
		},
		[props.onEndSession, props.onSubmitAttempt, props.sessionId, stateRef]
	)

	const router = useRouter()
	useFocusShellRuntimeEffects({
		dispatch,
		performSubmit,
		previewMode: props.previewMode === true,
		router,
		sessionDurationMs: props.sessionDurationMs,
		sessionId: props.sessionId,
		state,
		stateRef,
		tutorialOverlayOpen,
		warningSoundEnabled: props.warningSoundEnabled,
		perQuestionTargetMs: props.perQuestionTargetMs,
		onEndSession: props.onEndSession
	})

	const { sessionBarDemoBehindPace, sessionBarDemoCycle } = useTutorialSessionBarDemo(
		tutorialOverlayOpen,
		timerDemoActive,
		activeTutorialStepIndex
	)
	const chromeState = buildFocusShellChromeState(
		props,
		state,
		tutorialOverlayOpen,
		timerDemoActive,
		sessionBarDemoBehindPace,
		sessionBarDemoCycle,
		tutorialSessionClockElapsedMs
	)
	const progressionBarNode = (
		<div ref={questionProgressBarRef}>
			<QuestionProgressionBar
				totalQuestions={props.targetQuestionCount}
				questionsRemaining={state.questionsRemaining}
			/>
		</div>
	)
	const questionTimerNode = (
		<QuestionTimerBarStack
			itemId={timerDemoActive ? `tutorial-demo-${tutorialDemoCycle}` : state.currentItem.id}
			perQuestionTargetMs={props.perQuestionTargetMs}
			paused={tutorialOverlayOpen ? !timerDemoActive : false}
			animationDurationMs={timerDemoActive ? props.perQuestionTargetMs : undefined}
		/>
	)
	const lastQuestionSuffix = chromeState.isLastQuestion ? " — last question" : ""
	const submitDisabled = state.submitPending
	const strictModeAttr = String(props.strictMode)
	const overlayControls = resolveTutorialOverlayControls(
		props.previewMode,
		tutorialOverlayOpen,
		replayTutorial,
		props
	)
	const tutorialClockAlwaysVisible = tutorialOverlayOpen && timerDemoActive

	return (
		<div
			ref={rootRef}
			data-strict-mode={strictModeAttr}
			className={cn(
				"flex min-h-dvh w-full flex-col px-6 pt-4 pb-8",
				"font-[ui-sans-serif,system-ui,-apple-system,Arial,sans-serif]"
			)}
		>
			<main className="mx-auto flex w-full max-w-3xl flex-1 flex-col">
				{chromeState.chronometerNode !== null ? (
					<div className="mb-4 flex items-center justify-end gap-3">
						{!props.previewMode ? (
							<button
								type="button"
								onClick={replayTutorial.openReplayTutorial}
								className="rounded-full border border-foreground/12 px-3 py-1.5 text-foreground/72 text-sm transition-colors hover:bg-foreground/5 hover:text-foreground"
							>
								Guide
							</button>
						) : null}
						<div
							ref={clockRef}
							className={cn("flex justify-end", tutorialClockAlwaysVisible && "relative z-[60]")}
							data-focus-tutorial-region="session-clock"
						>
							{chromeState.chronometerNode}
						</div>
					</div>
				) : null}
				<div data-focus-tutorial-region="timing-overview">
					<div data-focus-tutorial-region="question-progress">
						{progressionBarNode}
						<div className="mt-2 text-foreground/70 text-sm">
							Question <strong className="text-foreground">{chromeState.questionNumber}</strong>
							{" / "}
							{props.targetQuestionCount}
							{lastQuestionSuffix}
						</div>
					</div>
					{chromeState.sessionBarNode !== null ? (
						<div ref={overallTimeRef} className="mt-2" data-focus-tutorial-region="overall-time">
							{chromeState.sessionBarNode}
						</div>
					) : null}
					<div ref={questionTimeRef} className="mt-2" data-focus-tutorial-region="per-question-time">
						{questionTimerNode}
					</div>
				</div>
				<hr className="mt-3 border-foreground/10" />
				<div className="mt-6 flex flex-col gap-5">
					<ItemSlot
						key={state.currentItem.id}
						item={state.currentItem}
						subTypeId={props.subTypeId}
						selectedOptionId={state.selectedOptionId}
						onSelectOption={function selectOption(optionId: string) {
							if (props.previewMode || tutorialOverlayOpen) return
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
						ref={submitButtonRef}
						data-focus-tutorial-region="submit-button"
						type="button"
						onClick={function clickSubmit() {
							if (props.previewMode || tutorialOverlayOpen) return
							if (state.submitPending) return
							if (props.warningSoundEnabled) {
								unlockAudio()
							}
							dispatch({ kind: "submit", nowMs: performance.now() })
						}}
						disabled={submitDisabled}
						className={cn(
							"w-full rounded-md bg-blue-600 px-6 py-3 font-medium text-sm text-white transition-colors",
							"hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600",
							"disabled:cursor-not-allowed disabled:opacity-50"
						)}
					>
						Submit Answer
					</button>
				</div>
			</main>
			<InterQuestionCard visible={state.interQuestionVisible} />
			<Heartbeat sessionId={props.sessionId} />
			{tutorialOverlayOpen && overlayControls ? (
				<FocusTutorialOverlay
					stepIndex={activeTutorialStepIndex}
					targetRects={tutorialRects}
					onBack={overlayControls.onBack}
					onNext={overlayControls.onNext}
					onSkip={overlayControls.onSkip}
					onFinish={overlayControls.onFinish}
				/>
			) : null}
		</div>
	)
}

interface FocusTutorialPreviewProps {
	onFinish: () => void
	onSkip: () => void
}

function FocusTutorialPreview(props: FocusTutorialPreviewProps) {
	const { prefs } = useFocusPrefs()
	const [tutorialStepIndex, setTutorialStepIndex] = React.useState<number>(0)

	const goToTutorialStep = React.useCallback(function goToTutorialStep(nextStepIndex: number) {
		maybePrimeTutorialDemoAudio(nextStepIndex)
		setTutorialStepIndex(nextStepIndex)
	}, [])

	const onSubmitAttempt = React.useCallback(async function onSubmitAttempt() {
		return {}
	}, [])

	const onEndSession = React.useCallback(async function onEndSession(): Promise<void> {
		return undefined
	}, [])

	return (
		<FocusShellRunning
			key="tutorial-preview"
			sessionId="tutorial-preview"
			sessionType="drill"
			subTypeId="numerical.percentage"
			sessionDurationMs={900_000}
			perQuestionTargetMs={18_000}
			targetQuestionCount={50}
			paceTrackVisible
			initialItem={TUTORIAL_PREVIEW_ITEM}
			strictMode={false}
			startMs={0}
			warningSoundEnabled={prefs.warningSoundEnabled}
			previewMode
			tutorialStepIndex={tutorialStepIndex}
			onTutorialBack={function onBack() {
				goToTutorialStep(Math.max(0, tutorialStepIndex - 1))
			}}
			onTutorialNext={function onNext() {
				goToTutorialStep(Math.min(tutorialStepIndex + 1, FOCUS_TUTORIAL_STEPS.length - 1))
			}}
			onTutorialSkip={props.onSkip}
			onTutorialFinish={props.onFinish}
			onSubmitAttempt={onSubmitAttempt}
			onEndSession={onEndSession}
		/>
	)
}

interface FocusTutorialBeforePrimerGateProps {
	children: React.ReactNode
	userKey?: string
}

function FocusTutorialBeforePrimerGate(props: FocusTutorialBeforePrimerGateProps) {
	const { tutorialLocal, tutorialSession, completeTutorialDismissal } = useFocusPrefs(props.userKey)
	if (shouldShowTutorialOnNextRunState(tutorialSession, tutorialLocal)) {
		return (
			<FocusTutorialPreview
				onFinish={completeTutorialDismissal}
				onSkip={completeTutorialDismissal}
			/>
		)
	}
	return <>{props.children}</>
}

function FocusShell(props: FocusShellProps) {
	const { prefs } = useFocusPrefs()
	const [shellStartAtMs] = React.useState<number>(function initStart() {
		return performance.now()
	})

	return (
		<FocusShellRunning
			key={shellStartAtMs}
			{...props}
			startMs={shellStartAtMs}
			warningSoundEnabled={prefs.warningSoundEnabled}
		/>
	)
}

export type { FocusShellProps, TutorialAudioEvent }
export {
	buildTimingOverviewRect,
	buildTutorialPerQuestionAudioSchedule,
	combineTutorialRects,
	FocusShell,
	FocusTutorialBeforePrimerGate,
	FocusTutorialPreview
}
