// <SubtypeSortSelector> — segmented button group + reverse toggle
// above the dojo grid. Three sort options (Recent / Rank / A–Z)
// drive the dashboard's global sort key for both <DojoCard>s; a
// separate icon toggle reverses the current order (newest↔oldest,
// highest↔lowest, A→Z↔Z→A).
//
// Button-group (not a dropdown) by design: three short labels are
// always visible, no portal/popover needed, and the active option
// sits inline with the rest of the strip — fewer clicks to switch
// view, more on-brand with ALPHA's editorial directness.
//
// The reverse toggle uses lucide's `ArrowDownNarrowWide` /
// `ArrowDownWideNarrow` pair to indicate direction in a sort-key-
// agnostic way: `ArrowDownWideNarrow` = "default order, biggest at
// top" when reversed=false, `ArrowDownNarrowWide` = "flipped, smallest
// at top" when reversed=true. The aria-label reads the resulting
// action ("Reverse sort order" / "Restore default order").
//
// Stateless. Controlled via value + reversed + onChange + onToggleReverse.

import { ArrowDownNarrowWideIcon, ArrowDownWideNarrowIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import type { SubtypeSortKey } from "@/components/dashboard/subtype-sort"

interface SubtypeSortSelectorProps {
	value: SubtypeSortKey
	reversed: boolean
	onChange: (next: SubtypeSortKey) => void
	onToggleReverse: () => void
}

interface SortOption {
	value: SubtypeSortKey
	label: string
	srLabel: string
}

const OPTIONS: ReadonlyArray<SortOption> = [
	{ value: "recent", label: "Recent", srLabel: "Sort by most recently drilled" },
	{ value: "rank", label: "Rank", srLabel: "Sort by belt rank" },
	{ value: "alpha", label: "A–Z", srLabel: "Sort alphabetically" }
]

function SubtypeSortSelector({
	value,
	reversed,
	onChange,
	onToggleReverse
}: SubtypeSortSelectorProps) {
	const ReverseIcon = reversed ? ArrowDownNarrowWideIcon : ArrowDownWideNarrowIcon
	const reverseLabel = reversed ? "Restore default sort order" : "Reverse sort order"
	return (
		<fieldset className="flex items-center gap-2 border-0 p-0">
			<legend className="float-left mr-2 text-[11px] text-text-3 uppercase tracking-[0.06em]">
				Sort by
			</legend>
			<div className="inline-flex gap-1 rounded-lg border border-border-soft bg-surface p-[3px]">
				{OPTIONS.map(function renderOption(opt) {
					const isActive = opt.value === value
					const stateClass = isActive
						? "bg-cobalt text-white"
						: "text-text-2 hover:bg-lavender hover:text-text-1"
					return (
						<button
							key={opt.value}
							type="button"
							aria-pressed={isActive}
							aria-label={opt.srLabel}
							onClick={function handleClick() {
								if (!isActive) onChange(opt.value)
							}}
							className={cn(
								"rounded-md px-3 py-[5px] font-medium text-[12px] transition-colors duration-150 ease-out focus-visible:outline focus-visible:outline-2 focus-visible:outline-cobalt focus-visible:outline-offset-1",
								stateClass
							)}
						>
							{opt.label}
						</button>
					)
				})}
			</div>
			<button
				type="button"
				aria-pressed={reversed}
				aria-label={reverseLabel}
				title={reverseLabel}
				onClick={onToggleReverse}
				className={cn(
					"inline-flex h-[30px] w-[30px] items-center justify-center rounded-lg border border-border-soft bg-surface transition-colors duration-150 ease-out focus-visible:outline focus-visible:outline-2 focus-visible:outline-cobalt focus-visible:outline-offset-1",
					reversed ? "bg-cobalt text-white" : "text-text-2 hover:bg-lavender hover:text-text-1"
				)}
			>
				<ReverseIcon aria-hidden="true" className="h-[14px] w-[14px]" />
			</button>
		</fieldset>
	)
}

export type { SubtypeSortSelectorProps }
export { SubtypeSortSelector }
