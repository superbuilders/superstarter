"use client"

// <BucketChangeConfirm> — modal confirmation for sub-type or difficulty
// edits on the admin item-detail page (Phase 4 sub-phase b §2.3 commit 0,
// Q5 ratification).
//
// Reuses the project's existing <AlertDialog> primitive (Radix-based,
// declared in src/components/ui/alert-dialog.tsx but until now unused —
// this is its first consumer). The redirector's initial proposal called
// for a native <dialog> element; audit step 10 surfaced the AlertDialog
// primitive as the canonical project-wide pattern, so we use that
// instead of introducing a parallel modal idiom.
//
// Renders when the admin attempts to save with a sub-type or difficulty
// change pending. The body spells out the downstream implications
// (pressure-cell recompute; validator verdicts may become stale) so the
// admin's confirmation is informed.

import type * as React from "react"
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle
} from "@/components/ui/alert-dialog"
import { subTypes } from "@/config/sub-types"
import type { Difficulty, SubTypeId } from "@/config/sub-types"

const SUB_TYPE_DISPLAY: ReadonlyMap<string, string> = new Map(
	subTypes.map(function toEntry(s) {
		return [s.id, s.displayName]
	})
)

function difficultyLabelFor(d: Difficulty): string {
	if (d === "easy") return "Easy"
	if (d === "medium") return "Medium"
	if (d === "hard") return "Hard"
	return "Brutal"
}

function subTypeLabelFor(id: SubTypeId): string {
	const found = SUB_TYPE_DISPLAY.get(id)
	if (found === undefined) return id
	return found
}

interface BucketChangeConfirmProps {
	readonly open: boolean
	readonly currentSubType: SubTypeId
	readonly currentDifficulty: Difficulty
	readonly newSubType: SubTypeId
	readonly newDifficulty: Difficulty
	readonly onConfirm: () => void
	readonly onCancel: () => void
}

function handleOpenChange(onCancel: () => void, next: boolean): void {
	if (!next) onCancel()
}

function BucketChangeConfirm(props: BucketChangeConfirmProps): React.ReactNode {
	const subTypeChanged = props.currentSubType !== props.newSubType
	const difficultyChanged = props.currentDifficulty !== props.newDifficulty
	const currentLabel = `${subTypeLabelFor(props.currentSubType)} · ${difficultyLabelFor(props.currentDifficulty)}`
	const newLabel = `${subTypeLabelFor(props.newSubType)} · ${difficultyLabelFor(props.newDifficulty)}`

	const changesSummary: string[] = []
	if (subTypeChanged) changesSummary.push("sub-type")
	if (difficultyChanged) changesSummary.push("difficulty")
	const changedFieldsCopy = changesSummary.join(" and ")

	return (
		<AlertDialog
			open={props.open}
			onOpenChange={function handle(next) {
				handleOpenChange(props.onCancel, next)
			}}
		>
			<AlertDialogContent>
				<AlertDialogHeader>
					<AlertDialogTitle>Confirm bucket change</AlertDialogTitle>
					<AlertDialogDescription>
						You're editing this candidate's {changedFieldsCopy}. Moving from{" "}
						<span className="font-mono">{currentLabel}</span> to{" "}
						<span className="font-mono">{newLabel}</span>. Pressure-cell calculations
						recompute; validator verdicts may become stale until the next batch.
					</AlertDialogDescription>
				</AlertDialogHeader>
				<AlertDialogFooter>
					<AlertDialogCancel onClick={props.onCancel}>Keep current bucket</AlertDialogCancel>
					<AlertDialogAction onClick={props.onConfirm}>Confirm change</AlertDialogAction>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	)
}

export type { BucketChangeConfirmProps }
export { BucketChangeConfirm }
