import { ChevronRightIcon } from "lucide-react"
import { subTypes } from "@/config/sub-types"
import { formatRelativePast } from "@/lib/relative-time"
import type { ExperimentalReviewSession } from "@/server/experimental/review-data"

const SUB_TYPE_NAMES: ReadonlyMap<string, string> = new Map(
	subTypes.map(function toEntry(s) {
		return [s.id, s.displayName]
	})
)

interface ExperimentalReviewHistoryProps {
	sessions: ReadonlyArray<ExperimentalReviewSession>
}

interface HistorySection {
	title: string
	emptyText: string
	sessions: ReadonlyArray<ExperimentalReviewSession>
}

function pluralizeSessions(count: number): string {
	return `${count} session${count === 1 ? "" : "s"}`
}

function primaryLabelFor(session: ExperimentalReviewSession): string {
	if (session.type === "drill") {
		if (session.subTypeId === undefined) return "Drill"
		const subTypeName = SUB_TYPE_NAMES.get(session.subTypeId)
		if (subTypeName === undefined) return session.subTypeId
		return subTypeName
	}
	if (session.type === "review") return "Experimental review"
	return "Practice test"
}

function tagLabelFor(type: ExperimentalReviewSession["type"]): string {
	if (type === "drill") return "Drill"
	if (type === "review") return "Review"
	return "Test"
}

function ReviewHistoryRow(props: {
	session: ExperimentalReviewSession
	nowMs: number
}) {
	const relativeTime = formatRelativePast(props.session.endedAtMs, props.nowMs)
	const scoreLabel = `${props.session.correctAttempts}/${props.session.targetQuestionCount}`
	const skippedNote =
		props.session.skippedAttempts > 0 ? (
			<span className="whitespace-nowrap text-[12px] text-text-3 tabular-nums">
				{props.session.skippedAttempts} skipped
			</span>
		) : (
			<span aria-hidden="true" />
		)
	return (
		<a
			href={`/experimental/review/${props.session.id}`}
			className="grid grid-cols-[60px_1fr_auto_auto_auto_16px] items-center gap-[10px] border-border-soft border-b px-4 py-[8px] text-sm transition-colors duration-150 ease-out last:border-b-0 hover:bg-lavender focus-visible:outline focus-visible:outline-2 focus-visible:outline-cobalt focus-visible:-outline-offset-2"
		>
			<span className="inline-flex items-center justify-center rounded-sm border border-border-soft bg-surface-2 px-[6px] py-[2px] font-medium text-[10px] text-text-2 uppercase tracking-[0.06em]">
				{tagLabelFor(props.session.type)}
			</span>
			<span className="flex min-w-0 items-center gap-[6px] font-medium text-text-1">
				<span className="truncate">{primaryLabelFor(props.session)}</span>
			</span>
			<span className="whitespace-nowrap text-[12px] text-text-3 tabular-nums">{relativeTime}</span>
			{skippedNote}
			<span className="whitespace-nowrap text-[13px] text-text-1 tabular-nums">{scoreLabel}</span>
			<ChevronRightIcon aria-hidden="true" className="h-[14px] w-[14px] text-text-3" />
		</a>
	)
}

function ReviewHistoryCard(props: {
	title: string
	sessions: ReadonlyArray<ExperimentalReviewSession>
	emptyText: string
	nowMs: number
}) {
	return (
		<section className="overflow-hidden rounded-lg border border-border-soft bg-surface">
			<header className="flex items-baseline justify-between border-border-soft border-b px-4 pt-2 pb-1">
				<h3 className="font-medium font-serif text-[15px] text-text-1 tracking-[-0.005em]">{props.title}</h3>
				<span className="text-[11px] text-text-3 uppercase tracking-[0.06em]">{pluralizeSessions(props.sessions.length)}</span>
			</header>
			{props.sessions.length === 0 ? (
				<p className="px-4 py-4 text-[13px] text-text-3">{props.emptyText}</p>
			) : (
				<ul>
					{props.sessions.map(function renderSession(session) {
						return (
							<li key={session.id}>
								<ReviewHistoryRow session={session} nowMs={props.nowMs} />
							</li>
						)
					})}
				</ul>
			)}
		</section>
	)
}

function ExperimentalReviewHistory(props: ExperimentalReviewHistoryProps) {
	const nowMs = Date.now()
	const sections: HistorySection[] = [
		{
			title: "Practice tests",
			emptyText: "No experimental practice tests yet.",
			sessions: props.sessions.filter(function isPracticeTest(session) {
				return session.type === "practice_test"
			})
		},
		{
			title: "Drills",
			emptyText: "No experimental drills yet.",
			sessions: props.sessions.filter(function isDrill(session) {
				return session.type === "drill"
			})
		}
	]
	const reviewSessions = props.sessions.filter(function isReviewSession(session) {
		return session.type === "review"
	})
	if (reviewSessions.length > 0) {
		sections.push({
			title: "Review sessions",
			emptyText: "No experimental review sessions yet.",
			sessions: reviewSessions
		})
	}
	return (
		<div className="grid grid-cols-1 gap-3 md:grid-cols-2">
			{sections.map(function renderSection(section) {
				return (
					<ReviewHistoryCard
						key={section.title}
						title={section.title}
						sessions={section.sessions}
						emptyText={section.emptyText}
						nowMs={nowMs}
					/>
				)
			})}
		</div>
	)
}

export { ExperimentalReviewHistory }
