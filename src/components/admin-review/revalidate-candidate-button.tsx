"use client"

// <RevalidateCandidateButton> — single-item re-validate affordance rendered
// inside the provenance-tab stale banner (Phase 4 sub-phase b §2.4 commit
// 1). Calls revalidateCandidateAction; on success the server action's
// revalidatePath fires, the page refetches, and the stale banner
// disappears (the freshened validatorResult has no staleAfterMs).
//
// Outline variant — this is a refresh action, not a primary disposition,
// so it visually defers to the (separate) approve/reject bar in the
// stem-options tab. xs size to fit comfortably inside the banner row.
//
// Failure path: feedback rendered inline beneath the button. Errors are
// admin-actionable (faulty embedding for one item, transient infra
// failure) and worth surfacing verbatim rather than masking.
//
// Scope: this component is unconditional once mounted. The provenance-tab
// gate (`candidate.status === "candidate"`) is the source of truth for
// whether re-validate is offered at all — live + rejected items don't
// render this component.

import * as errors from "@superbuilders/errors"
import * as React from "react"
import { Button } from "@/components/ui/button"
import { logger } from "@/logger"
import { revalidateCandidateAction } from "@/server/admin/revalidate-actions"

interface RevalidateCandidateButtonProps {
	readonly itemId: string
}

interface Feedback {
	readonly kind: "ok" | "err"
	readonly message: string
}

function RevalidateCandidateButton({ itemId }: RevalidateCandidateButtonProps) {
	const [feedback, setFeedback] = React.useState<Feedback | undefined>(undefined)
	const [isPending, startTransition] = React.useTransition()

	function onClick() {
		setFeedback(undefined)
		startTransition(async function runRevalidate() {
			const result = await errors.try(revalidateCandidateAction({ itemId }))
			if (result.error) {
				logger.warn(
					{ itemId, error: result.error },
					"RevalidateCandidateButton: action failed"
				)
				setFeedback({
					kind: "err",
					message: `Re-validate failed: ${result.error.message}`
				})
				return
			}
			const flagSummary = result.data.newHasAnyFlag ? "now flagged" : "now clear"
			setFeedback({
				kind: "ok",
				message: `Re-validated — ${flagSummary}.`
			})
		})
	}

	const buttonLabel = isPending ? "Re-running…" : "Re-run validator"
	const feedbackNode =
		feedback === undefined ? null : (
			<p
				role={feedback.kind === "err" ? "alert" : "status"}
				className={
					feedback.kind === "err"
						? "mt-1 w-full text-[12px] text-destructive"
						: "mt-1 w-full text-[12px] text-text-2"
				}
			>
				{feedback.message}
			</p>
		)

	return (
		<>
			<Button
				type="button"
				variant="outline"
				size="xs"
				onClick={onClick}
				disabled={isPending}
				aria-label="Re-run validator on this candidate"
			>
				{buttonLabel}
			</Button>
			{feedbackNode}
		</>
	)
}

export type { RevalidateCandidateButtonProps }
export { RevalidateCandidateButton }
