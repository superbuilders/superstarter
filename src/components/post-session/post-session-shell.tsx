"use client"

// <PostSessionShell> — tabbed review surface for practice tests + drills.
//
// Three tabs at the top of the page:
//   1. Performance by sub-type   → <PerformanceSummary>
//   2. Question review           → <WrongItemsBrowser> (practice-style
//                                  question + option formatting)
//   3. Strategies to review      → <StrategySurface>
//
// Page chrome mirrors the dashboard / /review listing (max-w-[1100px],
// bg-surface cards, font-serif headings, dashboard tokens). The
// authenticated <TopNav> is rendered by the page above the shell.

import { ChevronDownIcon, SlidersHorizontalIcon } from "lucide-react"
import { useRouter } from "next/navigation"
import * as React from "react"
import type {
	EndSessionTierForRender,
	PerSubTypePerformance,
	SurfacedStrategy,
	WrongItem
} from "@/app/(diagnostic-flow)/post-session/[sessionId]/page"
import { BeltIndicator } from "@/components/post-session/belt-indicator"
import { CumulativeTimeChart } from "@/components/post-session/charts/cumulative-time-chart"
import { TimeSinkChart } from "@/components/post-session/charts/time-sink-chart"
import { TopicProficiencyRadar } from "@/components/post-session/charts/topic-proficiency-radar"
import { OnboardingTargets } from "@/components/post-session/onboarding-targets"
import { PerformanceSummary } from "@/components/post-session/performance-summary"
import { ResultSoundFx } from "@/components/post-session/result-sound-fx"
import { StrategySurface } from "@/components/post-session/strategy-surface"
import { WrongItemsBrowser } from "@/components/post-session/wrong-items-browser"
import { Button } from "@/components/ui/button"
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

function PostSessionShell(props: PostSessionShellProps) {
	const [activeTab, setActiveTab] = React.useState<ReviewTab>("performance")
	const [filtersOpen, setFiltersOpen] = React.useState<boolean>(false)
	const isDiagnostic = props.sessionType === "diagnostic"
	const heading = headingFor(props.sessionType)
	function toggleFilters() {
		setFiltersOpen(function flip(prev) {
			return !prev
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

	let trailingSection: React.ReactNode
	if (isDiagnostic) {
		trailingSection = (
			<div className="mx-auto w-full max-w-md">
				<OnboardingTargets />
			</div>
		)
	} else {
		trailingSection = <ContinueButton />
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

	let panel: React.ReactNode = null
	if (activeTab === "performance") {
		const attemptPoints = props.wrongItems.map(function pickPoint(w) {
			return { attemptId: w.attemptId, latencyMs: w.latencyMs }
		})
		panel = (
			<div className="space-y-4" data-testid="post-session-slot-performance-summary">
				<ChartCard
					title="Time sink"
					eyebrow="Per-question time vs the 18s goal"
					testId="post-session-chart-time-sink"
				>
					<TimeSinkChart attempts={attemptPoints} />
				</ChartCard>
				<ChartCard
					title="Topic proficiency"
					eyebrow="Accuracy × speed by sub-type"
					testId="post-session-chart-topic-radar"
				>
					<TopicProficiencyRadar rows={props.performance} />
				</ChartCard>
				<ChartCard
					title="Cumulative time vs the budget"
					eyebrow="Where you fell behind the 15-minute pace"
					testId="post-session-chart-cumulative"
				>
					<CumulativeTimeChart attempts={attemptPoints} />
				</ChartCard>
				<section
					className="overflow-hidden rounded-lg border border-border-soft bg-surface"
					data-testid="post-session-card-accuracy-latency"
				>
					<header className="flex items-baseline justify-between border-border-soft border-b px-4 pt-2 pb-1">
						<h3 className="font-medium font-serif text-[15px] text-text-1 tracking-[-0.005em]">
							Accuracy and median latency
						</h3>
						<span className="text-[11px] text-text-3 uppercase tracking-[0.06em]">
							Per sub-type
						</span>
					</header>
					<div className="px-4 py-3">
						<PerformanceSummary rows={props.performance} />
					</div>
				</section>
			</div>
		)
	} else if (activeTab === "questions") {
		panel = (
			<div data-testid="post-session-slot-wrong-items">
				<WrongItemsBrowser items={props.wrongItems} toolbarOpen={filtersOpen} />
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

			<div className="mt-8 flex flex-col gap-4">
				{trailingSection}
				{pacingLine}
			</div>
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
				<span className="text-[11px] text-text-3 uppercase tracking-[0.06em]">
					{props.eyebrow}
				</span>
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

function ContinueButton() {
	const router = useRouter()
	return (
		<div className="flex justify-end">
			<Button
				onClick={function onContinue() {
					router.push("/")
				}}
				data-testid="post-session-continue"
			>
				Continue to dashboard
			</Button>
		</div>
	)
}

export type { SessionTypeForShell }
export { PostSessionShell }
