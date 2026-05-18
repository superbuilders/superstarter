"use client"

import { QuestionTimerBarOverflow } from "@/components/focus-shell/question-timer-bar-overflow"
import { QuestionTimerBarPrimary } from "@/components/focus-shell/question-timer-bar-primary"

interface QuestionTimerBarStackProps {
	itemId: string
	perQuestionTargetMs: number
	paused?: boolean
	animationDurationMs?: number
}

function QuestionTimerBarStack(props: QuestionTimerBarStackProps) {
	return (
		<div className="flex w-full flex-col gap-1" data-testid="question-timer-stack">
			<QuestionTimerBarPrimary
				itemId={props.itemId}
				perQuestionTargetMs={props.perQuestionTargetMs}
				paused={props.paused}
				animationDurationMs={props.animationDurationMs}
			/>
			<QuestionTimerBarOverflow
				itemId={props.itemId}
				perQuestionTargetMs={props.perQuestionTargetMs}
				paused={props.paused}
				animationDurationMs={props.animationDurationMs}
			/>
			<span className="text-foreground/60 text-xs" data-testid="question-timer-label">
				Per question time
			</span>
		</div>
	)
}

export type { QuestionTimerBarStackProps }
export { QuestionTimerBarStack }
