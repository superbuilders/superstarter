"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

interface TutorialRect {
	top: number
	left: number
	width: number
	height: number
}

interface ViewportRect {
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
type TutorialCardCandidatePlacement =
	| "bottom-left"
	| "bottom-right"
	| "top-left"
	| "top-right"
	| "right-top"
	| "right-bottom"
	| "left-top"
	| "left-bottom"
	| "center"

interface TutorialStep {
	target: TutorialTargetKey
	placement: TutorialCardPlacement
	title: string
	body: string
	bullets: ReadonlyArray<string>
}

interface TutorialCardLayout {
	height: number
	left: number
	needsScroll: boolean
	overlapsSpotlight: boolean
	placement: TutorialCardCandidatePlacement
	top: number
	width: number
}

interface ResolveTutorialCardLayoutArgs {
	measureHeight: (width: number) => number
	preferredPlacement: TutorialCardPlacement
	spotlight: TutorialRect
	viewportHeight: number
	viewportWidth: number
}

const FOCUS_TUTORIAL_STEPS: ReadonlyArray<TutorialStep> = [
	{
		target: "session-clock",
		placement: "bottom-left",
		title: "Session clock",
		body: "For 50 questions in 15 minutes, the average pace is about 18 seconds per question. Because that is only an average, some questions should be finished faster so you have room for the ones that take longer.",
		bullets: [
			"Good pacing means balancing quicker questions against the ones that need more time.",
			"Keep an eye on the full clock so one stubborn question never hides the total runway."
		]
	},
	{
		target: "timing-overview",
		placement: "bottom-right",
		title: "Pacing bars",
		body: "The question bar tells you where you are in the test. The overall timer bar spans the full 15 minutes and moves with your total elapsed time. It turns red when you are behind pace for the question number you have reached. Together they help you judge whether you are ahead or behind.",
		bullets: [
			"Read the question number against the full-test timer to see whether your pace is holding."
		]
	},
	{
		target: "per-question-time",
		placement: "top-right",
		title: "Per-question timer",
		body: "The warning sound is a recommendation to move on if you want to stay near average question pace. Some questions do take longer, so whether you guess early or stay longer depends on your CCAT time-management strategy.",
		bullets: [
			"Use your overall test time and question number together when deciding whether to move on or invest more time."
		]
	}
]

const COMBINED_BARS_TUTORIAL_STEP_INDEX = 1
const PER_QUESTION_TUTORIAL_STEP_INDEX = 2
const TUTORIAL_CARD_MARGIN_PX = 16
const TUTORIAL_CARD_GAP_PX = 18
const TUTORIAL_CARD_IDEAL_WIDTH_PX = 520
const TUTORIAL_CARD_FALLBACK_WIDTH_PX = 560

interface FocusTutorialOverlayProps {
	stepIndex: number
	targetRects: Partial<Record<TutorialTargetKey, TutorialRect>>
	onBack: () => void
	onNext: () => void
	onSkip: () => void
	onFinish: () => void
}

function readViewportRect(): ViewportRect {
	if (typeof window === "undefined") {
		return { width: 1280, height: 800 }
	}
	return {
		width: window.innerWidth,
		height: window.innerHeight
	}
}

function tutorialSpotlightPadding(target: TutorialTargetKey): number {
	if (target === "timing-overview") return 8
	return 12
}

function clamp(value: number, min: number, max: number): number {
	if (value < min) return min
	if (value > max) return max
	return value
}

function rectsOverlap(left: TutorialRect, right: TutorialRect): boolean {
	return !(
		left.left + left.width <= right.left ||
		right.left + right.width <= left.left ||
		left.top + left.height <= right.top ||
		right.top + right.height <= left.top
	)
}

function placementOrder(preferredPlacement: TutorialCardPlacement): ReadonlyArray<TutorialCardCandidatePlacement> {
	if (preferredPlacement === "bottom-left") {
		return [
			"bottom-left",
			"right-top",
			"left-top",
			"bottom-right",
			"top-left",
			"top-right",
			"right-bottom",
			"left-bottom",
			"center"
		]
	}
	if (preferredPlacement === "bottom-right") {
		return [
			"bottom-right",
			"left-top",
			"right-top",
			"bottom-left",
			"top-right",
			"top-left",
			"left-bottom",
			"right-bottom",
			"center"
		]
	}
	if (preferredPlacement === "top-left") {
		return [
			"top-left",
			"right-bottom",
			"left-bottom",
			"top-right",
			"bottom-left",
			"bottom-right",
			"right-top",
			"left-top",
			"center"
		]
	}
	return [
		"top-right",
		"left-bottom",
		"right-bottom",
		"top-left",
		"bottom-right",
		"bottom-left",
		"left-top",
		"right-top",
		"center"
	]
}

function measureTutorialCardHeight(card: HTMLDivElement, width: number): number {
	card.style.width = `${Math.max(1, width)}px`
	card.style.height = "auto"
	card.style.maxHeight = "none"
	return card.scrollHeight
}

function positionFallbackTutorialCard(
	card: HTMLDivElement,
	viewportWidth: number,
	viewportHeight: number
): TutorialCardLayout {
	const width = Math.max(1, Math.min(TUTORIAL_CARD_FALLBACK_WIDTH_PX, viewportWidth - TUTORIAL_CARD_MARGIN_PX * 2))
	const naturalHeight = measureTutorialCardHeight(card, width)
	const height = Math.max(1, Math.min(naturalHeight, viewportHeight - TUTORIAL_CARD_MARGIN_PX * 2))
	card.style.position = "fixed"
	card.style.width = `${width}px`
	card.style.height = `${height}px`
	card.style.maxWidth = `${width}px`
	card.style.maxHeight = `${height}px`
	card.style.top = `${TUTORIAL_CARD_MARGIN_PX}px`
	card.style.left = `${TUTORIAL_CARD_MARGIN_PX}px`
	return {
		height,
		left: TUTORIAL_CARD_MARGIN_PX,
		needsScroll: naturalHeight > height,
		overlapsSpotlight: true,
		placement: "center",
		top: TUTORIAL_CARD_MARGIN_PX,
		width
	}
}

interface TutorialCardCandidateConstraints {
	alignBottom: boolean
	alignRight: boolean
	desiredLeft: number
	desiredTop: number
	heightLimit: number
	widthLimit: number
}

function buildTutorialCardCandidateConstraints(
	placement: TutorialCardCandidatePlacement,
	spotlight: TutorialRect,
	viewportWidth: number,
	viewportHeight: number,
	preferredWidth: number
): TutorialCardCandidateConstraints {
	const spotlightRight = spotlight.left + spotlight.width
	const spotlightBottom = spotlight.top + spotlight.height
	const fallbackLeft = (viewportWidth - preferredWidth) / 2
	const fallbackTop = (viewportHeight - (viewportHeight - TUTORIAL_CARD_MARGIN_PX * 2)) / 2
	const constraints: TutorialCardCandidateConstraints = {
		alignBottom: false,
		alignRight: false,
		desiredLeft: fallbackLeft,
		desiredTop: fallbackTop,
		heightLimit: Math.max(1, viewportHeight - TUTORIAL_CARD_MARGIN_PX * 2),
		widthLimit: Math.max(1, viewportWidth - TUTORIAL_CARD_MARGIN_PX * 2)
	}

	if (placement === "right-top") {
		constraints.desiredLeft = spotlightRight + TUTORIAL_CARD_GAP_PX
		constraints.desiredTop = spotlight.top
		constraints.widthLimit = viewportWidth - TUTORIAL_CARD_MARGIN_PX - constraints.desiredLeft
		return constraints
	}
	if (placement === "right-bottom") {
		constraints.alignBottom = true
		constraints.desiredLeft = spotlightRight + TUTORIAL_CARD_GAP_PX
		constraints.desiredTop = spotlightBottom
		constraints.widthLimit = viewportWidth - TUTORIAL_CARD_MARGIN_PX - constraints.desiredLeft
		return constraints
	}
	if (placement === "left-top") {
		constraints.alignRight = true
		constraints.desiredLeft = spotlight.left - TUTORIAL_CARD_GAP_PX
		constraints.desiredTop = spotlight.top
		constraints.widthLimit = spotlight.left - TUTORIAL_CARD_GAP_PX - TUTORIAL_CARD_MARGIN_PX
		return constraints
	}
	if (placement === "left-bottom") {
		constraints.alignBottom = true
		constraints.alignRight = true
		constraints.desiredLeft = spotlight.left - TUTORIAL_CARD_GAP_PX
		constraints.desiredTop = spotlightBottom
		constraints.widthLimit = spotlight.left - TUTORIAL_CARD_GAP_PX - TUTORIAL_CARD_MARGIN_PX
		return constraints
	}
	if (placement === "bottom-left") {
		constraints.desiredLeft = spotlight.left
		constraints.desiredTop = spotlightBottom + TUTORIAL_CARD_GAP_PX
		constraints.heightLimit = viewportHeight - TUTORIAL_CARD_MARGIN_PX - spotlightBottom - TUTORIAL_CARD_GAP_PX
		return constraints
	}
	if (placement === "bottom-right") {
		constraints.alignRight = true
		constraints.desiredLeft = spotlightRight
		constraints.desiredTop = spotlightBottom + TUTORIAL_CARD_GAP_PX
		constraints.heightLimit = viewportHeight - TUTORIAL_CARD_MARGIN_PX - spotlightBottom - TUTORIAL_CARD_GAP_PX
		return constraints
	}
	if (placement === "top-left") {
		constraints.alignBottom = true
		constraints.desiredLeft = spotlight.left
		constraints.desiredTop = spotlight.top - TUTORIAL_CARD_GAP_PX
		constraints.heightLimit = spotlight.top - TUTORIAL_CARD_GAP_PX - TUTORIAL_CARD_MARGIN_PX
		return constraints
	}
	if (placement === "top-right") {
		constraints.alignBottom = true
		constraints.alignRight = true
		constraints.desiredLeft = spotlightRight
		constraints.desiredTop = spotlight.top - TUTORIAL_CARD_GAP_PX
		constraints.heightLimit = spotlight.top - TUTORIAL_CARD_GAP_PX - TUTORIAL_CARD_MARGIN_PX
		return constraints
	}
	return constraints
}

function finalizeTutorialCardLayout(
	placement: TutorialCardCandidatePlacement,
	spotlight: TutorialRect,
	viewportWidth: number,
	viewportHeight: number,
	preferredWidth: number,
	measureHeight: (width: number) => number
): TutorialCardLayout {
	const constraints = buildTutorialCardCandidateConstraints(
		placement,
		spotlight,
		viewportWidth,
		viewportHeight,
		preferredWidth
	)
	const viewportSafeWidth = Math.max(1, viewportWidth - TUTORIAL_CARD_MARGIN_PX * 2)
	const viewportSafeHeight = Math.max(1, viewportHeight - TUTORIAL_CARD_MARGIN_PX * 2)
	const widthLimit = Math.max(1, Math.min(constraints.widthLimit, viewportSafeWidth))
	const heightLimit = Math.max(1, Math.min(constraints.heightLimit, viewportSafeHeight))
	const width = Math.max(1, Math.min(preferredWidth, widthLimit))
	const naturalHeight = measureHeight(width)
	const height = Math.max(1, Math.min(naturalHeight, heightLimit))
	let left = constraints.desiredLeft
	let top = constraints.desiredTop

	if (constraints.alignRight) {
		left -= width
	}
	if (constraints.alignBottom) {
		top -= height
	}

	left = clamp(left, TUTORIAL_CARD_MARGIN_PX, viewportWidth - width - TUTORIAL_CARD_MARGIN_PX)
	top = clamp(top, TUTORIAL_CARD_MARGIN_PX, viewportHeight - height - TUTORIAL_CARD_MARGIN_PX)

	return {
		placement,
		top,
		left,
		width,
		height,
		needsScroll: naturalHeight > height,
		overlapsSpotlight: rectsOverlap({ top, left, width, height }, spotlight)
	}
}

function scoreTutorialCardLayout(
	layout: TutorialCardLayout,
	placementIndex: number,
	placementCount: number,
	viewportWidth: number,
	viewportHeight: number
): number {
	const insideViewport =
		layout.left >= TUTORIAL_CARD_MARGIN_PX &&
		layout.top >= TUTORIAL_CARD_MARGIN_PX &&
		layout.left + layout.width <= viewportWidth - TUTORIAL_CARD_MARGIN_PX &&
		layout.top + layout.height <= viewportHeight - TUTORIAL_CARD_MARGIN_PX
	return (
		(layout.overlapsSpotlight ? 0 : 1_000_000) +
		(insideViewport ? 500_000 : 0) +
		(layout.needsScroll ? 0 : 250_000) +
		layout.width * layout.height +
		layout.width * 100 +
		(placementCount - placementIndex) * 1_000
	)
}

function resolveTutorialCardLayout(args: ResolveTutorialCardLayoutArgs): TutorialCardLayout {
	const viewportSafeWidth = Math.max(1, args.viewportWidth - TUTORIAL_CARD_MARGIN_PX * 2)
	const viewportSafeHeight = Math.max(1, args.viewportHeight - TUTORIAL_CARD_MARGIN_PX * 2)
	const preferredWidth = Math.min(TUTORIAL_CARD_IDEAL_WIDTH_PX, viewportSafeWidth)
	const placements = placementOrder(args.preferredPlacement)
	let bestLayout: TutorialCardLayout | null = null
	let bestScore = Number.NEGATIVE_INFINITY

	for (const [index, placement] of placements.entries()) {
		const layout = finalizeTutorialCardLayout(
			placement,
			args.spotlight,
			args.viewportWidth,
			args.viewportHeight,
			preferredWidth,
			args.measureHeight
		)
		const score = scoreTutorialCardLayout(
			layout,
			index,
			placements.length,
			args.viewportWidth,
			args.viewportHeight
		)
		if (score > bestScore) {
			bestScore = score
			bestLayout = layout
		}
	}

	if (bestLayout !== null) return bestLayout
	const naturalHeight = args.measureHeight(viewportSafeWidth)
	const height = Math.min(naturalHeight, viewportSafeHeight)
	return {
		placement: "center",
		top: TUTORIAL_CARD_MARGIN_PX,
		left: TUTORIAL_CARD_MARGIN_PX,
		width: viewportSafeWidth,
		height: height,
		needsScroll: naturalHeight > height,
		overlapsSpotlight: true
	}
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
): TutorialCardLayout {
	const layout = resolveTutorialCardLayout({
		measureHeight: function measureHeight(width: number) {
			return measureTutorialCardHeight(card, width)
		},
		preferredPlacement: placement,
		spotlight,
		viewportHeight,
		viewportWidth
	})
	card.style.position = "fixed"
	card.style.width = `${layout.width}px`
	card.style.height = `${layout.height}px`
	card.style.maxWidth = `${layout.width}px`
	card.style.maxHeight = `${layout.height}px`
	card.style.top = `${layout.top}px`
	card.style.left = `${layout.left}px`
	return layout
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
	const [viewportRect, setViewportRect] = React.useState<ViewportRect>(readViewportRect)
	const [cardScrollable, setCardScrollable] = React.useState(false)

	const step = FOCUS_TUTORIAL_STEPS[props.stepIndex]
	const lastIndex = FOCUS_TUTORIAL_STEPS.length - 1
	const canGoBack = props.stepIndex > 0
	const isLastStep = props.stepIndex === lastIndex
	const spotlight = step ? props.targetRects[step.target] : undefined
	const spotlightPadding = step ? tutorialSpotlightPadding(step.target) : 12
	const viewportWidth = viewportRect.width
	const viewportHeight = viewportRect.height
	const paddedSpotlight = spotlight
		? {
				top: Math.max(8, spotlight.top - spotlightPadding),
				left: Math.max(8, spotlight.left - spotlightPadding),
				width: spotlight.width + spotlightPadding * 2,
				height: spotlight.height + spotlightPadding * 2
			}
		: null

	React.useEffect(function syncViewportRect() {
		function updateViewportRect() {
			setViewportRect(function keepPreviousIfUnchanged(previousRect) {
				const nextRect = readViewportRect()
				if (
					previousRect.width === nextRect.width &&
					previousRect.height === nextRect.height
				) {
					return previousRect
				}
				return nextRect
			})
		}

		updateViewportRect()
		window.addEventListener("resize", updateViewportRect)
		window.addEventListener("orientationchange", updateViewportRect)
		window.visualViewport?.addEventListener("resize", updateViewportRect)
		window.visualViewport?.addEventListener("scroll", updateViewportRect)
		return function cleanup() {
			window.removeEventListener("resize", updateViewportRect)
			window.removeEventListener("orientationchange", updateViewportRect)
			window.visualViewport?.removeEventListener("resize", updateViewportRect)
			window.visualViewport?.removeEventListener("scroll", updateViewportRect)
		}
	}, [])

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
					const fallbackLayout = positionFallbackTutorialCard(cardRef.current, viewportWidth, viewportHeight)
					setCardScrollable(fallbackLayout.needsScroll)
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
			const cardLayout = positionTutorialCard(
				cardRef.current,
				paddedSpotlight,
				step.placement,
				viewportWidth,
				viewportHeight
			)
			setCardScrollable(cardLayout.needsScroll)
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
					"fixed z-10 flex min-h-0 flex-col overflow-hidden rounded-2xl border border-foreground/10 bg-background p-4 shadow-2xl"
				)}
			>
				<div className="flex shrink-0 items-center justify-between gap-3">
					<p className="text-[11px] text-foreground/55 uppercase tracking-[0.08em]">Guide</p>
					<p className="text-foreground/60 text-sm">Step {props.stepIndex + 1} of {FOCUS_TUTORIAL_STEPS.length}</p>
				</div>
				<div className={cn(
					"mt-4 min-h-0 flex-1 pr-1",
					cardScrollable ? "overflow-y-auto overscroll-contain" : "overflow-visible"
				)}>
					<h2 className="font-serif text-3xl text-foreground tracking-[-0.02em]">{step.title}</h2>
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
				</div>
				<div className="mt-4 flex shrink-0 flex-wrap items-center justify-between gap-3 border-foreground/10 border-t pt-4">
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
	PER_QUESTION_TUTORIAL_STEP_INDEX,
	resolveTutorialCardLayout
}
export type { TutorialCardLayout, TutorialRect, TutorialTargetKey }
