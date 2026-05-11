"use client"

// <AverageTimeAcrossTests> — per-test average-latency line chart,
// sibling of <AccuracyAcrossTests> in the Stats Pacing card.
//
// X-axis: same chronological test ordering as the accuracy chart, so a
// vertical glance across both charts at the same test reads as one
// pair of data points.
// Y-axis: average seconds per question for the filtered slice. The
// dashed cobalt 18s reference line (the per-question pacing target)
// runs across the plot so over-pace tests read at a glance.
//
// Filtering composes three orthogonal axes:
//   • matrix selectedKeys — sub-type × difficulty cells highlighted
//     on the Pacing matrix above. Empty set = no key filter.
//   • splitMode — "none" | "sub-type" | "difficulty"; same semantics
//     as the accuracy chart's split-mode picker (one line per group).
//   • correctnessFilter — "all" | "correct" | "wrong"; restricts each
//     bucket to attempts that match. Tests with zero matching
//     attempts in a series render no dot and the line skips them.
//
// Dots are click-targets via the same <DotButton> pattern: clicking
// pushes /post-session/<testId>?subType=…&difficulty=…&status=… so
// the user lands directly on that test's Question review with the
// composed filter applied.

import * as React from "react"
import type { SplitMode } from "@/components/stats/accuracy-across-tests"
import { type Difficulty, type SubTypeId, subTypes } from "@/config/sub-types"
import type { StatsAttempt, StatsSession } from "@/server/stats/data"

type CorrectnessFilter = "all" | "correct" | "wrong"

interface AverageTimeAcrossTestsProps {
	tests: ReadonlyArray<StatsSession>
	attempts: ReadonlyArray<StatsAttempt>
	selectedKeys: ReadonlySet<string>
	splitMode: SplitMode
	correctnessFilter: CorrectnessFilter
	onPointClick?: (testId: string, seriesId: string) => void
}

interface SeriesPoint {
	testId: string
	index: number
	label: string
	avgMs: number
	count: number
}

interface Series {
	id: string
	label: string
	colorClass: string
	points: ReadonlyArray<SeriesPoint>
}

const VIEW_W = 1100
const VIEW_H = 260
const PAD_LEFT = 60
const PAD_RIGHT = 20
const PAD_TOP = 24
const PAD_BOTTOM = 52
const PLOT_W = VIEW_W - PAD_LEFT - PAD_RIGHT
const PLOT_H = VIEW_H - PAD_TOP - PAD_BOTTOM

const Y_STEP_MS = 10_000
const Y_MIN_MAX_MS = 30_000
const GOAL_MS = 18_000

// Sub-type palette mirrors <AccuracyAcrossTests> so the same sub-type
// reads as the same color in both charts at a glance.
const SUB_TYPE_COLOR: Record<SubTypeId, string> = {
	"verbal.antonyms": "text-cobalt",
	"verbal.analogies": "text-purple-500",
	"verbal.sentence_completion": "text-pink-500",
	"verbal.critical_reasoning": "text-fuchsia-500",
	"verbal.letter_series": "text-violet-500",
	"numerical.number_series": "text-emerald-500",
	"numerical.word_problems": "text-teal-500",
	"numerical.fractions": "text-cyan-500",
	"numerical.percentages": "text-sky-500",
	"numerical.averages": "text-amber-500",
	"numerical.ratios": "text-orange-500",
	"numerical.workrate": "text-rose-500",
	"numerical.speed_distance_time": "text-lime-500",
	"numerical.lowest_values": "text-good"
}

const DIFFICULTY_COLOR: Record<Difficulty, string> = {
	easy: "text-emerald-500",
	medium: "text-amber-500",
	hard: "text-orange-500",
	brutal: "text-rose-500"
}

const DIFFICULTY_ORDER: ReadonlyArray<Difficulty> = ["easy", "medium", "hard", "brutal"]

const DIFFICULTY_LABEL: Record<Difficulty, string> = {
	easy: "Easy",
	medium: "Medium",
	hard: "Hard",
	brutal: "Brutal"
}

function formatDateLabel(startedAtMs: number): string {
	const d = new Date(startedAtMs)
	return d.toLocaleDateString(undefined, { month: "short", day: "numeric" })
}

function formatSeconds(ms: number): string {
	return `${(ms / 1000).toFixed(0)}s`
}

interface DotButtonProps {
	cx: number
	cy: number
	hitRadius: number
	label: string
	testId: string
	seriesId: string
	onClick: ((testId: string, seriesId: string) => void) | undefined
	children: React.ReactNode
}

function DotButton(props: DotButtonProps) {
	const click = props.onClick
	if (click === undefined) {
		return <g>{props.children}</g>
	}
	return (
		// biome-ignore lint/a11y/useSemanticElements: <button> cannot live inside an <svg>; role="button" is the correct ARIA pattern for an SVG dot hit target.
		<g
			aria-label={props.label}
			className="cursor-pointer outline-none"
			onClick={function onDotMouseClick() {
				click(props.testId, props.seriesId)
			}}
			onKeyDown={function onDotKey(event: React.KeyboardEvent<SVGGElement>) {
				if (event.key !== "Enter" && event.key !== " ") return
				event.preventDefault()
				click(props.testId, props.seriesId)
			}}
			role="button"
			tabIndex={0}
		>
			<circle
				cx={props.cx}
				cy={props.cy}
				fill="transparent"
				r={props.hitRadius}
				stroke="transparent"
			/>
			{props.children}
		</g>
	)
}

interface PerTestAvgBucket {
	count: number
	totalMs: number
}

function bucketByTest(attempts: ReadonlyArray<StatsAttempt>): Map<string, PerTestAvgBucket> {
	const byTest = new Map<string, PerTestAvgBucket>()
	for (const a of attempts) {
		let bucket = byTest.get(a.sessionId)
		if (bucket === undefined) {
			bucket = { count: 0, totalMs: 0 }
			byTest.set(a.sessionId, bucket)
		}
		bucket.count += 1
		bucket.totalMs += a.latencyMs
	}
	return byTest
}

function buildPoints(
	tests: ReadonlyArray<StatsSession>,
	byTest: ReadonlyMap<string, PerTestAvgBucket>
): SeriesPoint[] {
	const out: SeriesPoint[] = []
	tests.forEach(function compose(test, idx) {
		const bucket = byTest.get(test.id)
		const count = bucket === undefined ? 0 : bucket.count
		const totalMs = bucket === undefined ? 0 : bucket.totalMs
		const avgMs = count === 0 ? 0 : totalMs / count
		out.push({
			testId: test.id,
			index: idx,
			label: formatDateLabel(test.startedAtMs),
			avgMs,
			count
		})
	})
	return out
}

function filterAttempts(
	attempts: ReadonlyArray<StatsAttempt>,
	selectedKeys: ReadonlySet<string>,
	correctnessFilter: CorrectnessFilter
): ReadonlyArray<StatsAttempt> {
	return attempts.filter(function matches(a) {
		if (selectedKeys.size > 0 && !selectedKeys.has(`${a.subTypeId}|${a.difficulty}`)) return false
		if (correctnessFilter === "correct" && !a.correct) return false
		if (correctnessFilter === "wrong" && a.correct) return false
		return true
	})
}

function buildSeriesNone(
	attempts: ReadonlyArray<StatsAttempt>,
	tests: ReadonlyArray<StatsSession>
): Series[] {
	const byTest = bucketByTest(attempts)
	return [
		{
			id: "all",
			label: "All",
			colorClass: "text-cobalt",
			points: buildPoints(tests, byTest)
		}
	]
}

function buildSeriesBySubType(
	attempts: ReadonlyArray<StatsAttempt>,
	tests: ReadonlyArray<StatsSession>
): Series[] {
	const grouped = new Map<SubTypeId, StatsAttempt[]>()
	for (const a of attempts) {
		let bucket = grouped.get(a.subTypeId)
		if (bucket === undefined) {
			bucket = []
			grouped.set(a.subTypeId, bucket)
		}
		bucket.push(a)
	}
	const out: Series[] = []
	for (const cfg of subTypes) {
		const bucket = grouped.get(cfg.id)
		if (bucket === undefined) continue
		out.push({
			id: cfg.id,
			label: cfg.displayName,
			colorClass: SUB_TYPE_COLOR[cfg.id],
			points: buildPoints(tests, bucketByTest(bucket))
		})
	}
	return out
}

function buildSeriesByDifficulty(
	attempts: ReadonlyArray<StatsAttempt>,
	tests: ReadonlyArray<StatsSession>
): Series[] {
	const grouped = new Map<Difficulty, StatsAttempt[]>()
	for (const a of attempts) {
		let bucket = grouped.get(a.difficulty)
		if (bucket === undefined) {
			bucket = []
			grouped.set(a.difficulty, bucket)
		}
		bucket.push(a)
	}
	const out: Series[] = []
	for (const d of DIFFICULTY_ORDER) {
		const bucket = grouped.get(d)
		if (bucket === undefined) continue
		out.push({
			id: d,
			label: DIFFICULTY_LABEL[d],
			colorClass: DIFFICULTY_COLOR[d],
			points: buildPoints(tests, bucketByTest(bucket))
		})
	}
	return out
}

function buildSeries(
	attempts: ReadonlyArray<StatsAttempt>,
	tests: ReadonlyArray<StatsSession>,
	splitMode: SplitMode
): Series[] {
	if (splitMode === "sub-type") return buildSeriesBySubType(attempts, tests)
	if (splitMode === "difficulty") return buildSeriesByDifficulty(attempts, tests)
	return buildSeriesNone(attempts, tests)
}

function pickYMax(series: ReadonlyArray<Series>): number {
	let observedMax = 0
	for (const s of series) {
		for (const p of s.points) {
			if (p.count === 0) continue
			if (p.avgMs > observedMax) observedMax = p.avgMs
		}
	}
	const candidate = Math.ceil(observedMax / Y_STEP_MS) * Y_STEP_MS
	if (candidate < Y_MIN_MAX_MS) return Y_MIN_MAX_MS
	return candidate
}

function AverageTimeAcrossTests(props: AverageTimeAcrossTestsProps) {
	const sortedTests = React.useMemo(
		function sortChrono() {
			const arr = [...props.tests]
			arr.sort(function byChrono(a, b) {
				return a.startedAtMs - b.startedAtMs
			})
			return arr
		},
		[props.tests]
	)

	const series = React.useMemo(
		function memoSeries() {
			const filtered = filterAttempts(props.attempts, props.selectedKeys, props.correctnessFilter)
			return buildSeries(filtered, sortedTests, props.splitMode)
		},
		[props.attempts, sortedTests, props.selectedKeys, props.splitMode, props.correctnessFilter]
	)

	if (props.tests.length === 0) {
		return <p className="text-foreground/70 text-sm">No tests selected.</p>
	}

	const hasAnyData = series.some(function hasSomePoints(s) {
		return s.points.some(function hasData(p) {
			return p.count > 0
		})
	})
	if (!hasAnyData) {
		return (
			<p className="text-foreground/70 text-sm">No matching attempts for the current filter.</p>
		)
	}

	const yMaxMs = pickYMax(series)
	const n = sortedTests.length

	function xOf(i: number): number {
		if (n <= 1) return PAD_LEFT + PLOT_W / 2
		return PAD_LEFT + (i / (n - 1)) * PLOT_W
	}
	function yOf(ms: number): number {
		const clamped = Math.max(0, Math.min(yMaxMs, ms))
		return PAD_TOP + PLOT_H - (clamped / yMaxMs) * PLOT_H
	}

	function pathFor(s: Series): string {
		const segments: string[] = []
		let prevHasData = false
		for (const p of s.points) {
			if (p.count === 0) {
				prevHasData = false
				continue
			}
			const cmd = prevHasData ? "L" : "M"
			segments.push(`${cmd}${xOf(p.index).toFixed(1)},${yOf(p.avgMs).toFixed(1)}`)
			prevHasData = true
		}
		return segments.join(" ")
	}

	const yTicks: number[] = []
	for (let ms = 0; ms <= yMaxMs; ms += Y_STEP_MS) yTicks.push(ms)

	const xTickLabels = sortedTests.map(function pickLabel(t) {
		return { id: t.id, label: formatDateLabel(t.startedAtMs) }
	})

	const plural = n === 1 ? "" : "s"
	const ariaLabel = `Average time per question across ${n} practice test${plural}.`
	const showLegend = props.splitMode !== "none" && series.length > 1
	const goalY = yOf(GOAL_MS)

	return (
		<div className="space-y-2">
			{showLegend && (
				<div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-text-2">
					{series.map(function renderLegend(s) {
						return (
							<span key={`legend-${s.id}`} className="inline-flex items-center gap-1.5">
								<span
									aria-hidden="true"
									className={`h-2 w-2 rounded-full bg-current ${s.colorClass}`}
								/>
								<span>{s.label}</span>
							</span>
						)
					})}
				</div>
			)}
			<svg
				aria-label={ariaLabel}
				className="h-[260px] w-full overflow-visible"
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
					const y = yOf(ms)
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
								{formatSeconds(ms)}
							</text>
						</g>
					)
				})}

				{xTickLabels.map(function renderVerticalGrid(t, i) {
					const x = xOf(i)
					return (
						<line
							key={`grid-${t.id}`}
							className="text-foreground/10"
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

				{xTickLabels.map(function renderXLabel(t, i) {
					const x = xOf(i)
					return (
						<text
							key={`xlabel-${t.id}`}
							className="fill-current font-sans text-[12px] text-foreground/60 tabular-nums"
							textAnchor="middle"
							x={x}
							y={VIEW_H - PAD_BOTTOM + 18}
						>
							{t.label}
						</text>
					)
				})}
				<text
					className="fill-current text-[13px] text-foreground/55"
					textAnchor="middle"
					x={PAD_LEFT + PLOT_W / 2}
					y={VIEW_H - 8}
				>
					Practice test (chronological)
				</text>

				{series.map(function renderSeriesPath(s) {
					const d = pathFor(s)
					if (d === "") return null
					return (
						<path
							key={`path-${s.id}`}
							className={s.colorClass}
							d={d}
							fill="none"
							stroke="currentColor"
							strokeLinecap="round"
							strokeLinejoin="round"
							strokeWidth="1.5"
						/>
					)
				})}

				{series.map(function renderSeriesDots(s) {
					return (
						<g key={`dots-${s.id}`} className={s.colorClass}>
							{s.points.map(function renderDot(p) {
								if (p.count === 0) return null
								const cx = xOf(p.index)
								const cy = yOf(p.avgMs)
								const secLabel = (p.avgMs / 1000).toFixed(1)
								const samplePlural = p.count === 1 ? "" : "s"
								const tooltip = `${s.label} · ${p.label}: ${p.count} attempt${samplePlural}, avg ${secLabel}s`
								return (
									<DotButton
										key={`dot-${s.id}-${p.testId}`}
										cx={cx}
										cy={cy}
										hitRadius={9}
										label={`${tooltip} — open in review`}
										onClick={props.onPointClick}
										testId={p.testId}
										seriesId={s.id}
									>
										<circle
											cx={cx}
											cy={cy}
											fill="currentColor"
											fillOpacity={1}
											stroke="currentColor"
											strokeOpacity={0.55}
											strokeWidth="1"
											r={3.5}
											pointerEvents="none"
										>
											<title>{tooltip}</title>
										</circle>
									</DotButton>
								)
							})}
						</g>
					)
				})}
			</svg>
		</div>
	)
}

export type { CorrectnessFilter }
export { AverageTimeAcrossTests }
