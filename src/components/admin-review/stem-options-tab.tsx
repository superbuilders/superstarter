// <StemOptionsTab> — read-only display of the candidate's stem + options
// + correct-answer marker. Reuses TextBody / NumberSeriesBody from the
// live practice surface for stem rendering (the dispatch logic mirrors
// item-prompt.tsx and wrong-items-browser.tsx — no modification to the
// shipped Round 3 / live components per §0.2 anti-scope).
//
// Options are rendered as a flat list, NOT as <OptionButton> instances.
// <OptionButton>'s blue-selected styling encodes the live "user selected
// this option" semantic; reusing it for "this is the correct answer"
// would visually overload that semantic. The admin view uses a "Correct"
// badge alongside the correct option's text — a distinct affordance.

import type * as React from "react"
import { NumberSeriesBody } from "@/components/item/body-renderers/number-series"
import { TextBody } from "@/components/item/body-renderers/text"
import { subTypes } from "@/config/sub-types"
import type { AdminCandidateRow } from "@/server/admin/item-detail-data"
import type { ItemBody } from "@/server/items/body-schema"

const NUMBER_SERIES_SUB_TYPE_ID = "numerical.number_series"

const SUB_TYPE_NAMES: ReadonlyMap<string, { displayName: string; section: "verbal" | "numerical" }> =
	new Map(
		subTypes.map(function toEntry(s) {
			return [s.id, { displayName: s.displayName, section: s.section }]
		})
	)

function renderBody(body: ItemBody, subTypeId: string): React.ReactNode {
	switch (body.kind) {
		case "text":
			if (subTypeId === NUMBER_SERIES_SUB_TYPE_ID) {
				return <NumberSeriesBody text={body.text} />
			}
			return <TextBody text={body.text} />
		default: {
			const _exhaustive: never = body.kind
			return _exhaustive
		}
	}
}

interface StemOptionsTabProps {
	readonly candidate: AdminCandidateRow
}

function difficultyLabelFor(diff: AdminCandidateRow["difficulty"]): string {
	if (diff === "easy") return "Easy"
	if (diff === "medium") return "Medium"
	if (diff === "hard") return "Hard"
	return "Brutal"
}

function StemOptionsTab({ candidate }: StemOptionsTabProps) {
	const subTypeMeta = SUB_TYPE_NAMES.get(candidate.subTypeId)
	const subTypeDisplay = subTypeMeta === undefined ? candidate.subTypeId : subTypeMeta.displayName
	const sectionTag = subTypeMeta === undefined ? "—" : subTypeMeta.section
	const difficultyLabel = difficultyLabelFor(candidate.difficulty)
	const pressureBadge = candidate.metadata.validatorResult?.isPressureCell ? (
		<span className="inline-flex items-center rounded-sm border border-cobalt/40 bg-surface px-[6px] py-[1px] font-medium text-[10px] text-cobalt uppercase tracking-[0.06em]">
			Pressure cell
		</span>
	) : null
	const statusBadge =
		candidate.status === "candidate" ? (
			<span className="inline-flex items-center rounded-sm bg-lavender px-[6px] py-[1px] font-medium text-[10px] text-indigo uppercase tracking-[0.06em]">
				Candidate
			</span>
		) : (
			<span className="inline-flex items-center rounded-sm border border-border-soft bg-surface-2 px-[6px] py-[1px] font-medium text-[10px] text-text-2 uppercase tracking-[0.06em]">
				{candidate.status}
			</span>
		)
	return (
		<section className="overflow-hidden rounded-lg border border-border-soft bg-surface">
			<header className="flex flex-wrap items-center gap-3 border-border-soft border-b px-4 py-2">
				<span className="font-medium text-[13px] text-text-1">{subTypeDisplay}</span>
				<span className="text-[11px] text-text-3 uppercase tracking-[0.06em]">
					{sectionTag}
				</span>
				<span className="inline-flex items-center justify-center rounded-sm border border-border-soft bg-surface-2 px-[6px] py-[2px] font-medium text-[10px] text-text-2 uppercase tracking-[0.06em]">
					{difficultyLabel}
				</span>
				{pressureBadge}
				{statusBadge}
			</header>
			<div className="flex flex-col gap-5 px-5 py-5">
				<div>{renderBody(candidate.body, candidate.subTypeId)}</div>
				<ol className="flex flex-col gap-1.5">
					{candidate.options.map(function renderOption(option) {
						const isCorrect = option.id === candidate.correctAnswer
						const containerClass = isCorrect
							? "flex w-full items-center gap-3 rounded-md border border-cobalt/40 bg-lavender px-4 py-2 text-sm text-text-1"
							: "flex w-full items-center gap-3 rounded-md border border-border-soft bg-surface px-4 py-2 text-sm text-text-2"
						const correctMarker = isCorrect ? (
							<span className="inline-flex items-center rounded-sm bg-cobalt px-[6px] py-[1px] font-medium text-[10px] text-white uppercase tracking-[0.06em]">
								Correct
							</span>
						) : null
						return (
							<li key={option.id} className={containerClass}>
								<span className="w-6 font-mono text-[12px] text-text-3 tabular-nums">
									{option.id}
								</span>
								<span className="flex-1">{option.text}</span>
								{correctMarker}
							</li>
						)
					})}
				</ol>
			</div>
		</section>
	)
}

export type { StemOptionsTabProps }
export { StemOptionsTab }
