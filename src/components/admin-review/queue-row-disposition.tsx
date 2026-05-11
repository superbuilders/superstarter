"use client"

// <QueueRowDisposition> — row-level disposition affordance for live and
// rejected cohorts. Renders one button (Reject on live rows, Approve on
// rejected rows) plus a confirmation modal that captures an optional or
// required reason note before invoking the matching server action.
//
// Why one button per cohort, not two: the candidate cohort already has
// full disposition UI on the item-detail page (StemOptionsView). For the
// row-level affordance the user only ever needs the *forward-going*
// direction:
//   - Live  → Reject (live → rejected) — Approve is a no-op (already live).
//   - Rejected → Approve (rejected → live) — Reject is a no-op (already
//     rejected).
// Hiding the no-op button keeps the row visually quiet and avoids
// disabled-button ambiguity.
//
// HTML structure: the parent QueueRow renders this component as a SIBLING
// of the row's <a> link element, not a descendant. Putting an interactive
// <button> inside <a> would be invalid HTML and the click semantics would
// be ambiguous.
//
// Submission flow: useTransition wraps the server-action call so React
// blocks pending re-renders until the action settles. revalidatePath in
// the action triggers a fresh queue load; the row will disappear from
// the current cohort and re-appear under the new status on the next
// navigation. On error, inline feedback surfaces below the button and
// the modal stays open.

import * as errors from "@superbuilders/errors"
import * as React from "react"
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
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { type Difficulty, type SubTypeId, subTypes } from "@/config/sub-types"
import { logger } from "@/logger"
import { approveItemAction, rejectItemAction } from "@/server/admin/disposition-actions"

type ActionKind = "approve" | "reject"

interface QueueRowDispositionProps {
	readonly itemId: string
	readonly subTypeId: SubTypeId
	readonly difficulty: Difficulty
	readonly action: ActionKind
}

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

interface CopyBundle {
	readonly buttonLabel: string
	readonly buttonVariant: "outline" | "destructive"
	readonly modalTitle: string
	readonly modalDescription: string
	readonly reasonLabel: string
	readonly reasonPlaceholder: string
	readonly reasonRequired: boolean
	readonly confirmLabel: string
	readonly confirmingLabel: string
	readonly confirmVariant: "default" | "destructive"
}

function computeSubmitDisabled(reasonSatisfied: boolean, isSubmitting: boolean): boolean {
	if (!reasonSatisfied) return true
	if (isSubmitting) return true
	return false
}

function copyFor(action: ActionKind, itemLabel: string): CopyBundle {
	if (action === "reject") {
		return {
			buttonLabel: "Reject",
			buttonVariant: "destructive",
			modalTitle: "Reject live item",
			modalDescription: `Item ${itemLabel} will be marked as rejected and removed from the live bank. The item row is preserved for the audit trail and can be re-approved later.`,
			reasonLabel: "Reason for rejection (required)",
			reasonPlaceholder: "Why is this item being rejected?",
			reasonRequired: true,
			confirmLabel: "Reject item",
			confirmingLabel: "Rejecting…",
			confirmVariant: "destructive"
		}
	}
	return {
		buttonLabel: "Approve",
		buttonVariant: "outline",
		modalTitle: "Approve rejected item",
		modalDescription: `Item ${itemLabel} will be restored to the live bank. Its prior rejection metadata is cleared but the audit trail is preserved.`,
		reasonLabel: "Reason for approval (optional)",
		reasonPlaceholder: "Why is this rejection being reversed?",
		reasonRequired: false,
		confirmLabel: "Approve item",
		confirmingLabel: "Approving…",
		confirmVariant: "default"
	}
}

function QueueRowDisposition({ itemId, subTypeId, difficulty, action }: QueueRowDispositionProps) {
	const [open, setOpen] = React.useState<boolean>(false)
	const [reasonDraft, setReasonDraft] = React.useState<string>("")
	const [errorMessage, setErrorMessage] = React.useState<string | undefined>(undefined)
	const [isSubmitting, startSubmitTransition] = React.useTransition()

	const itemLabel = `${subTypeLabelFor(subTypeId)} · ${difficultyLabelFor(difficulty)}`
	const copy = copyFor(action, itemLabel)
	const trimmedReason = reasonDraft.trim()
	const reasonSatisfied = copy.reasonRequired ? trimmedReason.length > 0 : true
	const submitDisabled = computeSubmitDisabled(reasonSatisfied, isSubmitting)

	function handleOpenChange(next: boolean) {
		if (next) {
			setOpen(true)
			return
		}
		if (isSubmitting) return
		setOpen(false)
		setErrorMessage(undefined)
	}

	function handleCancel() {
		if (isSubmitting) return
		setOpen(false)
		setErrorMessage(undefined)
	}

	function handleConfirm() {
		setErrorMessage(undefined)
		startSubmitTransition(async function runDisposition() {
			if (action === "approve") {
				const reasonNote = trimmedReason.length === 0 ? undefined : trimmedReason
				const approveResult = await errors.try(
					approveItemAction({
						itemId,
						reasonNote,
						acknowledgeStaleVerdict: false
					})
				)
				if (approveResult.error) {
					logger.warn(
						{ itemId, error: approveResult.error },
						"QueueRowDisposition: approveItemAction failed"
					)
					setErrorMessage(`Approve failed: ${approveResult.error.message}`)
					return
				}
				setOpen(false)
				setReasonDraft("")
				return
			}
			const rejectResult = await errors.try(rejectItemAction({ itemId, reasonNote: trimmedReason }))
			if (rejectResult.error) {
				logger.warn(
					{ itemId, error: rejectResult.error },
					"QueueRowDisposition: rejectItemAction failed"
				)
				setErrorMessage(`Reject failed: ${rejectResult.error.message}`)
				return
			}
			setOpen(false)
			setReasonDraft("")
		})
	}

	const confirmButtonLabel = isSubmitting ? copy.confirmingLabel : copy.confirmLabel
	const reasonInputId = `queue-row-${action}-reason-${itemId}`

	return (
		<>
			<Button
				type="button"
				variant={copy.buttonVariant}
				size="sm"
				onClick={function openModal() {
					setOpen(true)
				}}
				aria-label={`${copy.buttonLabel} item ${itemLabel}`}
			>
				{copy.buttonLabel}
			</Button>
			<AlertDialog open={open} onOpenChange={handleOpenChange}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>{copy.modalTitle}</AlertDialogTitle>
						<AlertDialogDescription>{copy.modalDescription}</AlertDialogDescription>
					</AlertDialogHeader>
					<div className="flex flex-col gap-2">
						<Label htmlFor={reasonInputId}>{copy.reasonLabel}</Label>
						<Textarea
							id={reasonInputId}
							value={reasonDraft}
							rows={3}
							maxLength={1000}
							placeholder={copy.reasonPlaceholder}
							disabled={isSubmitting}
							onChange={function onReasonChange(event) {
								setReasonDraft(event.target.value)
							}}
						/>
						{errorMessage !== undefined && (
							<p className="text-[12px] text-destructive">{errorMessage}</p>
						)}
					</div>
					<AlertDialogFooter>
						<AlertDialogCancel onClick={handleCancel} disabled={isSubmitting}>
							Cancel
						</AlertDialogCancel>
						<AlertDialogAction
							variant={copy.confirmVariant}
							onClick={handleConfirm}
							disabled={submitDisabled}
						>
							{confirmButtonLabel}
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</>
	)
}

export type { QueueRowDispositionProps }
export { QueueRowDisposition }
