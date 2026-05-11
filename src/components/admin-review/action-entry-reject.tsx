// <ActionEntryReject> — renders one item_admin_actions row of
// action_type 'reject' inside the audit-history-tab list (Phase 4
// sub-phase b §2.5 commit 0).
//
// Reject transitions an item from candidate → rejected. reasonNote was
// REQUIRED at the input boundary per Q6 ratification, so reason should
// always be present here; we still defensively render the omit branch
// in case of bypass (e.g., direct DB INSERT without the action body).
// Reason is emphasized — it's the primary forensic artifact for "why
// this got dropped from the bank."

import type { AdminActionHistoryEntry } from "@/server/admin/action-history-shared"

interface ActionEntryRejectProps {
	readonly entry: AdminActionHistoryEntry
}

function ActionEntryReject({ entry }: ActionEntryRejectProps) {
	const timestamp = new Date(entry.createdAtMs).toISOString()
	const reasonBlock =
		entry.reason === undefined ? null : (
			<div className="mt-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2">
				<p className="font-medium text-[10px] text-destructive uppercase tracking-[0.06em]">
					Reason
				</p>
				<p className="mt-1 text-[13px] text-text-1">{entry.reason}</p>
			</div>
		)
	return (
		<div className="flex flex-col gap-2">
			<div className="flex flex-wrap items-baseline justify-between gap-2">
				<div className="flex flex-wrap items-center gap-2">
					<span className="inline-flex items-center rounded-sm bg-destructive/10 px-[6px] py-[1px] font-medium text-[10px] text-destructive uppercase tracking-[0.06em]">
						Reject
					</span>
					<span className="text-[13px] text-text-1">{entry.adminEmail}</span>
				</div>
				<span className="font-mono text-[11px] text-text-3 tabular-nums">
					{timestamp}
				</span>
			</div>
			<p className="text-[13px] text-text-2">
				Rejected candidate (status →{" "}
				<span className="font-mono text-[12px] text-text-1">rejected</span>).
			</p>
			{reasonBlock}
		</div>
	)
}

export type { ActionEntryRejectProps }
export { ActionEntryReject }
