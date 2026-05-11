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
// Filter + sort state is persisted in sessionStorage, keyed by status
// cohort, so a "Back to queue" navigation from the item-detail page (or
// any other in-tab navigation) restores the admin's prior selections.
// New tabs / new sessions start from the per-cohort defaults. URL-state
// for shareable filter URLs is still a future affordance.

import * as errors from "@superbuilders/errors"
import * as React from "react"
import { z } from "zod"
import { subTypes } from "@/config/sub-types"
import { logger } from "@/logger"
import type { AdminQueueData, QueueStatusFilter } from "@/server/admin/queue-data"
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
	listHeading: string
	emptyMessage: string
}

// Per-cohort default filter state. The candidate queue defaults to
// "flagged" because triage is the dominant workflow there; live and
// rejected cohorts default to "all" because validator flags are largely
// inapplicable (live items are already approved; rejected items are
// terminal). Without this override, switching to Live/Rejected would
// produce an empty list by default and confuse the admin.
function defaultFilterStateFor(data: AdminQueueData): FilterState {
	if (data.statusFilter === "candidate") return DEFAULT_FILTER_STATE
	return { ...DEFAULT_FILTER_STATE, flag: "all" }
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

// sessionStorage-backed persistence (per status cohort). The shape is
// shallow so a malformed payload from a prior session — e.g. a future
// version added a field — degrades cleanly to the per-cohort defaults
// rather than crashing the queue.
const PERSIST_KEY_PREFIX = "admin-review-queue:"
const LAST_STATUS_KEY = `${PERSIST_KEY_PREFIX}last-status`

function persistKeyFor(status: QueueStatusFilter): string {
	return `${PERSIST_KEY_PREFIX}${status}`
}

function writeLastVisitedStatus(status: QueueStatusFilter): void {
	if (typeof window === "undefined") return
	const writeResult = errors.trySync(function persist() {
		window.sessionStorage.setItem(LAST_STATUS_KEY, status)
	})
	if (writeResult.error) {
		logger.warn(
			{ status, error: writeResult.error },
			"queue-list: last-status sessionStorage write failed"
		)
	}
}

const persistedShapeSchema = z.object({
	filterState: z.object({
		flag: z.string(),
		pressure: z.string(),
		subType: z.string(),
		difficulty: z.string(),
		stale: z.string()
	}),
	sortKey: z.string()
})

interface PersistedQueueState {
	readonly filterState: FilterState
	readonly sortKey: SortKey
}

function readPersistedQueueState(status: QueueStatusFilter): PersistedQueueState | undefined {
	if (typeof window === "undefined") return undefined
	const raw = window.sessionStorage.getItem(persistKeyFor(status))
	if (raw === null) return undefined
	const parsed = errors.trySync(function parseRaw() {
		return JSON.parse(raw)
	})
	if (parsed.error) {
		logger.warn(
			{ status, error: parsed.error },
			"queue-list: persisted state JSON.parse failed; falling back to defaults"
		)
		return undefined
	}
	const validated = persistedShapeSchema.safeParse(parsed.data)
	if (!validated.success) {
		logger.warn(
			{ status, error: validated.error },
			"queue-list: persisted state shape mismatch; falling back to defaults"
		)
		return undefined
	}
	const fs = validated.data.filterState
	const filterState: FilterState = {
		flag: asFlagFilter(fs.flag),
		pressure: asPressureFilter(fs.pressure),
		subType: asSubTypeFilter(fs.subType),
		difficulty: asDifficultyFilter(fs.difficulty),
		stale: asStaleFilter(fs.stale)
	}
	const sortKey = asSortKey(validated.data.sortKey)
	return { filterState, sortKey }
}

function writePersistedQueueState(
	status: QueueStatusFilter,
	filterState: FilterState,
	sortKey: SortKey
): void {
	if (typeof window === "undefined") return
	const payload = JSON.stringify({ filterState, sortKey })
	const writeResult = errors.trySync(function persist() {
		window.sessionStorage.setItem(persistKeyFor(status), payload)
	})
	if (writeResult.error) {
		// sessionStorage can throw QuotaExceededError or be disabled by
		// the browser (private mode in some configurations). Falling back
		// to no-op is acceptable — the admin loses cross-navigation
		// state restoration but the queue itself keeps working.
		logger.warn(
			{ status, error: writeResult.error },
			"queue-list: sessionStorage write failed; cross-navigation state will not persist"
		)
	}
}

const SELECT_CLASS =
	"h-8 rounded-md border border-border-soft bg-surface px-2 text-[12px] text-text-1 focus-visible:outline focus-visible:outline-2 focus-visible:outline-cobalt focus-visible:outline-offset-1"

function QueueList({ data, listHeading, emptyMessage }: QueueListProps) {
	// QueueList is intended to be remounted when the status cohort changes
	// (parent passes `key={data.statusFilter}`), so the per-cohort default
	// flag filter is picked up cleanly via useState's lazy initializer
	// instead of a derived-state-during-render pattern.
	//
	// Lazy initializers also restore from sessionStorage when the admin
	// returns to a previously-visited cohort tab in the same browser tab
	// (e.g., "Back to queue" from /admin/review/[itemId]). Falling back
	// to per-cohort defaults when nothing was persisted yet.
	const [filterState, setFilterState] = React.useState<FilterState>(function init() {
		const persisted = readPersistedQueueState(data.statusFilter)
		if (persisted !== undefined) return persisted.filterState
		return defaultFilterStateFor(data)
	})
	const [sortKey, setSortKey] = React.useState<SortKey>(function init() {
		const persisted = readPersistedQueueState(data.statusFilter)
		if (persisted !== undefined) return persisted.sortKey
		return DEFAULT_SORT_KEY
	})

	React.useEffect(
		function persistOnChange() {
			writePersistedQueueState(data.statusFilter, filterState, sortKey)
		},
		[data.statusFilter, filterState, sortKey]
	)

	// Record which cohort tab is currently visible so the item-detail
	// page's "Back to queue" link can restore it after navigation. Stored
	// as a separate sessionStorage key (not folded into the per-cohort
	// payload) because consumers want the pointer without having to know
	// which cohort it is.
	React.useEffect(
		function recordLastStatus() {
			writeLastVisitedStatus(data.statusFilter)
		},
		[data.statusFilter]
	)

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
		{ label: "Visible", value: visible.length },
		{ label: "Approved", value: data.dispositionStats.approvedCount },
		{ label: "Rejected", value: data.dispositionStats.rejectedCount },
		{ label: "Today", value: data.dispositionStats.totalDisposedToday }
	]

	const listBody =
		visible.length === 0 ? (
			<p className="px-4 py-6 text-[13px] text-text-3">{emptyMessage}</p>
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
			<section className="grid grid-cols-2 gap-3 rounded-lg border border-border-soft bg-surface px-4 py-3 md:grid-cols-3 lg:grid-cols-9">
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
						{listHeading}
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
