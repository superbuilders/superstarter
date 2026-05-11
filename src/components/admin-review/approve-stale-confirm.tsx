"use client"

// <ApproveStaleConfirm> — modal confirmation for approving a candidate
// whose validator verdict is stale (Phase 4 sub-phase b §2.4 commit 0).
//
// Renders ONLY when the validatorResult is stale at click time
// (validatorResult.staleAfterMs > validatorResult.evaluatedAtMs). For
// fresh verdicts, the approve action submits directly without surfacing
// this modal. Per Option (b) ratification: the staleness gate is server-
// side authoritative (approveItemAction throws
// ErrStaleVerdictNotAcknowledged unless input.acknowledgeStaleVerdict is
// true); this modal is the corresponding client-side affordance.
//
// Reuses the project's <AlertDialog> primitive. Default cobalt accent
// for the confirm action (NOT destructive — approve is the positive
// outcome; the warning is about the verdict's freshness, not the
// approval itself).

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

const MS_PER_SECOND = 1000
const MS_PER_MINUTE = 60 * MS_PER_SECOND
const MS_PER_HOUR = 60 * MS_PER_MINUTE
const MS_PER_DAY = 24 * MS_PER_HOUR

function formatDurationMs(deltaMs: number): string {
	if (deltaMs < MS_PER_MINUTE) return "less than a minute"
	if (deltaMs < MS_PER_HOUR) {
		const minutes = Math.round(deltaMs / MS_PER_MINUTE)
		return `${minutes} minute${minutes === 1 ? "" : "s"}`
	}
	if (deltaMs < MS_PER_DAY) {
		const hours = Math.round(deltaMs / MS_PER_HOUR)
		return `${hours} hour${hours === 1 ? "" : "s"}`
	}
	const days = Math.round(deltaMs / MS_PER_DAY)
	return `${days} day${days === 1 ? "" : "s"}`
}

interface ApproveStaleConfirmProps {
	readonly open: boolean
	readonly staleAfterMs: number
	readonly evaluatedAtMs: number
	readonly onConfirm: () => void
	readonly onCancel: () => void
	readonly isSubmitting: boolean
}

function handleOpenChange(onCancel: () => void, isSubmitting: boolean, next: boolean): void {
	if (next) return
	if (isSubmitting) return
	onCancel()
}

function ApproveStaleConfirm(props: ApproveStaleConfirmProps): React.ReactNode {
	const deltaMs = Math.max(0, props.staleAfterMs - props.evaluatedAtMs)
	const durationLabel = formatDurationMs(deltaMs)
	const confirmLabel = props.isSubmitting ? "Approving…" : "Approve anyway"

	return (
		<AlertDialog
			open={props.open}
			onOpenChange={function handle(next) {
				handleOpenChange(props.onCancel, props.isSubmitting, next)
			}}
		>
			<AlertDialogContent>
				<AlertDialogHeader>
					<AlertDialogTitle>Approve with stale validator verdict</AlertDialogTitle>
					<AlertDialogDescription>
						Validator verdict was generated {durationLabel} before this item's most
						recent edit. Verdicts shown may not reflect the current state. Re-running
						the validator is recommended; approving now bypasses this and trusts your
						judgment.
					</AlertDialogDescription>
				</AlertDialogHeader>
				<AlertDialogFooter>
					<AlertDialogCancel onClick={props.onCancel} disabled={props.isSubmitting}>
						Cancel
					</AlertDialogCancel>
					<AlertDialogAction onClick={props.onConfirm} disabled={props.isSubmitting}>
						{confirmLabel}
					</AlertDialogAction>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	)
}

export type { ApproveStaleConfirmProps }
export { ApproveStaleConfirm }
