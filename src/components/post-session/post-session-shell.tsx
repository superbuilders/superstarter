"use client"

// <PostSessionShell> — tabbed review surface for practice tests + drills.
//
// Three tabs at the top of the page:
//   1. Performance by sub-type   → Pacing card (Time sink + Cumulative)
//                                  + per-section topic-proficiency radars
//   2. Question review           → <WrongItemsBrowser> (practice-style
//                                  question + option formatting)
//   3. Strategies to review      → <StrategySurface>
//
// Page chrome mirrors the dashboard / /review listing (max-w-[1100px],
// bg-surface cards, font-serif headings, dashboard tokens). The
// authenticated <TopNav> is rendered by the page above the shell.

import { ChevronDownIcon, SlidersHorizontalIcon } from "lucide-react"
import { useSearchParams } from "next/navigation"
import * as React from "react"
import type {
	EndSessionTierForRender,
	ItemDifficulty,
	PerSubTypePerformance,
	SurfacedStrategy,
	WrongItem
} from "@/app/(diagnostic-flow)/post-session/[sessionId]/page"
import { BeltIndicator } from "@/components/post-session/belt-indicator"
import { CumulativeTimeChart } from "@/components/post-session/charts/cumulative-time-chart"
import { TimeSinkChart } from "@/components/post-session/charts/time-sink-chart"
import {
	computeOuterRingValue,
	TopicProficiencyRadar
} from "@/components/post-session/charts/topic-proficiency-radar"
import { OnboardingTargets } from "@/components/post-session/onboarding-targets"
import { ResultSoundFx } from "@/components/post-session/result-sound-fx"
import { ScrollToTopButton } from "@/components/post-session/scroll-to-top-button"
import { StrategySurface } from "@/components/post-session/strategy-surface"
import { WrongItemsBrowser } from "@/components/post-session/wrong-items-browser"
import { type SubTypeId, subTypeIds } from "@/config/sub-types"
import { cn } from "@/lib/utils"

type SessionTypeForShell = "diagnostic" | "drill" | "full_length" | "simulation"

type ReviewTab = "performance" | "questions" | "strategies"

interface PostSessionShellProps {
	sessionType: SessionTypeForShell
	pacingMinutes?: number
	performance: PerSubTypePerformance[]
	wrongItems: WrongItem[]
	surfacedStrategies: SurfacedStrategy[]
	endSessionTier: EndSessionTierForRender | null
}

interface TabDef {
	key: ReviewTab
	label: string
}

const TABS: ReadonlyArray<TabDef> = [
	{ key: "performance", label: "Performance by sub-type" },
	{ key: "questions", label: "Question review" },
	{ key: "strategies", label: "Strategies to review" }
]

const ACTIVE_TAB_CLASS =
	"rounded-md bg-surface-2 px-[12px] py-[8px] font-medium text-[13px] text-text-1"
const INACTIVE_TAB_CLASS =
	"rounded-md px-[12px] py-[8px] text-[13px] text-text-2 transition-colors hover:bg-lavender"

function sumCorrectAttempts(sum: number, row: PerSubTypePerformance): number {
	return sum + row.correct
}

function headingFor(sessionType: SessionTypeForShell): string {
	if (sessionType === "diagnostic") return "Diagnostic complete"
	if (sessionType === "drill") return "Drill review"
	return "Practice test review"
}

interface ScrollRequest {
	readonly nonce: number
	readonly attemptId: string
}

const DIFFICULTY_VALUES: ReadonlyArray<ItemDifficulty> = ["easy", "medium", "hard", "brutal"]

function isSubTypeIdValue(value: string): value is SubTypeId {
	for (const id of subTypeIds) {
		if (id === value) return true
	}
	return false
}

function isDifficultyValue(value: string): value is ItemDifficulty {
	for (const d of DIFFICULTY_VALUES) {
		if (d === value) return true
	}
	return false
}

type InitialStatusFilter = "correct" | "incorrect" | "skipped"

const STATUS_VALUES: ReadonlyArray<InitialStatusFilter> = ["correct", "incorrect", "skipped"]

function isStatusValue(value: string): value is InitialStatusFilter {
	for (const s of STATUS_VALUES) {
		if (s === value) return true
	}
	return false
}

interface InitialFilterFromUrl {
	subTypeId: SubTypeId | undefined
	difficulty: ItemDifficulty | undefined
	status: InitialStatusFilter | undefined
}

function readFilterFromParams(params: URLSearchParams): InitialFilterFromUrl {
	const subRaw = params.get("subType")
	const diffRaw = params.get("difficulty")
	const statusRaw = params.get("status")
	const subTypeId = subRaw !== null && isSubTypeIdValue(subRaw) ? subRaw : undefined
	const difficulty = diffRaw !== null && isDifficultyValue(diffRaw) ? diffRaw : undefined
	const status = statusRaw !== null && isStatusValue(statusRaw) ? statusRaw : undefined
	return { subTypeId, difficulty, status }
}

function buildPacingKeysFromFilter(
	filter: InitialFilterFromUrl,
	wrongItems: ReadonlyArray<WrongItem>
): ReadonlySet<string> {
	if (filter.subTypeId === undefined && filter.difficulty === undefined) {
		return new Set<string>()
	}
	const out = new Set<string>()
	for (const item of wrongItems) {
		if (filter.subTypeId !== undefined && item.subTypeId !== filter.subTypeId) continue
		if (filter.difficulty !== undefined && item.difficulty !== filter.difficulty) continue
		out.add(`${item.subTypeId}|${item.difficulty}`)
	}
	return out
}

function useUrlFilterDefaults(): {
	initialFilter: InitialFilterFromUrl
	initialActiveTab: ReviewTab
} {
	const searchParams = useSearchParams()
	const initialFilter = React.useMemo(
		function memoInitialFilter() {
			return readFilterFromParams(new URLSearchParams(searchParams.toString()))
		},
		[searchParams]
	)
	let initialActiveTab: ReviewTab = "performance"
	if (
		initialFilter.subTypeId !== undefined ||
		initialFilter.difficulty !== undefined ||
		initialFilter.status !== undefined
	) {
		initialActiveTab = "questions"
	}
	return { initialFilter, initialActiveTab }
}

function PostSessionShell(props: PostSessionShellProps) {
	const { initialFilter, initialActiveTab } = useUrlFilterDefaults()
	const [activeTab, setActiveTab] = React.useState<ReviewTab>(initialActiveTab)
	const [filtersOpen, setFiltersOpen] = React.useState<boolean>(false)
	const [scrollRequest, setScrollRequest] = React.useState<ScrollRequest | undefined>(undefined)
	const [pacingSelectedKeys, setPacingSelectedKeys] = React.useState<ReadonlySet<string>>(
		function initPacingSelection() {
			return buildPacingKeysFromFilter(initialFilter, props.wrongItems)
		}
	)
	const isDiagnostic = props.sessionType === "diagnostic"
	const heading = headingFor(props.sessionType)
	function toggleFilters() {
		setFiltersOpen(function flip(prev) {
			return !prev
		})
	}
	function handleAttemptClick(attemptId: string) {
		setActiveTab("questions")
		setScrollRequest(function next(prev) {
			const nonce = prev === undefined ? 1 : prev.nonce + 1
			return { nonce, attemptId }
		})
	}

	let subhead: React.ReactNode = null
	if (isDiagnostic) {
		subhead = (
			<p className="max-w-[60ch] text-sm text-text-2">
				Tell us what you're aiming for so we can pace your practice.
			</p>
		)
	}

	let pacingLine: React.ReactNode = null
	if (isDiagnostic && props.pacingMinutes !== undefined) {
		pacingLine = (
			<p className="text-sm text-text-2" data-testid="post-session-pacing-line">
				Your diagnostic took {props.pacingMinutes} minutes. The real CCAT is 15 minutes for 50
				questions.
			</p>
		)
	}

	let trailingSection: React.ReactNode = null
	if (isDiagnostic) {
		trailingSection = (
			<div className="mx-auto w-full max-w-md">
				<OnboardingTargets />
			</div>
		)
	}

	let beltSection: React.ReactNode = null
	if (props.sessionType === "drill" && props.endSessionTier !== null) {
		beltSection = (
			<BeltIndicator
				tier={props.endSessionTier.tier}
				subTypeDisplayName={props.endSessionTier.subTypeDisplayName}
				isPreFloor={props.endSessionTier.isPreFloor}
			/>
		)
	}

	let resultSoundFx: React.ReactNode = null
	if (props.sessionType === "full_length" || props.sessionType === "simulation") {
		const totalCorrect = props.performance.reduce(sumCorrectAttempts, 0)
		resultSoundFx = <ResultSoundFx score={totalCorrect} />
	}

	let filtersToggleNode: React.ReactNode = null
	if (activeTab === "questions") {
		filtersToggleNode = <FilterToggle open={filtersOpen} onToggle={toggleFilters} />
	}

	let bottomBlock: React.ReactNode = null
	if (trailingSection !== null || pacingLine !== null) {
		bottomBlock = (
			<div className="mt-8 flex flex-col gap-4">
				{trailingSection}
				{pacingLine}
			</div>
		)
	}

	let panel: React.ReactNode = null
	if (activeTab === "performance") {
		const attemptPoints = props.wrongItems.map(function pickPoint(w) {
			return {
				attemptId: w.attemptId,
				latencyMs: w.latencyMs,
				correct: w.correct,
				subTypeId: w.subTypeId,
				difficulty: w.difficulty
			}
		})
		// Shared scale across both radars so Verbal and Numerical are
		// visually comparable. Computed once, passed to both instances.
		const radarOuterRing = computeOuterRingValue(props.performance)
		panel = (
			<div className="space-y-4" data-testid="post-session-slot-performance-summary">
				<ChartCard
					title="Pacing"
					eyebrow="Per-question time and cumulative trajectory vs the 18s budget"
					testId="post-session-chart-pacing"
				>
					<div className="space-y-5">
						<TimeSinkChart
							attempts={attemptPoints}
							selectedKeys={pacingSelectedKeys}
							onSelectedKeysChange={setPacingSelectedKeys}
							onAttemptClick={handleAttemptClick}
						/>
						<div className="space-y-2 border-border-soft border-t pt-4">
							<span className="block text-[11px] text-text-3 uppercase tracking-[0.06em]">
								Cumulative time vs the budget
							</span>
							<CumulativeTimeChart
								attempts={attemptPoints}
								selectedKeys={pacingSelectedKeys}
								onAttemptClick={handleAttemptClick}
							/>
						</div>
					</div>
				</ChartCard>
				<div className="grid grid-cols-1 gap-4 md:grid-cols-2">
					<ChartCard
						title="Verbal proficiency"
						eyebrow="Target: 80% at 18s/question"
						testId="post-session-chart-radar-verbal"
					>
						<TopicProficiencyRadar
							rows={props.performance}
							section="verbal"
							outerRingValue={radarOuterRing}
						/>
					</ChartCard>
					<ChartCard
						title="Numerical proficiency"
						eyebrow="Target: 80% at 18s/question"
						testId="post-session-chart-radar-numerical"
					>
						<TopicProficiencyRadar
							rows={props.performance}
							section="numerical"
							outerRingValue={radarOuterRing}
						/>
					</ChartCard>
				</div>
			</div>
		)
	} else if (activeTab === "questions") {
		panel = (
			<div data-testid="post-session-slot-wrong-items">
				<WrongItemsBrowser
					items={props.wrongItems}
					toolbarOpen={filtersOpen}
					scrollRequest={scrollRequest}
					initialSubTypeFilter={initialFilter.subTypeId}
					initialDifficultyFilter={initialFilter.difficulty}
					initialStatusFilter={initialFilter.status}
					onScrollHandled={function clearScrollRequest() {
						setScrollRequest(undefined)
					}}
				/>
			</div>
		)
	} else {
		panel = (
			<section
				className="overflow-hidden rounded-lg border border-border-soft bg-surface"
				data-testid="post-session-slot-strategy-surface"
			>
				<header className="flex items-baseline justify-between border-border-soft border-b px-4 pt-2 pb-1">
					<h3 className="font-medium font-serif text-[15px] text-text-1 tracking-[-0.005em]">
						Strategies to review
					</h3>
					<span className="text-[11px] text-text-3 uppercase tracking-[0.06em]">
						Surfaced for struggled sub-types
					</span>
				</header>
				<div className="px-4 py-3">
					<StrategySurface strategies={props.surfacedStrategies} />
				</div>
			</section>
		)
	}

	return (
		<main className="mx-auto max-w-[1100px] px-7 pb-10" data-testid="post-session-heading">
			{resultSoundFx}
			<header className="mb-3 flex flex-col gap-2 border-border-soft border-b pb-3">
				<h2 className="font-medium font-serif text-[22px] text-text-1 leading-[1.15] tracking-[-0.015em]">
					{heading}
				</h2>
				{subhead}
				{beltSection}
			</header>

			<TabNav activeTab={activeTab} onSelect={setActiveTab} filtersToggle={filtersToggleNode} />

			<div className="mt-4">{panel}</div>

			{bottomBlock}
			<ScrollToTopButton />
		</main>
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
				<h3 className="font-medium font-serif text-[15px] text-text-1 tracking-[-0.005em]">
					{props.title}
				</h3>
				<span className="text-[11px] text-text-3 uppercase tracking-[0.06em]">{props.eyebrow}</span>
			</header>
			<div className="px-4 py-3">{props.children}</div>
		</section>
	)
}

interface TabNavProps {
	activeTab: ReviewTab
	onSelect: (tab: ReviewTab) => void
	filtersToggle: React.ReactNode
}

function TabNav(props: TabNavProps) {
	return (
		<div className="flex flex-wrap items-center justify-between gap-3">
			<div
				aria-label="Review sections"
				className="flex flex-wrap gap-[2px]"
				data-testid="post-session-tab-nav"
				role="tablist"
			>
				{TABS.map(function renderTab(tab) {
					const isActive = tab.key === props.activeTab
					const className = isActive ? ACTIVE_TAB_CLASS : INACTIVE_TAB_CLASS
					return (
						<button
							key={tab.key}
							type="button"
							role="tab"
							aria-selected={isActive}
							className={className}
							data-testid={`post-session-tab-${tab.key}`}
							onClick={function selectThis() {
								props.onSelect(tab.key)
							}}
						>
							{tab.label}
						</button>
					)
				})}
			</div>
			{props.filtersToggle}
		</div>
	)
}

interface FilterToggleProps {
	open: boolean
	onToggle: () => void
}

function FilterToggle(props: FilterToggleProps) {
	const stateClass = props.open
		? "bg-cobalt text-white hover:bg-cobalt"
		: "border border-border-soft bg-surface text-text-2 hover:bg-lavender hover:text-text-1"
	const chevronClass = props.open ? "rotate-180" : ""
	return (
		<button
			type="button"
			aria-expanded={props.open}
			aria-controls="post-session-review-toolbar"
			data-testid="post-session-filters-toggle"
			onClick={props.onToggle}
			className={cn(
				"inline-flex items-center gap-2 rounded-md px-3 py-[6px] font-medium text-[13px] transition-colors duration-150 ease-out focus-visible:outline focus-visible:outline-2 focus-visible:outline-cobalt focus-visible:outline-offset-1",
				stateClass
			)}
		>
			<SlidersHorizontalIcon aria-hidden="true" className="h-[14px] w-[14px]" />
			<span>Filters &amp; sort</span>
			<ChevronDownIcon
				aria-hidden="true"
				className={cn("h-[14px] w-[14px] transition-transform duration-150 ease-out", chevronClass)}
			/>
		</button>
	)
}

export type { SessionTypeForShell }
export { PostSessionShell }
