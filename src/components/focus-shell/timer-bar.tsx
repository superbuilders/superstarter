"use client"

// Shared timer-bar primitive used by <SessionTimerBar> (fill mode) and
// <QuestionTimerBar> (shrink mode). Pure CSS animation — Tailwind
// arbitrary-property classes drive `animation-duration`, `animation`
// references the keyframes declared in src/styles/unstyled/globals.css
// (`--animate-shrink-bar` and `--animate-fill-bar`).
//
// The duration must come from a small enumerated set so Tailwind's JIT
// can extract the literal `[animation-duration:NNNNNms]` classes at
// build time. If a caller passes an unsupported duration, the bar
// falls back to a 60s class (visible-but-non-load-bearing).
//
// `mode` selects shrink vs. fill. Phase 3 polish (commit 2) restyled
// the session timer to FILL left-to-right as the session elapses,
// matching the data/example_ccat_formatting/*.png reference. The
// per-question timer keeps shrinking — the two distinct modes give
// the user a visual register to tell session-time from question-time
// apart.

import { cn } from "@/lib/utils"

const DURATION_CLASS_BY_MS: ReadonlyMap<number, string> = new Map<number, string>([
	[18_000, "[animation-duration:18000ms]"],
	[90_000, "[animation-duration:90000ms]"],
	[180_000, "[animation-duration:180000ms]"],
	[360_000, "[animation-duration:360000ms]"],
	[900_000, "[animation-duration:900000ms]"]
])

type TimerBarMode = "shrink" | "fill"

interface TimerBarProps {
	durationMs: number
	mode: TimerBarMode
	// React `key` should be set on the parent so a new mount restarts the
	// animation when the duration anchor changes (per-item for the
	// question timer, per-session for the session timer).
	className?: string
}

function modeClasses(mode: TimerBarMode): string {
	if (mode === "shrink") return "origin-right animate-shrink-bar"
	if (mode === "fill") return "origin-left animate-fill-bar"
	const _exhaustive: never = mode
	return _exhaustive
}

function TimerBar(props: TimerBarProps) {
	const durationClass = DURATION_CLASS_BY_MS.get(props.durationMs)
	const mode = modeClasses(props.mode)
	if (durationClass === undefined) {
		// Fallback path: 60s default. We don't throw because the bar is
		// peripheral chrome; failing closed (no bar) is worse for the
		// user than a slightly-wrong bar.
		return (
			<div
				className={cn(
					"h-1 w-full bg-foreground/30 [animation-duration:60000ms]",
					mode,
					props.className
				)}
				aria-hidden="true"
			/>
		)
	}
	return (
		<div
			className={cn("h-1 w-full bg-foreground/30", mode, durationClass, props.className)}
			aria-hidden="true"
		/>
	)
}

export type { TimerBarMode, TimerBarProps }
export { TimerBar, DURATION_CLASS_BY_MS }
