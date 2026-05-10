"use client"

// <RejectConfirm> — modal confirmation for rejecting a candidate item
// (Phase 4 sub-phase b §2.4 commit 0).
//
// Rejection is soft-delete: the row stays in the items table with
// status='rejected' so the audit trail and source-provenance survive,
// but the item no longer appears in live banks or future candidate
// queues. Per Q6 ratification, the admin's free-text reason is REQUIRED
// — both the Zod schema (rejectInputSchema.reasonNote.min(1)) and this
// modal's submit-disabled gate enforce non-empty reason. UI + server
// must agree; one without the other is a bug.
//
// Reuses the project's <AlertDialog> primitive (same shape as
// BucketChangeConfirm at §2.3 commit-0). Destructive button variant for
// the confirm action signals the irreversible nature.

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
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
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

interface RejectConfirmProps {
	readonly open: boolean
	readonly currentSubType: SubTypeId
	readonly currentDifficulty: Difficulty
	readonly reasonNoteDraft: string
	readonly onReasonNoteChange: (next: string) => void
	readonly onConfirm: () => void
	readonly onCancel: () => void
	readonly isSubmitting: boolean
}

function handleOpenChange(onCancel: () => void, isSubmitting: boolean, next: boolean): void {
	if (next) return
	if (isSubmitting) return
	onCancel()
}

function computeSubmitDisabled(trimmedLen: number, isSubmitting: boolean): boolean {
	if (trimmedLen === 0) return true
	if (isSubmitting) return true
	return false
}

function RejectConfirm(props: RejectConfirmProps): React.ReactNode {
	const trimmedReason = props.reasonNoteDraft.trim()
	const submitDisabled = computeSubmitDisabled(trimmedReason.length, props.isSubmitting)
	const itemLabel = `${subTypeLabelFor(props.currentSubType)} · ${difficultyLabelFor(props.currentDifficulty)}`
	const confirmLabel = props.isSubmitting ? "Rejecting…" : "Reject item"

	return (
		<AlertDialog
			open={props.open}
			onOpenChange={function handle(next) {
				handleOpenChange(props.onCancel, props.isSubmitting, next)
			}}
		>
			<AlertDialogContent>
				<AlertDialogHeader>
					<AlertDialogTitle>Reject candidate item</AlertDialogTitle>
					<AlertDialogDescription>
						Item <span className="font-mono">{itemLabel}</span> will be marked as
						rejected. This action is soft-delete; the item remains in the database with
						status='rejected' but no longer appears in live banks or future candidate
						queues.
					</AlertDialogDescription>
				</AlertDialogHeader>
				<div className="flex flex-col gap-2">
					<Label htmlFor="reject-reason-note">Reason for rejection (required)</Label>
					<Textarea
						id="reject-reason-note"
						value={props.reasonNoteDraft}
						rows={3}
						maxLength={1000}
						placeholder="Why is this item being rejected?"
						disabled={props.isSubmitting}
						onChange={function onReasonChange(event) {
							props.onReasonNoteChange(event.target.value)
						}}
					/>
				</div>
				<AlertDialogFooter>
					<AlertDialogCancel onClick={props.onCancel} disabled={props.isSubmitting}>
						Cancel
					</AlertDialogCancel>
					<AlertDialogAction
						variant="destructive"
						onClick={props.onConfirm}
						disabled={submitDisabled}
					>
						{confirmLabel}
					</AlertDialogAction>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	)
}

export type { RejectConfirmProps }
export { RejectConfirm }
