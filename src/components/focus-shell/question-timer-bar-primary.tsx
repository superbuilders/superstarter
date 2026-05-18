"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { DURATION_CLASS_BY_MS } from "@/components/focus-shell/timer-bar"

interface QuestionTimerBarPrimaryProps {
	itemId: string
	perQuestionTargetMs: number
	paused?: boolean
	animationDurationMs?: number
}

function QuestionTimerBarPrimary(props: QuestionTimerBarPrimaryProps) {
	const blueRef = React.useRef<HTMLDivElement | null>(null)
	const redRef = React.useRef<HTMLDivElement | null>(null)
	const durationClass = DURATION_CLASS_BY_MS.get(props.perQuestionTargetMs)
	let effectiveDuration: string
	if (durationClass === undefined) {
		effectiveDuration = "[animation-duration:60000ms]"
	} else {
		effectiveDuration = durationClass
	}

	React.useLayoutEffect(
		function applyAnimationDurationOverride() {
			const override = props.animationDurationMs
			if (override === undefined) {
				if (blueRef.current) {
					blueRef.current.style.animationDuration = ""
				}
				if (redRef.current) {
					redRef.current.style.animationDuration = ""
				}
				return
			}
			const duration = `${override}ms`
			if (blueRef.current) {
				blueRef.current.style.animationDuration = duration
			}
			if (redRef.current) {
				redRef.current.style.animationDuration = duration
			}
		},
		[props.animationDurationMs]
	)

	return (
		<div
			className="relative h-1 w-full overflow-hidden rounded-sm bg-gray-200"
			data-testid="question-timer-primary-track"
		>
			<div
				ref={blueRef}
				key={`${props.itemId}-blue`}
				data-testid="question-timer-primary-fill-blue"
				className={cn(
					"absolute inset-0 origin-left animate-fill-bar-with-opacity-vth bg-blue-600",
					props.paused ? "[animation-play-state:paused]" : null,
					effectiveDuration
				)}
				aria-hidden="true"
			/>
			<div
				ref={redRef}
				key={`${props.itemId}-red`}
				data-testid="question-timer-primary-fill-red"
				className={cn(
					"absolute inset-0 origin-left animate-fill-bar-with-opacity-htv bg-red-600",
					props.paused ? "[animation-play-state:paused]" : null,
					effectiveDuration
				)}
				aria-hidden="true"
			/>
		</div>
	)
}

export type { QuestionTimerBarPrimaryProps }
export { QuestionTimerBarPrimary }
