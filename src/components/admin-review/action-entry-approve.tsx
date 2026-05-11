// <ActionEntryApprove> — renders one item_admin_actions row of
// action_type 'approve' inside the audit-history-tab list (Phase 4
// sub-phase b §2.5 commit 0).
//
// Approve transitions an item from candidate → live. The before/after
// snapshots only carry the status field per approveCandidateAction at
// §2.4 commit-0; no field-level diff is needed beyond the static
// "promoted to live" line.

import type { AdminActionHistoryEntry } from "@/server/admin/action-history-shared"

interface ActionEntryApproveProps {
	readonly entry: AdminActionHistoryEntry
}

function ActionEntryApprove({ entry }: ActionEntryApproveProps) {
	const timestamp = new Date(entry.createdAtMs).toISOString()
	const reasonBlock =
		entry.reason === undefined ? null : (
			<p className="mt-2 rounded-md border border-border-soft bg-surface-2 px-3 py-2 text-[13px] text-text-2 italic">
				{entry.reason}
			</p>
		)
	return (
		<div className="flex flex-col gap-2">
			<div className="flex flex-wrap items-baseline justify-between gap-2">
				<div className="flex flex-wrap items-center gap-2">
					<span className="inline-flex items-center rounded-sm border border-cobalt/40 bg-surface px-[6px] py-[1px] font-medium text-[10px] text-cobalt uppercase tracking-[0.06em]">
						Approve
					</span>
					<span className="text-[13px] text-text-1">{entry.adminEmail}</span>
				</div>
				<span className="font-mono text-[11px] text-text-3 tabular-nums">
					{timestamp}
				</span>
			</div>
			<p className="text-[13px] text-text-2">
				Promoted candidate to{" "}
				<span className="font-mono text-[12px] text-text-1">live</span>.
			</p>
			{reasonBlock}
		</div>
	)
}

export type { ActionEntryApproveProps }
export { ActionEntryApprove }
