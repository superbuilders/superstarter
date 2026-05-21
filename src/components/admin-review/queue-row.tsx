// <QueueRow> — one item row in the admin /admin/review queue.
//
// Mirrors <ReviewRow> (src/components/review/review-row.tsx) for visual
// rhythm: plain <a> (not <Link>, since href is dynamic at runtime and
// next.config.ts's typedRoutes accepts only Route literals on <Link>);
// grid layout; same bg/border/hover tokens (Layer A near-white bg-surface,
// Layer B brand-blue cobalt used as accent only — never as background per
// ALPHA_DESIGN §2.B authenticated-product surfaces).
//
// Columns inside the anchor:
//   1. Sub-type pill (display name) + section tag (verbal/numerical)
//   2. Difficulty pill
//   3. Body preview (truncated to 140 chars upstream)
//   4. Flag count badge + pressure-cell badge
//   5. Cohort key (first 8 hex chars of promptHash, monospace)
//   6. Chevron
//
// Click on the anchor navigates to /admin/review/${item.id}.
//
// Action affordance (live/rejected cohorts only): when statusFilter is
// "live" or "rejected" the row also renders a <QueueRowDisposition>
// SIBLING to the right of the anchor. The disposition button cannot live
// inside the <a> (interactive descendants in an anchor are invalid HTML
// and the click semantics would conflict), so the row container is a
// flex row with the anchor + action lane as separate children.

import { ChevronRightIcon } from "lucide-react"
import { flagCountOf } from "@/components/admin-review/queue-filters"
import { QueueRowDisposition } from "@/components/admin-review/queue-row-disposition"
import { subTypes } from "@/config/sub-types"
import type { AdminQueueItem, QueueStatusFilter } from "@/server/admin/queue-data"

const SUB_TYPE_NAMES: ReadonlyMap<
	string,
	{ displayName: string; section: "verbal" | "numerical" }
> = new Map(
	subTypes.map(function toEntry(s) {
		return [s.id, { displayName: s.displayName, section: s.section }]
	})
)

interface QueueRowProps {
	item: AdminQueueItem
	statusFilter: QueueStatusFilter
}

function difficultyLabelFor(diff: AdminQueueItem["difficulty"]): string {
	if (diff === "easy") return "Easy"
	if (diff === "medium") return "Medium"
	if (diff === "hard") return "Hard"
	return "Brutal"
}

function cohortKeyDisplay(cohortKey: string | undefined): string {
	if (cohortKey === undefined) return "—"
	if (cohortKey.length <= 8) return cohortKey
	return cohortKey.slice(0, 8)
}

function dispositionActionFor(statusFilter: QueueStatusFilter): "reject" | "approve" | undefined {
	if (statusFilter === "live") return "reject"
	if (statusFilter === "rejected") return "approve"
	return undefined
}

function QueueRow({ item, statusFilter }: QueueRowProps) {
	const subTypeMeta = SUB_TYPE_NAMES.get(item.subTypeId)
	const subTypeDisplay = subTypeMeta === undefined ? item.subTypeId : subTypeMeta.displayName
	const sectionTag = subTypeMeta === undefined ? "—" : subTypeMeta.section
	const difficultyLabel = difficultyLabelFor(item.difficulty)
	const flagCount = flagCountOf(item)
	const flagBadge =
		flagCount > 0 ? (
			<span className="inline-flex items-center rounded-sm bg-lavender px-[6px] py-[1px] font-medium text-[10px] text-indigo uppercase tracking-[0.06em]">
				{flagCount} flag{flagCount === 1 ? "" : "s"}
			</span>
		) : null
	const pressureBadge = item.isPressureCell ? (
		<span className="inline-flex items-center rounded-sm border border-cobalt/40 bg-surface px-[6px] py-[1px] font-medium text-[10px] text-cobalt uppercase tracking-[0.06em]">
			Pressure
		</span>
	) : null
	const unvalidatedBadge =
		item.evaluatedAtMs === undefined ? (
			<span className="inline-flex items-center rounded-sm border border-border-strong bg-surface-2 px-[6px] py-[1px] font-medium text-[10px] text-text-3 uppercase tracking-[0.06em]">
				Unvalidated
			</span>
		) : null
	const staleBadge = item.validatorStale ? (
		<span
			className="inline-flex items-center rounded-sm border border-cobalt/40 bg-surface px-[6px] py-[1px] font-medium text-[10px] text-cobalt uppercase tracking-[0.06em]"
			title="Validator verdict predates the most recent edit; re-run validator to refresh"
		>
			Stale
		</span>
	) : null
	const bodyPreview = item.bodyPreview.length === 0 ? "(no preview)" : item.bodyPreview
	const cohortKey = cohortKeyDisplay(item.cohortKey)
	const dispositionAction = dispositionActionFor(statusFilter)
	return (
		<div className="flex items-stretch border-border-soft border-b last:border-b-0 hover:bg-lavender">
			<a
				href={`/admin/review/${item.id}`}
				className="grid flex-1 grid-cols-[180px_72px_1fr_auto_88px_16px] items-center gap-[10px] px-4 py-[10px] text-sm transition-colors duration-150 ease-out focus-visible:outline focus-visible:outline-2 focus-visible:outline-cobalt focus-visible:-outline-offset-2"
			>
				<span className="flex min-w-0 flex-col gap-[2px]">
					<span className="truncate font-medium text-text-1">{subTypeDisplay}</span>
					<span className="text-[10px] text-text-3 uppercase tracking-[0.06em]">{sectionTag}</span>
				</span>
				<span className="inline-flex items-center justify-center rounded-sm border border-border-soft bg-surface-2 px-[6px] py-[2px] font-medium text-[10px] text-text-2 uppercase tracking-[0.06em]">
					{difficultyLabel}
				</span>
				<span className="min-w-0 truncate text-text-2">{bodyPreview}</span>
				<span className="flex items-center gap-[6px]">
					{pressureBadge}
					{flagBadge}
					{staleBadge}
					{unvalidatedBadge}
				</span>
				<span className="whitespace-nowrap font-mono text-[11px] text-text-3 tabular-nums">
					{cohortKey}
				</span>
				<ChevronRightIcon aria-hidden="true" className="h-[14px] w-[14px] text-text-3" />
			</a>
			{dispositionAction !== undefined && (
				<div className="flex items-center pr-4 pl-2">
					<QueueRowDisposition
						itemId={item.id}
						subTypeId={item.subTypeId}
						difficulty={item.difficulty}
						action={dispositionAction}
					/>
				</div>
			)}
		</div>
	)
}

export type { QueueRowProps }
export { QueueRow }
