"use client"

// Progressive-disclosure panel. Collapsed by default; clicking the
// header reveals the body. Used by every lesson to hide the
// "shortcut" explanation behind a single tap so the page can stay
// scannable.

import * as React from "react"

interface RevealPanelProps {
	label: string
	hiddenLabel?: string
	children: React.ReactNode
}

function RevealPanel({ label, hiddenLabel = "Hide", children }: RevealPanelProps) {
	const [open, setOpen] = React.useState(false)
	const displayLabel = open ? hiddenLabel : label
	const chevron = open ? "▾" : "▸"
	function toggle() {
		setOpen(function flip(prev) {
			return !prev
		})
	}
	return (
		<section className="mb-4 rounded-lg border border-border-soft bg-surface">
			<button
				type="button"
				onClick={toggle}
				aria-expanded={open}
				className="flex w-full items-center justify-between gap-3 rounded-lg px-5 py-3 text-left text-text-1 hover:bg-lavender focus-visible:outline focus-visible:outline-2 focus-visible:outline-cobalt focus-visible:outline-offset-2"
			>
				<span className="font-medium text-[14px]">{displayLabel}</span>
				<span aria-hidden="true" className="font-mono text-text-3 text-xs">
					{chevron}
				</span>
			</button>
			{open ? (
				<div className="border-border-soft border-t px-5 py-4 text-[14px] text-text-2 leading-relaxed">
					{children}
				</div>
			) : null}
		</section>
	)
}

export type { RevealPanelProps }
export { RevealPanel }
