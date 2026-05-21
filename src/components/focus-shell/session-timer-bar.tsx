"use client"

import * as React from "react"
import { DURATION_CLASS_BY_MS } from "@/components/focus-shell/timer-bar"
import { cn } from "@/lib/utils"

interface SessionTimerBarProps {
	sessionId: string
	durationMs: number
	behindPace: boolean
	paused?: boolean
	animationDurationMs?: number
}

function SessionTimerBar(props: SessionTimerBarProps) {
	const fillRef = React.useRef<HTMLDivElement | null>(null)
	const durationClass = DURATION_CLASS_BY_MS.get(props.durationMs)
	const pausedClass = props.paused ? "[animation-play-state:paused]" : null
	const fillColor = props.behindPace ? "bg-red-600" : "bg-blue-600"
	let effectiveDurationClass: string
	if (durationClass === undefined) {
		effectiveDurationClass = "[animation-duration:60000ms]"
	} else {
		effectiveDurationClass = durationClass
	}

	React.useLayoutEffect(
		function applyAnimationDurationOverride() {
			if (!fillRef.current) return
			const override = props.animationDurationMs
			if (override === undefined) {
				fillRef.current.style.animationDuration = ""
				return
			}
			fillRef.current.style.animationDuration = `${override}ms`
		},
		[props.animationDurationMs]
	)

	const fillNode = (
		<div
			ref={fillRef}
			key={props.sessionId}
			data-testid="session-timer-fill"
			className={cn(
				"absolute inset-0 origin-left animate-fill-bar",
				fillColor,
				pausedClass,
				effectiveDurationClass
			)}
			aria-hidden="true"
		/>
	)

	return (
		<div
			className="flex w-full flex-col gap-1"
			data-testid="session-timer-bar"
			data-behind-pace={props.behindPace ? "true" : "false"}
		>
			<div
				className="relative h-1 w-full overflow-hidden rounded-sm bg-gray-200"
				data-testid="session-timer-track"
			>
				{fillNode}
			</div>
			<span className="text-foreground/60 text-xs" data-testid="session-timer-label">
				Overall time
			</span>
		</div>
	)
}

function formatRemaining(durationMs: number, elapsedMs: number): string {
	const remaining = Math.max(0, durationMs - elapsedMs)
	const totalSeconds = Math.floor(remaining / 1000)
	const minutes = Math.floor(totalSeconds / 60)
	const seconds = totalSeconds % 60
	const minutesStr = String(minutes).padStart(2, "0")
	const secondsStr = String(seconds).padStart(2, "0")
	return `${minutesStr}:${secondsStr}`
}

export type { SessionTimerBarProps }
export { SessionTimerBar, formatRemaining }
