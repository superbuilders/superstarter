"use client"

// <WrongItemsBrowser> — per-question review surface.
//
// Each question card mirrors the live practice/drill question page
// formatting (same body renderers + option-button visual scaffolding),
// minus the timer/progression bars and the Submit Answer CTA. Review-
// only adornments — green/red highlight + ✅/❌ marker — sit on top
// of the practice surface.
//
// The toolbar above the list lets the user filter by status, sub-type,
// difficulty, and time-bucket, and sort by question order, sub-type,
// time taken, or difficulty in ascending or descending order. Default
// is "all items, question order, ascending" — i.e., chronological by
// attempt id.

import * as React from "react"
import { z } from "zod"
import type {
	ItemDifficulty,
	WrongItem
} from "@/app/(app)/post-session/[sessionId]/page"
import { NumberSeriesBody } from "@/components/item/body-renderers/number-series"
import { TextBody } from "@/components/item/body-renderers/text"
import {
	compareBySubTypeDisplay,
	SUB_TYPE_BY_ID
} from "@/components/post-session/_lib/sub-type-display"
import { LatencyRangeSlider } from "@/components/post-session/latency-range-slider"
import { StructuredExplanation } from "@/components/post-session/structured-explanation"
import type { SubTypeId } from "@/config/sub-types"
import { cn } from "@/lib/utils"
import { logger } from "@/logger"
import { type ItemBody, itemBody } from "@/server/items/body-schema"

interface ScrollRequest {
	readonly nonce: number
	readonly attemptId: string
}

interface WrongItemsBrowserProps {
	items: ReadonlyArray<WrongItem>
	/** Whether the filter + sort toolbar is expanded. Toggled by the
	 *  caller (the post-session shell) via a button in the tab nav.
	 *  Defaults to false at the parent — collapsed on first paint. */
	toolbarOpen: boolean
	/** Set by the shell when the user clicks a dot on the Performance
	 *  tab's charts. The browser resets filters, scrolls the matching
	 *  card into view, and flashes it. The `nonce` re-fires the effect
	 *  if the same attempt is clicked twice. */
	scrollRequest?: ScrollRequest
	onScrollHandled?: () => void
	/** Seed values for the sub-type / difficulty filter dropdowns,
	 *  parsed from /post-session URL search params on first mount
	 *  (e.g., arriving from a click on the /stats accuracy chart). The
	 *  user can clear or change them via the toolbar after landing. */
	initialSubTypeFilter?: SubTypeId
	initialDifficultyFilter?: ItemDifficulty
	/** Seed for the status dropdown — Stats' "Wrong only" filter maps
	 *  to "incorrect" here. The user can clear via the toolbar. */
	initialStatusFilter?: "correct" | "incorrect" | "skipped"
}

type ItemStatus = "correct" | "incorrect" | "skipped"
type StatusFilter = "all" | ItemStatus
type DifficultyFilter = "all" | ItemDifficulty
interface TimeRange {
	minMs: number
	maxMs: number
}
type SubTypeFilter = "all" | "section:numerical" | "section:verbal" | SubTypeId
type SortKey = "question" | "subType" | "latency" | "difficulty"
type SortDirection = "asc" | "desc"

const NUMBER_SERIES_SUB_TYPE_ID = "numerical.number_series"

const PRACTICE_FONT_CLASS = "font-[ui-sans-serif,system-ui,-apple-system,Arial,sans-serif]"

const DIFFICULTY_RANK: Record<ItemDifficulty, number> = {
	easy: 0,
	medium: 1,
	hard: 2,
	brutal: 3
}

function statusFor(item: WrongItem): ItemStatus {
	if (item.correct) return "correct"
	if (item.selectedAnswer === undefined) return "skipped"
	return "incorrect"
}

const optionShapeSchema = z.object({
	id: z.string(),
	text: z.string()
})

const optionsArraySchema = z.array(optionShapeSchema)

type OptionShape = z.infer<typeof optionShapeSchema>

interface ParsedItem {
	body: ItemBody
	options: ReadonlyArray<OptionShape>
}

function parseItem(item: WrongItem): ParsedItem | null {
	const bodyResult = itemBody.safeParse(item.body)
	if (!bodyResult.success) {
		logger.error(
			{
				attemptId: item.attemptId,
				itemId: item.itemId,
				error: bodyResult.error
			},
			"WrongItemCard: body parse failed"
		)
		return null
	}
	const optionsResult = optionsArraySchema.safeParse(item.optionsJson)
	if (!optionsResult.success) {
		logger.error(
			{
				attemptId: item.attemptId,
				itemId: item.itemId,
				error: optionsResult.error
			},
			"WrongItemCard: options parse failed"
		)
		return null
	}
	return { body: bodyResult.data, options: optionsResult.data }
}

function renderBody(body: ItemBody, subTypeId: SubTypeId): React.ReactNode {
	switch (body.kind) {
		case "text":
			if (subTypeId === NUMBER_SERIES_SUB_TYPE_ID) {
				return <NumberSeriesBody text={body.text} />
			}
			return <TextBody text={body.text} />
		default: {
			const _exhaustive: never = body.kind
			return <span>{_exhaustive}</span>
		}
	}
}

interface ReviewOptionButtonProps {
	text: string
	isUserAnswer: boolean
	isCorrect: boolean
	isStruck: boolean
	isHighlighted: boolean
}

function ReviewOptionButton(props: ReviewOptionButtonProps) {
	const isUserWrong = props.isUserAnswer && !props.isCorrect

	let marker: React.ReactNode = null
	if (props.isCorrect) {
		marker = (
			<span aria-label="correct answer" className="text-base leading-none" role="img">
				✅
			</span>
		)
	} else if (isUserWrong) {
		marker = (
			<span aria-label="your answer (incorrect)" className="text-base leading-none" role="img">
				❌
			</span>
		)
	}

	const radioBorderClass = props.isUserAnswer ? "border-orange-500" : "border-foreground/40"
	const dotClass = props.isUserAnswer ? "bg-orange-500 opacity-100" : "opacity-0"

	return (
		<div
			className={cn(
				"flex w-full items-center gap-3 rounded-md border px-4 py-2 text-left text-sm",
				"border-border bg-background text-foreground",
				props.isCorrect && "border-emerald-600 bg-emerald-50",
				isUserWrong && "border-rose-600 bg-rose-50",
				props.isHighlighted && "ring-1 ring-foreground/15"
			)}
			data-user-answer={props.isUserAnswer}
			data-correct={props.isCorrect}
		>
			<span
				aria-hidden="true"
				className={cn(
					"relative flex h-5 w-5 shrink-0 items-center justify-center rounded-full border",
					radioBorderClass
				)}
			>
				<span className={cn("h-2.5 w-2.5 rounded-full transition-opacity", dotClass)} />
			</span>
			<span
				className={cn(
					"flex-1",
					props.isCorrect && "text-emerald-700",
					props.isStruck && "text-foreground/60 line-through"
				)}
			>
				{props.text}
			</span>
			{marker}
		</div>
	)
}

interface StatusBadgeProps {
	status: ItemStatus
}

function StatusBadge(props: StatusBadgeProps) {
	let label = "Correct"
	let className =
		"rounded-sm bg-emerald-50 px-[8px] py-[2px] font-medium text-[11px] text-emerald-700 uppercase tracking-[0.06em]"
	if (props.status === "incorrect") {
		label = "Incorrect"
		className =
			"rounded-sm bg-rose-50 px-[8px] py-[2px] font-medium text-[11px] text-rose-700 uppercase tracking-[0.06em]"
	} else if (props.status === "skipped") {
		label = "Skipped"
		className =
			"rounded-sm border border-dashed border-text-3 px-[8px] py-[2px] font-medium text-[11px] text-text-2 uppercase tracking-[0.06em]"
	}
	return (
		<span aria-label={`Status: ${label}`} className={className} role="img">
			{label}
		</span>
	)
}

function formatLatencySeconds(latencyMs: number): string {
	const seconds = latencyMs / 1000
	return `${seconds.toFixed(1)}s`
}

interface QuestionCardProps {
	item: WrongItem
	index: number
	isFlashed: boolean
}

function QuestionCard(props: QuestionCardProps) {
	const parsed = parseItem(props.item)
	const [struck, setStruck] = React.useState<ReadonlyArray<string>>([])
	const [highlighted, setHighlighted] = React.useState<ReadonlyArray<string>>([])
	const status = statusFor(props.item)
	const subTypeMeta = SUB_TYPE_BY_ID.get(props.item.subTypeId)
	const subTypeDisplayName =
		subTypeMeta === undefined ? props.item.subTypeId : subTypeMeta.displayName
	const latencyDisplay = formatLatencySeconds(props.item.latencyMs)

	const flashClass = props.isFlashed ? "ring-2 ring-cobalt ring-offset-2 ring-offset-bg" : ""
	if (parsed === null) {
		return (
			<article
				className={cn(
					"overflow-hidden rounded-lg border border-border-soft bg-surface transition-shadow duration-300",
					flashClass
				)}
				data-attempt-id={props.item.attemptId}
				data-testid={`post-session-wrong-item-degraded-${props.item.attemptId}`}
			>
				<header className="flex flex-wrap items-center justify-between gap-3 border-border-soft border-b px-4 py-2">
					<div className="flex flex-wrap items-center gap-3">
						<span className="text-[11px] text-text-3 uppercase tracking-[0.06em]">
							Question {props.index}
						</span>
						<span className="text-[12px] text-text-2">{subTypeDisplayName}</span>
					</div>
					<StatusBadge status={status} />
				</header>
				<p className="px-4 py-4 text-[13px] text-text-3 italic">
					This item could not be displayed.
				</p>
			</article>
		)
	}

	const { body, options } = parsed
	const struckSet = new Set(struck)
	const highlightedSet = new Set(highlighted)

	let explanationNode: React.ReactNode = null
	if (props.item.structuredExplanation !== undefined) {
		explanationNode = (
			<StructuredExplanation
				raw={props.item.structuredExplanation}
				fallbackProse={props.item.explanation}
				onActiveStrikeChange={setStruck}
				onActiveHighlightChange={setHighlighted}
			/>
		)
	} else if (props.item.explanation !== undefined) {
		explanationNode = (
			<p className="text-[13px] text-text-2 leading-relaxed">{props.item.explanation}</p>
		)
	}

	return (
		<article
			className={cn(
				"overflow-hidden rounded-lg border border-border-soft bg-surface transition-shadow duration-300",
				flashClass
			)}
			data-attempt-id={props.item.attemptId}
			data-testid={`post-session-wrong-item-${props.item.attemptId}`}
			data-item-status={status}
		>
			<header className="flex flex-wrap items-center justify-between gap-3 border-border-soft border-b px-4 py-2">
				<div className="flex flex-wrap items-center gap-3">
					<span className="text-[11px] text-text-3 uppercase tracking-[0.06em]">
						Question {props.index}
					</span>
					<span className="text-[12px] text-text-2">{subTypeDisplayName}</span>
					<span className="text-[11px] text-text-3 capitalize">{props.item.difficulty}</span>
					<span className="font-mono text-[11px] text-text-3 tabular-nums">{latencyDisplay}</span>
				</div>
				<StatusBadge status={status} />
			</header>

			{/* Practice-formatted question body + options. The font + spacing
			    mirror the live FocusShell surface so the review reads as
			    the same artifact, minus the bars and Submit CTA. */}
			<div className={cn("flex flex-col gap-5 px-5 py-5", PRACTICE_FONT_CLASS)}>
				<div>{renderBody(body, props.item.subTypeId)}</div>
				<div className="flex flex-col gap-1.5">
					{options.map(function renderOption(option) {
						const isCorrect = option.id === props.item.correctAnswer
						const isUserAnswer =
							props.item.selectedAnswer !== undefined && option.id === props.item.selectedAnswer
						return (
							<ReviewOptionButton
								key={option.id}
								text={option.text}
								isUserAnswer={isUserAnswer}
								isCorrect={isCorrect}
								isStruck={struckSet.has(option.id)}
								isHighlighted={highlightedSet.has(option.id)}
							/>
						)
					})}
				</div>
			</div>

			{explanationNode !== null && (
				<div className="border-border-soft border-t bg-surface-2/40 px-5 py-4">
					{explanationNode}
				</div>
			)}
		</article>
	)
}

// ---------------- Filter + sort helpers ----------------

function matchesStatus(item: WrongItem, filter: StatusFilter): boolean {
	if (filter === "all") return true
	return statusFor(item) === filter
}

function matchesDifficulty(item: WrongItem, filter: DifficultyFilter): boolean {
	if (filter === "all") return true
	return item.difficulty === filter
}

function matchesSubType(item: WrongItem, filter: SubTypeFilter): boolean {
	if (filter === "all") return true
	if (filter === "section:numerical") {
		const meta = SUB_TYPE_BY_ID.get(item.subTypeId)
		return meta !== undefined && meta.section === "numerical"
	}
	if (filter === "section:verbal") {
		const meta = SUB_TYPE_BY_ID.get(item.subTypeId)
		return meta !== undefined && meta.section === "verbal"
	}
	return item.subTypeId === filter
}

function matchesTime(item: WrongItem, range: TimeRange): boolean {
	return item.latencyMs >= range.minMs && item.latencyMs <= range.maxMs
}

function compareByAttemptId(a: WrongItem, b: WrongItem): number {
	if (a.attemptId < b.attemptId) return -1
	if (a.attemptId > b.attemptId) return 1
	return 0
}

function compareItems(a: WrongItem, b: WrongItem, key: SortKey): number {
	if (key === "question") return compareByAttemptId(a, b)
	if (key === "latency") {
		const delta = a.latencyMs - b.latencyMs
		if (delta !== 0) return delta
		return compareByAttemptId(a, b)
	}
	if (key === "difficulty") {
		const delta = DIFFICULTY_RANK[a.difficulty] - DIFFICULTY_RANK[b.difficulty]
		if (delta !== 0) return delta
		return compareByAttemptId(a, b)
	}
	const aMeta = SUB_TYPE_BY_ID.get(a.subTypeId)
	const bMeta = SUB_TYPE_BY_ID.get(b.subTypeId)
	if (aMeta !== undefined && bMeta !== undefined) {
		const delta = compareBySubTypeDisplay(a, b)
		if (delta !== 0) return delta
	}
	return compareByAttemptId(a, b)
}

interface AppliedFilters {
	status: StatusFilter
	difficulty: DifficultyFilter
	time: TimeRange
	subType: SubTypeFilter
}

function filterItems(
	items: ReadonlyArray<WrongItem>,
	filters: AppliedFilters
): ReadonlyArray<WrongItem> {
	return items.filter(function matchesAll(item) {
		return (
			matchesStatus(item, filters.status) &&
			matchesDifficulty(item, filters.difficulty) &&
			matchesTime(item, filters.time) &&
			matchesSubType(item, filters.subType)
		)
	})
}

function sortItems(
	items: ReadonlyArray<WrongItem>,
	key: SortKey,
	direction: SortDirection
): WrongItem[] {
	const sorted = [...items].sort(function bySortKey(a, b) {
		return compareItems(a, b, key)
	})
	if (direction === "desc") sorted.reverse()
	return sorted
}

// ---------------- Toolbar ----------------

interface SelectOption<T extends string> {
	value: T
	label: string
}

const STATUS_OPTIONS: ReadonlyArray<SelectOption<StatusFilter>> = [
	{ value: "all", label: "All statuses" },
	{ value: "correct", label: "Correct" },
	{ value: "incorrect", label: "Incorrect" },
	{ value: "skipped", label: "Skipped" }
]

const DIFFICULTY_OPTIONS: ReadonlyArray<SelectOption<DifficultyFilter>> = [
	{ value: "all", label: "All difficulties" },
	{ value: "easy", label: "Easy" },
	{ value: "medium", label: "Medium" },
	{ value: "hard", label: "Hard" },
	{ value: "brutal", label: "Brutal" }
]

const SORT_OPTIONS: ReadonlyArray<SelectOption<SortKey>> = [
	{ value: "question", label: "Question order" },
	{ value: "subType", label: "Sub-type" },
	{ value: "latency", label: "Time taken" },
	{ value: "difficulty", label: "Difficulty" }
]

const DIRECTION_OPTIONS: ReadonlyArray<SelectOption<SortDirection>> = [
	{ value: "asc", label: "Ascending" },
	{ value: "desc", label: "Descending" }
]

const SELECT_TRIGGER_CLASS =
	"w-full rounded-lg border border-border-soft bg-surface px-3 py-[6px] font-medium text-[13px] text-text-1 transition-colors hover:bg-lavender focus-visible:outline focus-visible:outline-2 focus-visible:outline-cobalt focus-visible:outline-offset-1"

interface DropdownProps<T extends string> {
	legend: string
	options: ReadonlyArray<SelectOption<T>>
	value: T
	onChange: (next: T) => void
}

function Dropdown<T extends string>(props: DropdownProps<T>) {
	function onSelectChange(event: React.ChangeEvent<HTMLSelectElement>) {
		const next = event.target.value
		const match = props.options.find(function findOption(opt) {
			return opt.value === next
		})
		if (match === undefined) {
			logger.error({ next, legend: props.legend }, "Dropdown: unknown option value")
			return
		}
		props.onChange(match.value)
	}
	return (
		<fieldset className="flex min-w-[160px] flex-1 flex-col gap-1.5 border-0 p-0">
			<legend className="text-[11px] text-text-3 uppercase tracking-[0.06em]">
				{props.legend}
			</legend>
			<select
				aria-label={props.legend}
				className={SELECT_TRIGGER_CLASS}
				value={props.value}
				onChange={onSelectChange}
			>
				{props.options.map(function renderOption(opt) {
					return (
						<option key={opt.value} value={opt.value}>
							{opt.label}
						</option>
					)
				})}
			</select>
		</fieldset>
	)
}

interface SubTypeOption {
	value: SubTypeFilter
	label: string
}

interface SubTypeRow {
	id: SubTypeId
	displayName: string
}

// Indent the leaf labels with non-breaking spaces so the section
// parents (`Numerical`, `Verbal`) read as the level-1 headings and
// each sub-type underneath reads as a level-2 leaf. `<select>`
// option text doesn't render markup, so a leading whitespace prefix
// is the cheapest hierarchical signal that survives the platform's
// option rendering.
const LEAF_INDENT = "   "

function buildSubTypeOptions(items: ReadonlyArray<WrongItem>): ReadonlyArray<SubTypeOption> {
	const seen = new Set<SubTypeId>()
	const numerical: SubTypeRow[] = []
	const verbal: SubTypeRow[] = []
	for (const item of items) {
		if (seen.has(item.subTypeId)) continue
		const meta = SUB_TYPE_BY_ID.get(item.subTypeId)
		if (meta === undefined) continue
		seen.add(item.subTypeId)
		const row: SubTypeRow = { id: item.subTypeId, displayName: meta.displayName }
		if (meta.section === "numerical") {
			numerical.push(row)
		} else {
			verbal.push(row)
		}
	}
	numerical.sort(function byDisplayName(a, b) {
		return a.displayName.localeCompare(b.displayName)
	})
	verbal.sort(function byDisplayName(a, b) {
		return a.displayName.localeCompare(b.displayName)
	})

	const options: SubTypeOption[] = [{ value: "all", label: "All sub-types" }]
	if (numerical.length > 0) {
		options.push({ value: "section:numerical", label: "Numerical" })
		for (const row of numerical) {
			options.push({ value: row.id, label: `${LEAF_INDENT}${row.displayName}` })
		}
	}
	if (verbal.length > 0) {
		options.push({ value: "section:verbal", label: "Verbal" })
		for (const row of verbal) {
			options.push({ value: row.id, label: `${LEAF_INDENT}${row.displayName}` })
		}
	}
	return options
}

interface ReviewToolbarProps {
	items: ReadonlyArray<WrongItem>
	subTypeOptions: ReadonlyArray<SubTypeOption>
	dataMinMs: number
	dataMaxMs: number
	filters: AppliedFilters
	sortKey: SortKey
	direction: SortDirection
	onStatusChange: (next: StatusFilter) => void
	onDifficultyChange: (next: DifficultyFilter) => void
	onTimeChange: (next: TimeRange) => void
	onSubTypeChange: (next: SubTypeFilter) => void
	onSortKeyChange: (next: SortKey) => void
	onDirectionChange: (next: SortDirection) => void
}

function ReviewToolbar(props: ReviewToolbarProps) {
	const latencies = React.useMemo(
		function buildLatencies() {
			return props.items.map(function pickLatency(item) {
				return item.latencyMs
			})
		},
		[props.items]
	)
	return (
		<div
			className="flex flex-col gap-4 rounded-lg border border-border-soft bg-surface px-4 py-4"
			data-testid="post-session-review-toolbar"
			id="post-session-review-toolbar"
		>
			<div className="grid grid-cols-1 gap-x-4 gap-y-3 sm:grid-cols-2 lg:grid-cols-3">
				<Dropdown
					legend="Status"
					options={STATUS_OPTIONS}
					value={props.filters.status}
					onChange={props.onStatusChange}
				/>
				<Dropdown
					legend="Difficulty"
					options={DIFFICULTY_OPTIONS}
					value={props.filters.difficulty}
					onChange={props.onDifficultyChange}
				/>
				<Dropdown
					legend="Sub-type"
					options={props.subTypeOptions}
					value={props.filters.subType}
					onChange={props.onSubTypeChange}
				/>
			</div>
			<div className="border-border-soft border-t pt-4">
				<LatencyRangeSlider
					latenciesMs={latencies}
					dataMinMs={props.dataMinMs}
					dataMaxMs={props.dataMaxMs}
					value={props.filters.time}
					onChange={props.onTimeChange}
				/>
			</div>
			<div className="grid grid-cols-1 gap-x-4 gap-y-3 border-border-soft border-t pt-4 sm:grid-cols-2">
				<Dropdown
					legend="Sort by"
					options={SORT_OPTIONS}
					value={props.sortKey}
					onChange={props.onSortKeyChange}
				/>
				<Dropdown
					legend="Order"
					options={DIRECTION_OPTIONS}
					value={props.direction}
					onChange={props.onDirectionChange}
				/>
			</div>
		</div>
	)
}

// ---------------- Browser ----------------

interface DataLatencyBounds {
	minMs: number
	maxMs: number
}

function computeLatencyBounds(items: ReadonlyArray<WrongItem>): DataLatencyBounds {
	if (items.length === 0) {
		return { minMs: 0, maxMs: 60_000 }
	}
	let min = Number.POSITIVE_INFINITY
	let max = 0
	for (const item of items) {
		if (item.latencyMs < min) min = item.latencyMs
		if (item.latencyMs > max) max = item.latencyMs
	}
	const lower = Math.floor(min / 1000) * 1000
	const upper = Math.max(lower + 1000, Math.ceil(max / 1000) * 1000)
	return { minMs: lower, maxMs: upper }
}

function WrongItemsBrowser(props: WrongItemsBrowserProps) {
	const dataBounds = React.useMemo(
		function memoBounds() {
			return computeLatencyBounds(props.items)
		},
		[props.items]
	)

	let initialDifficultyValue: DifficultyFilter = "all"
	if (props.initialDifficultyFilter !== undefined) {
		initialDifficultyValue = props.initialDifficultyFilter
	}
	let initialSubTypeValue: SubTypeFilter = "all"
	if (props.initialSubTypeFilter !== undefined) {
		initialSubTypeValue = props.initialSubTypeFilter
	}
	let initialStatusValue: StatusFilter = "all"
	if (props.initialStatusFilter !== undefined) {
		initialStatusValue = props.initialStatusFilter
	}

	const [statusFilter, setStatusFilter] = React.useState<StatusFilter>(initialStatusValue)
	const [difficultyFilter, setDifficultyFilter] =
		React.useState<DifficultyFilter>(initialDifficultyValue)
	const [subTypeFilter, setSubTypeFilter] = React.useState<SubTypeFilter>(initialSubTypeValue)
	const [sortKey, setSortKey] = React.useState<SortKey>("question")
	const [direction, setDirection] = React.useState<SortDirection>("asc")
	const [timeRange, setTimeRange] = React.useState<TimeRange>(function initRange() {
		return { minMs: dataBounds.minMs, maxMs: dataBounds.maxMs }
	})

	// If the source items change (different session), reset the range to
	// the new dataset's bounds instead of holding stale numbers.
	const lastBoundsRef = React.useRef(dataBounds)
	React.useEffect(
		function syncRangeToBounds() {
			const prev = lastBoundsRef.current
			if (prev.minMs === dataBounds.minMs && prev.maxMs === dataBounds.maxMs) return
			lastBoundsRef.current = dataBounds
			setTimeRange({ minMs: dataBounds.minMs, maxMs: dataBounds.maxMs })
		},
		[dataBounds]
	)

	const filters = React.useMemo<AppliedFilters>(
		function buildFilters() {
			return {
				status: statusFilter,
				difficulty: difficultyFilter,
				time: timeRange,
				subType: subTypeFilter
			}
		},
		[statusFilter, difficultyFilter, timeRange, subTypeFilter]
	)

	const subTypeOptions = React.useMemo(
		function buildOptions() {
			return buildSubTypeOptions(props.items)
		},
		[props.items]
	)

	const indexByAttemptId = React.useMemo(
		function buildIndex() {
			const map = new Map<string, number>()
			props.items.forEach(function indexItem(item, idx) {
				map.set(item.attemptId, idx + 1)
			})
			return map
		},
		[props.items]
	)

	const visibleItems = React.useMemo(
		function buildVisible() {
			const filtered = filterItems(props.items, filters)
			return sortItems(filtered, sortKey, direction)
		},
		[props.items, filters, sortKey, direction]
	)

	const [flashAttemptId, setFlashAttemptId] = React.useState<string | undefined>(undefined)

	const onScrollHandled = props.onScrollHandled
	const scrollRequest = props.scrollRequest
	React.useEffect(
		function handleScrollRequest() {
			if (scrollRequest === undefined) return
			// Reset filters/sort so the requested attempt is visible.
			setStatusFilter("all")
			setDifficultyFilter("all")
			setSubTypeFilter("all")
			setSortKey("question")
			setDirection("asc")
			setTimeRange({ minMs: dataBounds.minMs, maxMs: dataBounds.maxMs })
			setFlashAttemptId(scrollRequest.attemptId)

			const targetAttemptId = scrollRequest.attemptId
			const raf = requestAnimationFrame(function scrollNow() {
				const el = document.querySelector(`[data-attempt-id="${targetAttemptId}"]`)
				if (el === null) {
					logger.warn({ attemptId: targetAttemptId }, "WrongItemsBrowser: scroll target not found")
					return
				}
				el.scrollIntoView({ behavior: "smooth", block: "start" })
			})

			const flashTimer = setTimeout(function clearFlash() {
				setFlashAttemptId(undefined)
			}, 1800)

			if (onScrollHandled !== undefined) onScrollHandled()

			return function cleanup() {
				cancelAnimationFrame(raf)
				clearTimeout(flashTimer)
			}
		},
		[scrollRequest, dataBounds, onScrollHandled]
	)

	const sourceIsEmpty = props.items.length === 0
	const filteredIsEmpty = !sourceIsEmpty && visibleItems.length === 0

	return (
		<section
			aria-labelledby="post-session-wrong-items-heading"
			className="mx-auto w-full max-w-3xl space-y-5"
			data-testid="post-session-wrong-items-browser-section"
		>
			<h2 id="post-session-wrong-items-heading" className="sr-only">
				Question review
			</h2>

			{!sourceIsEmpty && props.toolbarOpen && (
				<ReviewToolbar
					items={props.items}
					subTypeOptions={subTypeOptions}
					dataMinMs={dataBounds.minMs}
					dataMaxMs={dataBounds.maxMs}
					filters={filters}
					sortKey={sortKey}
					direction={direction}
					onStatusChange={setStatusFilter}
					onDifficultyChange={setDifficultyFilter}
					onTimeChange={setTimeRange}
					onSubTypeChange={setSubTypeFilter}
					onSortKeyChange={setSortKey}
					onDirectionChange={setDirection}
				/>
			)}

			{sourceIsEmpty && (
				<p
					className="rounded-lg border border-border-soft bg-surface px-4 py-4 text-[13px] text-text-3"
					data-testid="post-session-wrong-items-empty"
				>
					No questions in this session.
				</p>
			)}

			{filteredIsEmpty && (
				<p
					className="rounded-lg border border-border-soft bg-surface px-4 py-4 text-[13px] text-text-3"
					data-testid="post-session-wrong-items-filtered-empty"
				>
					No questions match the current filters.
				</p>
			)}

			{!sourceIsEmpty && !filteredIsEmpty && (
				<div className="space-y-4">
					{visibleItems.map(function renderItem(item) {
						const index = indexByAttemptId.get(item.attemptId)
						if (index === undefined) {
							logger.error(
								{ attemptId: item.attemptId },
								"WrongItemsBrowser: missing index for attempt"
							)
							return null
						}
						const isFlashed = item.attemptId === flashAttemptId
						return (
							<QuestionCard key={item.attemptId} item={item} index={index} isFlashed={isFlashed} />
						)
					})}
				</div>
			)}
		</section>
	)
}

export type { WrongItemsBrowserProps }
export {
	buildSubTypeOptions,
	compareItems,
	filterItems,
	QuestionCard,
	ReviewOptionButton,
	sortItems,
	WrongItemsBrowser
}
