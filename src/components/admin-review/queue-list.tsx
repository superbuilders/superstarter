"use client"

// <QueueList> — the admin review queue's interactive shell. Receives the
// full AdminQueueData payload (loaded server-side by loadAdminQueueData)
// and renders:
//
//   - Header strip: total / flagged / pressure-cell / unvalidated counts
//   - Sort dropdown: 4 keys (newest, oldest, flag-count, sub-type)
//   - Filter chips: flag (all/flagged/clean), pressure (all/pressure/non-
//     pressure), per-sub-type select, per-difficulty select
//   - List of <QueueRow>s for the filtered + sorted slice
//
// Pure filter + sort logic lives in queue-filters.ts (tested separately).
// This file is JSX-only state plumbing + presentation.
//
// No URL state at v1 — filter/sort lives in React.useState. Shareable URLs
// are a v1.5 affordance.

import * as React from "react"
import { subTypes } from "@/config/sub-types"
import type { AdminQueueData } from "@/server/admin/queue-data"
import { QueueRow } from "@/components/admin-review/queue-row"
import {
	applyFilters,
	applySort,
	DEFAULT_FILTER_STATE,
	DEFAULT_SORT_KEY,
	type DifficultyFilter,
	type FilterState,
	type FlagFilter,
	type PressureFilter,
	type SortKey,
	type StaleFilter,
	type SubTypeFilter
} from "@/components/admin-review/queue-filters"
import type { Difficulty } from "@/config/sub-types"

interface QueueListProps {
	data: AdminQueueData
}

const FLAG_OPTIONS: ReadonlyArray<{ value: FlagFilter; label: string }> = [
	{ value: "flagged", label: "Flagged" },
	{ value: "clean", label: "Clean" },
	{ value: "all", label: "All" }
]

const PRESSURE_OPTIONS: ReadonlyArray<{ value: PressureFilter; label: string }> = [
	{ value: "pressure", label: "Pressure cells" },
	{ value: "non-pressure", label: "Non-pressure" },
	{ value: "all", label: "All cells" }
]

const STALE_OPTIONS: ReadonlyArray<{ value: StaleFilter; label: string }> = [
	{ value: "all", label: "All freshness" },
	{ value: "stale", label: "Stale only" },
	{ value: "fresh", label: "Fresh only" }
]

const SORT_OPTIONS: ReadonlyArray<{ value: SortKey; label: string }> = [
	{ value: "flag-count", label: "Most flags first" },
	{ value: "newest", label: "Newest first" },
	{ value: "oldest", label: "Oldest first" },
	{ value: "sub-type", label: "By sub-type" }
]

const DIFFICULTY_OPTIONS: ReadonlyArray<Difficulty> = ["easy", "medium", "hard", "brutal"]

const DIFFICULTY_VALUE_SET: ReadonlySet<string> = new Set<string>(DIFFICULTY_OPTIONS)
const SUB_TYPE_ID_SET: ReadonlySet<string> = new Set<string>(
	subTypes.map(function pickId(s) {
		return s.id
	})
)

function asFlagFilter(value: string): FlagFilter {
	if (value === "all" || value === "flagged" || value === "clean") return value
	return DEFAULT_FILTER_STATE.flag
}

function asPressureFilter(value: string): PressureFilter {
	if (value === "all" || value === "pressure" || value === "non-pressure") return value
	return DEFAULT_FILTER_STATE.pressure
}

function asSortKey(value: string): SortKey {
	if (
		value === "newest" ||
		value === "oldest" ||
		value === "flag-count" ||
		value === "sub-type"
	) {
		return value
	}
	return DEFAULT_SORT_KEY
}

function asSubTypeFilter(value: string): SubTypeFilter {
	if (value === "all") return "all"
	if (SUB_TYPE_ID_SET.has(value)) {
		const matched = subTypes.find(function eqs(s) {
			return s.id === value
		})
		if (matched === undefined) return DEFAULT_FILTER_STATE.subType
		return matched.id
	}
	return DEFAULT_FILTER_STATE.subType
}

function asDifficultyFilter(value: string): DifficultyFilter {
	if (value === "all") return "all"
	if (DIFFICULTY_VALUE_SET.has(value)) {
		const matched = DIFFICULTY_OPTIONS.find(function eqs(d) {
			return d === value
		})
		if (matched === undefined) return DEFAULT_FILTER_STATE.difficulty
		return matched
	}
	return DEFAULT_FILTER_STATE.difficulty
}

function asStaleFilter(value: string): StaleFilter {
	if (value === "all" || value === "stale" || value === "fresh") return value
	return DEFAULT_FILTER_STATE.stale
}

const SELECT_CLASS =
	"h-8 rounded-md border border-border-soft bg-surface px-2 text-[12px] text-text-1 focus-visible:outline focus-visible:outline-2 focus-visible:outline-cobalt focus-visible:outline-offset-1"

function QueueList({ data }: QueueListProps) {
	const [filterState, setFilterState] = React.useState<FilterState>(DEFAULT_FILTER_STATE)
	const [sortKey, setSortKey] = React.useState<SortKey>(DEFAULT_SORT_KEY)

	const visible = React.useMemo(
		function recomputeVisible() {
			const filtered = applyFilters(data.items, filterState)
			return applySort(filtered, sortKey)
		},
		[data.items, filterState, sortKey]
	)

	function onFlagChange(event: React.ChangeEvent<HTMLSelectElement>) {
		setFilterState(function update(prev) {
			return { ...prev, flag: asFlagFilter(event.target.value) }
		})
	}

	function onPressureChange(event: React.ChangeEvent<HTMLSelectElement>) {
		setFilterState(function update(prev) {
			return { ...prev, pressure: asPressureFilter(event.target.value) }
		})
	}

	function onSubTypeChange(event: React.ChangeEvent<HTMLSelectElement>) {
		setFilterState(function update(prev) {
			return { ...prev, subType: asSubTypeFilter(event.target.value) }
		})
	}

	function onDifficultyChange(event: React.ChangeEvent<HTMLSelectElement>) {
		setFilterState(function update(prev) {
			return { ...prev, difficulty: asDifficultyFilter(event.target.value) }
		})
	}

	function onStaleChange(event: React.ChangeEvent<HTMLSelectElement>) {
		setFilterState(function update(prev) {
			return { ...prev, stale: asStaleFilter(event.target.value) }
		})
	}

	const headerStats = [
		{ label: "Total", value: data.totalCount },
		{ label: "Flagged", value: data.flaggedCount },
		{ label: "Pressure", value: data.pressureCellCount },
		{ label: "Stale", value: data.staleCount },
		{ label: "Unvalidated", value: data.unvalidatedCount },
		{ label: "Visible", value: visible.length }
	]

	const listBody =
		visible.length === 0 ? (
			<p className="px-4 py-6 text-[13px] text-text-3">
				No candidates match the current filters.
			</p>
		) : (
			<ul className="divide-none">
				{visible.map(function renderRow(item) {
					return (
						<li key={item.id}>
							<QueueRow item={item} />
						</li>
					)
				})}
			</ul>
		)

	return (
		<div className="flex flex-col gap-4">
			<section className="grid grid-cols-2 gap-3 rounded-lg border border-border-soft bg-surface px-4 py-3 md:grid-cols-6">
				{headerStats.map(function renderStat(stat) {
					return (
						<div key={stat.label} className="flex flex-col gap-[2px]">
							<span className="text-[11px] text-text-3 uppercase tracking-[0.06em]">
								{stat.label}
							</span>
							<span className="font-medium font-serif text-[20px] text-text-1 tabular-nums">
								{stat.value}
							</span>
						</div>
					)
				})}
			</section>

			<section className="flex flex-wrap items-end gap-3 rounded-lg border border-border-soft bg-surface px-4 py-3">
				<label className="flex flex-col gap-1 text-[11px] text-text-3 uppercase tracking-[0.06em]">
					Flag
					<select
						value={filterState.flag}
						onChange={onFlagChange}
						className={SELECT_CLASS}
						aria-label="Filter by flag status"
					>
						{FLAG_OPTIONS.map(function renderOption(opt) {
							return (
								<option key={opt.value} value={opt.value}>
									{opt.label}
								</option>
							)
						})}
					</select>
				</label>
				<label className="flex flex-col gap-1 text-[11px] text-text-3 uppercase tracking-[0.06em]">
					Pressure
					<select
						value={filterState.pressure}
						onChange={onPressureChange}
						className={SELECT_CLASS}
						aria-label="Filter by pressure-cell membership"
					>
						{PRESSURE_OPTIONS.map(function renderOption(opt) {
							return (
								<option key={opt.value} value={opt.value}>
									{opt.label}
								</option>
							)
						})}
					</select>
				</label>
				<label className="flex flex-col gap-1 text-[11px] text-text-3 uppercase tracking-[0.06em]">
					Sub-type
					<select
						value={filterState.subType}
						onChange={onSubTypeChange}
						className={SELECT_CLASS}
						aria-label="Filter by sub-type"
					>
						<option value="all">All sub-types</option>
						{subTypes.map(function renderSubType(s) {
							return (
								<option key={s.id} value={s.id}>
									{s.displayName} ({s.section})
								</option>
							)
						})}
					</select>
				</label>
				<label className="flex flex-col gap-1 text-[11px] text-text-3 uppercase tracking-[0.06em]">
					Difficulty
					<select
						value={filterState.difficulty}
						onChange={onDifficultyChange}
						className={SELECT_CLASS}
						aria-label="Filter by difficulty"
					>
						<option value="all">All tiers</option>
						{DIFFICULTY_OPTIONS.map(function renderDiff(d) {
							return (
								<option key={d} value={d}>
									{d}
								</option>
							)
						})}
					</select>
				</label>
				<label className="flex flex-col gap-1 text-[11px] text-text-3 uppercase tracking-[0.06em]">
					Freshness
					<select
						value={filterState.stale}
						onChange={onStaleChange}
						className={SELECT_CLASS}
						aria-label="Filter by validator freshness"
					>
						{STALE_OPTIONS.map(function renderOption(opt) {
							return (
								<option key={opt.value} value={opt.value}>
									{opt.label}
								</option>
							)
						})}
					</select>
				</label>
				<label className="flex flex-col gap-1 text-[11px] text-text-3 uppercase tracking-[0.06em]">
					Sort
					<select
						value={sortKey}
						onChange={function handleSort(event) {
							setSortKey(asSortKey(event.target.value))
						}}
						className={SELECT_CLASS}
						aria-label="Sort the queue"
					>
						{SORT_OPTIONS.map(function renderOption(opt) {
							return (
								<option key={opt.value} value={opt.value}>
									{opt.label}
								</option>
							)
						})}
					</select>
				</label>
			</section>

			<section className="overflow-hidden rounded-lg border border-border-soft bg-surface">
				<header className="flex items-baseline justify-between border-border-soft border-b px-4 pt-2 pb-1">
					<h3 className="font-medium font-serif text-[15px] text-text-1 tracking-[-0.005em]">
						Candidate queue
					</h3>
					<span className="text-[11px] text-text-3 uppercase tracking-[0.06em]">
						{visible.length} visible
					</span>
				</header>
				{listBody}
			</section>
		</div>
	)
}

export type { QueueListProps }
export { QueueList }
