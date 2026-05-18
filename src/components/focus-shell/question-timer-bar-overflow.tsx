"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

interface QuestionTimerBarOverflowProps {
	itemId: string
	perQuestionTargetMs: number
	paused?: boolean
	animationDurationMs?: number
}

function QuestionTimerBarOverflow(props: QuestionTimerBarOverflowProps) {
	const fillRef = React.useRef<HTMLDivElement | null>(null)
	void props.perQuestionTargetMs

	React.useLayoutEffect(
		function applyAnimationTimingOverride() {
			if (!fillRef.current) return
			const override = props.animationDurationMs
			if (override === undefined) {
				fillRef.current.style.animationDuration = ""
				fillRef.current.style.animationDelay = ""
				return
			}
			const duration = `${override}ms`
			fillRef.current.style.animationDuration = duration
			fillRef.current.style.animationDelay = duration
		},
		[props.animationDurationMs]
	)

	return (
		<div
			className="relative h-1 w-full overflow-hidden rounded-sm bg-gray-200"
			data-testid="question-timer-overflow-track"
		>
			<div
				ref={fillRef}
				key={props.itemId}
				data-testid="question-timer-overflow-fill"
				className={cn(
					"absolute inset-0 origin-left animate-fill-bar-after-target bg-red-600",
					props.paused ? "[animation-play-state:paused]" : null
				)}
				aria-hidden="true"
			/>
		</div>
	)
}

export type { QuestionTimerBarOverflowProps }
export { QuestionTimerBarOverflow }
