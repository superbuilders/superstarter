"use client"

// <AccuracyAcrossTests> — per-test accuracy line chart, driven by the
// <TimeSinkMatrix> selection above it. With no matrix selection, each
// dot is the test's overall accuracy (correct / total across every
// attempt). With a selection, only attempts whose (subType, difficulty)
// is in the selected set count toward the dot.
//
// The chart supports three split modes:
//   • "none"        — one cobalt line, overall accuracy per test
//   • "sub-type"    — one line per sub-type present in the filtered
//                     attempts, each colored from a fixed 14-entry
//                     palette so the same sub-type always reads as the
//                     same hue across sessions
//   • "difficulty"  — one line per difficulty present (easy / medium /
//                     hard / brutal), colored on a low→high severity
//                     ramp (emerald → amber → orange → rose)
// A small chip group in the parent (stats-view) sets the active mode.
//
// Tests are sorted chronologically (oldest left → newest right). For
// any series, tests with zero matching attempts render no dot at that
// X position and the connecting line skips them — so a gap reads as
// "no data for this series at this test" rather than a regression to
// 0%.

import * as React from "react"
import { type Difficulty, type SubTypeId, subTypes } from "@/config/sub-types"
import type { StatsAttempt, StatsSession } from "@/server/stats/data"

type SplitMode = "none" | "sub-type" | "difficulty"

interface AccuracyAcrossTestsProps {
	tests: ReadonlyArray<StatsSession>
	attempts: ReadonlyArray<StatsAttempt>
	selectedKeys: ReadonlySet<string>
	splitMode: SplitMode
	title?: string
	onPointClick?: (testId: string, seriesId: string) => void
}

interface SeriesPoint {
	testId: string
	index: number
	label: string
	accuracy: number
	correct: number
	total: number
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

const Y_TICK_PERCENTS: ReadonlyArray<number> = [0, 25, 50, 75, 100]

// Sub-type palette: mix of project brand tokens + Tailwind default
// hues, ordered so high-frequency sub-types (Antonyms, Number Series,
// Fractions) land on the most legible colors.
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

// Sub-types sorted Verbal-first then Numerical, alphabetical within each
// section. The matrix above uses the same ordering, so the chart's
// legend (and line-stacking order) reads as one consistent rhythm.
const SECTION_RANK: Record<"verbal" | "numerical", number> = { verbal: 0, numerical: 1 }
const SUB_TYPES_SORTED = [...subTypes].sort(function compareSubTypes(a, b) {
	const sectionDelta = SECTION_RANK[a.section] - SECTION_RANK[b.section]
	if (sectionDelta !== 0) return sectionDelta
	return a.displayName.localeCompare(b.displayName)
})

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

interface PerTestBucket {
	correct: number
	total: number
}

function bucketByTest(attempts: ReadonlyArray<StatsAttempt>): Map<string, PerTestBucket> {
	const byTest = new Map<string, PerTestBucket>()
	for (const a of attempts) {
		let bucket = byTest.get(a.sessionId)
		if (bucket === undefined) {
			bucket = { correct: 0, total: 0 }
			byTest.set(a.sessionId, bucket)
		}
		bucket.total += 1
		if (a.correct) bucket.correct += 1
	}
	return byTest
}

function buildPoints(
	tests: ReadonlyArray<StatsSession>,
	byTest: ReadonlyMap<string, PerTestBucket>
): SeriesPoint[] {
	const out: SeriesPoint[] = []
	tests.forEach(function compose(test, idx) {
		const bucket = byTest.get(test.id)
		const total = bucket === undefined ? 0 : bucket.total
		const correct = bucket === undefined ? 0 : bucket.correct
		const accuracy = total === 0 ? 0 : correct / total
		out.push({
			testId: test.id,
			index: idx,
			label: formatDateLabel(test.startedAtMs),
			accuracy,
			correct,
			total
		})
	})
	return out
}

function filterByKeys(
	attempts: ReadonlyArray<StatsAttempt>,
	selectedKeys: ReadonlySet<string>
): ReadonlyArray<StatsAttempt> {
	if (selectedKeys.size === 0) return attempts
	return attempts.filter(function byKey(a) {
		return selectedKeys.has(`${a.subTypeId}|${a.difficulty}`)
	})
}

function buildSeriesNone(
	attempts: ReadonlyArray<StatsAttempt>,
	tests: ReadonlyArray<StatsSession>
): Series[] {
	const byTest = bucketByTest(attempts)
	const points = buildPoints(tests, byTest)
	return [
		{
			id: "all",
			label: "All",
			colorClass: "text-cobalt",
			points
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
	for (const cfg of SUB_TYPES_SORTED) {
		const bucket = grouped.get(cfg.id)
		if (bucket === undefined) continue
		const byTest = bucketByTest(bucket)
		out.push({
			id: cfg.id,
			label: cfg.displayName,
			colorClass: SUB_TYPE_COLOR[cfg.id],
			points: buildPoints(tests, byTest)
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
		const byTest = bucketByTest(bucket)
		out.push({
			id: d,
			label: DIFFICULTY_LABEL[d],
			colorClass: DIFFICULTY_COLOR[d],
			points: buildPoints(tests, byTest)
		})
	}
	return out
}

function buildSeries(
	attempts: ReadonlyArray<StatsAttempt>,
	tests: ReadonlyArray<StatsSession>,
	selectedKeys: ReadonlySet<string>,
	splitMode: SplitMode
): Series[] {
	const filtered = filterByKeys(attempts, selectedKeys)
	if (splitMode === "sub-type") return buildSeriesBySubType(filtered, tests)
	if (splitMode === "difficulty") return buildSeriesByDifficulty(filtered, tests)
	return buildSeriesNone(filtered, tests)
}

function AccuracyAcrossTests(props: AccuracyAcrossTestsProps) {
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
			return buildSeries(props.attempts, sortedTests, props.selectedKeys, props.splitMode)
		},
		[props.attempts, sortedTests, props.selectedKeys, props.splitMode]
	)

	if (props.tests.length === 0) {
		return <p className="text-foreground/70 text-sm">No tests selected.</p>
	}

	const hasAnyData = series.some(function hasSomePoints(s) {
		return s.points.some(function hasData(p) {
			return p.total > 0
		})
	})
	if (!hasAnyData) {
		return (
			<p className="text-foreground/70 text-sm">No matching attempts for the current filter.</p>
		)
	}

	const n = sortedTests.length

	function xOf(i: number): number {
		if (n <= 1) return PAD_LEFT + PLOT_W / 2
		return PAD_LEFT + (i / (n - 1)) * PLOT_W
	}
	function yOf(accuracy: number): number {
		const clamped = Math.max(0, Math.min(1, accuracy))
		return PAD_TOP + PLOT_H - clamped * PLOT_H
	}

	function pathFor(s: Series): string {
		const segments: string[] = []
		let prevHasData = false
		for (const p of s.points) {
			if (p.total === 0) {
				prevHasData = false
				continue
			}
			const cmd = prevHasData ? "L" : "M"
			segments.push(`${cmd}${xOf(p.index).toFixed(1)},${yOf(p.accuracy).toFixed(1)}`)
			prevHasData = true
		}
		return segments.join(" ")
	}

	const xTickLabels = sortedTests.map(function pickLabel(t) {
		return { id: t.id, label: formatDateLabel(t.startedAtMs) }
	})

	const plural = n === 1 ? "" : "s"
	const ariaLabel = `Accuracy across ${n} practice test${plural}.`

	const showLegend = props.splitMode !== "none" && series.length > 1

	return (
		<div className="space-y-0.5">
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
			{props.title !== undefined && (
				<h4 className="text-center font-medium font-serif text-[18px] text-text-1 tracking-[-0.005em]">
					{props.title}
				</h4>
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

				{Y_TICK_PERCENTS.map(function renderYTick(pct) {
					const y = yOf(pct / 100)
					const isMidTick = pct !== 0 && pct !== 100
					const lineEmphasis = isMidTick ? "text-foreground/15" : "text-foreground/30"
					return (
						<g key={pct}>
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
								{`${pct}%`}
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
								if (p.total === 0) return null
								const cx = xOf(p.index)
								const cy = yOf(p.accuracy)
								const pctLabel = Math.round(p.accuracy * 100)
								const tooltip = `${s.label} · ${p.label}: ${p.correct}/${p.total} = ${pctLabel}%`
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

export type { SplitMode }
export { AccuracyAcrossTests }
