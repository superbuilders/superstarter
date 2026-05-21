"use client"

// <InterQuestionCard> — brief overlay between submit and the next item's
// paint. PRD §5.1 / SPEC §6.9.
//
// No progress count. No item index. Just a soft visual transition. The
// reducer auto-clears the visibility after a short window if the next
// item never advances (defensive, prevents a sticky card on a slow
// network).
//
// `pointer-events-none` is load-bearing: the card is purely decorative
// (per the comment above) and must not block clicks on the underlying
// <ItemSlot> during a single-frame race between advance's commit and
// this card's render-tree update. Without it, a user clicking an option
// at the moment of advance would have the click swallowed by the card
// (see docs/plans/focus-shell-post-overhaul-fixes.md §2 candidate #2).

interface InterQuestionCardProps {
	visible: boolean
}

function InterQuestionCard(props: InterQuestionCardProps) {
	if (!props.visible) return null
	return (
		<div
			aria-hidden="true"
			className="pointer-events-none fixed inset-0 flex items-center justify-center bg-background/60 backdrop-blur-sm"
		/>
	)
}

export type { InterQuestionCardProps }
export { InterQuestionCard }
