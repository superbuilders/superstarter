"use client"

import * as React from "react"
import { submitExperimentalItemAuditAction } from "@/app/(app)/experimental/actions"
import { Button } from "@/components/ui/button"
import { subTypes } from "@/config/sub-types"
import { logger } from "@/logger"
import type {
	ExperimentalReviewItem,
	ExperimentalReviewItemAudit
} from "@/server/experimental/review-data"

interface ExperimentalReviewAuditFormProps {
	sessionId: string
	item: ExperimentalReviewItem
}

interface AuditFormState {
	makesSense: string
	correctAnswerIsRight: string
	subjectTagIsRight: string
	difficultyIsRight: string
	suggestedSubject: string
	suggestedDifficulty: string
	notes: string
}

function booleanToValue(value: boolean | undefined): string {
	if (value === undefined) return ""
	return value ? "yes" : "no"
}

function valueToBoolean(value: string): boolean | undefined {
	if (value === "yes") return true
	if (value === "no") return false
	return undefined
}

function buildStateFromAudit(audit: ExperimentalReviewItemAudit | undefined): AuditFormState {
	return {
		makesSense: booleanToValue(audit?.makesSense),
		correctAnswerIsRight: booleanToValue(audit?.correctAnswerIsRight),
		subjectTagIsRight: booleanToValue(audit?.subjectTagIsRight),
		difficultyIsRight: booleanToValue(audit?.difficultyIsRight),
		suggestedSubject: audit?.suggestedSubject === undefined ? "" : audit.suggestedSubject,
		suggestedDifficulty:
			audit?.suggestedDifficulty === undefined ? "" : audit.suggestedDifficulty,
		notes: audit?.notes === undefined ? "" : audit.notes
	}
}

function formatWhen(ms: number): string {
	return new Intl.DateTimeFormat("en-US", {
		month: "short",
		day: "numeric",
		year: "numeric",
		hour: "numeric",
		minute: "2-digit"
	}).format(new Date(ms))
}

function readSuggestedSubject(value: string): string | undefined {
	if (value.length === 0) return undefined
	return value
}

function readSuggestedDifficulty(
	value: string
): "easy" | "medium" | "hard" | "brutal" | undefined {
	if (value === "easy") return value
	if (value === "medium") return value
	if (value === "hard") return value
	if (value === "brutal") return value
	return undefined
}

function ExperimentalReviewAuditForm(props: ExperimentalReviewAuditFormProps) {
	const [audit, setAudit] = React.useState<ExperimentalReviewItemAudit | undefined>(props.item.audit)
	const [formState, setFormState] = React.useState<AuditFormState>(function init() {
		return buildStateFromAudit(props.item.audit)
	})
	const [error, setError] = React.useState<string | undefined>(undefined)
	const [status, setStatus] = React.useState<string | undefined>(
		props.item.audit === undefined
			? undefined
			: `Saved ${formatWhen(props.item.audit.submittedAtMs)}`
	)
	const [isPending, startTransition] = React.useTransition()

	function updateField(field: keyof AuditFormState, value: string) {
		setFormState(function update(previous) {
			return { ...previous, [field]: value }
		})
	}

	function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
		event.preventDefault()
		setError(undefined)
		setStatus(undefined)
		const suggestedSubject = readSuggestedSubject(formState.suggestedSubject)
		const suggestedDifficulty = readSuggestedDifficulty(formState.suggestedDifficulty)
		startTransition(function submit() {
			void submitExperimentalItemAuditAction({
				experimentalSessionId: props.sessionId,
				experimentalAttemptId: props.item.attemptId,
				experimentalItemId: props.item.experimentalItemId,
				makesSense: valueToBoolean(formState.makesSense),
				correctAnswerIsRight: valueToBoolean(formState.correctAnswerIsRight),
				subjectTagIsRight: valueToBoolean(formState.subjectTagIsRight),
				difficultyIsRight: valueToBoolean(formState.difficultyIsRight),
				suggestedSubject,
				suggestedDifficulty,
				notes: formState.notes
			})
				.then(function onSuccess(savedAudit) {
					setAudit(savedAudit)
					setFormState(buildStateFromAudit(savedAudit))
					setStatus(`Saved ${formatWhen(savedAudit.submittedAtMs)}`)
				})
				.catch(function onError(err: unknown) {
					logger.error(
						{ err, attemptId: props.item.attemptId },
						"ExperimentalReviewAuditForm: submit failed"
					)
					setError("Couldn’t save this audit. Try again.")
				})
		})
	}

	const actionLabel = audit === undefined ? "Save audit" : "Update audit"
	return (
		<form onSubmit={handleSubmit} className="space-y-4">
			<div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
				<label className="flex flex-col gap-1 text-sm text-text-2">
					<span className="text-[11px] text-text-3 uppercase tracking-[0.06em]">Makes sense?</span>
					<select
						value={formState.makesSense}
						onChange={function onChange(event) {
							updateField("makesSense", event.target.value)
						}}
						className="rounded-md border border-border-soft bg-bg px-3 py-2 text-sm text-text-1 focus-visible:outline focus-visible:outline-2 focus-visible:outline-cobalt focus-visible:outline-offset-2"
					>
						<option value="">Leave blank</option>
						<option value="yes">Yes</option>
						<option value="no">No</option>
					</select>
				</label>
				<label className="flex flex-col gap-1 text-sm text-text-2">
					<span className="text-[11px] text-text-3 uppercase tracking-[0.06em]">Correct answer right?</span>
					<select
						value={formState.correctAnswerIsRight}
						onChange={function onChange(event) {
							updateField("correctAnswerIsRight", event.target.value)
						}}
						className="rounded-md border border-border-soft bg-bg px-3 py-2 text-sm text-text-1 focus-visible:outline focus-visible:outline-2 focus-visible:outline-cobalt focus-visible:outline-offset-2"
					>
						<option value="">Leave blank</option>
						<option value="yes">Yes</option>
						<option value="no">No</option>
					</select>
				</label>
				<label className="flex flex-col gap-1 text-sm text-text-2">
					<span className="text-[11px] text-text-3 uppercase tracking-[0.06em]">Subject tag right?</span>
					<select
						value={formState.subjectTagIsRight}
						onChange={function onChange(event) {
							updateField("subjectTagIsRight", event.target.value)
						}}
						className="rounded-md border border-border-soft bg-bg px-3 py-2 text-sm text-text-1 focus-visible:outline focus-visible:outline-2 focus-visible:outline-cobalt focus-visible:outline-offset-2"
					>
						<option value="">Leave blank</option>
						<option value="yes">Yes</option>
						<option value="no">No</option>
					</select>
				</label>
				<label className="flex flex-col gap-1 text-sm text-text-2">
					<span className="text-[11px] text-text-3 uppercase tracking-[0.06em]">Difficulty right?</span>
					<select
						value={formState.difficultyIsRight}
						onChange={function onChange(event) {
							updateField("difficultyIsRight", event.target.value)
						}}
						className="rounded-md border border-border-soft bg-bg px-3 py-2 text-sm text-text-1 focus-visible:outline focus-visible:outline-2 focus-visible:outline-cobalt focus-visible:outline-offset-2"
					>
						<option value="">Leave blank</option>
						<option value="yes">Yes</option>
						<option value="no">No</option>
					</select>
				</label>
			</div>
			<div className="grid gap-3 md:grid-cols-2">
				<label className="flex flex-col gap-1 text-sm text-text-2">
					<span className="text-[11px] text-text-3 uppercase tracking-[0.06em]">Suggested subject</span>
					<select
						value={formState.suggestedSubject}
						onChange={function onChange(event) {
							updateField("suggestedSubject", event.target.value)
						}}
						className="rounded-md border border-border-soft bg-bg px-3 py-2 text-sm text-text-1 focus-visible:outline focus-visible:outline-2 focus-visible:outline-cobalt focus-visible:outline-offset-2"
					>
						<option value="">No suggestion</option>
						{subTypes.map(function renderSubType(subType) {
							return (
								<option key={subType.id} value={subType.id}>
									{subType.displayName}
								</option>
							)
						})}
					</select>
				</label>
				<label className="flex flex-col gap-1 text-sm text-text-2">
					<span className="text-[11px] text-text-3 uppercase tracking-[0.06em]">Suggested difficulty</span>
					<select
						value={formState.suggestedDifficulty}
						onChange={function onChange(event) {
							updateField("suggestedDifficulty", event.target.value)
						}}
						className="rounded-md border border-border-soft bg-bg px-3 py-2 text-sm text-text-1 focus-visible:outline focus-visible:outline-2 focus-visible:outline-cobalt focus-visible:outline-offset-2"
					>
						<option value="">No suggestion</option>
						<option value="easy">Easy</option>
						<option value="medium">Medium</option>
						<option value="hard">Hard</option>
						<option value="brutal">Brutal</option>
					</select>
				</label>
			</div>
			<label className="flex flex-col gap-1 text-sm text-text-2">
				<span className="text-[11px] text-text-3 uppercase tracking-[0.06em]">Notes</span>
				<textarea
					value={formState.notes}
					onChange={function onChange(event) {
						updateField("notes", event.target.value)
					}}
					rows={4}
					placeholder="Optional notes about the prompt, answer key, subject tag, or difficulty."
					className="min-h-28 rounded-md border border-border-soft bg-bg px-3 py-2 text-sm text-text-1 focus-visible:outline focus-visible:outline-2 focus-visible:outline-cobalt focus-visible:outline-offset-2"
				/>
			</label>
			<div className="flex flex-wrap items-center gap-3">
				<Button type="submit" disabled={isPending} size="lg">
					{isPending ? "Saving…" : actionLabel}
				</Button>
				{status === undefined ? null : <p className="text-sm text-text-2">{status}</p>}
				{error === undefined ? null : (
					<p className="text-pace-over text-sm" role="alert">
						{error}
					</p>
				)}
			</div>
		</form>
	)
}

export { ExperimentalReviewAuditForm }
