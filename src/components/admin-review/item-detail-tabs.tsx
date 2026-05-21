"use client"

// <ItemDetailTabs> — tab strip for /admin/review/[itemId]. Mirrors
// post-session-shell's TabNav shape (TABS array, role="tablist" +
// role="tab" + aria-selected, click-to-select handler) so the admin
// queue + post-session review read as the same family of tabbed
// surfaces. No URL state — selected tab lives in parent's useState.

type ItemDetailTab = "stem" | "explanation" | "provenance" | "audit"

interface TabDef {
	readonly key: ItemDetailTab
	readonly label: string
}

const TABS: ReadonlyArray<TabDef> = [
	{ key: "stem", label: "Stem & options" },
	{ key: "explanation", label: "Explanation" },
	{ key: "provenance", label: "Provenance" },
	{ key: "audit", label: "Audit history" }
]

const ACTIVE_TAB_CLASS =
	"rounded-md bg-surface-2 px-[12px] py-[8px] font-medium text-[13px] text-text-1"
const INACTIVE_TAB_CLASS =
	"rounded-md px-[12px] py-[8px] text-[13px] text-text-2 transition-colors hover:bg-lavender"

interface ItemDetailTabsProps {
	readonly activeTab: ItemDetailTab
	readonly onSelect: (tab: ItemDetailTab) => void
}

function ItemDetailTabs({ activeTab, onSelect }: ItemDetailTabsProps) {
	return (
		<div
			aria-label="Item detail sections"
			className="flex flex-wrap gap-[2px]"
			role="tablist"
		>
			{TABS.map(function renderTab(tab) {
				const isActive = tab.key === activeTab
				const className = isActive ? ACTIVE_TAB_CLASS : INACTIVE_TAB_CLASS
				return (
					<button
						key={tab.key}
						type="button"
						role="tab"
						aria-selected={isActive}
						className={className}
						onClick={function selectThis() {
							onSelect(tab.key)
						}}
					>
						{tab.label}
					</button>
				)
			})}
		</div>
	)
}

export type { ItemDetailTab, ItemDetailTabsProps }
export { ItemDetailTabs, TABS }
