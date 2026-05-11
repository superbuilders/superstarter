"use client"

// Butterfly Fraction Comparison lesson body.
//
// Three stacked panels:
//   1. <RevealPanel> — explains the upward cross-multiplication rule.
//   2. Interactive butterfly — two fraction inputs + a "Compare" button
//      that draws the diagonal arrows and surfaces the comparison
//      products above each numerator.
//   3. Speed Drill — infinite "which is larger?" problems that reward
//      applying the shortcut.

import * as React from "react"
import { LessonShell } from "@/components/lessons/shared/lesson-shell"
import { MasteryPill, useMastery } from "@/components/lessons/shared/mastery"
import { RevealPanel } from "@/components/lessons/shared/reveal-panel"

const MIN_DENOM = 2
const MAX_DENOM = 19
const MIN_NUM = 1
const MAX_NUM = 19

function clampNum(v: number, lo: number, hi: number): number {
	const r = Math.round(v)
	if (r < lo) return lo
	if (r > hi) return hi
	return r
}

function ButterflyLesson() {
	return (
		<LessonShell
			eyebrow="Lesson 02 · Fractions"
			eyebrowClass="text-alpha-accent"
			title="Butterfly Compare"
			blurb="Cross-multiply upward, not sideways. Compare two fractions by looking at two products — no common denominator, no division."
		>
			<RevealPanel label="Reveal the shortcut">
				<p className="mb-3">
					To compare <span className="font-mono text-text-1">a/b</span> and{" "}
					<span className="font-mono text-text-1">c/d</span>, multiply each numerator by the{" "}
					<em>opposite</em> denominator, working diagonally upward:
				</p>
				<p className="mb-3 font-mono text-text-1">a·d ⟷ b·c</p>
				<p className="mb-2">
					The bigger product sits above the bigger fraction. If they tie, the fractions are equal.
				</p>
				<p>
					Why it works: multiplying both sides of{" "}
					<span className="font-mono text-text-1">a/b ? c/d</span> by{" "}
					<span className="font-mono text-text-1">b·d</span> (positive, so the inequality is
					preserved) gives <span className="font-mono text-text-1">a·d ? b·c</span>.
				</p>
			</RevealPanel>
			<Sandbox />
			<SpeedDrill />
		</LessonShell>
	)
}

function Sandbox() {
	const [n1, setN1] = React.useState(3)
	const [d1, setD1] = React.useState(8)
	const [n2, setN2] = React.useState(2)
	const [d2, setD2] = React.useState(5)
	const [revealed, setRevealed] = React.useState(false)

	const cross1 = n1 * d2
	const cross2 = n2 * d1
	let resultCopy = "—"
	let resultTone = "text-text-3"
	if (revealed) {
		if (cross1 > cross2) {
			resultCopy = `${n1}/${d1} is larger (${cross1} > ${cross2})`
			resultTone = "text-cobalt"
		} else if (cross1 < cross2) {
			resultCopy = `${n2}/${d2} is larger (${cross1} < ${cross2})`
			resultTone = "text-alpha-accent"
		} else {
			resultCopy = `Equal (${cross1} = ${cross2})`
			resultTone = "text-good"
		}
	}

	function compare() {
		if (revealed) return
		setRevealed(true)
	}
	function shuffle() {
		setRevealed(false)
		setN1(clampNum(1 + Math.floor(Math.random() * 9), MIN_NUM, MAX_NUM))
		setD1(clampNum(2 + Math.floor(Math.random() * 10), MIN_DENOM, MAX_DENOM))
		setN2(clampNum(1 + Math.floor(Math.random() * 9), MIN_NUM, MAX_NUM))
		setD2(clampNum(2 + Math.floor(Math.random() * 10), MIN_DENOM, MAX_DENOM))
	}

	return (
		<section className="mb-4 overflow-hidden rounded-lg border border-border-soft bg-surface">
			<div className="border-border-soft border-b px-5 py-3">
				<p className="font-semibold text-[11px] text-text-3 uppercase tracking-[0.06em]">
					Interactive butterfly
				</p>
				<p className="mt-0.5 text-[13px] text-text-2">
					Type two fractions. Tap Compare to draw the diagonals and surface each product.
				</p>
			</div>
			<div className="px-3 pt-4 pb-2">
				<ButterflySvg
					n1={n1}
					d1={d1}
					n2={n2}
					d2={d2}
					cross1={cross1}
					cross2={cross2}
					revealed={revealed}
				/>
			</div>
			<div className={`px-5 pb-3 text-center font-medium text-[14px] ${resultTone}`}>
				{resultCopy}
			</div>
			<div className="grid grid-cols-2 gap-4 border-border-soft border-t px-5 py-4">
				<FractionEditor
					label="Left fraction"
					tone="text-cobalt"
					numerator={n1}
					denominator={d1}
					onNumeratorChange={function set(v) {
						setN1(v)
						setRevealed(false)
					}}
					onDenominatorChange={function set(v) {
						setD1(v)
						setRevealed(false)
					}}
				/>
				<FractionEditor
					label="Right fraction"
					tone="text-alpha-accent"
					numerator={n2}
					denominator={d2}
					onNumeratorChange={function set(v) {
						setN2(v)
						setRevealed(false)
					}}
					onDenominatorChange={function set(v) {
						setD2(v)
						setRevealed(false)
					}}
				/>
			</div>
			<div className="flex gap-2 border-border-soft border-t px-5 py-3">
				<button
					type="button"
					onClick={compare}
					disabled={revealed}
					className="rounded-md border border-text-1 bg-text-1 px-4 py-2 font-medium text-[14px] text-bg transition-opacity hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-cobalt focus-visible:outline-offset-2 disabled:opacity-40"
				>
					Compare
				</button>
				<button
					type="button"
					onClick={shuffle}
					className="rounded-md border border-border-strong bg-surface px-4 py-2 font-medium text-[14px] text-text-1 transition-colors hover:bg-lavender focus-visible:outline focus-visible:outline-2 focus-visible:outline-cobalt focus-visible:outline-offset-2"
				>
					Shuffle
				</button>
			</div>
		</section>
	)
}

interface FractionEditorProps {
	label: string
	tone: string
	numerator: number
	denominator: number
	onNumeratorChange: (v: number) => void
	onDenominatorChange: (v: number) => void
}
function FractionEditor({
	label,
	tone,
	numerator,
	denominator,
	onNumeratorChange,
	onDenominatorChange
}: FractionEditorProps) {
	return (
		<div className="flex flex-col gap-2">
			<p className={`font-semibold text-[10px] uppercase tracking-[0.08em] ${tone}`}>{label}</p>
			<NumberStepper
				label="Numerator"
				value={numerator}
				onChange={onNumeratorChange}
				min={MIN_NUM}
				max={MAX_NUM}
			/>
			<NumberStepper
				label="Denominator"
				value={denominator}
				onChange={onDenominatorChange}
				min={MIN_DENOM}
				max={MAX_DENOM}
			/>
		</div>
	)
}

interface NumberStepperProps {
	label: string
	value: number
	onChange: (v: number) => void
	min: number
	max: number
}
function NumberStepper({ label, value, onChange, min, max }: NumberStepperProps) {
	function dec() {
		if (value > min) onChange(value - 1)
	}
	function inc() {
		if (value < max) onChange(value + 1)
	}
	function onInput(e: React.ChangeEvent<HTMLInputElement>) {
		const parsed = Number.parseInt(e.target.value, 10)
		if (Number.isNaN(parsed)) return
		onChange(clampNum(parsed, min, max))
	}
	return (
		<div className="flex items-center gap-2">
			<span className="w-20 text-[11px] text-text-3 uppercase tracking-[0.06em]">{label}</span>
			<div className="flex items-center gap-1">
				<button
					type="button"
					aria-label={`Decrease ${label}`}
					onClick={dec}
					disabled={value <= min}
					className="size-9 rounded-md border border-border-soft bg-bg font-mono text-[18px] text-text-1 transition-colors hover:bg-lavender focus-visible:outline focus-visible:outline-2 focus-visible:outline-cobalt focus-visible:outline-offset-2 disabled:opacity-30 disabled:hover:bg-bg"
				>
					−
				</button>
				<input
					type="number"
					inputMode="numeric"
					value={value}
					onChange={onInput}
					aria-label={label}
					className="h-9 w-14 rounded-md border border-border-strong bg-bg text-center font-mono text-[15px] text-text-1 focus-visible:border-cobalt focus-visible:outline focus-visible:outline-2 focus-visible:outline-cobalt focus-visible:outline-offset-2"
				/>
				<button
					type="button"
					aria-label={`Increase ${label}`}
					onClick={inc}
					disabled={value >= max}
					className="size-9 rounded-md border border-border-soft bg-bg font-mono text-[18px] text-text-1 transition-colors hover:bg-lavender focus-visible:outline focus-visible:outline-2 focus-visible:outline-cobalt focus-visible:outline-offset-2 disabled:opacity-30 disabled:hover:bg-bg"
				>
					+
				</button>
			</div>
		</div>
	)
}

interface ButterflySvgProps {
	n1: number
	d1: number
	n2: number
	d2: number
	cross1: number
	cross2: number
	revealed: boolean
}
interface SideTone {
	productTone: string
	arrowTone: string
	boxFill: string
	boxStroke: string
	boxText: string
}
const LEFT_WINNING_TONE: SideTone = {
	productTone: "fill-cobalt",
	arrowTone: "stroke-cobalt",
	boxFill: "fill-cobalt",
	boxStroke: "stroke-cobalt",
	boxText: "fill-bg"
}
const LEFT_LOSING_TONE: SideTone = {
	productTone: "fill-text-3",
	arrowTone: "stroke-text-3",
	boxFill: "fill-bg",
	boxStroke: "stroke-border-strong",
	boxText: "fill-text-1"
}
const RIGHT_WINNING_TONE: SideTone = {
	productTone: "fill-alpha-accent",
	arrowTone: "stroke-alpha-accent",
	boxFill: "fill-alpha-accent",
	boxStroke: "stroke-alpha-accent",
	boxText: "fill-bg"
}
const RIGHT_LOSING_TONE: SideTone = LEFT_LOSING_TONE

const INEQUALITY_GLYPH: Record<"left" | "right" | "tie", string> = {
	left: ">",
	right: "<",
	tie: "="
}

function ButterflySvg({ n1, d1, n2, d2, cross1, cross2, revealed }: ButterflySvgProps) {
	const LEFT_X = 110
	const RIGHT_X = 290
	const BAR_Y = 110
	const NUM_Y = 92
	const DEN_Y = 132
	const PRODUCT_Y = 32
	const arrowOpacity = revealed ? 1 : 0
	let winnerSide: "left" | "right" | "tie" = "tie"
	if (cross1 > cross2) winnerSide = "left"
	else if (cross1 < cross2) winnerSide = "right"
	const leftTone = winnerSide === "left" ? LEFT_WINNING_TONE : LEFT_LOSING_TONE
	const rightTone = winnerSide === "right" ? RIGHT_WINNING_TONE : RIGHT_LOSING_TONE
	const inequalityGlyph = revealed ? INEQUALITY_GLYPH[winnerSide] : "?"
	return (
		<svg
			viewBox="0 0 400 170"
			role="img"
			aria-label="Butterfly comparison of two fractions"
			className="block h-auto w-full min-w-[320px]"
		>
			<title>Butterfly cross-multiplication of two fractions</title>
			<defs>
				<marker
					id="butterfly-arrow-left"
					viewBox="0 0 10 10"
					refX={8}
					refY={5}
					markerWidth={6}
					markerHeight={6}
					orient="auto-start-reverse"
				>
					<path d="M0,0 L10,5 L0,10 z" className={leftTone.arrowTone} fill="currentColor" />
				</marker>
				<marker
					id="butterfly-arrow-right"
					viewBox="0 0 10 10"
					refX={8}
					refY={5}
					markerWidth={6}
					markerHeight={6}
					orient="auto-start-reverse"
				>
					<path d="M0,0 L10,5 L0,10 z" className={rightTone.arrowTone} fill="currentColor" />
				</marker>
			</defs>
			<g>
				<line
					x1={LEFT_X - 26}
					y1={BAR_Y}
					x2={LEFT_X + 26}
					y2={BAR_Y}
					className="stroke-text-1"
					strokeWidth={2}
					strokeLinecap="round"
				/>
				<text
					x={LEFT_X}
					y={NUM_Y}
					textAnchor="middle"
					className="fill-cobalt font-mono font-semibold text-[26px]"
				>
					{n1}
				</text>
				<text
					x={LEFT_X}
					y={DEN_Y}
					textAnchor="middle"
					className="fill-cobalt font-mono font-semibold text-[26px]"
				>
					{d1}
				</text>
			</g>
			<text
				x={200}
				y={117}
				textAnchor="middle"
				className="fill-text-3 font-mono font-semibold text-[28px]"
			>
				{inequalityGlyph}
			</text>
			<g>
				<line
					x1={RIGHT_X - 26}
					y1={BAR_Y}
					x2={RIGHT_X + 26}
					y2={BAR_Y}
					className="stroke-text-1"
					strokeWidth={2}
					strokeLinecap="round"
				/>
				<text
					x={RIGHT_X}
					y={NUM_Y}
					textAnchor="middle"
					className="fill-alpha-accent font-mono font-semibold text-[26px]"
				>
					{n2}
				</text>
				<text
					x={RIGHT_X}
					y={DEN_Y}
					textAnchor="middle"
					className="fill-alpha-accent font-mono font-semibold text-[26px]"
				>
					{d2}
				</text>
			</g>
			<g opacity={arrowOpacity} className="transition-opacity duration-300">
				<line
					x1={RIGHT_X - 6}
					y1={DEN_Y - 6}
					x2={LEFT_X + 4}
					y2={NUM_Y - 18}
					className={leftTone.arrowTone}
					strokeWidth={1.5}
					strokeLinecap="round"
					strokeDasharray="3 3"
					markerEnd="url(#butterfly-arrow-left)"
				/>
				<line
					x1={LEFT_X + 6}
					y1={DEN_Y - 6}
					x2={RIGHT_X - 4}
					y2={NUM_Y - 18}
					className={rightTone.arrowTone}
					strokeWidth={1.5}
					strokeLinecap="round"
					strokeDasharray="3 3"
					markerEnd="url(#butterfly-arrow-right)"
				/>
				<rect
					x={LEFT_X - 26}
					y={PRODUCT_Y - 14}
					width={52}
					height={22}
					rx={6}
					className={`${leftTone.boxFill} ${leftTone.boxStroke}`}
					strokeWidth={1.5}
				/>
				<text
					x={LEFT_X}
					y={PRODUCT_Y + 1}
					textAnchor="middle"
					className={`font-mono font-semibold text-[13px] ${leftTone.productTone} ${leftTone.boxText}`}
				>
					{n1}·{d2} = {cross1}
				</text>
				<rect
					x={RIGHT_X - 26}
					y={PRODUCT_Y - 14}
					width={52}
					height={22}
					rx={6}
					className={`${rightTone.boxFill} ${rightTone.boxStroke}`}
					strokeWidth={1.5}
				/>
				<text
					x={RIGHT_X}
					y={PRODUCT_Y + 1}
					textAnchor="middle"
					className={`font-mono font-semibold text-[13px] ${rightTone.productTone} ${rightTone.boxText}`}
				>
					{n2}·{d1} = {cross2}
				</text>
			</g>
		</svg>
	)
}

interface DrillProblem {
	n1: number
	d1: number
	n2: number
	d2: number
	answer: "left" | "right" | "equal"
}

function generateProblem(): DrillProblem {
	for (let attempt = 0; attempt < 30; attempt++) {
		const n1 = 1 + Math.floor(Math.random() * 11)
		const d1 = 2 + Math.floor(Math.random() * 10)
		const n2 = 1 + Math.floor(Math.random() * 11)
		const d2 = 2 + Math.floor(Math.random() * 10)
		if (n1 >= d1 || n2 >= d2) continue
		const c1 = n1 * d2
		const c2 = n2 * d1
		let answer: "left" | "right" | "equal" = "equal"
		if (c1 > c2) answer = "left"
		else if (c1 < c2) answer = "right"
		return { n1, d1, n2, d2, answer }
	}
	return { n1: 3, d1: 8, n2: 2, d2: 5, answer: "right" }
}

function SpeedDrill() {
	const [problem, setProblem] = React.useState<DrillProblem>(generateProblem)
	const [streak, setStreak] = React.useState(0)
	const [best, setBest] = React.useState(0)
	const [feedback, setFeedback] = React.useState<"idle" | "right" | "wrong">("idle")
	const [picked, setPicked] = React.useState<"left" | "right" | "equal" | null>(null)
	const pillRef = React.useRef<HTMLDivElement>(null)
	const mastered = useMastery({ score: best, originRef: pillRef })

	function pick(choice: "left" | "right" | "equal") {
		if (feedback === "right") return
		setPicked(choice)
		if (choice === problem.answer) {
			const nextStreak = streak + 1
			setFeedback("right")
			setStreak(nextStreak)
			if (nextStreak > best) setBest(nextStreak)
			window.setTimeout(function nextProblem() {
				setProblem(generateProblem())
				setFeedback("idle")
				setPicked(null)
			}, 600)
		} else {
			setFeedback("wrong")
			setStreak(0)
		}
	}
	function skip() {
		setStreak(0)
		setProblem(generateProblem())
		setFeedback("idle")
		setPicked(null)
	}

	const cross1 = problem.n1 * problem.d2
	const cross2 = problem.n2 * problem.d1
	const feedbackTone =
		feedback === "right" ? "text-good" : feedback === "wrong" ? "text-pace-over" : "text-text-3"
	const feedbackCopy =
		feedback === "right"
			? `Right — ${problem.n1}·${problem.d2} = ${cross1}, ${problem.n2}·${problem.d1} = ${cross2}.`
			: feedback === "wrong"
				? `Not yet — ${problem.n1}·${problem.d2} = ${cross1}, ${problem.n2}·${problem.d1} = ${cross2}. Try again.`
				: "Multiply each numerator by the opposite denominator. Bigger product wins."
	return (
		<section className="rounded-lg border border-border-soft bg-surface">
			<div className="flex items-center justify-between border-border-soft border-b px-5 py-3">
				<div>
					<p className="font-semibold text-[11px] text-text-3 uppercase tracking-[0.06em]">
						Speed drill
					</p>
					<p className="mt-0.5 text-[13px] text-text-2">Which fraction is larger?</p>
				</div>
				<div className="flex gap-2">
					<StatPill label="Streak" value={String(streak)} tone="text-alpha-accent" />
					<MasteryPill
						pillRef={pillRef}
						label="Best"
						value={String(best)}
						tone="text-good"
						mastered={mastered}
					/>
				</div>
			</div>
			<div className="grid grid-cols-2 items-center gap-6 px-5 py-6 text-center">
				<FractionGlyph numerator={problem.n1} denominator={problem.d1} tone="text-cobalt" />
				<FractionGlyph numerator={problem.n2} denominator={problem.d2} tone="text-alpha-accent" />
			</div>
			<div className="grid grid-cols-3 gap-2 px-5 pb-3">
				<DrillButton
					label="Left bigger"
					selected={picked === "left"}
					correct={feedback === "right" && picked === "left"}
					wrong={feedback === "wrong" && picked === "left"}
					onClick={function onLeft() {
						pick("left")
					}}
				/>
				<DrillButton
					label="Equal"
					selected={picked === "equal"}
					correct={feedback === "right" && picked === "equal"}
					wrong={feedback === "wrong" && picked === "equal"}
					onClick={function onEqual() {
						pick("equal")
					}}
				/>
				<DrillButton
					label="Right bigger"
					selected={picked === "right"}
					correct={feedback === "right" && picked === "right"}
					wrong={feedback === "wrong" && picked === "right"}
					onClick={function onRight() {
						pick("right")
					}}
				/>
			</div>
			<div className="flex items-center justify-between gap-2 border-border-soft border-t px-5 py-3">
				<p className={`text-[13px] ${feedbackTone}`}>{feedbackCopy}</p>
				<button
					type="button"
					onClick={skip}
					className="shrink-0 rounded-md border border-border-strong bg-surface px-3 py-1.5 font-medium text-[13px] text-text-1 transition-colors hover:bg-lavender focus-visible:outline focus-visible:outline-2 focus-visible:outline-cobalt focus-visible:outline-offset-2"
				>
					Skip
				</button>
			</div>
		</section>
	)
}

interface FractionGlyphProps {
	numerator: number
	denominator: number
	tone: string
}
function FractionGlyph({ numerator, denominator, tone }: FractionGlyphProps) {
	return (
		<div className={`inline-flex flex-col items-center font-mono font-semibold ${tone}`}>
			<span className="text-[40px] leading-none">{numerator}</span>
			<span className="my-1 block h-[3px] w-[64px] rounded-full bg-current" />
			<span className="text-[40px] leading-none">{denominator}</span>
		</div>
	)
}

interface DrillButtonProps {
	label: string
	selected: boolean
	correct: boolean
	wrong: boolean
	onClick: () => void
}
function DrillButton({ label, selected, correct, wrong, onClick }: DrillButtonProps) {
	let tone = "border-border-strong bg-surface text-text-1 hover:bg-lavender"
	if (correct) {
		tone = "border-good bg-good text-bg"
	} else if (wrong) {
		tone = "border-pace-over bg-pace-over/10 text-pace-over"
	} else if (selected) {
		tone = "border-text-1 bg-text-1 text-bg"
	}
	return (
		<button
			type="button"
			onClick={onClick}
			className={`h-12 rounded-md border font-medium text-[14px] transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-cobalt focus-visible:outline-offset-2 ${tone}`}
		>
			{label}
		</button>
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

export { ButterflyLesson }
