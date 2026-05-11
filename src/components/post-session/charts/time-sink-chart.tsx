"use client"

// <TimeSinkChart> — per-question latency vs the 18s "speed limit."
//
// X axis: question number (1..N, chronological).
// Y axis: time taken in seconds (0..max of 18s × 1.5 or actual peak).
// A horizontal goal line sits at 18s. Markers above the line render in
// the destructive token (over budget); markers at or below render in
// the `good` token. A connecting polyline draws between markers in a
// neutral muted color so the eye can follow the rhythm without two
// signals fighting for attention (Alpha §3: accents earn placement).

import { cn } from "@/lib/utils"

interface AttemptPoint {
	attemptId: string
	latencyMs: number
}

interface TimeSinkChartProps {
	attempts: ReadonlyArray<AttemptPoint>
}

const GOAL_MS = 18_000
const VIEW_W = 600
const VIEW_H = 220
const PAD_LEFT = 36
const PAD_RIGHT = 12
const PAD_TOP = 16
const PAD_BOTTOM = 28

function pickYMax(attempts: ReadonlyArray<AttemptPoint>): number {
	let peak = GOAL_MS * 3
	for (const a of attempts) {
		if (a.latencyMs > peak) peak = a.latencyMs
	}
	return Math.ceil(peak / GOAL_MS) * GOAL_MS
}

function formatSeconds(ms: number): string {
	return `${(ms / 1000).toFixed(0)}s`
}

interface AxisTick {
	ms: number
	label: string
}

function buildYTicks(yMaxMs: number): ReadonlyArray<AxisTick> {
	const ticks: AxisTick[] = []
	const stepMs = GOAL_MS
	for (let ms = 0; ms <= yMaxMs; ms += stepMs) {
		ticks.push({ ms, label: formatSeconds(ms) })
	}
	return ticks
}

function buildXTicks(count: number): ReadonlyArray<number> {
	if (count <= 1) return [1]
	if (count <= 10) {
		const arr: number[] = []
		for (let i = 1; i <= count; i += 1) arr.push(i)
		return arr
	}
	const step = Math.max(1, Math.floor(count / 8))
	const arr: number[] = [1]
	for (let i = step; i < count; i += step) arr.push(i)
	if (arr[arr.length - 1] !== count) arr.push(count)
	return arr
}

function TimeSinkChart(props: TimeSinkChartProps) {
	const attempts = props.attempts
	if (attempts.length === 0) {
		return (
			<p className="text-foreground/70 text-sm">No question data this session.</p>
		)
	}

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
	const xTicks = buildXTicks(n)

	let overCount = 0
	for (const a of attempts) {
		if (a.latencyMs > GOAL_MS) overCount += 1
	}
	const underCount = n - overCount

	return (
		<div className="space-y-3">
			<div className="flex flex-wrap items-baseline gap-x-4 gap-y-1 text-foreground/70 text-xs">
				<span className="inline-flex items-center gap-1.5">
					<span aria-hidden="true" className="h-2 w-2 rounded-full bg-good" />
					<span className="tabular-nums">{underCount} under 18s</span>
				</span>
				<span className="inline-flex items-center gap-1.5">
					<span aria-hidden="true" className="h-2 w-2 rounded-full bg-destructive" />
					<span className="tabular-nums">{overCount} over 18s</span>
				</span>
			</div>
			<svg
				aria-label={`Per-question time vs 18 second goal across ${n} question${n === 1 ? "" : "s"}.`}
				className="h-[220px] w-full overflow-visible"
				overflow="visible"
				role="img"
				viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
				preserveAspectRatio="none"
				xmlns="http://www.w3.org/2000/svg"
			>
				{/* Plot-area boundary — subtle border framing the data region.
				    Drawn first so gridlines and data render on top. */}
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

				{/* Y grid + tick labels */}
				{yTicks.map(function renderYTick(tick) {
					const y = yOf(tick.ms)
					const isGoal = tick.ms === 0
					const is18s = tick.ms === GOAL_MS
					const tickEmphasisClass = is18s
						? "text-cobalt font-medium"
						: "text-foreground/60"
					return (
						<g key={tick.ms}>
							<line
								className={cn(
									"text-foreground/15",
									isGoal && "text-foreground/30"
								)}
								stroke="currentColor"
								strokeWidth="1"
								x1={PAD_LEFT}
								x2={VIEW_W - PAD_RIGHT}
								y1={y}
								y2={y}
							/>
							<text
								className={cn(
									"fill-current font-sans text-[10px] tabular-nums",
									tickEmphasisClass
								)}
								textAnchor="end"
								x={PAD_LEFT - 6}
								y={y + 3}
							>
								{tick.label}
							</text>
						</g>
					)
				})}

				{/* 18s goal line — dashed, cobalt brand-target accent.
				    The 18s reference is communicated by this line + the
				    emphasized cobalt y-tick label at the 18 mark. */}
				<line
					className="text-cobalt/70"
					stroke="currentColor"
					strokeDasharray="4 3"
					strokeWidth="1.25"
					x1={PAD_LEFT}
					x2={VIEW_W - PAD_RIGHT}
					y1={goalY}
					y2={goalY}
				/>

				{/* X tick labels */}
				{xTicks.map(function renderXTick(q) {
					const i = q - 1
					const x = xOf(i)
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
					x={PAD_LEFT + plotW / 2}
					y={VIEW_H - 4}
				>
					Question number
				</text>

				{/* Connecting line in muted neutral so the marker colors carry the signal */}
				<path
					className="text-foreground/30"
					d={linePath}
					fill="none"
					stroke="currentColor"
					strokeLinecap="round"
					strokeLinejoin="round"
					strokeWidth="1.25"
				/>

				{/* Markers */}
				{attempts.map(function renderPoint(a, i) {
					const isOver = a.latencyMs > GOAL_MS
					const markerClass = isOver ? "text-destructive" : "text-good"
					return (
						<circle
							key={a.attemptId}
							className={markerClass}
							cx={xOf(i)}
							cy={yOf(a.latencyMs)}
							fill="currentColor"
							r={2.5}
						>
							<title>{`Q${i + 1}: ${(a.latencyMs / 1000).toFixed(1)}s`}</title>
						</circle>
					)
				})}
			</svg>
		</div>
	)
}

export type { TimeSinkChartProps }
export { TimeSinkChart }
