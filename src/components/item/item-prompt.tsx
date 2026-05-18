"use client"

// <ItemPrompt> — renders the question body + the radio-style option
// buttons. Mouse-and-click only; no keyboard option-selection
// shortcuts.
//
// Phase 3 polish commit 3 stripped the digit (1–5) + letter (A–E)
// keyboard nav and the visible A/B/C/D/E label per
// docs/plans/phase-3-polish-practice-surface-features.md §3.0 / §3.1.
// The real CCAT is a browser-based mouse-and-click test with no
// keyboard shortcuts; training muscle memory the real test won't honor
// is a regression dressed as ergonomics. Selection is click-only.

import type * as React from "react"
import { NumberSeriesBody } from "@/components/item/body-renderers/number-series"
import { TextBody } from "@/components/item/body-renderers/text"
import { OptionButton } from "@/components/item/option-button"
import type { ItemBody } from "@/server/items/body-schema"

interface ItemPromptOption {
	id: string
	text: string
}

interface ItemPromptProps {
	body: ItemBody
	options: ItemPromptOption[]
	selectedOptionId?: string
	onSelect: (id: string) => void
	// Optional sub-type id for body-renderer dispatch. Drill mode passes
	// this through from the route's `[subTypeId]` param via the focus-shell
	// prop chain; diagnostic + full_length leave it undefined (those
	// surfaces mix sub-types per-item, which would require a schema change
	// to ItemForRender to support per-item dispatch — out of scope per
	// Round 1 §1, see §5.8 §6.14.28 addendum). Round 1 §5.8 + §0.7.
	subTypeId?: string
}

// Canonical id for the number-series sub-type (per src/config/sub-types.ts).
// Not imported as a type from the config module to keep this client-side
// component free of server-config imports; the string match is the
// dispatch contract.
const NUMBER_SERIES_SUB_TYPE_ID = "numerical.number_series"

function ItemPrompt(props: ItemPromptProps) {
	const { body, options, selectedOptionId, onSelect, subTypeId } = props
	return (
		<div className="flex flex-col gap-5">
			<div data-focus-tutorial-region="question-prompt">{renderBody(body, subTypeId)}</div>
			<div
				className="flex flex-col gap-1.5"
				data-focus-tutorial-region="answer-choices"
			>
				{options.map(function renderOption(option) {
					return (
						<OptionButton
							key={option.id}
							id={option.id}
							text={option.text}
							selected={option.id === selectedOptionId}
							onSelect={function selectThis() {
								onSelect(option.id)
							}}
						/>
					)
				})}
			</div>
		</div>
	)
}

function renderBody(body: ItemBody, subTypeId: string | undefined): React.ReactNode {
	switch (body.kind) {
		case "text":
			if (subTypeId === NUMBER_SERIES_SUB_TYPE_ID) {
				return <NumberSeriesBody text={body.text} />
			}
			return <TextBody text={body.text} />
		default: {
			// Exhaustiveness check: adding a new variant to ItemBody fails the
			// compile here until the renderer handles it.
			const _exhaustive: never = body.kind
			return _exhaustive
		}
	}
}

export type { ItemPromptOption, ItemPromptProps }
export { ItemPrompt }
