// <BeltLegend> — inline four-item legend mapping each tier name to
// its <BeltGraphic> color so users can read the dashboard's
// Recent/Rank sorts without having to memorize the tier→belt
// mapping. Reuses the canonical <BeltGraphic> primitive (same SVG
// the <BeltStripe> on each row uses) so the legend's swatches are
// pixel-identical to the row swatches.
//
// Layout: a horizontal row of 4 (graphic + label) pairs. Sized
// smaller than <BeltStripe>'s 40×12 dashboard cell to read as
// secondary chrome rather than as another row of belts.

import type { ReactNode } from "react"
import { BeltGraphic } from "@/components/dashboard/belt-graphic"
import type { Difficulty } from "@/config/sub-types"
import type { BeltLevel } from "@/server/dashboard/types"

interface LegendEntry {
	tier: Difficulty
	belt: BeltLevel
	label: string
}

// Order matches tier difficulty progression (easy → brutal), which
// is also the white → black belt progression the post-session
// <BeltIndicator> uses (`tierToBeltColor` in
// src/components/post-session/belt-indicator.tsx).
const ENTRIES: ReadonlyArray<LegendEntry> = [
	{ tier: "easy", belt: "white", label: "Easy" },
	{ tier: "medium", belt: "blue", label: "Medium" },
	{ tier: "hard", belt: "brown", label: "Hard" },
	{ tier: "brutal", belt: "black", label: "Brutal" }
]

function BeltLegend(): ReactNode {
	return (
		<div className="flex flex-wrap items-center gap-x-3 gap-y-1">
			{ENTRIES.map(function renderEntry(entry) {
				const swatchLabel = `${entry.label} (${entry.belt} belt)`
				return (
					<div key={entry.tier} className="flex items-center gap-1.5">
						<span className="inline-block h-[10px] w-[26px] overflow-hidden rounded-[1px]">
							<BeltGraphic
								beltColor={entry.belt}
								ariaLabel={swatchLabel}
								className="block h-full w-full"
							/>
						</span>
						<span className="text-[11px] text-text-3 uppercase tracking-[0.04em]">
							{entry.label}
						</span>
					</div>
				)
			})}
		</div>
	)
}

export { BeltLegend }
