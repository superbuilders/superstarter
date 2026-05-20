import { Badge } from "@/components/ui/badge"
import { subTypes } from "@/config/sub-types"
import type {
	ExperimentalAdminQueueData,
	ExperimentalAdminQueueItem
} from "@/server/experimental/admin-data"

interface ExperimentalAdminQueueListProps {
	data: ExperimentalAdminQueueData
}

const subTypeLabelEntries: ReadonlyArray<readonly [string, string]> = subTypes.map(function mapSubType(subType) {
	return [subType.id, subType.displayName]
})

const subTypeLabelById = new Map<string, string>(subTypeLabelEntries)

function displaySubTypeLabel(subTypeId: string): string {
	const label = subTypeLabelById.get(subTypeId)
	if (label === undefined) return subTypeId
	return label
}

function formatWhen(ms: number | undefined): string {
	if (ms === undefined) return "—"
	return new Intl.DateTimeFormat("en-US", {
		month: "short",
		day: "numeric",
		year: "numeric",
		hour: "numeric",
		minute: "2-digit"
	}).format(new Date(ms))
}

function statusTone(item: ExperimentalAdminQueueItem): "secondary" | "default" | "destructive" | "outline" {
	if (item.hiddenAtMs !== undefined) return "outline"
	if (item.auditStatus === "approved") return "default"
	if (item.auditStatus === "rejected") return "destructive"
	if (item.auditStatus === "needs_revision") return "secondary"
	return "secondary"
}

function latestActivityMs(item: ExperimentalAdminQueueItem): number | undefined {
	if (item.latestDecisionAtMs !== undefined) return item.latestDecisionAtMs
	if (item.latestProposalAtMs !== undefined) return item.latestProposalAtMs
	if (item.latestAuditAtMs !== undefined) return item.latestAuditAtMs
	return undefined
}

function QueueRow({ item }: { item: ExperimentalAdminQueueItem }) {
	return (
		<li className="rounded-xl border border-border-soft bg-panel px-4 py-4 shadow-sm">
			<div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
				<div className="min-w-0 space-y-2">
					<div className="flex flex-wrap items-center gap-2">
						<Badge variant={statusTone(item)}>
							{item.hiddenAtMs !== undefined ? "hidden" : item.auditStatus}
						</Badge>
						<Badge variant="outline">{displaySubTypeLabel(item.subTypeId)}</Badge>
						<Badge variant="outline">{item.difficulty}</Badge>
					</div>
					<h3 className="line-clamp-2 font-medium text-base text-text-1">
						{item.promptPreview}
					</h3>
					<p className="text-[12px] text-text-3">
						Audits {item.auditCount} · Proposals {item.proposalCount} · Decisions {item.decisionCount}
					</p>
				</div>
				<div className="flex shrink-0 flex-col items-start gap-2 text-[12px] text-text-3 lg:items-end">
					<p>Updated {formatWhen(item.updatedAtMs)}</p>
					<p>Latest activity {formatWhen(latestActivityMs(item))}</p>
					<a href={`/admin/experimental/${item.id}`} className="font-medium text-cobalt hover:underline">
						Open moderation detail
					</a>
				</div>
			</div>
		</li>
	)
}

function ExperimentalAdminQueueList(props: ExperimentalAdminQueueListProps) {
	return (
		<div className="space-y-8">
			<section className="grid gap-3 md:grid-cols-4">
				<div className="rounded-xl border border-border-soft bg-panel px-4 py-4 shadow-sm">
					<p className="text-[11px] text-text-3 uppercase tracking-[0.06em]">Pending</p>
					<p className="mt-2 font-serif text-3xl text-text-1">{props.data.totals.pending}</p>
				</div>
				<div className="rounded-xl border border-border-soft bg-panel px-4 py-4 shadow-sm">
					<p className="text-[11px] text-text-3 uppercase tracking-[0.06em]">Approved</p>
					<p className="mt-2 font-serif text-3xl text-text-1">{props.data.totals.approved}</p>
				</div>
				<div className="rounded-xl border border-border-soft bg-panel px-4 py-4 shadow-sm">
					<p className="text-[11px] text-text-3 uppercase tracking-[0.06em]">Rejected</p>
					<p className="mt-2 font-serif text-3xl text-text-1">{props.data.totals.rejected}</p>
				</div>
				<div className="rounded-xl border border-border-soft bg-panel px-4 py-4 shadow-sm">
					<p className="text-[11px] text-text-3 uppercase tracking-[0.06em]">Hidden</p>
					<p className="mt-2 font-serif text-3xl text-text-1">{props.data.totals.hidden}</p>
				</div>
			</section>
			{props.data.sections.map(function renderSection(section) {
				return (
					<section key={section.key} className="space-y-3">
						<div className="space-y-1">
							<h2 className="font-medium font-serif text-[22px] text-text-1">
								{section.title}
							</h2>
							<p className="max-w-[72ch] text-sm text-text-2">{section.description}</p>
						</div>
						{section.items.length === 0 ? (
							<div className="rounded-xl border border-border-soft border-dashed bg-panel px-4 py-5 text-sm text-text-3">
								No items in this cohort yet.
							</div>
						) : (
							<ul className="space-y-3">
								{section.items.map(function renderItem(item) {
									return <QueueRow key={item.id} item={item} />
								})}
							</ul>
						)}
					</section>
				)
			})}
		</div>
	)
}

export { ExperimentalAdminQueueList }
