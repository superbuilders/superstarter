"use client"

// Percent Flip lesson body.
//
// Three stacked panels:
//   1. <RevealPanel> — explains why X% of Y = Y% of X.
//   2. Flip card — a single problem the user can flip with a tap.
//      The "hard" side reads e.g. "16% of 50"; the flipped side reads
//      "50% of 16". A live timer shows how fast they solve the
//      flipped version.
//   3. Speed Drill — random "ugly" problems where the flipped form is
//      trivial. User types the answer; flip is one tap away.

import * as errors from "@superbuilders/errors"
import * as React from "react"
import { LessonShell } from "@/components/lessons/shared/lesson-shell"
import { MasteryPill, useMastery } from "@/components/lessons/shared/mastery"
import { RevealPanel } from "@/components/lessons/shared/reveal-panel"
import { logger } from "@/logger"

interface FlipProblem {
	percent: number
	base: number
	answer: number
}

const HARD_PERCENTS: ReadonlyArray<number> = [
	4, 6, 7, 8, 9, 11, 12, 13, 14, 16, 17, 18, 19, 24, 27, 32, 36, 44, 48
]
const EASY_BASES: ReadonlyArray<number> = [10, 20, 25, 50, 100, 200, 250, 500, 1000]

const ErrEmptyPool = errors.new("percent flip drill pool index out of range")

function generateProblem(): FlipProblem {
	const pIndex = Math.floor(Math.random() * HARD_PERCENTS.length)
	const bIndex = Math.floor(Math.random() * EASY_BASES.length)
	const percent = HARD_PERCENTS[pIndex]
	const base = EASY_BASES[bIndex]
	if (percent === undefined || base === undefined) {
		logger.error(
			{ pIndex, bIndex, pLen: HARD_PERCENTS.length, bLen: EASY_BASES.length },
			"percent flip drill: pool index out of range"
		)
		throw errors.wrap(ErrEmptyPool, `pIndex=${pIndex} bIndex=${bIndex}`)
	}
	const product = percent * base
	return { percent, base, answer: product / 100 }
}

function formatAnswer(v: number): string {
	if (Number.isInteger(v)) return String(v)
	return v.toFixed(2).replace(/\.?0+$/, "")
}

function PercentFlipLesson() {
	return (
		<LessonShell
			eyebrow="Lesson 03 · Percent"
			eyebrowClass="text-indigo-deep"
			title="Flip It"
			blurb="X% of Y always equals Y% of X. The two problems share an answer, but one of them is easy. Train yourself to flip first, compute second."
		>
			<RevealPanel label="Reveal the shortcut">
				<p className="mb-3">
					Percent is multiplication. <span className="font-mono text-text-1">X% of Y</span> means{" "}
					<span className="font-mono text-text-1">(X·Y) / 100</span>. Multiplication is commutative,
					so <span className="font-mono text-text-1">X·Y = Y·X</span> — and therefore:
				</p>
				<p className="mb-3 font-mono text-text-1">X% of Y = Y% of X</p>
				<p className="mb-2">
					16% of 50 looks hard. 50% of 16 is "half of 16", which is{" "}
					<span className="font-mono text-text-1">8</span>. Same answer.
				</p>
				<p>
					Default move on the CCAT: if one side is a "friendly" number (10, 20, 25, 50, 100…), flip
					first.
				</p>
			</RevealPanel>
			<FlipCardSandbox />
			<SpeedDrill />
		</LessonShell>
	)
}

function FlipCardSandbox() {
	const [problem, setProblem] = React.useState<FlipProblem>(generateProblem)
	const [flipped, setFlipped] = React.useState(false)
	const [revealAnswer, setRevealAnswer] = React.useState(false)
	const [elapsedMs, setElapsedMs] = React.useState(0)
	const [running, setRunning] = React.useState(false)
	const startRef = React.useRef<number | null>(null)
	const frameRef = React.useRef<number | null>(null)

	React.useEffect(
		function trackElapsed() {
			if (!running) return
			function tick() {
				const start = startRef.current
				if (start === null) return
				setElapsedMs(performance.now() - start)
				frameRef.current = window.requestAnimationFrame(tick)
			}
			frameRef.current = window.requestAnimationFrame(tick)
			return function cleanup() {
				const f = frameRef.current
				if (f !== null) window.cancelAnimationFrame(f)
			}
		},
		[running]
	)

	function flipAndStart() {
		if (!flipped) {
			setFlipped(true)
			setRevealAnswer(false)
			startRef.current = performance.now()
			setElapsedMs(0)
			setRunning(true)
		} else {
			setFlipped(false)
			setRunning(false)
			startRef.current = null
			setElapsedMs(0)
			setRevealAnswer(false)
		}
	}
	function showAnswer() {
		setRunning(false)
		setRevealAnswer(true)
	}
	function newProblem() {
		setProblem(generateProblem())
		setFlipped(false)
		setRevealAnswer(false)
		setRunning(false)
		startRef.current = null
		setElapsedMs(0)
	}

	const elapsedLabel = (elapsedMs / 1000).toFixed(2)
	const innerTransform = flipped ? "rotate-y-180" : "rotate-y-0"
	const flipLabel = flipped ? "Unflip" : "Flip it"
	const answerLabel = revealAnswer ? formatAnswer(problem.answer) : "—"
	const answerTone = revealAnswer ? "text-good" : "text-text-3"

	return (
		<section className="mb-4 overflow-hidden rounded-lg border border-border-soft bg-surface">
			<div className="border-border-soft border-b px-5 py-3">
				<p className="font-semibold text-[11px] text-text-3 uppercase tracking-[0.06em]">
					Flip card
				</p>
				<p className="mt-0.5 text-[13px] text-text-2">
					Tap "Flip it" to swap the percent and base. The answer is the same; the math is easier.
				</p>
			</div>
			<div className="px-5 py-6 [perspective:1000px]">
				<div
					className={`relative mx-auto h-44 w-full max-w-md transition-transform duration-500 [transform-style:preserve-3d] ${innerTransform}`}
				>
					<FlipFace
						side="front"
						eyebrow="Original"
						percent={problem.percent}
						base={problem.base}
						tone="text-indigo-deep"
						accentClass="bg-indigo-deep/10 text-indigo-deep"
					/>
					<FlipFace
						side="back"
						eyebrow="Flipped"
						percent={problem.base}
						base={problem.percent}
						tone="text-cobalt"
						accentClass="bg-cobalt/10 text-cobalt"
					/>
				</div>
			</div>
			<div className="grid grid-cols-1 gap-3 px-5 pb-4 sm:grid-cols-3">
				<Readout label="Elapsed" value={`${elapsedLabel}s`} tone="text-text-1" />
				<Readout label="Answer" value={answerLabel} tone={answerTone} />
				<Readout
					label="Identity"
					value={`${problem.percent}·${problem.base} = ${problem.base}·${problem.percent}`}
					tone="text-text-2"
				/>
			</div>
			<div className="flex flex-wrap gap-2 border-border-soft border-t px-5 py-3">
				<button
					type="button"
					onClick={flipAndStart}
					className="rounded-md border border-text-1 bg-text-1 px-4 py-2 font-medium text-[14px] text-bg transition-opacity hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-cobalt focus-visible:outline-offset-2"
				>
					{flipLabel}
				</button>
				<button
					type="button"
					onClick={showAnswer}
					disabled={revealAnswer}
					className="rounded-md border border-border-strong bg-surface px-4 py-2 font-medium text-[14px] text-text-1 transition-colors hover:bg-lavender focus-visible:outline focus-visible:outline-2 focus-visible:outline-cobalt focus-visible:outline-offset-2 disabled:opacity-40"
				>
					Reveal answer
				</button>
				<button
					type="button"
					onClick={newProblem}
					className="rounded-md border border-border-strong bg-surface px-4 py-2 font-medium text-[14px] text-text-1 transition-colors hover:bg-lavender focus-visible:outline focus-visible:outline-2 focus-visible:outline-cobalt focus-visible:outline-offset-2"
				>
					New problem
				</button>
			</div>
		</section>
	)
}

interface FlipFaceProps {
	side: "front" | "back"
	eyebrow: string
	percent: number
	base: number
	tone: string
	accentClass: string
}
function FlipFace({ side, eyebrow, percent, base, tone, accentClass }: FlipFaceProps) {
	const positionClass =
		side === "front" ? "[transform:rotateY(0deg)]" : "[transform:rotateY(180deg)]"
	return (
		<div
			className={`backface-hidden absolute inset-0 flex flex-col items-center justify-center gap-2 rounded-lg border border-border-strong bg-bg ${positionClass}`}
		>
			<span
				className={`rounded-full px-3 py-0.5 font-semibold text-[10px] uppercase tracking-[0.08em] ${accentClass}`}
			>
				{eyebrow}
			</span>
			<p className={`font-mono font-semibold text-[40px] leading-none ${tone}`}>
				{percent}% of {base}
			</p>
			<p className="font-mono text-[12px] text-text-3">
				= ({percent} × {base}) ÷ 100
			</p>
		</div>
	)
}

interface ReadoutProps {
	label: string
	value: string
	tone: string
}
function Readout({ label, value, tone }: ReadoutProps) {
	return (
		<div className="rounded-md border border-border-soft bg-bg px-3 py-2">
			<p className="font-semibold text-[10px] text-text-3 uppercase tracking-[0.08em]">{label}</p>
			<p className={`font-mono font-semibold text-[18px] tabular-nums tracking-tight ${tone}`}>
				{value}
			</p>
		</div>
	)
}

function SpeedDrill() {
	const [problem, setProblem] = React.useState<FlipProblem>(generateProblem)
	const [guess, setGuess] = React.useState("")
	const [streak, setStreak] = React.useState(0)
	const [best, setBest] = React.useState(0)
	const [showFlipped, setShowFlipped] = React.useState(false)
	const [feedback, setFeedback] = React.useState<"idle" | "right" | "wrong">("idle")
	const inputRef = React.useRef<HTMLInputElement>(null)
	const pillRef = React.useRef<HTMLDivElement>(null)
	const mastered = useMastery({ slug: "percent-flip", score: best, originRef: pillRef })

	function next() {
		setProblem(generateProblem())
		setGuess("")
		setShowFlipped(false)
		setFeedback("idle")
		const el = inputRef.current
		if (el) el.focus()
	}
	function check(event: React.FormEvent) {
		event.preventDefault()
		const parsed = Number.parseFloat(guess)
		if (Number.isNaN(parsed)) return
		if (Math.abs(parsed - problem.answer) < 0.0001) {
			const nextStreak = streak + 1
			setFeedback("right")
			setStreak(nextStreak)
			if (nextStreak > best) setBest(nextStreak)
			window.setTimeout(next, 650)
		} else {
			setFeedback("wrong")
			setStreak(0)
		}
	}
	function flip() {
		setShowFlipped(function toggle(prev) {
			return !prev
		})
	}
	function skip() {
		setStreak(0)
		next()
	}

	const shownPercent = showFlipped ? problem.base : problem.percent
	const shownBase = showFlipped ? problem.percent : problem.base
	const flipLabel = showFlipped ? "Unflip" : "Flip"
	const feedbackTone =
		feedback === "right" ? "text-good" : feedback === "wrong" ? "text-pace-over" : "text-text-3"
	const feedbackCopy =
		feedback === "right"
			? `Snap. ${problem.percent}% of ${problem.base} = ${formatAnswer(problem.answer)}.`
			: feedback === "wrong"
				? `Off — answer is ${formatAnswer(problem.answer)}. Try flipping: ${problem.base}% of ${problem.percent}.`
				: "Flip first. Solve the friendly side."
	return (
		<section className="rounded-lg border border-border-soft bg-surface">
			<div className="flex items-center justify-between border-border-soft border-b px-5 py-3">
				<div>
					<p className="font-semibold text-[11px] text-text-3 uppercase tracking-[0.06em]">
						Speed drill
					</p>
					<p className="mt-0.5 text-[13px] text-text-2">
						Solve. Tap Flip if one side looks friendlier.
					</p>
				</div>
				<div className="flex gap-2">
					<StatPill label="Streak" value={String(streak)} tone="text-indigo-deep" />
					<MasteryPill
						pillRef={pillRef}
						label="Best"
						value={String(best)}
						tone="text-good"
						mastered={mastered}
					/>
				</div>
			</div>
			<div className="px-5 py-6">
				<p className="text-center font-mono font-semibold text-[44px] text-text-1 leading-none">
					{shownPercent}% of {shownBase}
				</p>
				<p className="mt-1 text-center text-[12px] text-text-3">
					= ({shownPercent} × {shownBase}) ÷ 100
				</p>
				<form onSubmit={check} className="mt-5 flex flex-wrap items-center justify-center gap-2">
					<input
						ref={inputRef}
						type="number"
						step="any"
						inputMode="decimal"
						value={guess}
						onChange={function onChange(e) {
							setGuess(e.target.value)
							setFeedback("idle")
						}}
						aria-label="Your answer"
						className="h-11 w-32 rounded-md border border-border-strong bg-bg px-3 font-mono text-[18px] text-text-1 focus-visible:border-cobalt focus-visible:outline focus-visible:outline-2 focus-visible:outline-cobalt focus-visible:outline-offset-2"
					/>
					<button
						type="submit"
						className="h-11 rounded-md border border-text-1 bg-text-1 px-4 font-medium text-[14px] text-bg transition-opacity hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-cobalt focus-visible:outline-offset-2"
					>
						Check
					</button>
					<button
						type="button"
						onClick={flip}
						className="h-11 rounded-md border border-cobalt bg-cobalt/10 px-4 font-medium text-[14px] text-cobalt transition-colors hover:bg-cobalt/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-cobalt focus-visible:outline-offset-2"
					>
						{flipLabel}
					</button>
					<button
						type="button"
						onClick={skip}
						className="h-11 rounded-md border border-border-strong bg-surface px-4 font-medium text-[14px] text-text-1 transition-colors hover:bg-lavender focus-visible:outline focus-visible:outline-2 focus-visible:outline-cobalt focus-visible:outline-offset-2"
					>
						Skip
					</button>
				</form>
				<p className={`mt-3 text-center text-[13px] ${feedbackTone}`}>{feedbackCopy}</p>
			</div>
		</section>
	)
}

interface StatPillProps {
	label: string
	value: string
	tone: string
}
function StatPill({ label, value, tone }: StatPillProps) {
	return (
		<div className="rounded-md border border-border-soft bg-bg px-3 py-1.5 text-right">
			<p className="font-semibold text-[9px] text-text-3 uppercase tracking-[0.08em]">{label}</p>
			<p className={`font-mono font-semibold text-[16px] tabular-nums ${tone}`}>{value}</p>
		</div>
	)
}

export { PercentFlipLesson }
