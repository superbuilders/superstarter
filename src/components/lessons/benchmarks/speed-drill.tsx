"use client"

// Match-the-pair drill with three logic-based hints layered on top of
// the original 5-second-per-prompt format:
//
//   • Show Lineage — renders the LINEAGE.steps as a chip chain so the
//     learner can trace 1/12 back through 1/6 and 1/3.
//   • Halve It    — pulls LINEAGE.parent into a side-by-side card and
//     animates a "÷ 2" arrow into the current row's percent.
//   • Close Enough — session-scoped toggle that surfaces the
//     LINEAGE.closeTo estimation tag (e.g. "Just under 10%") under the
//     fraction display, for the rows that have one.
//
// Show Lineage and Halve It pause the per-prompt timer so the learner
// can read without losing the round. Close Enough is purely a label
// toggle and never pauses anything.
//
// Mastery still tracks per-row clears against all 19 anchors and uses
// the shared <MasteryPill>/useMastery confetti hook unchanged. Hints
// don't affect the mastery count — using a hint and then answering
// correctly still locks the row in.

import * as React from "react"
import {
	type BenchmarkRow,
	BENCHMARKS,
	LINEAGE,
	type Lineage,
	type ParentRef,
	rowFraction,
	rowKey
} from "@/components/lessons/benchmarks/benchmarks-data"
import { markLessonDoneToday } from "@/components/lessons/shared/lesson-mastery-store"
import { MasteryPill, useMastery } from "@/components/lessons/shared/mastery"

const ROUND_LENGTH = 10
const ROUND_TIME_MS = 5000
const TOTAL_ROWS = BENCHMARKS.length

type PromptMode = "fraction-to-percent" | "percent-to-fraction" | "fraction-to-decimal"
type HintKind = "lineage" | "halve" | null

interface Prompt {
	row: BenchmarkRow
	mode: PromptMode
	choices: ReadonlyArray<string>
	answer: string
}

const MODE_LABEL: Record<PromptMode, string> = {
	"fraction-to-percent": "Pick the percent",
	"percent-to-fraction": "Pick the fraction",
	"fraction-to-decimal": "Pick the decimal"
}

interface RoundState {
	prompts: ReadonlyArray<Prompt>
	index: number
	correct: number
	picked: string | null
	feedback: "idle" | "right" | "wrong" | "timeout"
	startMs: number
	pausedAccumMs: number
	pausedAt: number | null
}

function pickMode(): PromptMode {
	const r = Math.floor(Math.random() * 3)
	if (r === 0) return "fraction-to-percent"
	if (r === 1) return "percent-to-fraction"
	return "fraction-to-decimal"
}

function shuffleInPlace<T>(arr: Array<T>): void {
	for (let i = arr.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1))
		const tmp = arr[i]
		const other = arr[j]
		if (tmp === undefined || other === undefined) continue
		arr[i] = other
		arr[j] = tmp
	}
}

function uniqueChoices(answer: string, candidates: ReadonlyArray<string>): ReadonlyArray<string> {
	const set = new Set<string>([answer])
	const shuffled = [...candidates]
	shuffleInPlace(shuffled)
	for (const c of shuffled) {
		if (set.size >= 4) break
		set.add(c)
	}
	const items = Array.from(set)
	shuffleInPlace(items)
	return items
}

function generatePromptForRow(row: BenchmarkRow): Prompt {
	const mode = pickMode()
	if (mode === "fraction-to-percent") {
		const candidates = BENCHMARKS.filter(function notSame(r) {
			return r !== row
		}).map(function pct(r) {
			return r.percent
		})
		return {
			row,
			mode,
			answer: row.percent,
			choices: uniqueChoices(row.percent, candidates)
		}
	}
	if (mode === "percent-to-fraction") {
		const candidates = BENCHMARKS.filter(function notSame(r) {
			return r !== row
		}).map(function frac(r) {
			return rowFraction(r)
		})
		return {
			row,
			mode,
			answer: rowFraction(row),
			choices: uniqueChoices(rowFraction(row), candidates)
		}
	}
	const candidates = BENCHMARKS.filter(function notSame(r) {
		return r !== row
	}).map(function dec(r) {
		return r.decimal
	})
	return {
		row,
		mode,
		answer: row.decimal,
		choices: uniqueChoices(row.decimal, candidates)
	}
}

function newRound(masteredRows: ReadonlySet<string>): RoundState {
	const unmastered = BENCHMARKS.filter(function notMastered(r) {
		return !masteredRows.has(rowKey(r))
	})
	const pool = [...unmastered]
	shuffleInPlace(pool)
	const selected = pool.slice(0, ROUND_LENGTH)
	const prompts = selected.map(generatePromptForRow)
	return {
		prompts,
		index: 0,
		correct: 0,
		picked: null,
		feedback: "idle",
		startMs: performance.now(),
		pausedAccumMs: 0,
		pausedAt: null
	}
}

function elapsedFor(round: RoundState, now: number): number {
	const raw = now - round.startMs - round.pausedAccumMs
	if (round.pausedAt === null) return raw
	return raw - (now - round.pausedAt)
}

function findRow(num: number, den: number): BenchmarkRow | null {
	for (const r of BENCHMARKS) {
		if (r.num === num && r.den === den) return r
	}
	return null
}

function SpeedDrill() {
	const [masteredRows, setMasteredRows] = React.useState<ReadonlySet<string>>(function init() {
		return new Set()
	})
	const [round, setRound] = React.useState<RoundState | null>(null)
	const [hint, setHint] = React.useState<HintKind>(null)
	const [closeEnoughOn, setCloseEnoughOn] = React.useState(false)
	const [, forceTick] = React.useState(0)
	const pillRef = React.useRef<HTMLDivElement>(null)
	const masteredCount = masteredRows.size
	const allMastered = masteredCount >= TOTAL_ROWS
	const mastered = useMastery({
		slug: "benchmarks",
		score: masteredCount,
		threshold: TOTAL_ROWS,
		originRef: pillRef
	})

	const current = round === null ? undefined : round.prompts[round.index]
	const answered = round !== null && round.feedback !== "idle"
	const paused = round !== null && round.pausedAt !== null
	const lineage = current ? LINEAGE[rowKey(current.row)] : undefined

	React.useEffect(
		function timer() {
			if (round === null) return
			if (answered) return
			if (paused) return
			const interval = window.setInterval(function bump() {
				forceTick(function inc(t) {
					return t + 1
				})
			}, 80)
			return function cleanup() {
				window.clearInterval(interval)
			}
		},
		[answered, paused, round]
	)

	const elapsed = round === null ? 0 : elapsedFor(round, performance.now())
	const remaining = Math.max(0, ROUND_TIME_MS - elapsed)
	const remainingPct = Math.max(0, Math.min(100, (remaining / ROUND_TIME_MS) * 100))

	React.useEffect(
		function fireTimeout() {
			if (round === null) return
			if (answered) return
			if (paused) return
			if (remaining > 0) return
			setRound(function expire(prev) {
				if (prev === null) return prev
				if (prev.feedback !== "idle") return prev
				return { ...prev, feedback: "timeout", picked: null }
			})
		},
		[remaining, answered, paused, round]
	)

	React.useEffect(
		function advance() {
			if (round === null) return
			if (round.feedback === "idle") return
			const delay = round.feedback === "right" ? 600 : 1100
			const handle = window.setTimeout(function next() {
				setHint(null)
				setRound(function step(prev) {
					if (prev === null) return prev
					const nextIndex = prev.index + 1
					if (nextIndex >= prev.prompts.length) {
						return null
					}
					return {
						prompts: prev.prompts,
						index: nextIndex,
						correct: prev.correct,
						picked: null,
						feedback: "idle",
						startMs: performance.now(),
						pausedAccumMs: 0,
						pausedAt: null
					}
				})
			}, delay)
			return function cleanup() {
				window.clearTimeout(handle)
			}
		},
		[round]
	)

	function pick(choice: string) {
		if (answered || !current || round === null) return
		const target = current
		const isRight = choice === target.answer
		if (isRight) {
			markLessonDoneToday()
			setMasteredRows(function add(prev) {
				const next = new Set(prev)
				next.add(rowKey(target.row))
				return next
			})
		}
		setHint(null)
		setRound(function lock(prev) {
			if (prev === null) return prev
			const updatedCorrect = isRight ? prev.correct + 1 : prev.correct
			const fb = isRight ? "right" : "wrong"
			let pausedAccumMs = prev.pausedAccumMs
			if (prev.pausedAt !== null) {
				pausedAccumMs = pausedAccumMs + (performance.now() - prev.pausedAt)
			}
			return {
				...prev,
				picked: choice,
				feedback: fb,
				correct: updatedCorrect,
				pausedAt: null,
				pausedAccumMs
			}
		})
	}

	function openHint(kind: "lineage" | "halve") {
		if (answered || round === null) return
		setHint(kind)
		setRound(function pause(prev) {
			if (prev === null) return prev
			if (prev.pausedAt !== null) return prev
			return { ...prev, pausedAt: performance.now() }
		})
	}
	function closeHint() {
		setHint(null)
		setRound(function resume(prev) {
			if (prev === null) return prev
			if (prev.pausedAt === null) return prev
			const pausedAccumMs = prev.pausedAccumMs + (performance.now() - prev.pausedAt)
			return { ...prev, pausedAt: null, pausedAccumMs }
		})
	}
	function toggleCloseEnough() {
		setCloseEnoughOn(function flip(prev) {
			return !prev
		})
	}

	function reset() {
		setMasteredRows(new Set())
		setRound(null)
		setHint(null)
	}

	if (round === null) {
		return (
			<IdleView
				allMastered={allMastered}
				masteredCount={masteredCount}
				onStart={function start() {
					setRound(newRound(masteredRows))
				}}
				onReset={reset}
				mastered={mastered}
				pillRef={pillRef}
			/>
		)
	}

	if (!current) {
		return (
			<section className="rounded-lg border border-border-soft bg-surface px-5 py-6 text-center text-text-3">
				Loading…
			</section>
		)
	}

	return (
		<ActivePromptView
			round={round}
			current={current}
			lineage={lineage}
			hint={hint}
			closeEnoughOn={closeEnoughOn}
			masteredCount={masteredCount}
			mastered={mastered}
			pillRef={pillRef}
			remainingPct={remainingPct}
			paused={paused}
			answered={answered}
			onPick={pick}
			onOpenHint={openHint}
			onCloseHint={closeHint}
			onToggleCloseEnough={toggleCloseEnough}
		/>
	)
}

interface IdleViewProps {
	allMastered: boolean
	masteredCount: number
	onStart: () => void
	onReset: () => void
	mastered: boolean
	pillRef: React.RefObject<HTMLDivElement | null>
}
function IdleView({
	allMastered,
	masteredCount,
	onStart,
	onReset,
	mastered,
	pillRef
}: IdleViewProps) {
	if (allMastered) {
		return (
			<AllMasteredCard
				total={TOTAL_ROWS}
				onReset={onReset}
				mastered={mastered}
				pillRef={pillRef}
			/>
		)
	}
	if (masteredCount === 0) {
		return (
			<StartCard
				total={TOTAL_ROWS}
				onStart={onStart}
				mastered={mastered}
				pillRef={pillRef}
			/>
		)
	}
	return (
		<BetweenRoundsCard
			masteredCount={masteredCount}
			total={TOTAL_ROWS}
			onContinue={onStart}
			onReset={onReset}
			mastered={mastered}
			pillRef={pillRef}
		/>
	)
}

interface ActivePromptViewProps {
	round: RoundState
	current: Prompt
	lineage: Lineage | undefined
	hint: HintKind
	closeEnoughOn: boolean
	masteredCount: number
	mastered: boolean
	pillRef: React.RefObject<HTMLDivElement | null>
	remainingPct: number
	paused: boolean
	answered: boolean
	onPick: (choice: string) => void
	onOpenHint: (kind: "lineage" | "halve") => void
	onCloseHint: () => void
	onToggleCloseEnough: () => void
}
function ActivePromptView({
	round,
	current,
	lineage,
	hint,
	closeEnoughOn,
	masteredCount,
	mastered,
	pillRef,
	remainingPct,
	paused,
	answered,
	onPick,
	onOpenHint,
	onCloseHint,
	onToggleCloseEnough
}: ActivePromptViewProps) {
	const promptCopy = MODE_LABEL[current.mode]
	let displayValue = rowFraction(current.row)
	let displayKind = "Fraction"
	if (current.mode === "percent-to-fraction") {
		displayValue = current.row.percent
		displayKind = "Percent"
	}
	const closeEnoughLabel = lineage?.closeTo
	const showCloseEnoughTag = closeEnoughOn && !!closeEnoughLabel
	const lineageAvailable = current.mode === "fraction-to-percent" && !!lineage
	const halveAvailable = current.mode === "fraction-to-percent" && !!lineage?.parent

	return (
		<section className="rounded-lg border border-border-soft bg-surface">
			<div className="flex items-center justify-between border-border-soft border-b px-5 py-3">
				<div>
					<p className="font-semibold text-[11px] text-text-3 uppercase tracking-[0.06em]">
						Match-the-pair · {round.index + 1}/{round.prompts.length}
					</p>
					<p className="mt-0.5 text-[13px] text-text-2">{promptCopy}.</p>
				</div>
				<MasteryPill
					pillRef={pillRef}
					label="Rows"
					value={`${masteredCount}/${TOTAL_ROWS}`}
					tone="text-good"
					mastered={mastered}
				/>
			</div>
			<TimerBar remainingPct={remainingPct} paused={paused} />
			<div className="px-5 pt-5 pb-3 text-center">
				<p className="font-semibold text-[10px] text-text-3 uppercase tracking-[0.08em]">
					{displayKind}
				</p>
				<p className="font-mono font-semibold text-[48px] text-text-1 leading-none">
					{displayValue}
				</p>
				{showCloseEnoughTag && closeEnoughLabel ? (
					<p className="mt-2 inline-block rounded-full border border-border-soft bg-bg px-3 py-0.5 font-mono text-[12px] text-cobalt">
						≈ {closeEnoughLabel}
					</p>
				) : null}
			</div>
			<ChoiceGrid
				choices={current.choices}
				answer={current.answer}
				picked={round.picked}
				feedback={round.feedback}
				onPick={onPick}
			/>
			<HintBar
				lineageAvailable={lineageAvailable}
				halveAvailable={halveAvailable}
				closeEnoughOn={closeEnoughOn}
				openHint={hint}
				disabled={answered}
				onOpenLineage={function ol() {
					onOpenHint("lineage")
				}}
				onOpenHalve={function oh() {
					onOpenHint("halve")
				}}
				onToggleCloseEnough={onToggleCloseEnough}
			/>
			{hint !== null && lineage ? (
				<HintPanel kind={hint} lineage={lineage} row={current.row} onClose={onCloseHint} />
			) : null}
		</section>
	)
}

interface TimerBarProps {
	remainingPct: number
	paused: boolean
}
function TimerBar({ remainingPct, paused }: TimerBarProps) {
	let tone = "fill-cobalt"
	if (paused) tone = "fill-text-3"
	else if (remainingPct <= 30) tone = "fill-pace-over"
	else if (remainingPct <= 60) tone = "fill-pace-warn"
	const width = Math.max(0, Math.min(100, remainingPct))
	return (
		<svg
			viewBox="0 0 100 4"
			preserveAspectRatio="none"
			role="progressbar"
			aria-valuemin={0}
			aria-valuemax={100}
			aria-valuenow={Math.round(remainingPct)}
			aria-label="Time remaining"
			className="block h-1 w-full bg-border-soft"
		>
			<title>Time remaining in this prompt</title>
			<rect x={0} y={0} width={width} height={4} className={tone} />
		</svg>
	)
}

interface ChoiceGridProps {
	choices: ReadonlyArray<string>
	answer: string
	picked: string | null
	feedback: RoundState["feedback"]
	onPick: (choice: string) => void
}
function ChoiceGrid({ choices, answer, picked, feedback, onPick }: ChoiceGridProps) {
	return (
		<div className="grid grid-cols-2 gap-2 px-5 pt-2 pb-4">
			{choices.map(function renderChoice(choice) {
				const isPicked = picked === choice
				const isAnswer = choice === answer
				let tone = "border-border-strong bg-surface text-text-1 hover:bg-lavender"
				if (feedback === "right" && isPicked) tone = "border-good bg-good text-bg"
				else if (feedback === "wrong" && isPicked)
					tone = "border-pace-over bg-pace-over/10 text-pace-over"
				else if ((feedback === "wrong" || feedback === "timeout") && isAnswer)
					tone = "border-good bg-good/10 text-good"
				else if (feedback === "timeout" && !isAnswer) tone = "border-border-soft bg-bg text-text-3"
				return (
					<button
						type="button"
						key={choice}
						onClick={function onClick() {
							onPick(choice)
						}}
						disabled={feedback !== "idle"}
						className={`h-14 rounded-md border font-mono font-semibold text-[20px] transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-cobalt focus-visible:outline-offset-2 disabled:cursor-default ${tone}`}
					>
						{choice}
					</button>
				)
			})}
		</div>
	)
}

interface HintBarProps {
	lineageAvailable: boolean
	halveAvailable: boolean
	closeEnoughOn: boolean
	openHint: HintKind
	disabled: boolean
	onOpenLineage: () => void
	onOpenHalve: () => void
	onToggleCloseEnough: () => void
}
function HintBar({
	lineageAvailable,
	halveAvailable,
	closeEnoughOn,
	openHint,
	disabled,
	onOpenLineage,
	onOpenHalve,
	onToggleCloseEnough
}: HintBarProps) {
	let lineageTone = "border-border-strong bg-surface text-text-1 hover:bg-lavender"
	if (openHint === "lineage") lineageTone = "border-cobalt bg-cobalt text-bg"
	let halveTone = "border-border-strong bg-surface text-text-1 hover:bg-lavender"
	if (openHint === "halve") halveTone = "border-cobalt bg-cobalt text-bg"
	let closeTone = "border-border-strong bg-surface text-text-1 hover:bg-lavender"
	if (closeEnoughOn) closeTone = "border-good bg-good/10 text-good"
	let lineageDisabled = !lineageAvailable
	if (disabled) lineageDisabled = true
	let halveDisabled = !halveAvailable
	if (disabled) halveDisabled = true
	return (
		<div className="flex flex-wrap items-center justify-between gap-2 border-border-soft border-t bg-bg/60 px-5 py-3">
			<p className="font-semibold text-[10px] text-text-3 uppercase tracking-[0.08em]">
				Stuck? Hints pause the timer.
			</p>
			<div className="flex flex-wrap gap-2">
				<button
					type="button"
					onClick={onOpenLineage}
					disabled={lineageDisabled}
					className={`rounded-md border px-3 py-1.5 font-medium text-[12px] transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-cobalt focus-visible:outline-offset-2 disabled:cursor-default disabled:opacity-30 ${lineageTone}`}
				>
					Show lineage
				</button>
				<button
					type="button"
					onClick={onOpenHalve}
					disabled={halveDisabled}
					className={`rounded-md border px-3 py-1.5 font-medium text-[12px] transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-cobalt focus-visible:outline-offset-2 disabled:cursor-default disabled:opacity-30 ${halveTone}`}
				>
					Halve it
				</button>
				<button
					type="button"
					onClick={onToggleCloseEnough}
					aria-pressed={closeEnoughOn}
					className={`rounded-md border px-3 py-1.5 font-medium text-[12px] transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-cobalt focus-visible:outline-offset-2 ${closeTone}`}
				>
					{closeEnoughOn ? "Close enough · on" : "Close enough · off"}
				</button>
			</div>
		</div>
	)
}

interface HintPanelProps {
	kind: "lineage" | "halve"
	lineage: Lineage
	row: BenchmarkRow
	onClose: () => void
}
function HintPanel({ kind, lineage, row, onClose }: HintPanelProps) {
	return (
		<div className="fade-in animate-in border-border-soft border-t bg-lavender px-5 py-4 duration-200">
			<div className="flex items-start justify-between gap-3">
				<div className="flex-1">
					{kind === "lineage" ? (
						<LineageHint lineage={lineage} />
					) : (
						<HalveHint lineage={lineage} row={row} />
					)}
				</div>
				<button
					type="button"
					onClick={onClose}
					className="shrink-0 rounded-md border border-border-strong bg-surface px-3 py-1 font-medium text-[12px] text-text-1 transition-colors hover:bg-bg focus-visible:outline focus-visible:outline-2 focus-visible:outline-cobalt focus-visible:outline-offset-2"
				>
					Got it
				</button>
			</div>
		</div>
	)
}

interface LineageHintProps {
	lineage: Lineage
}
function LineageHint({ lineage }: LineageHintProps) {
	return (
		<div>
			<p className="font-semibold text-[10px] text-text-3 uppercase tracking-[0.08em]">
				Lineage · {lineage.rootLabel}
			</p>
			<div className="mt-2 flex flex-wrap items-center gap-2">
				{lineage.steps.map(function renderStep(step, idx) {
					const key = `${step.label}-${idx}`
					return (
						<React.Fragment key={key}>
							{idx > 0 && step.op ? (
								<span className="font-mono text-[11px] text-text-3">{step.op}</span>
							) : null}
							<span className="rounded-md border border-border-strong bg-surface px-2 py-1 font-mono text-[13px] text-text-1">
								<span className="font-semibold">{step.label}</span>
								<span className="ml-1 text-text-3">{step.percent}</span>
							</span>
						</React.Fragment>
					)
				})}
			</div>
		</div>
	)
}

interface HalveHintProps {
	lineage: Lineage
	row: BenchmarkRow
}
function HalveHint({ lineage, row }: HalveHintProps) {
	const parent = lineage.parent
	if (!parent) {
		return (
			<p className="text-[12px] text-text-2 italic">
				No halving parent — this row is a root or derived by sum/multiple. Try Show lineage instead.
			</p>
		)
	}
	const fullParent = findRow(parent.num, parent.den)
	const parentRow: ParentRef = parent
	const parentDisplay = fullParent ? fullParent.percent : parentRow.percent
	return (
		<div>
			<p className="font-semibold text-[10px] text-text-3 uppercase tracking-[0.08em]">
				Halve it
			</p>
			<div className="mt-2 flex items-center justify-center gap-3">
				<HalveCard
					label={`${parentRow.num}/${parentRow.den}`}
					percent={parentDisplay}
					accent="text-text-1"
				/>
				<HalveArrow />
				<HalveCard
					label={rowFraction(row)}
					percent={row.percent}
					accent="text-cobalt"
					highlight
				/>
			</div>
			<p className="mt-3 text-center text-[12px] text-text-2">
				Half of {parentDisplay} is{" "}
				<span className="font-mono font-semibold text-text-1">{row.percent}</span>.
			</p>
		</div>
	)
}

interface HalveCardProps {
	label: string
	percent: string
	accent: string
	highlight?: boolean
}
function HalveCard({ label, percent, accent, highlight = false }: HalveCardProps) {
	let frame = "border-border-strong bg-surface"
	if (highlight) frame = "border-cobalt bg-surface"
	return (
		<div className={`flex flex-col items-center rounded-md border-2 px-3 py-2 ${frame}`}>
			<span className="font-mono font-semibold text-[18px] text-text-1">{label}</span>
			<span className={`font-mono font-semibold text-[13px] ${accent}`}>{percent}</span>
		</div>
	)
}

function HalveArrow() {
	return (
		<svg
			viewBox="0 0 60 32"
			role="presentation"
			focusable="false"
			aria-hidden="true"
			className="h-8 w-12"
		>
			<title>Halving arrow</title>
			<line
				x1={4}
				y1={16}
				x2={50}
				y2={16}
				strokeWidth={2}
				className="stroke-cobalt"
				strokeLinecap="round"
			/>
			<path d="M50,11 L58,16 L50,21 z" className="fill-cobalt" />
			<text
				x={28}
				y={10}
				textAnchor="middle"
				className="fill-cobalt font-mono font-semibold text-[10px]"
			>
				÷ 2
			</text>
		</svg>
	)
}

interface ProgressPillProps {
	masteredCount: number
	total: number
	mastered: boolean
	pillRef: React.RefObject<HTMLDivElement | null>
}
function ProgressPill({ masteredCount, total, mastered, pillRef }: ProgressPillProps) {
	return (
		<MasteryPill
			pillRef={pillRef}
			label="Rows"
			value={`${masteredCount}/${total}`}
			tone="text-good"
			mastered={mastered}
		/>
	)
}

interface StartCardProps {
	total: number
	onStart: () => void
	mastered: boolean
	pillRef: React.RefObject<HTMLDivElement | null>
}
function StartCard({ total, onStart, mastered, pillRef }: StartCardProps) {
	return (
		<section className="rounded-lg border border-border-soft bg-surface">
			<div className="flex items-center justify-between border-border-soft border-b px-5 py-3">
				<div>
					<p className="font-semibold text-[11px] text-text-3 uppercase tracking-[0.06em]">
						Match-the-pair
					</p>
					<p className="mt-0.5 text-[13px] text-text-2">
						Recognize each anchor under a 5-second clock. Hints pause the timer.
					</p>
				</div>
				<ProgressPill masteredCount={0} total={total} mastered={mastered} pillRef={pillRef} />
			</div>
			<div className="px-5 py-8 text-center">
				<p className="font-semibold text-[10px] text-text-3 uppercase tracking-[0.08em]">
					Anchors to master
				</p>
				<p className="font-mono font-semibold text-[56px] text-text-1 leading-none">{total}</p>
				<p className="mx-auto mt-2 max-w-[28rem] text-sm text-text-2">
					Get any one form (fraction, decimal, or percent) right per row. Mastered rows are skipped
					on later rounds. Three hints — Show lineage, Halve it, and Close enough — are there
					whenever you're stuck.
				</p>
				<button
					type="button"
					onClick={onStart}
					className="mt-5 rounded-md border border-text-1 bg-text-1 px-5 py-2 font-medium text-[14px] text-bg transition-opacity hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-cobalt focus-visible:outline-offset-2"
				>
					Start the drill
				</button>
			</div>
		</section>
	)
}

interface BetweenRoundsCardProps {
	masteredCount: number
	total: number
	onContinue: () => void
	onReset: () => void
	mastered: boolean
	pillRef: React.RefObject<HTMLDivElement | null>
}
function BetweenRoundsCard({
	masteredCount,
	total,
	onContinue,
	onReset,
	mastered,
	pillRef
}: BetweenRoundsCardProps) {
	const remaining = total - masteredCount
	const remainingCopy = `${remaining} row${remaining === 1 ? "" : "s"} left to master.`
	return (
		<section className="rounded-lg border border-border-soft bg-surface">
			<div className="flex items-center justify-between border-border-soft border-b px-5 py-3">
				<div>
					<p className="font-semibold text-[11px] text-text-3 uppercase tracking-[0.06em]">
						Round complete
					</p>
					<p className="mt-0.5 text-[13px] text-text-2">{remainingCopy}</p>
				</div>
				<ProgressPill
					masteredCount={masteredCount}
					total={total}
					mastered={mastered}
					pillRef={pillRef}
				/>
			</div>
			<div className="px-5 py-6 text-center">
				<p className="font-semibold text-[10px] text-text-3 uppercase tracking-[0.08em]">
					Mastered
				</p>
				<p className="font-mono font-semibold text-[56px] text-good leading-none">
					{masteredCount}/{total}
				</p>
			</div>
			<div className="flex flex-wrap justify-center gap-2 border-border-soft border-t px-5 py-4">
				<button
					type="button"
					onClick={onContinue}
					className="rounded-md border border-text-1 bg-text-1 px-5 py-2 font-medium text-[14px] text-bg transition-opacity hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-cobalt focus-visible:outline-offset-2"
				>
					Continue
				</button>
				<button
					type="button"
					onClick={onReset}
					className="rounded-md border border-border-strong bg-surface px-5 py-2 font-medium text-[14px] text-text-1 transition-colors hover:bg-lavender focus-visible:outline focus-visible:outline-2 focus-visible:outline-cobalt focus-visible:outline-offset-2"
				>
					Reset
				</button>
			</div>
		</section>
	)
}

interface AllMasteredCardProps {
	total: number
	onReset: () => void
	mastered: boolean
	pillRef: React.RefObject<HTMLDivElement | null>
}
function AllMasteredCard({ total, onReset, mastered, pillRef }: AllMasteredCardProps) {
	return (
		<section className="rounded-lg border border-border-soft bg-surface">
			<div className="flex items-center justify-between border-border-soft border-b px-5 py-3">
				<div>
					<p className="font-semibold text-[11px] text-good uppercase tracking-[0.06em]">
						All mastered
					</p>
					<p className="mt-0.5 text-[13px] text-text-2">
						Every anchor is locked in. Reset to drill again.
					</p>
				</div>
				<ProgressPill masteredCount={total} total={total} mastered={mastered} pillRef={pillRef} />
			</div>
			<div className="px-5 py-8 text-center">
				<p className="font-semibold text-[10px] text-text-3 uppercase tracking-[0.08em]">
					Anchors mastered
				</p>
				<p className="font-mono font-semibold text-[64px] text-good leading-none">
					{total}/{total}
				</p>
			</div>
			<div className="flex justify-center border-border-soft border-t px-5 py-4">
				<button
					type="button"
					onClick={onReset}
					className="rounded-md border border-text-1 bg-text-1 px-5 py-2 font-medium text-[14px] text-bg transition-opacity hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-cobalt focus-visible:outline-offset-2"
				>
					Reset
				</button>
			</div>
		</section>
	)
}

export { SpeedDrill }
