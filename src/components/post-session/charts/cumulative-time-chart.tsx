"use client"

// <CumulativeTimeChart> — cumulative time spent vs. the 18s-per-question
// budget pace (15 minutes over 50 questions).
//
// X axis: question number (1..N, chronological).
// Y axis: cumulative seconds (max of actual total OR the budget total).
// Two lines:
//   - The "budget" diagonal: straight from (1, 18s) to (N, N×18s),
//     i.e. 18s per question over a 50-question CCAT pace.
//   - The user's actual cumulative time, with markers per question.
// Where the actual line crosses above the budget diagonal, the segment
// switches to the destructive token so the moment the user fell into
// time debt reads at a glance.

import { cn } from "@/lib/utils"

interface AttemptPoint {
	attemptId: string
	latencyMs: number
}

interface CumulativeTimeChartProps {
	attempts: ReadonlyArray<AttemptPoint>
}

const FULL_TEST_QUESTIONS = 50
const FULL_TEST_BUDGET_MS = 15 * 60_000
const PER_QUESTION_BUDGET_MS = FULL_TEST_BUDGET_MS / FULL_TEST_QUESTIONS
const VIEW_W = 600
const VIEW_H = 220
const PAD_LEFT = 44
const PAD_RIGHT = 12
const PAD_TOP = 16
const PAD_BOTTOM = 28
const PLOT_W = VIEW_W - PAD_LEFT - PAD_RIGHT
const PLOT_H = VIEW_H - PAD_TOP - PAD_BOTTOM

interface QPoint {
	attemptId: string
	qIndex: number
	cumulativeMs: number
	budgetMs: number
	over: boolean
}

interface Segment {
	key: string
	path: string
	over: boolean
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
	return Math.ceil(peak / 60_000) * 60_000
}

function buildPoints(attempts: ReadonlyArray<AttemptPoint>): QPoint[] {
	const points: QPoint[] = []
	let running = 0
	attempts.forEach(function compose(a, i) {
		running += a.latencyMs
		const budget = PER_QUESTION_BUDGET_MS * (i + 1)
		points.push({
			attemptId: a.attemptId,
			qIndex: i,
			cumulativeMs: running,
			budgetMs: budget,
			over: running > budget
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

function buildSegments(points: ReadonlyArray<QPoint>, yMaxMs: number): Segment[] {
	const segs: Segment[] = []
	const n = points.length
	for (let i = 1; i < n; i += 1) {
		const prev = points[i - 1]
		const cur = points[i]
		if (prev === undefined || cur === undefined) continue
		const fromX = xOf(prev.qIndex, n)
		const fromY = yOf(prev.cumulativeMs, yMaxMs)
		const toX = xOf(cur.qIndex, n)
		const toY = yOf(cur.cumulativeMs, yMaxMs)
		segs.push({
			key: `seg-${cur.attemptId}`,
			path: `M${fromX.toFixed(1)},${fromY.toFixed(1)} L${toX.toFixed(1)},${toY.toFixed(1)}`,
			over: cur.over
		})
	}
	return segs
}

function buildYTicks(yMaxMs: number): number[] {
	const ticks: number[] = []
	const step = 60_000
	for (let ms = 0; ms <= yMaxMs; ms += step) ticks.push(ms)
	return ticks
}

function buildXTicks(n: number): number[] {
	if (n <= 10) {
		const arr: number[] = []
		for (let q = 1; q <= n; q += 1) arr.push(q)
		return arr
	}
	const step = Math.max(1, Math.floor(n / 8))
	const arr: number[] = [1]
	for (let q = step; q < n; q += step) arr.push(q)
	if (arr[arr.length - 1] !== n) arr.push(n)
	return arr
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
	const segments = buildSegments(points, yMaxMs)
	const yTicks = buildYTicks(yMaxMs)
	const xTicks = buildXTicks(n)

	const budgetStartX = xOf(0, n)
	const budgetStartY = yOf(PER_QUESTION_BUDGET_MS, yMaxMs)
	const budgetEndX = xOf(n - 1, n)
	const budgetEndY = yOf(budgetTotalMs, yMaxMs)

	const isOverBudgetEnd = actualTotalMs > budgetTotalMs
	const totalClass = isOverBudgetEnd ? "text-destructive" : "text-good"
	const deltaCopy = formatPaceDelta(actualTotalMs - budgetTotalMs)

	return (
		<div className="space-y-3">
			<div className="flex flex-wrap items-baseline gap-x-4 gap-y-1 text-foreground/70 text-xs">
				<span className="inline-flex items-center gap-1.5">
					<span aria-hidden="true" className="h-2 w-2 rounded-full bg-cobalt" />
					<span>Your time</span>
				</span>
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
				className="h-[220px] w-full overflow-visible"
				role="img"
				viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
				preserveAspectRatio="none"
				xmlns="http://www.w3.org/2000/svg"
			>
				{yTicks.map(function renderYTick(ms) {
					const y = yOf(ms, yMaxMs)
					return (
						<g key={ms}>
							<line
								className="text-foreground/10"
								stroke="currentColor"
								strokeWidth="1"
								x1={PAD_LEFT}
								x2={VIEW_W - PAD_RIGHT}
								y1={y}
								y2={y}
							/>
							<text
								className="fill-current font-sans text-[10px] text-foreground/60 tabular-nums"
								textAnchor="end"
								x={PAD_LEFT - 6}
								y={y + 3}
							>
								{formatMinSec(ms)}
							</text>
						</g>
					)
				})}

				<line
					className="text-foreground/50"
					stroke="currentColor"
					strokeDasharray="4 3"
					strokeWidth="1.25"
					x1={budgetStartX}
					x2={budgetEndX}
					y1={budgetStartY}
					y2={budgetEndY}
				/>

				{xTicks.map(function renderXTick(q) {
					const x = xOf(q - 1, n)
					return (
						<text
							key={q}
							className="fill-current font-sans text-[10px] text-foreground/60 tabular-nums"
							textAnchor="middle"
							x={x}
							y={VIEW_H - PAD_BOTTOM + 14}
						>
							{q}
						</text>
					)
				})}
				<text
					className="fill-current text-[10px] text-foreground/50"
					textAnchor="middle"
					x={PAD_LEFT + PLOT_W / 2}
					y={VIEW_H - 4}
				>
					Question number
				</text>

				{segments.map(function renderSegment(seg) {
					const segClass = seg.over ? "text-destructive" : "text-cobalt"
					return (
						<path
							key={seg.key}
							className={segClass}
							d={seg.path}
							fill="none"
							stroke="currentColor"
							strokeLinecap="round"
							strokeWidth="1.5"
						/>
					)
				})}

				{points.map(function renderPoint(p) {
					const markerClass = p.over ? "text-destructive" : "text-cobalt"
					return (
						<circle
							key={p.attemptId}
							className={markerClass}
							cx={xOf(p.qIndex, n)}
							cy={yOf(p.cumulativeMs, yMaxMs)}
							fill="currentColor"
							r={2}
						>
							<title>{`Q${p.qIndex + 1}: ${formatMinSec(p.cumulativeMs)} elapsed`}</title>
						</circle>
					)
				})}
			</svg>
		</div>
	)
}

export type { CumulativeTimeChartProps }
export { CumulativeTimeChart }
