"use client"

// Benchmark Anchor memory game body.
//
// Three stacked panels:
//   1. <RevealPanel> — the canonical CCAT fraction–decimal–percent
//      table, surfaced behind a tap so the page can be scanned
//      without scrolling past the reference grid.
//   2. Reference table — same data laid out for direct study,
//      collapsible inside the reveal panel.
//   3. Match-the-pair speed drill — show a fraction, pick the right
//      percent (or vice-versa) from four options under a 5-second
//      clock. Correct streak + accuracy stats persist for the
//      session.

import * as React from "react"
import { LessonShell } from "@/components/lessons/shared/lesson-shell"
import { markLessonDoneToday } from "@/components/lessons/shared/lesson-mastery-store"
import { MasteryPill, useMastery } from "@/components/lessons/shared/mastery"
import { RevealPanel } from "@/components/lessons/shared/reveal-panel"

interface BenchmarkRow {
	num: number
	den: number
	decimal: string
	percent: string
}

const BENCHMARKS: ReadonlyArray<BenchmarkRow> = [
	{ num: 1, den: 2, decimal: "0.5", percent: "50%" },
	{ num: 1, den: 3, decimal: "0.333…", percent: "33.33%" },
	{ num: 2, den: 3, decimal: "0.666…", percent: "66.67%" },
	{ num: 1, den: 4, decimal: "0.25", percent: "25%" },
	{ num: 3, den: 4, decimal: "0.75", percent: "75%" },
	{ num: 1, den: 5, decimal: "0.2", percent: "20%" },
	{ num: 2, den: 5, decimal: "0.4", percent: "40%" },
	{ num: 3, den: 5, decimal: "0.6", percent: "60%" },
	{ num: 4, den: 5, decimal: "0.8", percent: "80%" },
	{ num: 1, den: 6, decimal: "0.166…", percent: "16.67%" },
	{ num: 5, den: 6, decimal: "0.833…", percent: "83.33%" },
	{ num: 1, den: 8, decimal: "0.125", percent: "12.5%" },
	{ num: 3, den: 8, decimal: "0.375", percent: "37.5%" },
	{ num: 5, den: 8, decimal: "0.625", percent: "62.5%" },
	{ num: 7, den: 8, decimal: "0.875", percent: "87.5%" },
	{ num: 1, den: 10, decimal: "0.1", percent: "10%" },
	{ num: 1, den: 12, decimal: "0.0833…", percent: "8.33%" },
	{ num: 1, den: 16, decimal: "0.0625", percent: "6.25%" },
	{ num: 1, den: 20, decimal: "0.05", percent: "5%" }
]

const ROUND_LENGTH = 10
const ROUND_TIME_MS = 5000

function BenchmarkLesson() {
	return (
		<LessonShell
			eyebrow="Lesson 04 · Memory"
			eyebrowClass="text-good"
			title="Anchor Drill"
			blurb="Burn the CCAT fraction–decimal–percent table into recall. Fast recognition of these anchors is what lets you skip long division on test day."
		>
			<RevealPanel label="Reveal the anchor table">
				<p className="mb-3">
					Memorize cold:{" "}
					<strong>
						halves, thirds, quarters, fifths, sixths, eighths, tenths, twelfths, sixteenths
					</strong>
					. These cover ≈85% of the CCAT's quantitative fractions.
				</p>
				<div className="overflow-x-auto">
					<table className="w-full min-w-[360px] border-collapse text-[12px]">
						<thead>
							<tr className="border-border-soft border-b text-text-3">
								<th className="px-2 py-1.5 text-left font-semibold">Fraction</th>
								<th className="px-2 py-1.5 text-left font-semibold">Decimal</th>
								<th className="px-2 py-1.5 text-left font-semibold">Percent</th>
							</tr>
						</thead>
						<tbody>
							{BENCHMARKS.map(function renderRow(row) {
								const key = `${row.num}-${row.den}`
								return (
									<tr key={key} className="border-border-soft/60 border-b">
										<td className="px-2 py-1 font-mono text-text-1">
											{row.num}/{row.den}
										</td>
										<td className="px-2 py-1 font-mono text-text-2">{row.decimal}</td>
										<td className="px-2 py-1 font-mono text-text-2">{row.percent}</td>
									</tr>
								)
							})}
						</tbody>
					</table>
				</div>
			</RevealPanel>
			<SpeedDrill />
		</LessonShell>
	)
}

interface Prompt {
	row: BenchmarkRow
	mode: "fraction-to-percent" | "percent-to-fraction" | "fraction-to-decimal"
	choices: ReadonlyArray<string>
	answer: string
}

const MODE_LABEL: Record<Prompt["mode"], string> = {
	"fraction-to-percent": "Pick the percent",
	"percent-to-fraction": "Pick the fraction",
	"fraction-to-decimal": "Pick the decimal"
}

function rowFraction(row: BenchmarkRow): string {
	return `${row.num}/${row.den}`
}

function rowKey(row: BenchmarkRow): string {
	return `${row.num}-${row.den}`
}

function pickMode(): Prompt["mode"] {
	const r = Math.floor(Math.random() * 3)
	if (r === 0) return "fraction-to-percent"
	if (r === 1) return "percent-to-fraction"
	return "fraction-to-decimal"
}

function uniqueChoices(answer: string, candidates: ReadonlyArray<string>): ReadonlyArray<string> {
	const set = new Set<string>([answer])
	const shuffled = [...candidates]
	for (let i = shuffled.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1))
		const tmp = shuffled[i]
		const other = shuffled[j]
		if (tmp === undefined || other === undefined) continue
		shuffled[i] = other
		shuffled[j] = tmp
	}
	for (const c of shuffled) {
		if (set.size >= 4) break
		set.add(c)
	}
	const items = Array.from(set)
	for (let i = items.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1))
		const tmp = items[i]
		const other = items[j]
		if (tmp === undefined || other === undefined) continue
		items[i] = other
		items[j] = tmp
	}
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

interface RoundState {
	prompts: ReadonlyArray<Prompt>
	index: number
	correct: number
	picked: string | null
	feedback: "idle" | "right" | "wrong" | "timeout"
	startMs: number
}

function newRound(masteredRows: ReadonlySet<string>): RoundState {
	const unmastered = BENCHMARKS.filter(function notMastered(r) {
		return !masteredRows.has(rowKey(r))
	})
	const pool = [...unmastered]
	for (let i = pool.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1))
		const tmp = pool[i]
		const other = pool[j]
		if (tmp === undefined || other === undefined) continue
		pool[i] = other
		pool[j] = tmp
	}
	const selected = pool.slice(0, ROUND_LENGTH)
	const prompts = selected.map(generatePromptForRow)
	return {
		prompts,
		index: 0,
		correct: 0,
		picked: null,
		feedback: "idle",
		startMs: performance.now()
	}
}

const TOTAL_ROWS = BENCHMARKS.length

function SpeedDrill() {
	const [masteredRows, setMasteredRows] = React.useState<ReadonlySet<string>>(function init() {
		return new Set()
	})
	const [round, setRound] = React.useState<RoundState | null>(null)
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
	const locked = round === null ? true : round.feedback !== "idle"

	React.useEffect(
		function timer() {
			if (round === null) return
			if (locked) return
			const interval = window.setInterval(function bump() {
				forceTick(function inc(t) {
					return t + 1
				})
			}, 80)
			return function cleanup() {
				window.clearInterval(interval)
			}
		},
		[locked, round]
	)

	const elapsed = round === null ? 0 : performance.now() - round.startMs
	const remaining = Math.max(0, ROUND_TIME_MS - elapsed)
	const remainingPct = Math.max(0, Math.min(100, (remaining / ROUND_TIME_MS) * 100))

	React.useEffect(
		function fireTimeout() {
			if (round === null) return
			if (locked) return
			if (remaining > 0) return
			setRound(function expire(prev) {
				if (prev === null) return prev
				if (prev.feedback !== "idle") return prev
				return { ...prev, feedback: "timeout", picked: null }
			})
		},
		[remaining, locked, round]
	)

	React.useEffect(
		function advance() {
			if (round === null) return
			if (round.feedback === "idle") return
			const delay = round.feedback === "right" ? 450 : 950
			const handle = window.setTimeout(function next() {
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
						startMs: performance.now()
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
		if (locked || !current) return
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
		setRound(function lock(prev) {
			if (prev === null) return prev
			const updatedCorrect = isRight ? prev.correct + 1 : prev.correct
			const fb = isRight ? "right" : "wrong"
			return { ...prev, picked: choice, feedback: fb, correct: updatedCorrect }
		})
	}

	function reset() {
		setMasteredRows(new Set())
		setRound(null)
	}

	if (round === null) {
		if (allMastered) {
			return <AllMasteredCard total={TOTAL_ROWS} onReset={reset} mastered={mastered} pillRef={pillRef} />
		}
		if (masteredCount === 0) {
			return (
				<StartCard
					total={TOTAL_ROWS}
					onStart={function start() {
						setRound(newRound(masteredRows))
					}}
					mastered={mastered}
					pillRef={pillRef}
				/>
			)
		}
		return (
			<BetweenRoundsCard
				masteredCount={masteredCount}
				total={TOTAL_ROWS}
				onContinue={function start() {
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

	const promptCopy = MODE_LABEL[current.mode]
	let displayValue = ""
	let displayKind = ""
	if (current.mode === "fraction-to-percent") {
		displayValue = rowFraction(current.row)
		displayKind = "Fraction"
	} else if (current.mode === "percent-to-fraction") {
		displayValue = current.row.percent
		displayKind = "Percent"
	} else {
		displayValue = rowFraction(current.row)
		displayKind = "Fraction"
	}

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
			<TimerBar remainingPct={remainingPct} />
			<div className="px-5 pt-5 pb-3 text-center">
				<p className="font-semibold text-[10px] text-text-3 uppercase tracking-[0.08em]">
					{displayKind}
				</p>
				<p className="font-mono font-semibold text-[48px] text-text-1 leading-none">
					{displayValue}
				</p>
			</div>
			<ChoiceGrid
				choices={current.choices}
				answer={current.answer}
				picked={round.picked}
				feedback={round.feedback}
				onPick={pick}
			/>
		</section>
	)
}

interface TimerBarProps {
	remainingPct: number
}
function TimerBar({ remainingPct }: TimerBarProps) {
	let tone = "fill-cobalt"
	if (remainingPct <= 30) tone = "fill-pace-over"
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
		<div className="grid grid-cols-2 gap-2 px-5 pt-2 pb-5">
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
						Recognize each anchor under a 5-second clock.
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
					on later rounds. 10 prompts at a time.
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

export { BenchmarkLesson }
