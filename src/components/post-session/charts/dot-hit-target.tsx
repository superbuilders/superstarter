"use client"

// <DotHitTarget> — SVG-friendly clickable wrapper for a single chart dot.
//
// Wraps a visible marker with an invisible larger circle to enlarge the
// click target on a small SVG dot, and attaches keyboard + ARIA so the
// interaction satisfies a11y rules. When `onAttemptClick` is undefined
// the children render with no wrapper interactivity (read-only chart).

import type * as React from "react"

interface DotHitTargetProps {
	attemptId: string
	cx: number
	cy: number
	hitRadius: number
	label: string
	onAttemptClick: ((attemptId: string) => void) | undefined
	children: React.ReactNode
}

function DotHitTarget(props: DotHitTargetProps) {
	const { attemptId, cx, cy, hitRadius, label, onAttemptClick, children } = props
	if (onAttemptClick === undefined) {
		return <g>{children}</g>
	}
	const click = onAttemptClick
	return (
		// biome-ignore lint/a11y/useSemanticElements: <button> cannot live inside an <svg>; role="button" is the correct ARIA pattern for an SVG dot hit target.
		<g
			aria-label={`${label} — open in review`}
			className="cursor-pointer outline-none"
			onClick={function dotClick() {
				click(attemptId)
			}}
			onKeyDown={function dotKey(event: React.KeyboardEvent<SVGGElement>) {
				if (event.key !== "Enter" && event.key !== " ") return
				event.preventDefault()
				click(attemptId)
			}}
			role="button"
			tabIndex={0}
		>
			<circle cx={cx} cy={cy} fill="transparent" r={hitRadius} stroke="transparent" />
			{children}
		</g>
	)
}

export type { DotHitTargetProps }
export { DotHitTarget }
