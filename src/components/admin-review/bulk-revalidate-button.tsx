"use client"

// <BulkRevalidateButton> — header-strip affordance for the candidates tab
// that re-runs the validator across every stale candidate in one batch
// (Phase 4 sub-phase b §2.4 commit 1). Wired to revalidateStaleCandidates-
// Action which queries the stale set, builds one ValidationContext over
// it, and persists fresh validatorResults inside a single transaction.
//
// Render gate: caller (AdminReviewContent) renders this ONLY when the
// active cohort is "candidate" AND staleCount > 0. Live and rejected
// cohorts never render this — re-validation is candidates-only per
// redirector ratification.
//
// Outline variant — refresh action, not a primary disposition. Label
// includes the staleCount so the admin sees what they're committing to
// before they click.
//
// Bulk action duration: ~50ms per candidate (validator engine is in-
// memory; the bottleneck is the per-row UPDATE inside the transaction).
// For N=10 stale items, sub-second; for N=100, a few seconds. Admin sees
// "Re-validating N candidates…" while pending.

import * as errors from "@superbuilders/errors"
import * as React from "react"
import { Button } from "@/components/ui/button"
import { logger } from "@/logger"
import { revalidateStaleCandidatesAction } from "@/server/admin/revalidate-actions"

interface BulkRevalidateButtonProps {
	readonly staleCount: number
}

interface Feedback {
	readonly kind: "ok" | "err"
	readonly message: string
}

function pluralizeCandidate(n: number): string {
	if (n === 1) return "candidate"
	return "candidates"
}

function BulkRevalidateButton({ staleCount }: BulkRevalidateButtonProps) {
	const [feedback, setFeedback] = React.useState<Feedback | undefined>(undefined)
	const [isPending, startTransition] = React.useTransition()

	function onClick() {
		setFeedback(undefined)
		startTransition(async function runBulk() {
			const result = await errors.try(revalidateStaleCandidatesAction())
			if (result.error) {
				logger.warn(
					{ error: result.error },
					"BulkRevalidateButton: action failed"
				)
				setFeedback({
					kind: "err",
					message: `Bulk re-validate failed: ${result.error.message}`
				})
				return
			}
			const out = result.data
			const skippedNote = out.skippedCount > 0 ? ` (${out.skippedCount} skipped)` : ""
			setFeedback({
				kind: "ok",
				message: `Re-validated ${out.revalidatedCount}: ${out.nowFlaggedCount} now flagged, ${out.nowClearedCount} now clear${skippedNote}.`
			})
		})
	}

	const noun = pluralizeCandidate(staleCount)
	const idleLabel = `Re-validate ${staleCount} stale ${noun}`
	const pendingLabel = `Re-validating ${staleCount} ${noun}…`
	const label = isPending ? pendingLabel : idleLabel

	const feedbackNode =
		feedback === undefined ? null : (
			<p
				role={feedback.kind === "err" ? "alert" : "status"}
				className={
					feedback.kind === "err"
						? "text-[12px] text-destructive"
						: "text-[12px] text-text-2"
				}
			>
				{feedback.message}
			</p>
		)

	return (
		<div className="flex flex-wrap items-center gap-3">
			<Button
				type="button"
				variant="outline"
				size="sm"
				onClick={onClick}
				disabled={isPending}
				aria-label={`Re-validate ${staleCount} stale ${noun}`}
			>
				{label}
			</Button>
			{feedbackNode}
		</div>
	)
}

export type { BulkRevalidateButtonProps }
export { BulkRevalidateButton }
