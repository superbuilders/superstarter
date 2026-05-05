// FocusShell reducer per SPEC §6.2 + plan §5.2/5.3.
//
// The reducer is sync. All async work (the server-action calls in
// onSubmitAttempt / onEndSession) lives in the FocusShell component;
// the reducer only models the shell's local state.
//
// Time semantics:
// - questionStartedAtMs and sessionStartedAtMs are captured in
//   performance.now() coordinates. The component captures them at first
//   paint of each item (questionStartedAtMs) and once at mount
//   (sessionStartedAtMs).
// - elapsedQuestionMs / elapsedSessionMs are derived in the reducer's
//   `tick` handler from the action's `nowMs` minus the start values.
//   They never drift from the start values regardless of how many
//   ticks were dropped (e.g., when a tab is backgrounded).
//
// The diagnostic overtime-note reducer machinery (the
// `diagnostic_overtime_note_shown` action,
// `diagnosticOvertimeNoteShown` / `diagnosticOvertimeNoteVisibleUntilMs`
// state fields, the DIAGNOSTIC_OVERTIME_* constants) is removed. The
// diagnostic is untimed at the session level under the capacity-
// measurement framing (PRD §4.1, plan
// docs/plans/phase3-diagnostic-flow.md §4); pacing feedback after the
// session is rendered post-session as a derived sentence (plan §6).

import * as errors from "@superbuilders/errors"
import type { ItemForRender } from "@/components/focus-shell/types"
import { logger } from "@/logger"

const TRIAGE_TAKEN_WINDOW_MS = 3000
const INTER_QUESTION_FADE_MS = 200

interface ShellState {
	currentItem: ItemForRender
	// performance.now() at first paint of currentItem. Captured by
	// <ItemSlot>'s mount effect, then echoed into state via
	// `set_question_started`. Latency anchor — see plan §9.1 for the
	// risk if this is ever lifted to a non-keyed parent.
	questionStartedAtMs: number
	// performance.now() at session start. Captured once at FocusShell
	// mount and never updated.
	sessionStartedAtMs: number
	elapsedQuestionMs: number
	elapsedSessionMs: number
	triagePromptFired: boolean
	triagePromptFiredAtMs?: number
	triageTaken: boolean
	selectedOptionId?: string
	interQuestionVisible: boolean
	interQuestionVisibleUntilMs?: number
	questionsRemaining: number
	// One-shot flag set by `submit` and consumed by the FocusShell
	// component to invoke onSubmitAttempt asynchronously. Cleared ONLY
	// by `set_question_started` — i.e., when the next item's <ItemSlot>
	// mounts and dispatches the latency anchor. The mid-await
	// `submit_started` action does NOT clear it; otherwise a fast user
	// pressing Enter twice within the await window would dispatch a
	// second submit against the same (now-stale) item snapshot.
	submitPending: boolean
	// Per-question audio gate (post-overhaul-fixes commit 2). True after
	// the urgency-loop has started for the current item (i.e.,
	// elapsedQuestionMs first crossed perQuestionTargetMs and the
	// audio-ticker started the chosen MP3 looping). Reset to false on
	// `advance` so the next item's per-question target re-arms. The
	// loop itself is stopped via `stopUrgencyLoop` from a cleanup-on-
	// item-change effect in FocusShell, NOT from the reducer.
	urgencyLoopStartedForCurrentQuestion: boolean
	// Session-level auto-end gate (commit 7). True after the session
	// timer has reached zero AND the FocusShell has fired its auto-end
	// flow exactly once. Same double-guard pattern as
	// dongPlayedForCurrentQuestion: the reducer flag is canonical state
	// and a synchronous useRef prevents intra-render-batch double-fires.
	sessionEnded: boolean
}

type ShellAction =
	| { kind: "tick"; nowMs: number }
	| { kind: "select"; optionId: string }
	| { kind: "submit"; nowMs: number }
	| { kind: "triage_take"; nowMs: number }
	| { kind: "submit_started" }
	| { kind: "advance"; next: ItemForRender; nowMs: number }
	| { kind: "set_question_started"; nowMs: number }
	| { kind: "urgency_loop_started" }
	| { kind: "session_ended" }

interface InitArgs {
	initialItem: ItemForRender
	targetQuestionCount: number
	startMs: number
}

function initShellState(args: InitArgs): ShellState {
	return {
		currentItem: args.initialItem,
		questionStartedAtMs: args.startMs,
		sessionStartedAtMs: args.startMs,
		elapsedQuestionMs: 0,
		elapsedSessionMs: 0,
		triagePromptFired: false,
		triagePromptFiredAtMs: undefined,
		triageTaken: false,
		selectedOptionId: undefined,
		interQuestionVisible: false,
		interQuestionVisibleUntilMs: undefined,
		questionsRemaining: args.targetQuestionCount,
		submitPending: false,
		urgencyLoopStartedForCurrentQuestion: false,
		sessionEnded: false
	}
}

interface TickContext {
	perQuestionTargetMs: number
	sessionType: "diagnostic" | "drill" | "full_length" | "simulation"
}

function reduceTick(state: ShellState, nowMs: number, ctx: TickContext): ShellState {
	const elapsedQuestionMs = nowMs - state.questionStartedAtMs
	const elapsedSessionMs = nowMs - state.sessionStartedAtMs

	// Triage prompt fires the first time elapsedQuestionMs crosses the
	// per-question target. Persistent — never auto-dismisses (see plan §5.2).
	let triagePromptFired = state.triagePromptFired
	let triagePromptFiredAtMs = state.triagePromptFiredAtMs
	if (!triagePromptFired && elapsedQuestionMs >= ctx.perQuestionTargetMs) {
		triagePromptFired = true
		triagePromptFiredAtMs = elapsedQuestionMs
	}

	// Inter-question card auto-clears when its visibility deadline elapses,
	// so an idle reducer (waiting for advance) doesn't leave the card stuck.
	let interQuestionVisible = state.interQuestionVisible
	if (
		state.interQuestionVisibleUntilMs !== undefined &&
		elapsedSessionMs >= state.interQuestionVisibleUntilMs
	) {
		interQuestionVisible = false
	}

	return {
		...state,
		elapsedQuestionMs,
		elapsedSessionMs,
		triagePromptFired,
		triagePromptFiredAtMs,
		interQuestionVisible
	}
}

function reduceTriageTake(
	state: ShellState,
	action: { kind: "triage_take"; nowMs: number }
): ShellState {
	// Argument's nowMs is unused — the reducer compares elapsed values to
	// `state.triagePromptFiredAtMs`, both of which are derived from the
	// same `tick` action stream. Reserved for future use where the
	// component might want to override the elapsed comparison.
	void action
	// Idempotent against an in-flight submit, same rationale as the
	// `submit` action's guard above.
	if (state.submitPending) return state
	let triageTakenInWindow = state.triageTaken
	if (
		state.triagePromptFired &&
		state.triagePromptFiredAtMs !== undefined &&
		state.elapsedQuestionMs - state.triagePromptFiredAtMs <= TRIAGE_TAKEN_WINDOW_MS
	) {
		triageTakenInWindow = true
	}
	// Triage-take semantics (plan §3.3): submit whatever the user has
	// selected, blank if nothing. The previous random-pick behavior was
	// dropped in commit 3 — it modeled "guess and advance" too literally.
	// The BrainLift reframe is "knowing when to abandon a question is
	// the strategic skill" (handoff §2). Abandoning cleanly with no
	// selection is the right behavior for a user who has no leaning;
	// random picks contaminate the mastery model with noise that looks
	// like real-but-wrong attempts.
	return {
		...state,
		triageTaken: triageTakenInWindow,
		submitPending: true
	}
}

function reduceSubmitStarted(state: ShellState): ShellState {
	// Note: submitPending stays true here. The flag only clears when the
	// next item's <ItemSlot> mounts and dispatches set_question_started.
	// This is what closes the race window where a fast Enter press would
	// double-submit during the onSubmitAttempt await.
	return {
		...state,
		interQuestionVisible: true,
		interQuestionVisibleUntilMs: state.elapsedSessionMs + INTER_QUESTION_FADE_MS * 4
	}
}

function reduceAdvance(
	state: ShellState,
	next: ItemForRender,
	nowMs: number
): ShellState {
	return {
		...state,
		currentItem: next,
		selectedOptionId: undefined,
		triagePromptFired: false,
		triagePromptFiredAtMs: undefined,
		triageTaken: false,
		interQuestionVisible: false,
		interQuestionVisibleUntilMs: undefined,
		questionsRemaining: state.questionsRemaining - 1,
		// `questionStartedAtMs` is reset to the advance time so the very
		// first `tick` action after advance computes a small
		// `elapsedQuestionMs` instead of `nowMs - OLD_questionStartedAtMs`
		// (which would be ~20s+ on a triage-take advance). Without this
		// reset, that spurious tick fires `reduceTick`'s
		// `if (!triagePromptFired && elapsedQuestionMs >= target)` branch,
		// re-flipping `triagePromptFired: true` and stranding the prompt
		// visible on the new question — observed in dogfooding as
		// "Best move: guess and advance" not going away.
		// `set_question_started` (from the next <ItemSlot>'s mount effect)
		// then OVERRIDES this with the more precise paint-time value. On
		// a same-id advance where ItemSlot doesn't remount, this advance-
		// time value sticks; that's still a correct latency anchor since
		// "first paint" doesn't apply when the screen never changed.
		questionStartedAtMs: nowMs,
		elapsedQuestionMs: 0,
		// `submitPending` is also cleared by `set_question_started` from
		// the next <ItemSlot>'s mount effect — the original "single
		// source of truth" for the clear, designed to keep Submit
		// disabled across the network await. We mirror that clear here
		// so the user is never stranded if the keyed mount-effect doesn't
		// fire (e.g., server returns the same item id as the next item,
		// which can happen on small bank fallbacks — see
		// docs/plans/focus-shell-post-overhaul-fixes.md §2 candidate #4).
		// The original race the comment guarded against (double-Enter
		// during the await) is closed by the dispatch-site guards in
		// FocusShell + reduceTriageTake's `submitPending` early return,
		// so clearing here is safe.
		submitPending: false,
		// Per-question audio gate — reset so the next item's per-question
		// target re-arms the urgency loop.
		urgencyLoopStartedForCurrentQuestion: false
	}
}

// Dispatch is split into two halves so neither exceeds biome's
// noExcessiveCognitiveComplexity threshold of 15. The `tick` action is
// handled by the outer reducer (it needs ctx), so neither half sees it.
function dispatchPrimary(state: ShellState, action: ShellAction): ShellState | undefined {
	if (action.kind === "select") return { ...state, selectedOptionId: action.optionId }
	if (action.kind === "submit") {
		// Idempotent: if a submit is already in flight, don't bump the
		// reference (also avoids unnecessary re-renders). The dispatch-
		// site guard in <FocusShell> is the primary defense; this is
		// belt-and-suspenders.
		if (state.submitPending) return state
		return { ...state, submitPending: true }
	}
	if (action.kind === "triage_take") return reduceTriageTake(state, action)
	if (action.kind === "submit_started") return reduceSubmitStarted(state)
	if (action.kind === "advance") return reduceAdvance(state, action.next, action.nowMs)
	if (action.kind === "set_question_started") {
		return {
			...state,
			questionStartedAtMs: action.nowMs,
			elapsedQuestionMs: 0,
			submitPending: false,
			// Belt-and-suspenders: reset the triage-prompt flags here too.
			// `reduceAdvance` already resets them, but if any tick action
			// fires between `advance` and this dispatch (the mount effect
			// fires after React's commit phase, with possibly-multiple
			// ticks queued from earlier RAF frames), `reduceTick` could
			// re-flip `triagePromptFired: true` based on a stale
			// `questionStartedAtMs`. The `nowMs` reset in reduceAdvance
			// closes the primary window; this is the secondary defense.
			triagePromptFired: false,
			triagePromptFiredAtMs: undefined
		}
	}
	return undefined
}

function dispatchSecondary(state: ShellState, action: ShellAction): ShellState | undefined {
	if (action.kind === "urgency_loop_started") {
		if (state.urgencyLoopStartedForCurrentQuestion) return state
		return { ...state, urgencyLoopStartedForCurrentQuestion: true }
	}
	if (action.kind === "session_ended") {
		if (state.sessionEnded) return state
		return { ...state, sessionEnded: true }
	}
	return undefined
}

function makeReducer(ctx: TickContext): (state: ShellState, action: ShellAction) => ShellState {
	return function reducer(state: ShellState, action: ShellAction): ShellState {
		if (action.kind === "tick") return reduceTick(state, action.nowMs, ctx)
		const fromPrimary = dispatchPrimary(state, action)
		if (fromPrimary !== undefined) return fromPrimary
		const fromSecondary = dispatchSecondary(state, action)
		if (fromSecondary !== undefined) return fromSecondary
		// Exhaustiveness: every ShellAction.kind is handled by the two
		// dispatch halves above. If a new kind is added, the compile-time
		// `never` check below catches it inside dispatchPrimary or
		// dispatchSecondary's hidden default branch — but since both
		// helpers return `undefined` for unknown kinds, this final guard
		// is the runtime safety net.
		logger.error({ kind: action.kind }, "shell-reducer: unhandled action kind")
		throw errors.new("shell-reducer: unhandled action kind")
	}
}

export type { InitArgs, ShellAction, ShellState, TickContext }
export {
	INTER_QUESTION_FADE_MS,
	TRIAGE_TAKEN_WINDOW_MS,
	initShellState,
	makeReducer
}
