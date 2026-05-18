"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

interface TutorialStep {
	title: string
	body: string
	bullets: ReadonlyArray<string>
}

const TUTORIAL_STEPS: ReadonlyArray<TutorialStep> = [
	{
		title: "Read the shell first",
		body:
			"This screen is built to help you judge pace at a glance before you commit to an answer.",
		bullets: [
			"The large clock tracks the whole session.",
			"The progress bars show where you are in the session and on this question.",
			"The question count reminds you how much runway is left."
		]
	},
	{
		title: "The 18-second idea",
		body:
			"Eighteen seconds is a guide, not a rule. The point is to build judgment about which items deserve speed and which deserve patience.",
		bullets: [
			"Some questions are meant to be quick wins.",
			"Some questions are worth slowing down for.",
			"Your edge comes from noticing the difference early."
		]
	},
	{
		title: "When to guess and move",
		body:
			"If the path is still foggy after a quick scan, make the best guess you can and preserve time for cleaner points later.",
		bullets: [
			"Use elimination when you can.",
			"Avoid burning time just because you already started.",
			"A disciplined guess is often better than a late perfect solve attempt."
		]
	},
	{
		title: "When to stay longer",
		body:
			"If you see a promising route, extra seconds can be worth it. The goal is not constant speed; it is deliberate speed.",
		bullets: [
			"Stay when the structure is becoming clearer.",
			"Slow down for questions that match your strengths.",
			"Re-center on accuracy when the payoff is real."
		]
	},
	{
		title: "Sound is optional",
		body:
			"The warning sound is there to help if you want it, and you can change it from the settings menu near your user icon.",
		bullets: [
			"Warning sound status updates from your current setting.",
			"You can replay this tutorial anytime from settings.",
			"Skip now if you already know the flow."
		]
	}
]

interface FocusTutorialOverlayProps {
	stepIndex: number
	warningSoundEnabled: boolean
	onBack: () => void
	onNext: () => void
	onSkip: () => void
	onFinish: () => void
}

function FocusTutorialOverlay(props: FocusTutorialOverlayProps) {
	const steps = React.useMemo(function buildSteps() {
		return TUTORIAL_STEPS.map(function resolveStep(step) {
			if (step.title !== "Sound is optional") return step
			return {
				...step,
				bullets: [
					props.warningSoundEnabled
						? "Warning sound is currently on for this session."
						: "Warning sound is currently off for this session.",
					"You can replay this tutorial anytime from settings.",
					"Skip now if you already know the flow."
				]
			}
		})
	}, [props.warningSoundEnabled])
	const step = steps[props.stepIndex]
	const lastIndex = steps.length - 1
	const canGoBack = props.stepIndex > 0
	const isLastStep = props.stepIndex === lastIndex
	if (step === undefined) return null

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 px-4 py-6 backdrop-blur-sm">
			<div className="grid w-full max-w-5xl gap-4 rounded-3xl border border-foreground/10 bg-background p-4 shadow-2xl md:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] md:p-6">
				<div className="rounded-2xl border border-foreground/10 bg-surface/70 p-4">
					<p className="text-[11px] text-foreground/55 uppercase tracking-[0.08em]">Question interface</p>
					<div className="mt-3 space-y-3">
						<div className="flex items-start justify-between gap-3 rounded-xl border border-foreground/10 bg-background px-3 py-3">
							<div>
								<p className="text-foreground/55 text-xs">Session clock</p>
								<div className="mt-1 h-5 w-24 rounded bg-foreground/8" />
							</div>
							<div className="min-w-32 flex-1">
								<p className="text-foreground/55 text-xs">Progress + pace bars</p>
								<div className="mt-2 space-y-2">
									<div className="h-2 rounded-full bg-foreground/8" />
									<div className="h-2 rounded-full bg-foreground/8" />
									<div className="h-2 rounded-full bg-foreground/8" />
								</div>
							</div>
						</div>
						<div className="rounded-xl border border-foreground/10 bg-background px-3 py-4">
							<p className="text-foreground/55 text-xs">Question prompt</p>
							<div className="mt-2 h-3 w-11/12 rounded bg-foreground/8" />
							<div className="mt-2 h-3 w-10/12 rounded bg-foreground/8" />
							<div className="mt-2 h-3 w-7/12 rounded bg-foreground/8" />
						</div>
						<div className="grid gap-2">
							{[0, 1, 2, 3].map(function renderOption(index) {
								return (
									<div key={index} className="rounded-xl border border-foreground/10 bg-background px-3 py-3">
										<div className="h-3 w-4/5 rounded bg-foreground/8" />
									</div>
								)
							})}
						</div>
						<div className="rounded-xl bg-blue-600 px-4 py-3 text-center font-medium text-sm text-white">Submit Answer</div>
					</div>
				</div>

				<div className="flex flex-col rounded-2xl border border-foreground/10 bg-background p-4">
					<div className="flex items-center justify-between gap-3">
						<p className="text-[11px] text-foreground/55 uppercase tracking-[0.08em]">Tutorial</p>
						<p className="text-foreground/60 text-sm">Step {props.stepIndex + 1} of {steps.length}</p>
					</div>
					<h2 className="mt-4 font-serif text-3xl text-foreground tracking-[-0.02em]">{step.title}</h2>
					<p className="mt-3 max-w-[44ch] text-base text-foreground/75 leading-7">{step.body}</p>
					<ul className="mt-5 space-y-3">
						{step.bullets.map(function renderBullet(bullet) {
							return (
								<li key={bullet} className="flex gap-3 text-foreground/72 text-sm leading-6">
									<span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-indigo/70" />
									<span>{bullet}</span>
								</li>
							)
						})}
					</ul>
					<div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-foreground/10 border-t pt-4">
						<button
							type="button"
							onClick={props.onSkip}
							className="text-foreground/60 text-sm transition-colors hover:text-foreground"
						>
							Skip
						</button>
						<div className="flex items-center gap-2">
							<button
								type="button"
								onClick={props.onBack}
								disabled={!canGoBack}
								className={cn(
									"rounded-full border border-foreground/12 px-4 py-2 text-foreground text-sm transition-colors",
									"hover:bg-foreground/5 disabled:cursor-not-allowed disabled:opacity-40"
								)}
							>
								Back
							</button>
							<button
								type="button"
								onClick={isLastStep ? props.onFinish : props.onNext}
								className="rounded-full bg-indigo px-4 py-2 font-medium text-sm text-white transition-colors hover:brightness-110"
							>
								{isLastStep ? "Finish" : "Next"}
							</button>
						</div>
					</div>
				</div>
			</div>
		</div>
	)
}

export { FocusTutorialOverlay }
