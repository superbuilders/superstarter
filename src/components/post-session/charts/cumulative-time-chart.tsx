"use client"

// <CumulativeTimeChart> — cumulative time spent vs. the 18s-per-question
// budget pace (15 minutes over 50 questions).
//
// Visual chrome matches the Time sink chart in the same Pacing card:
// same viewBox + render height, same font sizes, same vertical-gridline
// rhythm (a line per question, numbers at 1 / every 5th), same y-axis
// gridline-with-label cadence (one line per minute). Dots are colored
// by correctness (good / destructive), matching the Time sink chart;
// the dashed cobalt diagonal is the 18s × question budget, the lone
// chromatic accent that earns its place.
// The actual cumulative-time polyline is drawn in a neutral foreground/30
// — over-budget reads via crossings against the dashed budget line, not
// via a second color channel competing with the correct/incorrect dot
// signal.

import { DotHitTarget } from "@/components/post-session/charts/dot-hit-target"
import { makeKey } from "@/components/post-session/charts/time-sink-matrix"
import type { Difficulty, SubTypeId } from "@/config/sub-types"
import { cn } from "@/lib/utils"

interface AttemptPoint {
	attemptId: string
	latencyMs: number
	correct: boolean
	subTypeId: SubTypeId
	difficulty: Difficulty
}

interface CumulativeTimeChartProps {
	attempts: ReadonlyArray<AttemptPoint>
	selectedKeys: ReadonlySet<string>
	onAttemptClick?: (attemptId: string) => void
}

const FULL_TEST_QUESTIONS = 50
const FULL_TEST_BUDGET_MS = 15 * 60_000
const PER_QUESTION_BUDGET_MS = FULL_TEST_BUDGET_MS / FULL_TEST_QUESTIONS
const VIEW_W = 1100
const VIEW_H = 340
const PAD_LEFT = 60
const PAD_RIGHT = 20
const PAD_TOP = 24
const PAD_BOTTOM = 52
const PLOT_W = VIEW_W - PAD_LEFT - PAD_RIGHT
const PLOT_H = VIEW_H - PAD_TOP - PAD_BOTTOM

const Y_STEP_MS = 60_000

interface QPoint {
	attemptId: string
	qIndex: number
	cumulativeMs: number
	correct: boolean
	filterKey: string
}

function formatMinSec(ms: number): string {
	const totalSeconds = Math.round(ms / 1000)
	const m = Math.floor(totalSeconds / 60)
	const s = totalSeconds % 60
	const pad = s < 10 ? "0" : ""
	return `${m}:${pad}${s}`
}

function pickYMax(actualTotalMs: number, budgetTotalMs: number): number {
	const peak = Math.max(actualTotalMs, budgetTotalMs)
	return Math.ceil(peak / Y_STEP_MS) * Y_STEP_MS
}

function buildPoints(attempts: ReadonlyArray<AttemptPoint>): QPoint[] {
	const points: QPoint[] = []
	let running = 0
	attempts.forEach(function compose(a, i) {
		running += a.latencyMs
		points.push({
			attemptId: a.attemptId,
			qIndex: i,
			cumulativeMs: running,
			correct: a.correct,
			filterKey: makeKey(a.subTypeId, a.difficulty)
		})
	})
	return points
}

function xOf(qIndex: number, n: number): number {
	if (n <= 1) return PAD_LEFT + PLOT_W / 2
	return PAD_LEFT + (qIndex / (n - 1)) * PLOT_W
}

function yOf(ms: number, yMaxMs: number): number {
	const t = ms / yMaxMs
	const clamped = t > 1 ? 1 : t
	return PAD_TOP + PLOT_H - clamped * PLOT_H
}

function buildYTicks(yMaxMs: number): number[] {
	const ticks: number[] = []
	for (let ms = 0; ms <= yMaxMs; ms += Y_STEP_MS) ticks.push(ms)
	return ticks
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

function formatPaceDelta(deltaMs: number): string {
	if (deltaMs > 1000) return `${formatMinSec(deltaMs)} over the 18s/question pace`
	if (deltaMs < -1000) return `${formatMinSec(-deltaMs)} under the 18s/question pace`
	return "on pace with the 18s/question budget"
}

function CumulativeTimeChart(props: CumulativeTimeChartProps) {
	const attempts = props.attempts
	if (attempts.length === 0) {
		return <p className="text-foreground/70 text-sm">No question data this session.</p>
	}

	const points = buildPoints(attempts)
	const n = points.length
	const lastPoint = points[n - 1]
	if (lastPoint === undefined) {
		return <p className="text-foreground/70 text-sm">No question data this session.</p>
	}
	const actualTotalMs = lastPoint.cumulativeMs
	const budgetTotalMs = PER_QUESTION_BUDGET_MS * n
	const yMaxMs = pickYMax(actualTotalMs, budgetTotalMs)
	const yTicks = buildYTicks(yMaxMs)
	const xTickLabels = buildXTickLabels(n)
	const xTickLabelSet = new Set(xTickLabels)

	const linePath = points
		.map(function pointCmd(p, i) {
			const cmd = i === 0 ? "M" : "L"
			return `${cmd}${xOf(p.qIndex, n).toFixed(1)},${yOf(p.cumulativeMs, yMaxMs).toFixed(1)}`
		})
		.join(" ")

	const budgetStartX = xOf(0, n)
	const budgetStartY = yOf(PER_QUESTION_BUDGET_MS, yMaxMs)
	const budgetEndX = xOf(n - 1, n)
	const budgetEndY = yOf(budgetTotalMs, yMaxMs)

	const isOverBudgetEnd = actualTotalMs > budgetTotalMs
	const totalClass = isOverBudgetEnd ? "text-destructive" : "text-good"
	const deltaCopy = formatPaceDelta(actualTotalMs - budgetTotalMs)
	const anyFilter = props.selectedKeys.size > 0

	return (
		<div className="space-y-3">
			<div className="flex flex-wrap items-baseline gap-x-4 gap-y-1 text-foreground/70 text-xs">
				<span className="inline-flex items-center gap-1.5">
					<span
						aria-hidden="true"
						className="inline-block h-0 w-3 border-foreground/50 border-t border-dashed"
					/>
					<span>Budget (18s × question)</span>
				</span>
				<span className={cn("ml-auto tabular-nums", totalClass)}>{deltaCopy}</span>
			</div>
			<svg
				aria-label={`Cumulative time across ${n} question${n === 1 ? "" : "s"} vs the 18s-per-question budget.`}
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
					height={PLOT_H}
					stroke="currentColor"
					strokeWidth="1"
					width={PLOT_W}
					x={PAD_LEFT}
					y={PAD_TOP}
				/>

				{yTicks.map(function renderYTick(ms) {
					const y = yOf(ms, yMaxMs)
					const isBaseline = ms === 0
					const lineEmphasis = isBaseline ? "text-foreground/30" : "text-foreground/15"
					return (
						<g key={ms}>
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
								{formatMinSec(ms)}
							</text>
						</g>
					)
				})}

				{points.map(function renderVerticalGrid(p) {
					const x = xOf(p.qIndex, n)
					const q = p.qIndex + 1
					const isLabelTick = xTickLabelSet.has(q)
					const lineEmphasis = isLabelTick ? "text-foreground/20" : "text-foreground/10"
					return (
						<line
							key={p.attemptId}
							className={lineEmphasis}
							stroke="currentColor"
							strokeWidth="1"
							x1={x}
							x2={x}
							y1={PAD_TOP}
							y2={PAD_TOP + PLOT_H}
						/>
					)
				})}

				<line
					className="text-cobalt/70"
					stroke="currentColor"
					strokeDasharray="5 4"
					strokeWidth="1.5"
					x1={budgetStartX}
					x2={budgetEndX}
					y1={budgetStartY}
					y2={budgetEndY}
				/>

				{xTickLabels.map(function renderXTick(q) {
					const x = xOf(q - 1, n)
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
					x={PAD_LEFT + PLOT_W / 2}
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

				{points.map(function renderPoint(p) {
					const correctnessClass = p.correct ? "text-good" : "text-destructive"
					const cx = xOf(p.qIndex, n)
					const cy = yOf(p.cumulativeMs, yMaxMs)
					const tooltip = `Q${p.qIndex + 1}: ${formatMinSec(p.cumulativeMs)} elapsed`
					const isMatch = props.selectedKeys.has(p.filterKey)
					const dimmed = anyFilter && !isMatch
					const radius = dimmed ? 3 : 4
					const opacity = dimmed ? 0.25 : 1
					const strokeOpacity = dimmed ? 0.15 : 0.55
					return (
						<DotHitTarget
							key={p.attemptId}
							attemptId={p.attemptId}
							cx={cx}
							cy={cy}
							hitRadius={9}
							label={tooltip}
							onAttemptClick={props.onAttemptClick}
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
								<title>{tooltip}</title>
							</circle>
						</DotHitTarget>
					)
				})}
			</svg>
		</div>
	)
}

export type { CumulativeTimeChartProps }
export { CumulativeTimeChart }
