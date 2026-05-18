"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

interface TutorialRect {
	top: number
	left: number
	width: number
	height: number
}

type TutorialTargetKey =
	| "session-clock"
	| "timing-overview"
	| "per-question-time"
	| "question-progress"
	| "overall-time"
	| "question-prompt"
	| "answer-choices"
	| "submit-button"

type TutorialCardPlacement = "bottom-left" | "bottom-right" | "top-left" | "top-right"

interface TutorialStep {
	target: TutorialTargetKey
	placement: TutorialCardPlacement
	title: string
	body: string
	bullets: ReadonlyArray<string>
}

const FOCUS_TUTORIAL_STEPS: ReadonlyArray<TutorialStep> = [
	{
		target: "session-clock",
		placement: "bottom-left",
		title: "Session clock",
		body: "This is the big session clock. Keep an eye on it so one stubborn question never hides the total runway.",
		bullets: [
			"It tells you how much total test time is left.",
			"Good pacing starts with awareness of the whole clock."
		]
	},
	{
		target: "timing-overview",
		placement: "bottom-right",
		title: "Pacing bars",
		body: "The question bar tells you where you are in the test. The overall timer helps you compare that position against recommended average pacing. Together they help you judge whether you are ahead or behind.",
		bullets: [
			"Watch the overall time bar move and notice when it shifts from safe to costly pacing."
		]
	},
	{
		target: "per-question-time",
		placement: "top-right",
		title: "Per-question timer",
		body: "This timer turns red at about 9 seconds and gives the warning sound at about 18 seconds. That is the cue to wrap it up and move on if needed.",
		bullets: [
			"If the sound is distracting during normal runs, turn it off in Settings near the user icon on the dashboard or full-length configure screen."
		]
	}
]

const COMBINED_BARS_TUTORIAL_STEP_INDEX = 1
const PER_QUESTION_TUTORIAL_STEP_INDEX = 2

interface FocusTutorialOverlayProps {
	stepIndex: number
	targetRects: Partial<Record<TutorialTargetKey, TutorialRect>>
	onBack: () => void
	onNext: () => void
	onSkip: () => void
	onFinish: () => void
}

function setBoxStyles(
	node: HTMLDivElement | null,
	box: { top: number; left: number; width: number; height: number } | null
): void {
	if (!node) return
	if (box === null) {
		node.style.display = "none"
		return
	}
	node.style.display = "block"
	node.style.top = `${box.top}px`
	node.style.left = `${box.left}px`
	node.style.width = `${box.width}px`
	node.style.height = `${box.height}px`
}

function resetOverlayBoxes(refs: ReadonlyArray<HTMLDivElement | null>): void {
	for (const ref of refs) {
		setBoxStyles(ref, null)
	}
}

function positionTutorialCard(
	card: HTMLDivElement,
	spotlight: { top: number; left: number; width: number; height: number },
	placement: TutorialCardPlacement,
	viewportWidth: number,
	viewportHeight: number
): void {
	const cardWidth = Math.min(360, viewportWidth - 32)
	const gap = 18
	const defaultCardHeight = 300
	let top = spotlight.top
	let left = spotlight.left
	if (placement === "bottom-left") {
		top = spotlight.top + spotlight.height + gap
		left = spotlight.left
	} else if (placement === "bottom-right") {
		top = spotlight.top + spotlight.height + gap
		left = spotlight.left + spotlight.width - cardWidth
	} else if (placement === "top-left") {
		top = spotlight.top - defaultCardHeight
		left = spotlight.left
	} else {
		top = spotlight.top - defaultCardHeight
		left = spotlight.left + spotlight.width - cardWidth
	}
	card.style.position = "fixed"
	card.style.width = `${cardWidth}px`
	card.style.top = `${Math.min(viewportHeight - defaultCardHeight - 16, Math.max(16, top))}px`
	card.style.left = `${Math.min(viewportWidth - cardWidth - 16, Math.max(16, left))}px`
}

function positionSpotlightMasks(
	spotlight: { top: number; left: number; width: number; height: number },
	viewportWidth: number,
	viewportHeight: number,
	topMask: HTMLDivElement | null,
	leftMask: HTMLDivElement | null,
	rightMask: HTMLDivElement | null,
	bottomMask: HTMLDivElement | null,
	blocker: HTMLDivElement | null,
	ring: HTMLDivElement | null
): void {
	setBoxStyles(topMask, {
		top: 0,
		left: 0,
		width: viewportWidth,
		height: spotlight.top
	})
	setBoxStyles(leftMask, {
		top: spotlight.top,
		left: 0,
		width: spotlight.left,
		height: spotlight.height
	})
	setBoxStyles(rightMask, {
		top: spotlight.top,
		left: spotlight.left + spotlight.width,
		width: Math.max(0, viewportWidth - spotlight.left - spotlight.width),
		height: spotlight.height
	})
	setBoxStyles(bottomMask, {
		top: spotlight.top + spotlight.height,
		left: 0,
		width: viewportWidth,
		height: Math.max(0, viewportHeight - spotlight.top - spotlight.height)
	})
	setBoxStyles(blocker, spotlight)
	setBoxStyles(ring, spotlight)
}

function FocusTutorialOverlay(props: FocusTutorialOverlayProps) {
	const topMaskRef = React.useRef<HTMLDivElement | null>(null)
	const leftMaskRef = React.useRef<HTMLDivElement | null>(null)
	const rightMaskRef = React.useRef<HTMLDivElement | null>(null)
	const bottomMaskRef = React.useRef<HTMLDivElement | null>(null)
	const blockerRef = React.useRef<HTMLDivElement | null>(null)
	const ringRef = React.useRef<HTMLDivElement | null>(null)
	const cardRef = React.useRef<HTMLDivElement | null>(null)
	const fullVeilRef = React.useRef<HTMLDivElement | null>(null)

	const step = FOCUS_TUTORIAL_STEPS[props.stepIndex]
	const lastIndex = FOCUS_TUTORIAL_STEPS.length - 1
	const canGoBack = props.stepIndex > 0
	const isLastStep = props.stepIndex === lastIndex
	const spotlight = step ? props.targetRects[step.target] : undefined
	const spotlightPadding = 12
	const viewportWidth = typeof window === "undefined" ? 1280 : window.innerWidth
	const viewportHeight = typeof window === "undefined" ? 800 : window.innerHeight
	const paddedSpotlight = spotlight
		? {
				top: Math.max(8, spotlight.top - spotlightPadding),
				left: Math.max(8, spotlight.left - spotlightPadding),
				width: spotlight.width + spotlightPadding * 2,
				height: spotlight.height + spotlightPadding * 2
			}
		: null

	React.useLayoutEffect(
		function positionOverlay() {
			if (!step) return
			const veilDisplay = paddedSpotlight ? "none" : "block"
			if (fullVeilRef.current) {
				fullVeilRef.current.style.display = veilDisplay
			}
			if (paddedSpotlight === null) {
				resetOverlayBoxes([
					topMaskRef.current,
					leftMaskRef.current,
					rightMaskRef.current,
					bottomMaskRef.current,
					blockerRef.current,
					ringRef.current
				])
				if (cardRef.current) {
					cardRef.current.style.position = "fixed"
					cardRef.current.style.width = "min(28rem, calc(100vw - 2rem))"
					cardRef.current.style.top = "1.5rem"
					cardRef.current.style.left = "1rem"
				}
				return
			}
			positionSpotlightMasks(
				paddedSpotlight,
				viewportWidth,
				viewportHeight,
				topMaskRef.current,
				leftMaskRef.current,
				rightMaskRef.current,
				bottomMaskRef.current,
				blockerRef.current,
				ringRef.current
			)
			if (!cardRef.current) return
			positionTutorialCard(
				cardRef.current,
				paddedSpotlight,
				step.placement,
				viewportWidth,
				viewportHeight
			)
		},
		[paddedSpotlight, step, viewportHeight, viewportWidth]
	)

	if (step === undefined) return null

	return (
		<div className="fixed inset-0 z-50">
			<div ref={fullVeilRef} className="fixed inset-0 bg-background/72 backdrop-blur-[1px]" />
			<div ref={topMaskRef} className="fixed bg-background/72 backdrop-blur-[1px]" />
			<div ref={leftMaskRef} className="fixed bg-background/72 backdrop-blur-[1px]" />
			<div ref={rightMaskRef} className="fixed bg-background/72 backdrop-blur-[1px]" />
			<div ref={bottomMaskRef} className="fixed bg-background/72 backdrop-blur-[1px]" />
			<div ref={blockerRef} className="fixed bg-transparent" />
			<div
				ref={ringRef}
				className="pointer-events-none fixed rounded-2xl border-2 border-indigo/80 shadow-[0_0_0_1px_rgba(255,255,255,0.2)]"
			/>

			<div
				ref={cardRef}
				className={cn(
					"fixed z-10 flex max-w-md flex-col rounded-2xl border border-foreground/10 bg-background p-4 shadow-2xl"
				)}
			>
				<div className="flex items-center justify-between gap-3">
					<p className="text-[11px] text-foreground/55 uppercase tracking-[0.08em]">Guide</p>
					<p className="text-foreground/60 text-sm">Step {props.stepIndex + 1} of {FOCUS_TUTORIAL_STEPS.length}</p>
				</div>
				<h2 className="mt-4 font-serif text-3xl text-foreground tracking-[-0.02em]">{step.title}</h2>
				<p className="mt-3 text-base text-foreground/75 leading-7">{step.body}</p>
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
	)
}

export {
	COMBINED_BARS_TUTORIAL_STEP_INDEX,
	FOCUS_TUTORIAL_STEPS,
	FocusTutorialOverlay,
	PER_QUESTION_TUTORIAL_STEP_INDEX
}
export type { TutorialRect, TutorialTargetKey }
