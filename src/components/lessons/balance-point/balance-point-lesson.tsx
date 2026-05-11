"use client"

// Balance Point Average lesson body.
//
// Three stacked panels:
//   1. <RevealPanel> — explains "Sum of Deviations = 0" behind a tap.
//   2. Interactive seesaw — SVG number line with adjustable values
//      and a live readout of left-vs-right deviations.
//   3. Missing-value practice — infinite "find the missing value"
//      problems that show every deviation update live as the user
//      types, so they can watch the shortcut work in real time.
//      No auto-advance: the user reflects on the result, then taps
//      "Next problem" to load another.
//
// All state is local to this component; no server round-trips. Numbers
// are integers in [0, 20] so the SVG x-axis maps cleanly to a 0..100
// percentage scale (5 SVG units per integer).

import * as React from "react"
import { LessonShell } from "@/components/lessons/shared/lesson-shell"
import { RevealPanel } from "@/components/lessons/shared/reveal-panel"

interface NumberChip {
	id: number
	value: number
}

const AXIS_MIN = 0
const AXIS_MAX = 20
const SVG_LEFT = 24
const SVG_RIGHT = 376
const SVG_AXIS_Y = 110
const SVG_DOT_Y = 60
const SVG_LABEL_Y = 38
const SVG_DEV_LABEL_Y = 92

function axisX(value: number): number {
	const t = (value - AXIS_MIN) / (AXIS_MAX - AXIS_MIN)
	return SVG_LEFT + t * (SVG_RIGHT - SVG_LEFT)
}

function nextId(chips: ReadonlyArray<NumberChip>): number {
	let max = 0
	for (const chip of chips) {
		if (chip.id > max) max = chip.id
	}
	return max + 1
}

function clampValue(v: number): number {
	if (v < AXIS_MIN) return AXIS_MIN
	if (v > AXIS_MAX) return AXIS_MAX
	return Math.round(v)
}

function sum(values: ReadonlyArray<number>): number {
	let s = 0
	for (const v of values) s += v
	return s
}

function BalancePointLesson() {
	return (
		<LessonShell
			eyebrow="Lesson 01 · Averages"
			eyebrowClass="text-cobalt"
			title="The Balance Point"
			blurb="A mean is the point where the number line balances. Move a value, and an equal-and-opposite move must happen on the other side — or the balance tips."
		>
			<RevealPanel label="Reveal the shortcut">
				<p className="mb-3">
					Don't average by summing-and-dividing. Pick the balance point and check that the tugs on
					each side cancel.
				</p>
				<p className="mb-3 font-mono text-text-1">Σ (xᵢ − μ) = 0</p>
				<p className="mb-2">
					Every value pulls the balance point toward itself with force equal to its{" "}
					<em>deviation</em> from the mean. If the left tugs and right tugs don't match, the mean
					must shift until they do.
				</p>
				<p>
					On the CCAT, this turns "find the missing value to hit mean M" into one subtraction:{" "}
					<span className="font-mono text-text-1">missing = (n+1)·M − Σ existing</span>.
				</p>
			</RevealPanel>
			<Sandbox />
			<MissingValuePractice />
		</LessonShell>
	)
}

function Sandbox() {
	const [chips, setChips] = React.useState<ReadonlyArray<NumberChip>>([
		{ id: 1, value: 4 },
		{ id: 2, value: 8 },
		{ id: 3, value: 12 }
	])

	const values = chips.map(function pluck(c) {
		return c.value
	})
	const total = sum(values)
	const count = values.length
	const meanExact = count > 0 ? total / count : 0
	const meanLabel = count > 0 ? meanExact.toFixed(2).replace(/\.00$/, "") : "—"

	let leftPull = 0
	let rightPull = 0
	for (const v of values) {
		const dev = v - meanExact
		if (dev < 0) leftPull += -dev
		if (dev > 0) rightPull += dev
	}
	const leftLabel = leftPull.toFixed(2).replace(/\.00$/, "")
	const rightLabel = rightPull.toFixed(2).replace(/\.00$/, "")
	const balanced = Math.abs(leftPull - rightPull) < 0.0001

	function add() {
		if (chips.length >= 7) return
		setChips(function append(prev) {
			const id = nextId(prev)
			return [...prev, { id, value: 10 }]
		})
	}
	function remove(id: number) {
		setChips(function filter(prev) {
			return prev.filter(function notId(c) {
				return c.id !== id
			})
		})
	}
	function step(id: number, delta: number) {
		setChips(function map(prev) {
			return prev.map(function update(c) {
				if (c.id !== id) return c
				return { id: c.id, value: clampValue(c.value + delta) }
			})
		})
	}
	function reset() {
		const defaults: ReadonlyArray<NumberChip> = [
			{ id: 1, value: 4 },
			{ id: 2, value: 8 },
			{ id: 3, value: 12 }
		]
		setChips(defaults)
	}

	const balanceCopy = balanced
		? "Balanced — this is the mean."
		: "Tugs don't match. The mean is wherever they would cancel."
	const balanceTone = balanced ? "text-good" : "text-text-3"

	return (
		<section className="mb-4 overflow-hidden rounded-lg border border-border-soft bg-surface">
			<div className="border-border-soft border-b px-5 py-3">
				<p className="font-semibold text-[11px] text-text-3 uppercase tracking-[0.06em]">
					Interactive seesaw
				</p>
				<p className="mt-0.5 text-[13px] text-text-2">
					Tap − / + to move a value. Watch the deviations on each side of the mean.
				</p>
			</div>
			<div className="overflow-x-auto px-3 pt-4">
				<SeesawSvg chips={chips} meanExact={meanExact} />
			</div>
			<div className="grid grid-cols-1 gap-3 px-5 py-4 sm:grid-cols-3">
				<Readout label="Left pull" value={leftLabel} tone="text-pace-over" />
				<Readout label="Mean μ" value={meanLabel} tone="text-cobalt" />
				<Readout label="Right pull" value={rightLabel} tone="text-pace-on" />
			</div>
			<p className={`px-5 pb-3 text-[12px] tracking-[0.01em] ${balanceTone}`}>{balanceCopy}</p>
			<div className="border-border-soft border-t px-3 py-3">
				<ul className="flex flex-wrap gap-2">
					{chips.map(function renderChip(chip) {
						const dev = chip.value - meanExact
						const devSign = dev >= 0 ? "+" : "−"
						const devLabel = `${devSign}${Math.abs(dev).toFixed(2).replace(/\.00$/, "")}`
						const devTone =
							Math.abs(dev) < 0.0001 ? "text-text-3" : dev > 0 ? "text-pace-on" : "text-pace-over"
						return (
							<li
								key={chip.id}
								className="flex items-center gap-1 rounded-md border border-border-soft bg-bg px-2 py-1"
							>
								<StepperButton
									label={`Decrease value ${chip.value}`}
									onClick={function dec() {
										step(chip.id, -1)
									}}
									disabled={chip.value <= AXIS_MIN}
								>
									−
								</StepperButton>
								<div className="flex w-12 flex-col items-center px-1 leading-tight">
									<span className="font-mono font-semibold text-[15px] text-text-1">
										{chip.value}
									</span>
									<span className={`font-mono text-[10px] ${devTone}`}>{devLabel}</span>
								</div>
								<StepperButton
									label={`Increase value ${chip.value}`}
									onClick={function inc() {
										step(chip.id, 1)
									}}
									disabled={chip.value >= AXIS_MAX}
								>
									+
								</StepperButton>
								<button
									type="button"
									onClick={function rm() {
										remove(chip.id)
									}}
									disabled={chips.length <= 2}
									aria-label={`Remove ${chip.value}`}
									className="ml-1 size-7 rounded-md text-text-3 hover:bg-lavender hover:text-pace-over focus-visible:outline focus-visible:outline-2 focus-visible:outline-cobalt focus-visible:outline-offset-2 disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-text-3"
								>
									×
								</button>
							</li>
						)
					})}
				</ul>
				<div className="mt-3 flex gap-2">
					<button
						type="button"
						onClick={add}
						disabled={chips.length >= 7}
						className="rounded-md border border-text-1 bg-text-1 px-3 py-2 font-medium text-[13px] text-bg transition-opacity hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-cobalt focus-visible:outline-offset-2 disabled:opacity-40"
					>
						Add a number
					</button>
					<button
						type="button"
						onClick={reset}
						className="rounded-md border border-border-strong bg-surface px-3 py-2 font-medium text-[13px] text-text-1 transition-colors hover:bg-lavender focus-visible:outline focus-visible:outline-2 focus-visible:outline-cobalt focus-visible:outline-offset-2"
					>
						Reset
					</button>
				</div>
			</div>
		</section>
	)
}

interface StepperButtonProps {
	label: string
	disabled?: boolean
	onClick: () => void
	children: React.ReactNode
}
function StepperButton({ label, disabled, onClick, children }: StepperButtonProps) {
	return (
		<button
			type="button"
			aria-label={label}
			onClick={onClick}
			disabled={disabled}
			className="size-9 rounded-md border border-border-soft bg-surface font-mono text-[18px] text-text-1 transition-colors hover:bg-lavender focus-visible:outline focus-visible:outline-2 focus-visible:outline-cobalt focus-visible:outline-offset-2 disabled:opacity-30 disabled:hover:bg-surface"
		>
			{children}
		</button>
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
			<p className={`font-mono font-semibold text-[22px] tracking-tight ${tone}`}>{value}</p>
		</div>
	)
}

interface SeesawSvgProps {
	chips: ReadonlyArray<NumberChip>
	meanExact: number
}
function SeesawSvg({ chips, meanExact }: SeesawSvgProps) {
	const meanX = axisX(meanExact)
	const tickValues: ReadonlyArray<number> = [0, 5, 10, 15, 20]
	return (
		<svg
			viewBox="0 0 400 140"
			role="img"
			aria-label="Number line with adjustable values"
			className="block h-auto w-full min-w-[320px]"
		>
			<title>Number line balance visualization</title>
			<line
				x1={SVG_LEFT}
				y1={SVG_AXIS_Y}
				x2={SVG_RIGHT}
				y2={SVG_AXIS_Y}
				className="stroke-border-strong"
				strokeWidth={1.5}
			/>
			{tickValues.map(function renderTick(v) {
				const x = axisX(v)
				return (
					<g key={v}>
						<line
							x1={x}
							y1={SVG_AXIS_Y - 4}
							x2={x}
							y2={SVG_AXIS_Y + 4}
							className="stroke-border-strong"
							strokeWidth={1}
						/>
						<text
							x={x}
							y={SVG_AXIS_Y + 18}
							textAnchor="middle"
							className="fill-text-3 font-mono text-[10px]"
						>
							{v}
						</text>
					</g>
				)
			})}
			<g>
				<line
					x1={meanX}
					y1={SVG_LABEL_Y - 14}
					x2={meanX}
					y2={SVG_AXIS_Y + 12}
					className="stroke-cobalt"
					strokeWidth={1.5}
					strokeDasharray="4 3"
				/>
				<rect
					x={meanX - 22}
					y={SVG_LABEL_Y - 28}
					width={44}
					height={16}
					rx={8}
					className="fill-cobalt"
				/>
				<text
					x={meanX}
					y={SVG_LABEL_Y - 17}
					textAnchor="middle"
					className="fill-bg font-mono font-semibold text-[10px]"
				>
					μ {meanExact.toFixed(1).replace(/\.0$/, "")}
				</text>
			</g>
			{chips.map(function renderDot(chip) {
				const x = axisX(chip.value)
				const dev = chip.value - meanExact
				const tone =
					Math.abs(dev) < 0.0001 ? "stroke-text-3" : dev > 0 ? "stroke-pace-on" : "stroke-pace-over"
				const dotTone =
					Math.abs(dev) < 0.0001 ? "fill-text-3" : dev > 0 ? "fill-pace-on" : "fill-pace-over"
				const sign = dev >= 0 ? "+" : "−"
				const devMagnitude = Math.abs(dev).toFixed(1).replace(/\.0$/, "")
				const devLabel = `${sign}${devMagnitude}`
				return (
					<g key={chip.id}>
						<line
							x1={x}
							y1={SVG_DOT_Y}
							x2={meanX}
							y2={SVG_AXIS_Y}
							className={tone}
							strokeWidth={1.2}
							strokeLinecap="round"
							opacity={0.5}
						/>
						<circle cx={x} cy={SVG_DOT_Y} r={11} className={`${dotTone} opacity-90`} />
						<text
							x={x}
							y={SVG_DOT_Y + 4}
							textAnchor="middle"
							className="fill-bg font-mono font-semibold text-[11px]"
						>
							{chip.value}
						</text>
						<rect
							x={x - 14}
							y={SVG_DEV_LABEL_Y - 8}
							width={28}
							height={12}
							rx={3}
							className="fill-bg stroke-border-soft"
							strokeWidth={1}
						/>
						<text
							x={x}
							y={SVG_DEV_LABEL_Y + 1}
							textAnchor="middle"
							className="fill-text-2 font-mono text-[9px]"
						>
							{devLabel}
						</text>
					</g>
				)
			})}
		</svg>
	)
}

interface DrillProblem {
	givens: ReadonlyArray<number>
	target: number
	answer: number
}

function generateProblem(): DrillProblem {
	const givenCount = 3 + Math.floor(Math.random() * 2)
	for (let attempt = 0; attempt < 24; attempt++) {
		const givens: number[] = []
		for (let i = 0; i < givenCount; i++) {
			givens.push(1 + Math.floor(Math.random() * 19))
		}
		const target = 4 + Math.floor(Math.random() * 13)
		const required = target * (givenCount + 1) - sum(givens)
		if (required >= 0 && required <= 20) {
			return { givens, target, answer: required }
		}
	}
	const givens = [10, 10, 10]
	return { givens, target: 10, answer: 10 }
}

function formatSignedInt(v: number): string {
	if (v === 0) return "0"
	if (v > 0) return `+${v}`
	return `−${Math.abs(v)}`
}

function MissingValuePractice() {
	const [problem, setProblem] = React.useState<DrillProblem>(generateProblem)
	const [guess, setGuess] = React.useState("")
	const [solved, setSolved] = React.useState(0)
	const [feedback, setFeedback] = React.useState<"idle" | "right" | "wrong">("idle")
	const inputRef = React.useRef<HTMLInputElement>(null)

	function next() {
		setProblem(generateProblem())
		setGuess("")
		setFeedback("idle")
		const el = inputRef.current
		if (el) el.focus()
	}
	function check(event: React.FormEvent) {
		event.preventDefault()
		const parsed = Number.parseInt(guess, 10)
		if (Number.isNaN(parsed)) return
		if (parsed === problem.answer) {
			setFeedback("right")
			setSolved(function inc(prev) {
				return prev + 1
			})
		} else {
			setFeedback("wrong")
		}
	}
	const parsedGuess = Number.parseInt(guess, 10)
	const guessIsValid = !Number.isNaN(parsedGuess)
	const givenDeviations = problem.givens.map(function dev(v) {
		return v - problem.target
	})
	const givenSum = givenDeviations.reduce(function add(a, b) {
		return a + b
	}, 0)
	const guessDeviation = guessIsValid ? parsedGuess - problem.target : null
	const totalDeviation = guessDeviation === null ? givenSum : givenSum + guessDeviation
	const balanced = guessIsValid && totalDeviation === 0
	const correct = feedback === "right"
	const feedbackTone =
		feedback === "right" ? "text-good" : feedback === "wrong" ? "text-pace-over" : "text-text-3"
	const guessDevForCopy = guessDeviation === null ? 0 : guessDeviation
	let feedbackCopy = "Type a guess. The deviations update live — when they sum to 0, you're on it."
	if (feedback === "right") {
		feedbackCopy = `Balanced. ${parsedGuess} − ${problem.target} = ${formatSignedInt(guessDevForCopy)}, cancelling the other tugs.`
	} else if (feedback === "wrong") {
		feedbackCopy = `Off by ${formatSignedInt(totalDeviation)}. Adjust your guess so the deviations sum to 0.`
	}
	return (
		<section className="rounded-lg border border-border-soft bg-surface">
			<div className="flex items-center justify-between border-border-soft border-b px-5 py-3">
				<div>
					<p className="font-semibold text-[11px] text-text-3 uppercase tracking-[0.06em]">
						Missing-value practice
					</p>
					<p className="mt-0.5 text-[13px] text-text-2">
						Find the value that makes the deviations sum to zero.
					</p>
				</div>
				<StatPill label="Solved" value={String(solved)} tone="text-good" />
			</div>
			<div className="px-5 py-5">
				<p className="text-sm text-text-2">
					These <span className="font-semibold text-text-1">{problem.givens.length}</span> numbers
					have a mean of{" "}
					<span className="font-mono font-semibold text-cobalt">{problem.target}</span>. Find the
					missing value.
				</p>
				<DeviationRow
					givens={problem.givens}
					deviations={givenDeviations}
					target={problem.target}
					guess={guessIsValid ? parsedGuess : null}
					guessDeviation={guessDeviation}
				/>
				<DeviationSum
					givenSum={givenSum}
					guessDeviation={guessDeviation}
					total={totalDeviation}
					balanced={balanced}
					revealed={feedback !== "idle"}
				/>
				<form onSubmit={check} className="mt-4 flex flex-wrap items-center gap-2">
					<input
						ref={inputRef}
						type="number"
						inputMode="numeric"
						value={guess}
						onChange={function onChange(e) {
							setGuess(e.target.value)
							if (feedback !== "idle") setFeedback("idle")
						}}
						disabled={correct}
						aria-label="Your guess"
						placeholder="?"
						className="h-11 w-28 rounded-md border border-border-strong bg-bg px-3 font-mono text-[18px] text-text-1 placeholder:text-text-3 focus-visible:border-cobalt focus-visible:outline focus-visible:outline-2 focus-visible:outline-cobalt focus-visible:outline-offset-2 disabled:opacity-60"
					/>
					{correct ? null : (
						<button
							type="submit"
							disabled={!guessIsValid}
							className="h-11 rounded-md border border-text-1 bg-text-1 px-4 font-medium text-[14px] text-bg transition-opacity hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-cobalt focus-visible:outline-offset-2 disabled:opacity-40"
						>
							Check
						</button>
					)}
					{correct ? (
						<button
							type="button"
							onClick={next}
							className="h-11 rounded-md border border-text-1 bg-text-1 px-4 font-medium text-[14px] text-bg transition-opacity hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-cobalt focus-visible:outline-offset-2"
						>
							Next problem
						</button>
					) : null}
					<button
						type="button"
						onClick={next}
						className="h-11 rounded-md border border-border-strong bg-surface px-4 font-medium text-[14px] text-text-1 transition-colors hover:bg-lavender focus-visible:outline focus-visible:outline-2 focus-visible:outline-cobalt focus-visible:outline-offset-2"
					>
						Skip
					</button>
				</form>
				<p className={`mt-3 text-[13px] ${feedbackTone}`}>{feedbackCopy}</p>
			</div>
		</section>
	)
}

interface DeviationRowProps {
	givens: ReadonlyArray<number>
	deviations: ReadonlyArray<number>
	target: number
	guess: number | null
	guessDeviation: number | null
}
function DeviationRow({ givens, deviations, target, guess, guessDeviation }: DeviationRowProps) {
	return (
		<div className="mt-3 flex flex-wrap items-stretch gap-2">
			{givens.map(function renderGiven(value, i) {
				const dev = deviations[i]
				const devLabel = dev === undefined ? "" : formatSignedInt(dev)
				let devTone = "text-text-3"
				if (dev !== undefined && dev > 0) devTone = "text-pace-on"
				else if (dev !== undefined && dev < 0) devTone = "text-pace-over"
				const key = `${i}-${value}`
				return (
					<div
						key={key}
						className="flex w-16 flex-col items-center rounded-md border border-border-soft bg-bg px-2 py-2"
					>
						<span className="font-mono font-semibold text-[18px] text-text-1">{value}</span>
						<span className={`font-mono text-[11px] ${devTone}`}>{devLabel}</span>
					</div>
				)
			})}
			<GuessChip target={target} guess={guess} guessDeviation={guessDeviation} />
		</div>
	)
}

interface GuessChipProps {
	target: number
	guess: number | null
	guessDeviation: number | null
}
function GuessChip({ target: _target, guess, guessDeviation }: GuessChipProps) {
	const valueLabel = guess === null ? "?" : String(guess)
	const devLabel = guessDeviation === null ? "—" : formatSignedInt(guessDeviation)
	let devTone = "text-text-3"
	if (guessDeviation !== null && guessDeviation > 0) devTone = "text-pace-on"
	else if (guessDeviation !== null && guessDeviation < 0) devTone = "text-pace-over"
	const borderTone = guess === null ? "border-dashed border-border-strong" : "border-cobalt"
	const valueTone = guess === null ? "text-text-3" : "text-cobalt"
	return (
		<div
			className={`flex w-16 flex-col items-center rounded-md border-2 bg-bg px-2 py-2 ${borderTone}`}
		>
			<span className={`font-mono font-semibold text-[18px] ${valueTone}`}>{valueLabel}</span>
			<span className={`font-mono text-[11px] ${devTone}`}>{devLabel}</span>
		</div>
	)
}

interface DeviationSumProps {
	givenSum: number
	guessDeviation: number | null
	total: number
	balanced: boolean
	revealed: boolean
}
function DeviationSum({ givenSum, guessDeviation, total, balanced, revealed }: DeviationSumProps) {
	const totalLabel = formatSignedInt(total)
	const isZero = balanced ? true : total === 0
	const totalTone = isZero ? "text-good" : total > 0 ? "text-pace-on" : "text-pace-over"
	const guessTerm = guessDeviation === null ? "?" : formatSignedInt(guessDeviation)
	const balancedHint = balanced
		? "Sum is 0 — the seesaw balances."
		: revealed
			? "Adjust your guess until the sum hits 0."
			: "Need: total = 0."
	return (
		<div className="mt-3 rounded-md border border-border-soft bg-bg px-3 py-2">
			<p className="font-mono text-[12px] text-text-2">
				Σ (xᵢ − {"{"}μ{"}"}) = <span className="text-text-1">{formatSignedInt(givenSum)}</span>{" "}
				<span className="text-text-3">(given)</span> +{" "}
				<span className="text-text-1">{guessTerm}</span>{" "}
				<span className="text-text-3">(guess)</span> ={" "}
				<span className={`font-semibold ${totalTone}`}>{totalLabel}</span>
			</p>
			<p className="mt-0.5 text-[11px] text-text-3">{balancedHint}</p>
		</div>
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

export { BalancePointLesson }
