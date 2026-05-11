// <AuditHistoryTab> — renders the persisted item_admin_actions log for
// the current item (Phase 4 sub-phase b §2.5 commit 0). Replaces the
// §2.2 commit-0 placeholder.
//
// The history is loaded server-side by loadAdminActionHistory and threaded
// through page.tsx + content.tsx as a parallel promise alongside the item
// detail. AuditHistoryTab itself is a pure render function over the
// resolved entries — no fetching, no React.use here (the parent's
// <Suspense> covers the load).
//
// Per-entry rendering dispatches on actionType to a dedicated component
// (edit / approve / reject), each tuned to that action's semantics:
// edit shows a changed-field list + reason; approve shows the promotion
// line + reason; reject emphasizes the reason as the primary forensic
// artifact. Reserved enum values (flag / unflag) are not used at v1 but
// have a generic fallback render so the surface degrades gracefully if
// they ever appear in the ledger.
//
// Visible on all three status tabs (candidates / live / rejected) — the
// audit history is read-only retrospective and does not depend on the
// item's current status. Re-validation events are NOT in the ledger per
// §2.4 commit-1 ratification.

import { ActionEntryApprove } from "@/components/admin-review/action-entry-approve"
import { ActionEntryEdit } from "@/components/admin-review/action-entry-edit"
import { ActionEntryReject } from "@/components/admin-review/action-entry-reject"
import type { AdminActionHistoryEntry } from "@/server/admin/action-history-shared"

interface AuditHistoryTabProps {
	readonly history: ReadonlyArray<AdminActionHistoryEntry>
}

function renderEntryByType(entry: AdminActionHistoryEntry) {
	if (entry.actionType === "edit") return <ActionEntryEdit entry={entry} />
	if (entry.actionType === "approve") return <ActionEntryApprove entry={entry} />
	if (entry.actionType === "reject") return <ActionEntryReject entry={entry} />
	// flag / unflag are reserved enum values not used at v1 — generic
	// fallback so future additions degrade gracefully.
	const timestamp = new Date(entry.createdAtMs).toISOString()
	return (
		<div className="flex flex-wrap items-baseline justify-between gap-2 text-[13px] text-text-2">
			<span>
				<span className="mr-2 inline-flex items-center rounded-sm border border-border-soft bg-surface-2 px-[6px] py-[1px] font-medium text-[10px] text-text-2 uppercase tracking-[0.06em]">
					{entry.actionType}
				</span>
				{entry.adminEmail}
			</span>
			<span className="font-mono text-[11px] text-text-3 tabular-nums">
				{timestamp}
			</span>
		</div>
	)
}

function AuditHistoryTab({ history }: AuditHistoryTabProps) {
	if (history.length === 0) {
		return (
			<section className="overflow-hidden rounded-lg border border-border-soft bg-surface">
				<header className="flex items-baseline justify-between border-border-soft border-b px-4 pt-2 pb-1">
					<h3 className="font-medium font-serif text-[15px] text-text-1 tracking-[-0.005em]">
						Audit history
					</h3>
					<span className="text-[11px] text-text-3 uppercase tracking-[0.06em]">
						Admin action ledger
					</span>
				</header>
				<div className="px-4 py-6">
					<p className="text-[13px] text-text-3">
						No admin actions recorded for this item yet. Edits, approvals, and
						rejections will appear here once an admin disposes of this candidate.
					</p>
				</div>
			</section>
		)
	}
	const noun = history.length === 1 ? "entry" : "entries"
	return (
		<section className="overflow-hidden rounded-lg border border-border-soft bg-surface">
			<header className="flex items-baseline justify-between border-border-soft border-b px-4 pt-2 pb-1">
				<h3 className="font-medium font-serif text-[15px] text-text-1 tracking-[-0.005em]">
					Audit history
				</h3>
				<span className="text-[11px] text-text-3 uppercase tracking-[0.06em]">
					{history.length} {noun} • newest first
				</span>
			</header>
			<ol className="divide-none">
				{history.map(function renderEntry(entry) {
					return (
						<li
							key={entry.id}
							className="border-border-soft border-b px-4 py-3 last:border-b-0"
						>
							{renderEntryByType(entry)}
						</li>
					)
				})}
			</ol>
		</section>
	)
}

export type { AuditHistoryTabProps }
export { AuditHistoryTab }
