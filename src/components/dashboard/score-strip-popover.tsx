"use client"

// <ScoreStripPopover> — minimal popover wrapper for the inline
// editors (<GoalEditor>, <DaysToTestEditor>) on the rebuilt
// <ScoreStrip>. Practice round commit 9.
//
// Why a custom inline popover instead of shadcn primitives: the
// project's src/components/ui/ has alert-dialog (modal confirms) +
// dropdown-menu (radix menus) but no anchor-positioned popover for
// inline form-input editors. Building a minimal wrapper here is
// cheaper than installing radix-popover and matches ALPHA §7's
// "crisp, legible, emotionally calm" form discipline.
//
// **Behavior:**
//   - Click trigger button → opens the popover.
//   - Click outside the popover content → closes.
//   - Escape key → closes.
//   - Optional onClose callback fires from the children (e.g. when
//     the editor's submit succeeds).
//
// **Accessibility:**
//   - The trigger button has aria-haspopup="dialog" + aria-expanded
//     toggling on open/close.
//   - The popover content has role="dialog" with aria-label.
//   - Focus-visible outline on the trigger (cobalt).
//   - First focusable input inside the popover should auto-focus
//     (handled by the editor children themselves via autoFocus).

import * as React from "react"
import { cn } from "@/lib/utils"

interface ScoreStripPopoverProps {
	triggerLabel: string
	triggerValue: React.ReactNode
	triggerClassName?: string
	dialogLabel: string
	children: (close: () => void) => React.ReactNode
}

function ScoreStripPopover(props: ScoreStripPopoverProps) {
	const [isOpen, setIsOpen] = React.useState(false)
	const containerRef = React.useRef<HTMLDivElement>(null)

	const close = React.useCallback(function handleClose() {
		setIsOpen(false)
	}, [])

	React.useEffect(
		function attachClickOutsideAndEscape() {
			if (!isOpen) return
			function handleClickOutside(event: MouseEvent) {
				const target = event.target
				if (!(target instanceof Node)) return
				if (containerRef.current === null) return
				if (containerRef.current.contains(target)) return
				setIsOpen(false)
			}
			function handleEscape(event: KeyboardEvent) {
				if (event.key === "Escape") setIsOpen(false)
			}
			document.addEventListener("mousedown", handleClickOutside)
			document.addEventListener("keydown", handleEscape)
			return function cleanup() {
				document.removeEventListener("mousedown", handleClickOutside)
				document.removeEventListener("keydown", handleEscape)
			}
		},
		[isOpen]
	)

	const triggerClasses = cn(
		"flex flex-col items-end text-right rounded-md cursor-pointer transition-colors px-1 -mx-1 hover:bg-lavender focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cobalt",
		props.triggerClassName
	)

	return (
		<div ref={containerRef} className="relative">
			<button
				type="button"
				aria-haspopup="dialog"
				aria-expanded={isOpen}
				className={triggerClasses}
				onClick={function handleClick() {
					setIsOpen(function toggle(prev) {
						return !prev
					})
				}}
			>
				<span className="mb-1 text-[11px] text-text-3 uppercase tracking-[0.06em]">
					{props.triggerLabel}
				</span>
				<span>{props.triggerValue}</span>
			</button>
			{isOpen ? (
				<div
					role="dialog"
					aria-label={props.dialogLabel}
					className="absolute top-full right-0 z-10 mt-2 min-w-[220px] rounded-lg border border-border-soft bg-surface p-4 shadow-lg"
				>
					{props.children(close)}
				</div>
			) : null}
		</div>
	)
}

export type { ScoreStripPopoverProps }
export { ScoreStripPopover }
