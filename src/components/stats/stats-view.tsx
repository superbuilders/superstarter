"use client"

// <StatsView> — aggregate Pacing matrix + per-section topic-proficiency
// radars across the user's completed FULL practice tests (full_length
// + simulation). Drills are intentionally excluded — Stats reflects
// sit-the-whole-test performance, not bank-up-a-sub-type performance.
// Mirrors the Performance-by-sub-type tab from /post-session/<id>,
// except:
//   • a test picker at the top filters which sessions feed the
//     aggregation (default: every completed session selected);
//   • the matrix's sub-type × difficulty selection still flows through
//     to the two radars below it, so clicking a cell/row/column narrows
//     both the matrix highlight AND the radar values to the chosen
//     slice. This re-uses the same controlled-selection contract as the
//     post-session shell's Pacing card.
//
// All aggregation is client-side: the server hands back per-attempt
// rows for every completed session, and useMemo() folds them into the
// shapes the matrix (per-cell mean) and radar (per-sub-type median)
// consume. Per-session median can't be combined into a cross-session
// median, which is why the server doesn't pre-aggregate.

import { useRouter } from "next/navigation"
import * as React from "react"
import { TimeSinkMatrix } from "@/components/post-session/charts/time-sink-matrix"
import {
	computeOuterRingValue,
	TopicProficiencyRadar
} from "@/components/post-session/charts/topic-proficiency-radar"
import { AccuracyAcrossTests, type SplitMode } from "@/components/stats/accuracy-across-tests"
import {
	AverageTimeAcrossTests,
	type CorrectnessFilter
} from "@/components/stats/average-time-across-tests"
import type { SubTypeId } from "@/config/sub-types"
import { cn } from "@/lib/utils"
import type { StatsAttempt, StatsPageData, StatsSession } from "@/server/stats/data"

interface StatsViewProps {
	dataPromise: Promise<StatsPageData>
}

interface PerSubTypePerformance {
	subTypeId: SubTypeId
	correct: number
	total: number
	medianLatencyMs: number
}

function computeMedian(sorted: ReadonlyArray<number>): number {
	const n = sorted.length
	if (n === 0) return 0
	const mid = Math.floor(n / 2)
	if (n % 2 === 1) {
		const v = sorted[mid]
		if (v === undefined) return 0
		return v
	}
	const a = sorted[mid - 1]
	const b = sorted[mid]
	if (a === undefined || b === undefined) return 0
	return (a + b) / 2
}

interface Bucket {
	correct: number
	total: number
	latencies: number[]
}

function aggregatePerSubType(attempts: ReadonlyArray<StatsAttempt>): PerSubTypePerformance[] {
	const map = new Map<SubTypeId, Bucket>()
	for (const a of attempts) {
		let bucket = map.get(a.subTypeId)
		if (bucket === undefined) {
			bucket = { correct: 0, total: 0, latencies: [] }
			map.set(a.subTypeId, bucket)
		}
		bucket.total += 1
		if (a.correct) bucket.correct += 1
		bucket.latencies.push(a.latencyMs)
	}
	const out: PerSubTypePerformance[] = []
	for (const [subTypeId, bucket] of map) {
		bucket.latencies.sort(function ascending(x, y) {
			return x - y
		})
		out.push({
			subTypeId,
			correct: bucket.correct,
			total: bucket.total,
			medianLatencyMs: computeMedian(bucket.latencies)
		})
	}
	return out
}

function formatSessionLabel(s: StatsSession): string {
	const date = new Date(s.startedAtMs)
	const dateStr = date.toLocaleDateString(undefined, {
		month: "short",
		day: "numeric"
	})
	return `Practice test · ${dateStr}`
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

interface TestPickerProps {
	sessions: ReadonlyArray<StatsSession>
	selected: ReadonlySet<string>
	onChange: (next: ReadonlySet<string>) => void
}

function TestPicker(props: TestPickerProps) {
	const allSelected = props.selected.size === props.sessions.length
	const toggleAllLabel = allSelected ? "Clear all" : "Select all"
	function toggleAll() {
		if (allSelected) {
			props.onChange(new Set<string>())
			return
		}
		const next = new Set<string>()
		for (const s of props.sessions) next.add(s.id)
		props.onChange(next)
	}
	return (
		<section
			aria-label="Tests to include"
			className="space-y-2 rounded-lg border border-border-soft bg-surface px-4 py-3"
		>
			<div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
				<span className="text-[11px] text-text-3 uppercase tracking-[0.06em]">
					Tests to include
				</span>
				<span className="text-[10px] text-text-3 tabular-nums">
					{props.selected.size} of {props.sessions.length} selected
				</span>
			</div>
			<div className="flex flex-wrap gap-1.5">
				<Chip label={toggleAllLabel} active={allSelected} onClick={toggleAll} />
				{props.sessions.map(function renderChip(s) {
					const active = props.selected.has(s.id)
					return (
						<Chip
							key={s.id}
							label={formatSessionLabel(s)}
							active={active}
							onClick={function toggle() {
								const next = new Set(props.selected)
								if (next.has(s.id)) next.delete(s.id)
								else next.add(s.id)
								props.onChange(next)
							}}
						/>
					)
				})}
			</div>
		</section>
	)
}

interface AccuracySplitModePickerProps {
	mode: SplitMode
	onChange: (next: SplitMode) => void
}

interface SplitModeOption {
	value: SplitMode
	label: string
}

const SPLIT_MODE_OPTIONS: ReadonlyArray<SplitModeOption> = [
	{ value: "none", label: "Single line" },
	{ value: "sub-type", label: "By sub-type" },
	{ value: "difficulty", label: "By difficulty" }
]

function AccuracySplitModePicker(props: AccuracySplitModePickerProps) {
	return (
		<div className="flex flex-wrap gap-1.5">
			{SPLIT_MODE_OPTIONS.map(function renderOption(opt) {
				const active = props.mode === opt.value
				return (
					<Chip
						key={opt.value}
						label={opt.label}
						active={active}
						onClick={function pick() {
							props.onChange(opt.value)
						}}
					/>
				)
			})}
		</div>
	)
}

interface CorrectnessPickerProps {
	value: CorrectnessFilter
	onChange: (next: CorrectnessFilter) => void
}

interface CorrectnessOption {
	value: CorrectnessFilter
	label: string
}

const CORRECTNESS_OPTIONS: ReadonlyArray<CorrectnessOption> = [
	{ value: "all", label: "All" },
	{ value: "correct", label: "Correct only" },
	{ value: "wrong", label: "Wrong only" }
]

function CorrectnessPicker(props: CorrectnessPickerProps) {
	return (
		<div className="flex flex-wrap gap-1.5">
			{CORRECTNESS_OPTIONS.map(function renderOption(opt) {
				const active = props.value === opt.value
				return (
					<Chip
						key={opt.value}
						label={opt.label}
						active={active}
						onClick={function pick() {
							props.onChange(opt.value)
						}}
					/>
				)
			})}
		</div>
	)
}

interface ChartCardProps {
	title: string
	eyebrow: string
	testId: string
	children: React.ReactNode
}

function ChartCard(props: ChartCardProps) {
	return (
		<section
			className="overflow-hidden rounded-lg border border-border-soft bg-surface"
			data-testid={props.testId}
		>
			<header className="flex items-baseline justify-between border-border-soft border-b px-4 pt-2 pb-1">
				<h3 className="font-medium font-serif text-[18px] text-text-1 tracking-[-0.005em]">
					{props.title}
				</h3>
				<span className="text-[11px] text-text-3 uppercase tracking-[0.06em]">{props.eyebrow}</span>
			</header>
			<div className="px-4 py-3">{props.children}</div>
		</section>
	)
}

function StatsView(props: StatsViewProps) {
	const data = React.use(props.dataPromise)
	const router = useRouter()
	const initialSessionIds = React.useMemo(
		function buildInitial() {
			const s = new Set<string>()
			for (const sess of data.sessions) s.add(sess.id)
			return s
		},
		[data.sessions]
	)
	const [selectedSessionIds, setSelectedSessionIds] =
		React.useState<ReadonlySet<string>>(initialSessionIds)
	const [selectedKeys, setSelectedKeys] = React.useState<ReadonlySet<string>>(function initKeys() {
		return new Set<string>()
	})
	const [accuracySplitMode, setAccuracySplitMode] = React.useState<SplitMode>("none")
	const [avgTimeSplitMode, setAvgTimeSplitMode] = React.useState<SplitMode>("none")
	const [correctnessFilter, setCorrectnessFilter] = React.useState<CorrectnessFilter>("all")

	function handleAccuracyPointClick(testId: string, seriesId: string) {
		const params = new URLSearchParams()
		if (accuracySplitMode === "sub-type") params.set("subType", seriesId)
		else if (accuracySplitMode === "difficulty") params.set("difficulty", seriesId)
		const qs = params.toString()
		if (qs.length === 0) {
			router.push(`/post-session/${testId}`)
			return
		}
		router.push(`/post-session/${testId}?${qs}`)
	}

	function handleAvgTimePointClick(testId: string, seriesId: string) {
		const params = new URLSearchParams()
		if (avgTimeSplitMode === "sub-type") params.set("subType", seriesId)
		else if (avgTimeSplitMode === "difficulty") params.set("difficulty", seriesId)
		if (correctnessFilter === "correct") params.set("status", "correct")
		else if (correctnessFilter === "wrong") params.set("status", "incorrect")
		const qs = params.toString()
		if (qs.length === 0) {
			router.push(`/post-session/${testId}`)
			return
		}
		router.push(`/post-session/${testId}?${qs}`)
	}

	const sessionFiltered = React.useMemo(
		function filterBySession() {
			return data.attempts.filter(function bySession(a) {
				return selectedSessionIds.has(a.sessionId)
			})
		},
		[data.attempts, selectedSessionIds]
	)

	const selectedSessions = React.useMemo(
		function pickSelected() {
			return data.sessions.filter(function isSelected(s) {
				return selectedSessionIds.has(s.id)
			})
		},
		[data.sessions, selectedSessionIds]
	)

	const radarAttempts = React.useMemo(
		function filterByKey() {
			if (selectedKeys.size === 0) return sessionFiltered
			return sessionFiltered.filter(function byKey(a) {
				return selectedKeys.has(`${a.subTypeId}|${a.difficulty}`)
			})
		},
		[sessionFiltered, selectedKeys]
	)

	const performance = React.useMemo(
		function computePerf() {
			return aggregatePerSubType(radarAttempts)
		},
		[radarAttempts]
	)

	const radarOuterRing = React.useMemo(
		function computeOuter() {
			return computeOuterRingValue(performance)
		},
		[performance]
	)

	if (data.sessions.length === 0) {
		return (
			<main className="mx-auto max-w-[1100px] px-7 pb-10">
				<header className="mb-3 border-border-soft border-b pt-6 pb-3">
					<h1 className="font-medium font-serif text-2xl text-text-1 tracking-tight">Stats</h1>
				</header>
				<p className="text-sm text-text-2">
					No completed practice tests yet. Once you finish a full practice test it'll show up here.
				</p>
			</main>
		)
	}

	return (
		<main className="mx-auto max-w-[1100px] px-7 pb-10" data-testid="stats-page-main">
			<header className="mb-4 flex flex-col gap-1 border-border-soft border-b pt-6 pb-3">
				<h1 className="font-medium font-serif text-2xl text-text-1 tracking-tight">Stats</h1>
				<p className="max-w-[60ch] text-sm text-text-2">
					Aggregate pacing + topic proficiency across your completed practice tests.
				</p>
			</header>

			<div className="space-y-4">
				<TestPicker
					sessions={data.sessions}
					selected={selectedSessionIds}
					onChange={setSelectedSessionIds}
				/>

				<ChartCard
					title="Pacing"
					eyebrow="Sub-type × difficulty across selected tests"
					testId="stats-chart-pacing"
				>
					<div className="space-y-5">
						<TimeSinkMatrix
							attempts={sessionFiltered}
							selectedKeys={selectedKeys}
							onChange={setSelectedKeys}
						/>
						<div className="space-y-2 border-border-soft border-t pt-4">
							<div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
								<span className="text-[11px] text-text-3 uppercase tracking-[0.06em]">
									Accuracy across selected tests
								</span>
								<AccuracySplitModePicker mode={accuracySplitMode} onChange={setAccuracySplitMode} />
							</div>
							<AccuracyAcrossTests
								tests={selectedSessions}
								attempts={sessionFiltered}
								selectedKeys={selectedKeys}
								splitMode={accuracySplitMode}
								onPointClick={handleAccuracyPointClick}
							/>
						</div>
						<div className="space-y-2 border-border-soft border-t pt-4">
							<div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
								<span className="text-[11px] text-text-3 uppercase tracking-[0.06em]">
									Average time per question
								</span>
								<div className="flex flex-wrap gap-2">
									<CorrectnessPicker value={correctnessFilter} onChange={setCorrectnessFilter} />
									<AccuracySplitModePicker mode={avgTimeSplitMode} onChange={setAvgTimeSplitMode} />
								</div>
							</div>
							<AverageTimeAcrossTests
								tests={selectedSessions}
								attempts={sessionFiltered}
								selectedKeys={selectedKeys}
								splitMode={avgTimeSplitMode}
								correctnessFilter={correctnessFilter}
								onPointClick={handleAvgTimePointClick}
							/>
						</div>
					</div>
				</ChartCard>

				<div className="grid grid-cols-1 gap-4 md:grid-cols-2">
					<ChartCard
						title="Verbal proficiency"
						eyebrow="Target: 80% at 18s/question"
						testId="stats-chart-radar-verbal"
					>
						<TopicProficiencyRadar
							rows={performance}
							section="verbal"
							outerRingValue={radarOuterRing}
						/>
					</ChartCard>
					<ChartCard
						title="Numerical proficiency"
						eyebrow="Target: 80% at 18s/question"
						testId="stats-chart-radar-numerical"
					>
						<TopicProficiencyRadar
							rows={performance}
							section="numerical"
							outerRingValue={radarOuterRing}
						/>
					</ChartCard>
				</div>
			</div>
		</main>
	)
}

export { StatsView }
