"use client"

// <TimeSinkChart> — per-question latency vs the 18s "speed limit."
//
// X axis: question number (1..N). Vertical gridline at every question;
// numeric labels at 1 and every 5th question thereafter (1, 5, 10, …).
// Y axis: time taken in seconds, gridlines on a 10s cadence.
// The dashed 18s line marks the speed-limit reference.
//
// Markers are colored by correctness (good / destructive), not by
// budget. Above-budget reads via the 18s line itself, freeing the dot
// color to carry the answer signal. A connecting polyline draws between
// markers in a neutral muted color so the eye can follow the rhythm
// without two signals fighting for attention (Alpha §3: accents earn
// placement).
//
// Two filter rows let the reader highlight a slice of the session by
// category (sub-type) and / or difficulty. Selected dots stay full-
// strength; unselected dots fade so the highlighted group reads first.

import * as React from "react"
import { type Difficulty, type SubTypeId, subTypes } from "@/config/sub-types"
import { cn } from "@/lib/utils"

interface AttemptPoint {
	attemptId: string
	latencyMs: number
	correct: boolean
	subTypeId: SubTypeId
	difficulty: Difficulty
}

interface TimeSinkChartProps {
	attempts: ReadonlyArray<AttemptPoint>
}

const GOAL_MS = 18_000
const Y_STEP_MS = 10_000
const Y_MIN_MAX_MS = 30_000 // floor of 30s so a fast session still reads
const VIEW_W = 1100
const VIEW_H = 340
const PAD_LEFT = 60
const PAD_RIGHT = 20
const PAD_TOP = 24
const PAD_BOTTOM = 52

const DIFFICULTY_ORDER: ReadonlyArray<Difficulty> = ["easy", "medium", "hard", "brutal"]
const DIFFICULTY_LABEL: Record<Difficulty, string> = {
	easy: "Easy",
	medium: "Medium",
	hard: "Hard",
	brutal: "Brutal"
}

interface FilterOption<V extends string> {
	value: V
	label: string
	active: boolean
}

interface Counts {
	correct: number
	incorrect: number
	overGoal: number
}

function pickYMax(attempts: ReadonlyArray<AttemptPoint>): number {
	let peak = Y_MIN_MAX_MS
	for (const a of attempts) {
		if (a.latencyMs > peak) peak = a.latencyMs
	}
	return Math.ceil(peak / Y_STEP_MS) * Y_STEP_MS
}

function formatSeconds(ms: number): string {
	return `${(ms / 1000).toFixed(0)}s`
}

interface YTick {
	ms: number
	label: string
}

function buildYTicks(yMaxMs: number): ReadonlyArray<YTick> {
	const out: YTick[] = []
	for (let ms = 0; ms <= yMaxMs; ms += Y_STEP_MS) {
		out.push({ ms, label: formatSeconds(ms) })
	}
	return out
}

// 1, 5, 10, 15, …, up to count. Always includes the terminal count.
function buildXTickLabels(count: number): ReadonlyArray<number> {
	if (count <= 1) return [1]
	const out: number[] = [1]
	for (let q = 5; q <= count; q += 5) out.push(q)
	const last = out[out.length - 1]
	if (last !== count) out.push(count)
	return out
}

function lookupSubTypeName(id: SubTypeId): string {
	const match = subTypes.find(function bySubTypeId(s) {
		return s.id === id
	})
	if (!match) {
		return id
	}
	return match.displayName
}

function matchesFilter(
	p: AttemptPoint,
	cats: ReadonlySet<SubTypeId>,
	diffs: ReadonlySet<Difficulty>
): boolean {
	if (cats.size > 0 && !cats.has(p.subTypeId)) return false
	if (diffs.size > 0 && !diffs.has(p.difficulty)) return false
	return true
}

function computeCounts(attempts: ReadonlyArray<AttemptPoint>): Counts {
	let correct = 0
	let incorrect = 0
	let overGoal = 0
	for (const a of attempts) {
		if (a.correct) correct += 1
		else incorrect += 1
		if (a.latencyMs > GOAL_MS) overGoal += 1
	}
	return { correct, incorrect, overGoal }
}

function buildCatOptions(
	attempts: ReadonlyArray<AttemptPoint>,
	highlighted: ReadonlySet<SubTypeId>
): ReadonlyArray<FilterOption<SubTypeId>> {
	const present = new Set<SubTypeId>()
	for (const a of attempts) present.add(a.subTypeId)
	const out: Array<FilterOption<SubTypeId>> = []
	for (const s of subTypes) {
		if (!present.has(s.id)) continue
		out.push({ value: s.id, label: s.displayName, active: highlighted.has(s.id) })
	}
	return out
}

function buildDiffOptions(
	attempts: ReadonlyArray<AttemptPoint>,
	highlighted: ReadonlySet<Difficulty>
): ReadonlyArray<FilterOption<Difficulty>> {
	const present = new Set<Difficulty>()
	for (const a of attempts) present.add(a.difficulty)
	const out: Array<FilterOption<Difficulty>> = []
	for (const d of DIFFICULTY_ORDER) {
		if (!present.has(d)) continue
		out.push({ value: d, label: DIFFICULTY_LABEL[d], active: highlighted.has(d) })
	}
	return out
}

interface ChipProps {
	label: string
	active: boolean
	onClick: () => void
}

function Chip(props: ChipProps) {
	const stateClass = props.active
		? "bg-cobalt text-white border-cobalt"
		: "border-border-soft bg-surface text-text-2 hover:bg-lavender hover:text-text-1"
	return (
		<button
			type="button"
			aria-pressed={props.active}
			onClick={props.onClick}
			className={cn(
				"inline-flex items-center rounded-full border px-2.5 py-[3px] text-[12px] transition-colors duration-150 ease-out focus-visible:outline focus-visible:outline-2 focus-visible:outline-cobalt focus-visible:outline-offset-1",
				stateClass
			)}
		>
			{props.label}
		</button>
	)
}

interface FilterRowProps<V extends string> {
	label: string
	options: ReadonlyArray<FilterOption<V>>
	onToggle: (value: V) => void
}

function FilterRow<V extends string>(props: FilterRowProps<V>) {
	if (props.options.length === 0) return null
	return (
		<div className="flex flex-wrap items-center gap-2">
			<span className="min-w-[64px] text-[11px] text-text-3 uppercase tracking-[0.06em]">
				{props.label}
			</span>
			<div className="flex flex-wrap gap-1.5">
				{props.options.map(function renderChip(opt) {
					return (
						<Chip
							key={opt.value}
							label={opt.label}
							active={opt.active}
							onClick={function chipClick() {
								props.onToggle(opt.value)
							}}
						/>
					)
				})}
			</div>
		</div>
	)
}

interface LegendProps {
	counts: Counts
}

function Legend(props: LegendProps) {
	return (
		<div className="flex flex-wrap items-baseline gap-x-4 gap-y-1 text-[12px] text-foreground/70">
			<span className="inline-flex items-center gap-1.5">
				<span aria-hidden="true" className="h-2 w-2 rounded-full bg-good" />
				<span className="tabular-nums">{props.counts.correct} correct</span>
			</span>
			<span className="inline-flex items-center gap-1.5">
				<span aria-hidden="true" className="h-2 w-2 rounded-full bg-destructive" />
				<span className="tabular-nums">{props.counts.incorrect} incorrect</span>
			</span>
			<span aria-hidden="true" className="text-text-3">
				·
			</span>
			<span className="text-text-2 tabular-nums">{props.counts.overGoal} over 18s</span>
		</div>
	)
}

interface TimeSinkSvgProps {
	attempts: ReadonlyArray<AttemptPoint>
	highlightedCats: ReadonlySet<SubTypeId>
	highlightedDiffs: ReadonlySet<Difficulty>
	ariaLabel: string
}

function TimeSinkSvg(props: TimeSinkSvgProps) {
	const { attempts, highlightedCats, highlightedDiffs, ariaLabel } = props
	const n = attempts.length
	const yMaxMs = pickYMax(attempts)
	const plotW = VIEW_W - PAD_LEFT - PAD_RIGHT
	const plotH = VIEW_H - PAD_TOP - PAD_BOTTOM

	function xOf(i: number): number {
		if (n === 1) return PAD_LEFT + plotW / 2
		return PAD_LEFT + (i / (n - 1)) * plotW
	}
	function yOf(ms: number): number {
		const t = ms / yMaxMs
		const clamped = t > 1 ? 1 : t
		return PAD_TOP + plotH - clamped * plotH
	}

	const linePath = attempts
		.map(function pointCmd(a, i) {
			const cmd = i === 0 ? "M" : "L"
			return `${cmd}${xOf(i).toFixed(1)},${yOf(a.latencyMs).toFixed(1)}`
		})
		.join(" ")

	const goalY = yOf(GOAL_MS)
	const yTicks = buildYTicks(yMaxMs)
	const xTickLabels = buildXTickLabels(n)
	const xTickLabelSet = new Set(xTickLabels)
	const anyFilter = highlightedCats.size + highlightedDiffs.size > 0

	return (
		<svg
			aria-label={ariaLabel}
			className="h-[340px] w-full overflow-visible"
			overflow="visible"
			role="img"
			viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
			preserveAspectRatio="xMidYMid meet"
			xmlns="http://www.w3.org/2000/svg"
		>
			<rect
				className="text-foreground/25"
				fill="none"
				height={plotH}
				stroke="currentColor"
				strokeWidth="1"
				width={plotW}
				x={PAD_LEFT}
				y={PAD_TOP}
			/>

			{yTicks.map(function renderYTick(tick) {
				const y = yOf(tick.ms)
				const isBaseline = tick.ms === 0
				const lineEmphasis = isBaseline ? "text-foreground/30" : "text-foreground/15"
				return (
					<g key={tick.ms}>
						<line
							className={lineEmphasis}
							stroke="currentColor"
							strokeWidth="1"
							x1={PAD_LEFT}
							x2={VIEW_W - PAD_RIGHT}
							y1={y}
							y2={y}
						/>
						<text
							className="fill-current font-sans text-[13px] text-foreground/60 tabular-nums"
							textAnchor="end"
							x={PAD_LEFT - 8}
							y={y + 4}
						>
							{tick.label}
						</text>
					</g>
				)
			})}

			{attempts.map(function renderVerticalGrid(a, i) {
				const x = xOf(i)
				const q = i + 1
				const isLabelTick = xTickLabelSet.has(q)
				const lineEmphasis = isLabelTick ? "text-foreground/20" : "text-foreground/10"
				return (
					<line
						key={a.attemptId}
						className={lineEmphasis}
						stroke="currentColor"
						strokeWidth="1"
						x1={x}
						x2={x}
						y1={PAD_TOP}
						y2={PAD_TOP + plotH}
					/>
				)
			})}

			<line
				className="text-cobalt/70"
				stroke="currentColor"
				strokeDasharray="5 4"
				strokeWidth="1.5"
				x1={PAD_LEFT}
				x2={VIEW_W - PAD_RIGHT}
				y1={goalY}
				y2={goalY}
			/>
			<text
				className="fill-current font-medium font-sans text-[12px] text-cobalt tabular-nums"
				textAnchor="start"
				x={PAD_LEFT + 6}
				y={goalY - 5}
			>
				18s
			</text>

			{xTickLabels.map(function renderXTick(q) {
				const i = q - 1
				const x = xOf(i)
				return (
					<text
						key={q}
						className="fill-current font-sans text-[13px] text-foreground/60 tabular-nums"
						textAnchor="middle"
						x={x}
						y={VIEW_H - PAD_BOTTOM + 18}
					>
						{q}
					</text>
				)
			})}
			<text
				className="fill-current text-[13px] text-foreground/55"
				textAnchor="middle"
				x={PAD_LEFT + plotW / 2}
				y={VIEW_H - 8}
			>
				Question number
			</text>

			<path
				className="text-foreground/30"
				d={linePath}
				fill="none"
				stroke="currentColor"
				strokeLinecap="round"
				strokeLinejoin="round"
				strokeWidth="1.5"
			/>

			{attempts.map(function renderPoint(a, i) {
				const correctnessClass = a.correct ? "text-good" : "text-destructive"
				const isMatch = matchesFilter(a, highlightedCats, highlightedDiffs)
				const dimmed = anyFilter && !isMatch
				const radius = dimmed ? 3 : 4
				const opacity = dimmed ? 0.25 : 1
				const strokeOpacity = dimmed ? 0.15 : 0.55
				const subTypeName = lookupSubTypeName(a.subTypeId)
				const diffLabel = DIFFICULTY_LABEL[a.difficulty]
				const resultLabel = a.correct ? "correct" : "incorrect"
				const tooltip = `Q${i + 1}: ${(a.latencyMs / 1000).toFixed(1)}s — ${resultLabel} · ${subTypeName} · ${diffLabel}`
				return (
					<circle
						key={a.attemptId}
						className={correctnessClass}
						cx={xOf(i)}
						cy={yOf(a.latencyMs)}
						fill="currentColor"
						fillOpacity={opacity}
						stroke="currentColor"
						strokeOpacity={strokeOpacity}
						strokeWidth="1"
						r={radius}
					>
						<title>{tooltip}</title>
					</circle>
				)
			})}
		</svg>
	)
}

function TimeSinkChart(props: TimeSinkChartProps) {
	const attempts = props.attempts
	const [highlightedCats, setHighlightedCats] = React.useState<ReadonlySet<SubTypeId>>(
		function initCats() {
			return new Set<SubTypeId>()
		}
	)
	const [highlightedDiffs, setHighlightedDiffs] = React.useState<ReadonlySet<Difficulty>>(
		function initDiffs() {
			return new Set<Difficulty>()
		}
	)

	if (attempts.length === 0) {
		return <p className="text-foreground/70 text-sm">No question data this session.</p>
	}

	const n = attempts.length
	const counts = computeCounts(attempts)
	const catOptions = buildCatOptions(attempts, highlightedCats)
	const diffOptions = buildDiffOptions(attempts, highlightedDiffs)
	const filterCount = highlightedCats.size + highlightedDiffs.size
	const anyFilter = filterCount > 0

	function toggleCat(id: SubTypeId) {
		setHighlightedCats(function next(prev) {
			const out = new Set(prev)
			if (out.has(id)) out.delete(id)
			else out.add(id)
			return out
		})
	}
	function toggleDiff(d: Difficulty) {
		setHighlightedDiffs(function next(prev) {
			const out = new Set(prev)
			if (out.has(d)) out.delete(d)
			else out.add(d)
			return out
		})
	}
	function clearFilters() {
		setHighlightedCats(new Set<SubTypeId>())
		setHighlightedDiffs(new Set<Difficulty>())
	}

	const plural = n === 1 ? "" : "s"
	const ariaLabel = `Per-question time vs 18 second goal across ${n} question${plural}.`

	let clearControl: React.ReactNode = null
	if (anyFilter) {
		clearControl = (
			<div className="pt-0.5">
				<button
					type="button"
					onClick={clearFilters}
					className="text-[11px] text-text-3 underline-offset-2 hover:text-text-1 hover:underline"
				>
					Clear highlight ({filterCount})
				</button>
			</div>
		)
	}

	return (
		<div className="space-y-4">
			<Legend counts={counts} />
			<div className="space-y-2">
				<FilterRow label="Category" options={catOptions} onToggle={toggleCat} />
				<FilterRow label="Difficulty" options={diffOptions} onToggle={toggleDiff} />
				{clearControl}
			</div>
			<TimeSinkSvg
				attempts={attempts}
				highlightedCats={highlightedCats}
				highlightedDiffs={highlightedDiffs}
				ariaLabel={ariaLabel}
			/>
		</div>
	)
}

export type { TimeSinkChartProps, AttemptPoint }
export { TimeSinkChart }
