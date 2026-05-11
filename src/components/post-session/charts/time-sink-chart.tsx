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
// The sub-type × difficulty <TimeSinkMatrix> below the legend doubles
// as the chart filter. Selected (subType, difficulty) cells stay full-
// strength; unselected dots fade so the highlighted group reads first.

import { DotHitTarget } from "@/components/post-session/charts/dot-hit-target"
import {
	type AttemptPoint,
	makeKey,
	TimeSinkMatrix
} from "@/components/post-session/charts/time-sink-matrix"
import { type Difficulty, type SubTypeId, subTypes } from "@/config/sub-types"

interface TimeSinkChartProps {
	attempts: ReadonlyArray<AttemptPoint>
	selectedKeys: ReadonlySet<string>
	onSelectedKeysChange: (next: ReadonlySet<string>) => void
	onAttemptClick?: (attemptId: string) => void
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

const DIFFICULTY_LABEL: Record<Difficulty, string> = {
	easy: "Easy",
	medium: "Medium",
	hard: "Hard",
	brutal: "Brutal"
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

function matchesFilter(p: AttemptPoint, selected: ReadonlySet<string>): boolean {
	if (selected.size === 0) return true
	return selected.has(makeKey(p.subTypeId, p.difficulty))
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

interface LegendProps {
	counts: Counts
}

function Legend(props: LegendProps) {
	return (
		<div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 text-[13px] text-text-1">
			<span className="inline-flex items-center gap-2">
				<span aria-hidden="true" className="h-2.5 w-2.5 rounded-full bg-good" />
				<span className="tabular-nums">
					<span className="font-semibold">{props.counts.correct}</span> correct
				</span>
			</span>
			<span className="inline-flex items-center gap-2">
				<span aria-hidden="true" className="h-2.5 w-2.5 rounded-full bg-destructive" />
				<span className="tabular-nums">
					<span className="font-semibold">{props.counts.incorrect}</span> incorrect
				</span>
			</span>
			<span aria-hidden="true" className="text-text-3">
				·
			</span>
			<span className="text-text-2 tabular-nums">
				<span className="font-semibold">{props.counts.overGoal}</span> over 18s
			</span>
		</div>
	)
}

interface TimeSinkSvgProps {
	attempts: ReadonlyArray<AttemptPoint>
	selectedKeys: ReadonlySet<string>
	ariaLabel: string
	onAttemptClick?: (attemptId: string) => void
}

function TimeSinkSvg(props: TimeSinkSvgProps) {
	const { attempts, selectedKeys, ariaLabel, onAttemptClick } = props
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
	const anyFilter = selectedKeys.size > 0

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
				const isMatch = matchesFilter(a, selectedKeys)
				const dimmed = anyFilter && !isMatch
				const radius = dimmed ? 3 : 4
				const opacity = dimmed ? 0.25 : 1
				const strokeOpacity = dimmed ? 0.15 : 0.55
				const subTypeName = lookupSubTypeName(a.subTypeId)
				const diffLabel = DIFFICULTY_LABEL[a.difficulty]
				const resultLabel = a.correct ? "correct" : "incorrect"
				const labelBase = `Q${i + 1}: ${(a.latencyMs / 1000).toFixed(1)}s — ${resultLabel} · ${subTypeName} · ${diffLabel}`
				const cx = xOf(i)
				const cy = yOf(a.latencyMs)
				return (
					<DotHitTarget
						key={a.attemptId}
						attemptId={a.attemptId}
						cx={cx}
						cy={cy}
						hitRadius={9}
						onAttemptClick={onAttemptClick}
						label={labelBase}
					>
						<circle
							className={correctnessClass}
							cx={cx}
							cy={cy}
							fill="currentColor"
							fillOpacity={opacity}
							stroke="currentColor"
							strokeOpacity={strokeOpacity}
							strokeWidth="1"
							r={radius}
							pointerEvents="none"
						>
							<title>{labelBase}</title>
						</circle>
					</DotHitTarget>
				)
			})}
		</svg>
	)
}

function TimeSinkChart(props: TimeSinkChartProps) {
	const attempts = props.attempts

	if (attempts.length === 0) {
		return <p className="text-foreground/70 text-sm">No question data this session.</p>
	}

	const n = attempts.length
	const counts = computeCounts(attempts)

	const plural = n === 1 ? "" : "s"
	const ariaLabel = `Per-question time vs 18 second goal across ${n} question${plural}.`

	return (
		<div className="space-y-4">
			<TimeSinkMatrix
				attempts={attempts}
				selectedKeys={props.selectedKeys}
				onChange={props.onSelectedKeysChange}
			/>
			<Legend counts={counts} />
			<div className="space-y-1 pt-2 text-center">
				<h4 className="font-medium font-serif text-[15px] text-text-1 tracking-[-0.005em]">
					Time sink
				</h4>
				<p className="text-[11px] text-text-3 uppercase tracking-[0.06em]">
					Per-question time vs the 18s goal
				</p>
			</div>
			<TimeSinkSvg
				attempts={attempts}
				selectedKeys={props.selectedKeys}
				ariaLabel={ariaLabel}
				onAttemptClick={props.onAttemptClick}
			/>
		</div>
	)
}

export type { AttemptPoint, TimeSinkChartProps }
export { TimeSinkChart }
