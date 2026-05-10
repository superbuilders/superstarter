"use client"

// <OptionButton> — tall full-width rectangular option button matching
// the data/example_ccat_formatting/*.png reference. Thin gray border,
// ample vertical padding, an unfilled radio-circle bullet on the left
// followed by the option text.
//
// No A/B/C/D/E letter label is rendered. The reference screenshots
// don't show one, the real CCAT doesn't surface one, and commit 3
// stripped the keyboard nav that would have made one useful. See
// docs/plans/phase-3-polish-practice-surface-features.md §3.0 / §3.1.
//
// Accessibility: `aria-pressed` on the button is what screen readers
// announce ("button, [option text], pressed"/"not pressed"). No letter
// or "Option A" aria-label needed.
//
// Selected-state visual: filled radio dot, light primary background,
// dark primary border. Hover-state visual: darker border without
// circle fill.

import * as React from "react"
import { cn } from "@/lib/utils"

interface OptionButtonProps {
	id: string
	text: string
	selected: boolean
	onSelect: () => void
}

function OptionButtonImpl(props: OptionButtonProps) {
	const { text, selected, onSelect } = props
	return (
		<button
			type="button"
			aria-pressed={selected}
			onClick={onSelect}
			className={cn(
				"flex w-full items-center gap-3 rounded-md border px-4 py-2 text-left text-sm transition-colors",
				"border-border bg-background text-foreground hover:border-foreground/40",
				"focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500",
				// Selected state visual: blue-tinted border + light blue background
				// echo the Submit-button blue. The radio-fill is a separate accent
				// (orange) so the user has two distinct visual cues for "this is
				// the selected option" vs "this is the action button".
				selected && "border-blue-600 bg-blue-50 text-foreground"
			)}
		>
			{/* Radio-circle bullet. Outer ring + inner dot only when selected.
			    Filled orange per the target screenshots — the radio fill is a
			    deliberately distinct accent from the Submit-button blue. */}
			<span
				aria-hidden="true"
				className={cn(
					"relative flex h-5 w-5 shrink-0 items-center justify-center rounded-full border",
					selected ? "border-orange-500" : "border-foreground/40"
				)}
			>
				<span
					className={cn(
						"h-2.5 w-2.5 rounded-full transition-opacity",
						selected ? "bg-orange-500 opacity-100" : "opacity-0"
					)}
				/>
			</span>
			<span className="flex-1">{text}</span>
		</button>
	)
}

const OptionButton = React.memo(OptionButtonImpl)

export type { OptionButtonProps }
export { OptionButton }
