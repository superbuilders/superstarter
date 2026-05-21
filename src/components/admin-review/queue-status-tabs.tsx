// <QueueStatusTabs> — top-level cohort selector for /admin/review. Three
// tabs: Candidates (status='candidate'), Live (status='live'), Rejected
// (status='rejected'). Each is a <Link> to the same route with a different
// `?status=` search param so the URL is bookmarkable and the server-side
// loader can scope its SELECT accordingly.
//
// Mirrors the visual rhythm of <ItemDetailTabs> (tab bar with active /
// inactive button styles), but uses anchor-style links so navigation
// triggers a server data refetch instead of in-page state changes.

import Link from "next/link"
import type { QueueStatusFilter, StatusCounts } from "@/server/admin/queue-data"

interface QueueStatusTabsProps {
	readonly active: QueueStatusFilter
	readonly counts: StatusCounts
}

interface StatusTabDef {
	readonly value: QueueStatusFilter
	readonly label: string
}

const STATUS_TABS: ReadonlyArray<StatusTabDef> = [
	{ value: "candidate", label: "Candidates" },
	{ value: "live", label: "Live" },
	{ value: "rejected", label: "Rejected" }
]

const ACTIVE_TAB_CLASS =
	"flex items-center gap-2 rounded-md bg-surface-2 px-[12px] py-[8px] font-medium text-[13px] text-text-1"
const INACTIVE_TAB_CLASS =
	"flex items-center gap-2 rounded-md px-[12px] py-[8px] text-[13px] text-text-2 transition-colors hover:bg-lavender focus-visible:outline focus-visible:outline-2 focus-visible:outline-cobalt focus-visible:outline-offset-1"

const ACTIVE_BADGE_CLASS =
	"inline-flex items-center rounded-sm bg-lavender px-[6px] py-[1px] font-medium text-[10px] text-indigo tabular-nums"
const INACTIVE_BADGE_CLASS =
	"inline-flex items-center rounded-sm border border-border-soft bg-surface-2 px-[6px] py-[1px] font-medium text-[10px] text-text-3 tabular-nums"

function countFor(counts: StatusCounts, value: QueueStatusFilter): number {
	if (value === "candidate") return counts.candidate
	if (value === "live") return counts.live
	return counts.rejected
}

function QueueStatusTabs({ active, counts }: QueueStatusTabsProps) {
	return (
		<nav
			aria-label="Queue cohort"
			className="flex flex-wrap gap-[2px] rounded-lg border border-border-soft bg-surface px-2 py-2"
		>
			{STATUS_TABS.map(function renderTab(tab) {
				const isActive = tab.value === active
				const className = isActive ? ACTIVE_TAB_CLASS : INACTIVE_TAB_CLASS
				const badgeClass = isActive ? ACTIVE_BADGE_CLASS : INACTIVE_BADGE_CLASS
				const count = countFor(counts, tab.value)
				return (
					<Link
						key={tab.value}
						href={{ pathname: "/admin/review", query: { status: tab.value } }}
						className={className}
						aria-current={isActive ? "page" : undefined}
					>
						<span>{tab.label}</span>
						<span className={badgeClass}>{count}</span>
					</Link>
				)
			})}
		</nav>
	)
}

export type { QueueStatusTabsProps }
export { QueueStatusTabs, STATUS_TABS }
