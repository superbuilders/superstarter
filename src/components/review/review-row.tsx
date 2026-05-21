// <ReviewRow> — one past-session row in a <ReviewCard>. Mirrors
// <BeltRow>'s grid + hover + focus shape so /review reads as the
// same visual family as the dashboard's dojo cards.
//
// Renders a 5-column grid:
//   1. Type tag (DRILL / TEST), 60px
//   2. Primary label + optional Abandoned badge (truncates)
//   3. Relative-time of session end (e.g. "3 days ago")
//   4. Score (correct / target), tabular nums
//   5. Chevron
//
// The whole row is a plain <a> (NOT <Link>) — the href is dynamic
// (`/post-session/${id}`) and the project's typedRoutes config
// requires <Link> hrefs to be Route literals. Same trade-off as
// <BeltRow>: loss of soft-nav prefetch, gained type-safety + rule-
// compliance.

import { ChevronRightIcon } from "lucide-react"
import { subTypes } from "@/config/sub-types"
import { formatRelativePast } from "@/lib/relative-time"
import type { ReviewSession } from "@/server/review/data"

const SUB_TYPE_NAMES: ReadonlyMap<string, string> = new Map(
	subTypes.map(function toEntry(s) {
		return [s.id, s.displayName]
	})
)

interface ReviewRowProps {
	session: ReviewSession
	nowMs: number
}

function tagLabelFor(type: ReviewSession["type"]): string {
	if (type === "drill") return "Drill"
	return "Test"
}

function primaryLabelFor(session: ReviewSession, subTypeName: string | undefined): string {
	if (session.type === "drill") {
		if (subTypeName === undefined) return "Drill"
		return subTypeName
	}
	return "Practice test"
}

function ReviewRow({ session, nowMs }: ReviewRowProps) {
	const subTypeName =
		session.subTypeId === undefined ? undefined : SUB_TYPE_NAMES.get(session.subTypeId)
	const tagLabel = tagLabelFor(session.type)
	const primaryLabel = primaryLabelFor(session, subTypeName)
	const relativeTime = formatRelativePast(session.endedAtMs, nowMs)
	const scoreLabel = `${session.correctAttempts}/${session.targetQuestionCount}`
	const isAbandoned = session.completionReason === "abandoned"
	const statusBadge = isAbandoned ? (
		<span className="rounded-sm bg-lavender px-[6px] py-[1px] font-medium text-[10px] text-indigo uppercase tracking-[0.06em]">
			Abandoned
		</span>
	) : null
	// Empty <span> placeholder keeps the 6-column grid stable when the
	// session had no skipped attempts; CSS grid auto-place would
	// otherwise shift the chevron one track to the left.
	const skippedNote =
		session.skippedAttempts > 0 ? (
			<span className="whitespace-nowrap text-[12px] text-text-3 tabular-nums">
				{session.skippedAttempts} skipped
			</span>
		) : (
			<span aria-hidden="true" />
		)
	return (
		<a
			href={`/post-session/${session.id}`}
			className="grid grid-cols-[60px_1fr_auto_auto_auto_16px] items-center gap-[10px] border-border-soft border-b px-4 py-[8px] text-sm transition-colors duration-150 ease-out last:border-b-0 hover:bg-lavender focus-visible:outline focus-visible:outline-2 focus-visible:outline-cobalt focus-visible:-outline-offset-2"
		>
			<span className="inline-flex items-center justify-center rounded-sm border border-border-soft bg-surface-2 px-[6px] py-[2px] font-medium text-[10px] text-text-2 uppercase tracking-[0.06em]">
				{tagLabel}
			</span>
			<span className="flex min-w-0 items-center gap-[6px] font-medium text-text-1">
				<span className="truncate">{primaryLabel}</span>
				{statusBadge}
			</span>
			<span className="whitespace-nowrap text-[12px] text-text-3 tabular-nums">{relativeTime}</span>
			{skippedNote}
			<span className="whitespace-nowrap text-[13px] text-text-1 tabular-nums">{scoreLabel}</span>
			<ChevronRightIcon aria-hidden="true" className="h-[14px] w-[14px] text-text-3" />
		</a>
	)
}

export type { ReviewRowProps }
export { ReviewRow }
