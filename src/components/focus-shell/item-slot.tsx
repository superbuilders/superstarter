"use client"

// <ItemSlot> — the latency-anchor host. Mounted by <FocusShell> with a
// React `key` set to `currentItem.id` so React remounts on every item
// swap. The mount-effect captures `performance.now()` and dispatches
// `set_question_started`; that timestamp is what `submit`'s latency
// calculation subtracts from to compute the per-question latency.
//
// Plan §5.3 / §9.1 — DO NOT lift this into a non-keyed render. If the
// effect runs once per session instead of once per item, every
// `latencyMs` becomes "time since session start." The `submitAttempt`
// server action has a 5-minute tripwire that throws on out-of-band
// values (see src/server/sessions/submit.ts), but the contract is the
// keyed mount; the tripwire is the safety net.

import * as React from "react"
import { ItemPrompt } from "@/components/item/item-prompt"
import type { ItemForRender } from "@/components/focus-shell/types"

interface ItemSlotProps {
	item: ItemForRender
	selectedOptionId?: string
	onSelectOption: (optionId: string) => void
	onMounted: (nowMs: number) => void
	// Drill-only — passed from <FocusShell> for body-renderer dispatch in
	// <ItemPrompt> (Round 1 §5.8). Diagnostic + full_length leave undefined.
	subTypeId?: string
}

function ItemSlot(props: ItemSlotProps) {
	// Latest-callback ref pattern. The mount effect below has truly empty
	// deps so it runs exactly once per mount — and since this component
	// is keyed on item.id by the parent, "once per mount" is "once per
	// item swap." Listing `props.onMounted` in the deps array would re-run
	// the effect any render the parent passes an inline closure (it does),
	// which dispatches set_question_started → state update → re-render →
	// infinite loop. The ref keeps the effect's identity stable while
	// still calling the latest callback.
	const onMountedRef = React.useRef(props.onMounted)
	React.useEffect(function syncOnMountedRef() {
		onMountedRef.current = props.onMounted
	})
	React.useEffect(function captureFirstPaint() {
		onMountedRef.current(performance.now())
	}, [])

	return (
		<ItemPrompt
			body={props.item.body}
			options={props.item.options}
			selectedOptionId={props.selectedOptionId}
			onSelect={props.onSelectOption}
			subTypeId={props.subTypeId}
		/>
	)
}

export type { ItemSlotProps }
export { ItemSlot }
