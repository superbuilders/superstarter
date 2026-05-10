// <AuditHistoryTab> — placeholder for the §2.5 admin-action history
// rendering. The item_admin_actions table exists per §1.0 schema
// migration; UI rendering against it lands at §2.5.
//
// This commit ships the tab as visible-but-empty so the admin shell
// surfaces the eventual home of audit-history rendering without
// pretending it works yet. The tab body just states the placeholder
// expectation in plain prose.

function AuditHistoryTab() {
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
					No admin actions yet. Edits, approvals, and rejections will appear here once §2.3 +
					§2.4 + §2.5 land.
				</p>
			</div>
		</section>
	)
}

export { AuditHistoryTab }
