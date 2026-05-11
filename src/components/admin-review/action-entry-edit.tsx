// <ActionEntryEdit> — renders one item_admin_actions row of action_type
// 'edit' inside the audit-history-tab list (Phase 4 sub-phase b §2.5
// commit 0).
//
// Edit rows write full pre/post snapshots of the 7 admin-editable
// columns (per §2.3 commit-1's submitEditAction). diffChangedKeys does a
// JSON.stringify value comparison to narrow the displayed list to the
// fields that ACTUALLY changed — without it, every edit would surface
// all 7 keys.
//
// Note: metadataJson nearly always shows as changed because submitEdit-
// Action sets validatorResult.staleAfterMs = Date.now() on every edit
// (per the staleness-marker design at §2.3 commit-1). That's accurate;
// the staleness marker IS metadata that changed.

import {
	type AdminActionHistoryEntry,
	diffChangedKeys
} from "@/server/admin/action-history-shared"

interface ActionEntryEditProps {
	readonly entry: AdminActionHistoryEntry
}

function ActionEntryEdit({ entry }: ActionEntryEditProps) {
	const changedKeys = diffChangedKeys(entry.beforeJson, entry.afterJson)
	const changedSummary =
		changedKeys.length > 0 ? changedKeys.join(", ") : "(no field-level diff captured)"
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
					<span className="inline-flex items-center rounded-sm border border-border-soft bg-surface-2 px-[6px] py-[1px] font-medium text-[10px] text-text-2 uppercase tracking-[0.06em]">
						Edit
					</span>
					<span className="text-[13px] text-text-1">{entry.adminEmail}</span>
				</div>
				<span className="font-mono text-[11px] text-text-3 tabular-nums">
					{timestamp}
				</span>
			</div>
			<p className="text-[13px] text-text-2">
				Changed fields:{" "}
				<span className="font-mono text-[12px] text-text-1">{changedSummary}</span>
			</p>
			{reasonBlock}
		</div>
	)
}

export type { ActionEntryEditProps }
export { ActionEntryEdit }
