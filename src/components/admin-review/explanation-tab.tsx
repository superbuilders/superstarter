"use client"

// <ExplanationTab> — admin explanation display + edit (Phase 4 sub-phase b
// §2.3 commit 0).
//
// View mode: read-only display preserved from §2.2 commit-0. Two branches:
//   1. metadata_json.structuredExplanation present → render the parsed
//      recognition / elimination / tie-breaker parts as three labeled
//      paragraphs (reuses parseStructuredExplanation from the post-session
//      <StructuredExplanation> component, without its toggle-strike /
//      toggle-highlight interactivity).
//   2. structuredExplanation missing → fall back to candidate.explanation
//      prose. Pre-batch seed items use this branch.
//
// Edit mode: prose textarea for `explanation`; structured-explanation is
// edited as raw JSON in a textarea (v1 decision per the redirector —
// rich-edit-of-structured-parts is a later affordance). On Save, parse
// the JSON; if it fails Zod validation, surface the error inline and
// abort. Otherwise dispatch to submitEditAction.
//
// Explanation edits do NOT trigger embedding regen (embedding scope is
// body text only per audit step 12 — verified against
// embedding-backfill-steps.ts and sibling-generation-steps.ts).
//
// State boundary same as <StemOptionsTab>: form state lives in
// <ExplanationEdit>; tab switch unmounts and discards.

import * as errors from "@superbuilders/errors"
import * as React from "react"
import { parseStructuredExplanation } from "@/components/post-session/structured-explanation"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { logger } from "@/logger"
import { submitEditAction } from "@/server/admin/edit-actions"
import type { AdminCandidateRow } from "@/server/admin/item-detail-data"

interface ExplanationTabProps {
	readonly candidate: AdminCandidateRow
}

function partLabelFor(kind: "recognition" | "elimination" | "tie-breaker"): string {
	if (kind === "recognition") return "Recognition"
	if (kind === "elimination") return "Elimination"
	return "Tie-breaker"
}

function ExplanationTab({ candidate }: ExplanationTabProps) {
	const [mode, setMode] = React.useState<"view" | "edit">("view")
	if (mode === "view") {
		return (
			<ExplanationView
				candidate={candidate}
				onEdit={function startEdit() {
					setMode("edit")
				}}
			/>
		)
	}
	return (
		<ExplanationEdit
			candidate={candidate}
			onCancel={function cancelEdit() {
				setMode("view")
			}}
		/>
	)
}

interface ExplanationViewProps {
	readonly candidate: AdminCandidateRow
	readonly onEdit: () => void
}

function ExplanationView({ candidate, onEdit }: ExplanationViewProps) {
	const raw = candidate.metadata.structuredExplanation
	const parsed = raw === undefined ? null : parseStructuredExplanation(raw)

	let body: React.ReactNode
	if (parsed !== null) {
		const tieBreakerNode =
			parsed.tieBreaker === undefined ? null : (
				<article className="flex flex-col gap-1">
					<span className="text-[11px] text-text-3 uppercase tracking-[0.06em]">
						{partLabelFor("tie-breaker")}
					</span>
					<p className="text-[14px] text-text-1 leading-relaxed">{parsed.tieBreaker.text}</p>
				</article>
			)
		body = (
			<div className="flex flex-col gap-4">
				<article className="flex flex-col gap-1">
					<span className="text-[11px] text-text-3 uppercase tracking-[0.06em]">
						{partLabelFor("recognition")}
					</span>
					<p className="text-[14px] text-text-1 leading-relaxed">{parsed.recognition.text}</p>
				</article>
				<article className="flex flex-col gap-1">
					<span className="text-[11px] text-text-3 uppercase tracking-[0.06em]">
						{partLabelFor("elimination")}
					</span>
					<p className="text-[14px] text-text-1 leading-relaxed">{parsed.elimination.text}</p>
				</article>
				{tieBreakerNode}
			</div>
		)
	} else if (candidate.explanation !== undefined) {
		body = <p className="text-[14px] text-text-1 leading-relaxed">{candidate.explanation}</p>
	} else {
		body = (
			<p className="text-[13px] text-text-3 italic">
				No explanation recorded for this candidate.
			</p>
		)
	}

	return (
		<section className="overflow-hidden rounded-lg border border-border-soft bg-surface">
			<header className="flex items-baseline justify-between border-border-soft border-b px-4 pt-2 pb-1">
				<h3 className="font-medium font-serif text-[15px] text-text-1 tracking-[-0.005em]">
					Explanation
				</h3>
				<div className="flex items-center gap-2">
					<span className="text-[11px] text-text-3 uppercase tracking-[0.06em]">
						Generator output
					</span>
					<Button variant="outline" size="sm" onClick={onEdit}>
						Edit
					</Button>
				</div>
			</header>
			<div className="px-4 py-4">{body}</div>
		</section>
	)
}

interface FeedbackOk {
	readonly kind: "ok"
}

interface FeedbackErr {
	readonly kind: "err"
	readonly message: string
}

type Feedback = FeedbackOk | FeedbackErr

interface ExplanationEditProps {
	readonly candidate: AdminCandidateRow
	readonly onCancel: () => void
}

function ExplanationEdit({ candidate, onCancel }: ExplanationEditProps) {
	const originalExplanation = candidate.explanation === undefined ? "" : candidate.explanation
	const originalStructuredRaw = candidate.metadata.structuredExplanation
	const originalStructuredJson =
		originalStructuredRaw === undefined ? "" : JSON.stringify(originalStructuredRaw, null, 2)

	const [explanation, setExplanation] = React.useState<string>(originalExplanation)
	const [structuredJson, setStructuredJson] = React.useState<string>(originalStructuredJson)
	const [reasonNote, setReasonNote] = React.useState<string>("")
	const [feedback, setFeedback] = React.useState<Feedback | undefined>(undefined)
	const [isSubmitting, startSubmitTransition] = React.useTransition()

	type DeltaResult =
		| { readonly outcome: "ok"; readonly delta: Record<string, unknown> }
		| { readonly outcome: "err"; readonly message: string }

	function buildEditedFieldsDelta(): DeltaResult {
		const delta: Record<string, unknown> = {}
		const trimmedExplanation = explanation.trim()
		if (trimmedExplanation !== originalExplanation.trim()) {
			delta.explanation = trimmedExplanation
		}
		const trimmedStructured = structuredJson.trim()
		if (trimmedStructured !== originalStructuredJson.trim()) {
			if (trimmedStructured.length === 0) {
				return {
					outcome: "err",
					message:
						"Structured-explanation cannot be cleared via edit (delete the candidate instead)."
				}
			}
			const parseResult = errors.trySync(function parse() {
				return JSON.parse(trimmedStructured)
			})
			if (parseResult.error) {
				return {
					outcome: "err",
					message: `Structured-explanation JSON parse failed: ${parseResult.error.message}`
				}
			}
			delta.structuredExplanation = parseResult.data
		}
		return { outcome: "ok", delta }
	}

	function onSaveClick() {
		setFeedback(undefined)
		const built = buildEditedFieldsDelta()
		if (built.outcome === "err") {
			setFeedback({ kind: "err", message: built.message })
			return
		}
		const editedFields = built.delta
		if (Object.keys(editedFields).length === 0) {
			setFeedback({ kind: "err", message: "No changes to save." })
			return
		}
		const trimmedReason = reasonNote.trim()
		const reasonField = trimmedReason.length > 0 ? trimmedReason : undefined
		const input = {
			itemId: candidate.id,
			editedFields,
			reasonNote: reasonField,
			bucketChangeAcknowledged: false
		}
		startSubmitTransition(async function runSubmit() {
			const result = await errors.try(submitEditAction(input))
			if (result.error) {
				logger.warn(
					{ itemId: candidate.id, error: result.error },
					"ExplanationEdit: submitEditAction returned error (expected stub at commit-0)"
				)
				setFeedback({
					kind: "err",
					message: `Edit submission failed: ${result.error.message}`
				})
				return
			}
			setFeedback({ kind: "ok" })
		})
	}

	let feedbackNode: React.ReactNode = null
	if (feedback !== undefined) {
		if (feedback.kind === "ok") {
			feedbackNode = (
				<p className="rounded-md border border-cobalt/40 bg-lavender px-3 py-2 text-[12px] text-indigo">
					Saved.
				</p>
			)
		} else {
			feedbackNode = (
				<p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-[12px] text-destructive">
					{feedback.message}
				</p>
			)
		}
	}
	const saveLabel = isSubmitting ? "Saving…" : "Save"

	return (
		<section className="overflow-hidden rounded-lg border border-border-soft bg-surface">
			<header className="flex flex-wrap items-center gap-3 border-border-soft border-b px-4 py-2">
				<h3 className="font-medium font-serif text-[15px] text-text-1 tracking-[-0.005em]">
					Editing explanation
				</h3>
				<span className="inline-flex items-center rounded-sm bg-lavender px-[6px] py-[1px] font-medium text-[10px] text-indigo uppercase tracking-[0.06em]">
					Edit mode
				</span>
				<div className="ml-auto flex items-center gap-2">
					<Button variant="outline" size="sm" onClick={onCancel} disabled={isSubmitting}>
						Cancel
					</Button>
					<Button size="sm" onClick={onSaveClick} disabled={isSubmitting}>
						{saveLabel}
					</Button>
				</div>
			</header>
			<div className="flex flex-col gap-5 px-5 py-5">
				<div className="flex flex-col gap-2">
					<Label htmlFor="edit-explanation-prose">Explanation prose</Label>
					<Textarea
						id="edit-explanation-prose"
						value={explanation}
						rows={4}
						onChange={function onProseChange(event) {
							setExplanation(event.target.value)
						}}
					/>
				</div>
				<div className="flex flex-col gap-2">
					<Label htmlFor="edit-structured-json">
						Structured explanation (JSON; v1 raw edit)
					</Label>
					<Textarea
						id="edit-structured-json"
						value={structuredJson}
						rows={10}
						className="font-mono text-[12px]"
						placeholder='{"parts": [{"kind": "recognition", "text": "…", "referencedOptions": []}, …]}'
						onChange={function onJsonChange(event) {
							setStructuredJson(event.target.value)
						}}
					/>
				</div>
				<div className="flex flex-col gap-2">
					<Label htmlFor="edit-explanation-reason">Reason (optional, max 500 chars)</Label>
					<Textarea
						id="edit-explanation-reason"
						value={reasonNote}
						rows={2}
						maxLength={500}
						placeholder="Why is this edit needed?"
						onChange={function onReasonChange(event) {
							setReasonNote(event.target.value)
						}}
					/>
				</div>
				{feedbackNode}
			</div>
		</section>
	)
}

export type { ExplanationTabProps }
export { ExplanationTab }
