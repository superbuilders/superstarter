"use client"

import * as React from "react"
import { submitExperimentalItemProposalAction } from "@/app/(app)/experimental/actions"
import { Button } from "@/components/ui/button"
import { subTypes } from "@/config/sub-types"
import { logger } from "@/logger"
import type {
	ExperimentalReviewItem,
	ExperimentalReviewItemProposal
} from "@/server/experimental/review-data"

interface ExperimentalReviewProposalFormProps {
	sessionId: string
	item: ExperimentalReviewItem
}

interface ProposalOptionState {
	id: string
	text: string
}

interface ProposalFormState {
	proposedStem: string
	proposedOptions: ProposalOptionState[]
	proposedCorrectAnswer: string
	proposedExplanation: string
	suggestedSubject: string
	suggestedDifficulty: string
	rationale: string
}

function buildStateFromItem(item: ExperimentalReviewItem): ProposalFormState {
	const proposal = item.proposal
	const proposedOptions =
		proposal?.proposedOptions === undefined
			? item.options.map(function mapOption(option) {
				return { id: option.id, text: option.text }
			})
			: proposal.proposedOptions.map(function mapOption(option) {
				return { id: option.id, text: option.text }
			})
	const proposedStem = proposal?.proposedStem === undefined ? item.prompt : proposal.proposedStem
	const proposedCorrectAnswer =
		proposal?.proposedCorrectAnswer === undefined
			? item.correctAnswer
			: proposal.proposedCorrectAnswer
	const proposedExplanation =
		proposal?.proposedExplanation === undefined
			? item.explanation === undefined
				? ""
				: item.explanation
			: proposal.proposedExplanation
	return {
		proposedStem,
		proposedOptions,
		proposedCorrectAnswer,
		proposedExplanation,
		suggestedSubject:
			proposal?.suggestedSubject === undefined ? "" : proposal.suggestedSubject,
		suggestedDifficulty:
			proposal?.suggestedDifficulty === undefined ? "" : proposal.suggestedDifficulty,
		rationale: proposal?.rationale === undefined ? "" : proposal.rationale
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

function normalizeProposalForPayload(state: ProposalFormState): {
	proposedStem: string
	proposedOptions: { id: string; text: string }[]
	proposedCorrectAnswer: string
	proposedExplanation: string
	suggestedSubject?: string
	suggestedDifficulty?: "easy" | "medium" | "hard" | "brutal"
	rationale: string
} {
	const proposedOptions = state.proposedOptions.map(function mapOption(option) {
		return { id: option.id, text: option.text }
	})
	return {
		proposedStem: state.proposedStem,
		proposedOptions,
		proposedCorrectAnswer: state.proposedCorrectAnswer,
		proposedExplanation: state.proposedExplanation,
		suggestedSubject: readSuggestedSubject(state.suggestedSubject),
		suggestedDifficulty: readSuggestedDifficulty(state.suggestedDifficulty),
		rationale: state.rationale
	}
}

function ExperimentalReviewProposalForm(props: ExperimentalReviewProposalFormProps) {
	const [proposal, setProposal] = React.useState<ExperimentalReviewItemProposal | undefined>(
		props.item.proposal
	)
	const [formState, setFormState] = React.useState<ProposalFormState>(function init() {
		return buildStateFromItem(props.item)
	})
	const [error, setError] = React.useState<string | undefined>(undefined)
	const [status, setStatus] = React.useState<string | undefined>(
		props.item.proposal === undefined
			? undefined
			: `Saved ${formatWhen(props.item.proposal.submittedAtMs)}`
	)
	const [isPending, startTransition] = React.useTransition()

	function updateField(field: keyof Omit<ProposalFormState, "proposedOptions">, value: string) {
		setFormState(function update(previous) {
			return { ...previous, [field]: value }
		})
	}

	function updateOptionText(index: number, value: string) {
		setFormState(function update(previous) {
			const proposedOptions = previous.proposedOptions.map(function mapOption(option, optionIndex) {
				if (optionIndex !== index) return option
				return { ...option, text: value }
			})
			return { ...previous, proposedOptions }
		})
	}

	function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
		event.preventDefault()
		setError(undefined)
		setStatus(undefined)
		const payload = normalizeProposalForPayload(formState)
		startTransition(function submit() {
			void submitExperimentalItemProposalAction({
				experimentalSessionId: props.sessionId,
				experimentalAttemptId: props.item.attemptId,
				experimentalItemId: props.item.experimentalItemId,
				proposedStem: payload.proposedStem,
				proposedOptions: payload.proposedOptions,
				proposedCorrectAnswer: payload.proposedCorrectAnswer,
				proposedExplanation: payload.proposedExplanation,
				suggestedSubject: payload.suggestedSubject,
				suggestedDifficulty: payload.suggestedDifficulty,
				rationale: payload.rationale
			})
				.then(function onSuccess(savedProposal) {
					setProposal(savedProposal)
					setFormState(buildStateFromItem({ ...props.item, proposal: savedProposal }))
					setStatus(`Saved ${formatWhen(savedProposal.submittedAtMs)}`)
				})
				.catch(function onError(err: unknown) {
					logger.error(
						{ err, experimentalItemId: props.item.experimentalItemId },
						"ExperimentalReviewProposalForm: submit failed"
					)
					setError("Couldn’t save this proposal. Try again.")
				})
		})
	}

	const actionLabel = proposal === undefined ? "Save proposal" : "Update proposal"
	return (
		<form onSubmit={handleSubmit} className="space-y-4">
			<label className="flex flex-col gap-1 text-sm text-text-2">
				<span className="text-[11px] text-text-3 uppercase tracking-[0.06em]">Proposed stem</span>
				<textarea
					value={formState.proposedStem}
					onChange={function onChange(event) {
						updateField("proposedStem", event.target.value)
					}}
					rows={4}
					className="min-h-28 rounded-md border border-border-soft bg-bg px-3 py-2 text-sm text-text-1 focus-visible:outline focus-visible:outline-2 focus-visible:outline-cobalt focus-visible:outline-offset-2"
				/>
			</label>
			<div className="space-y-3">
				<p className="text-[11px] text-text-3 uppercase tracking-[0.06em]">Proposed options</p>
				<div className="grid gap-3 md:grid-cols-2">
					{formState.proposedOptions.map(function renderOption(option, index) {
						return (
							<label key={option.id} className="flex flex-col gap-1 text-sm text-text-2">
								<span>Option {option.id}</span>
								<input
									value={option.text}
									onChange={function onChange(event) {
										updateOptionText(index, event.target.value)
									}}
									className="rounded-md border border-border-soft bg-bg px-3 py-2 text-sm text-text-1 focus-visible:outline focus-visible:outline-2 focus-visible:outline-cobalt focus-visible:outline-offset-2"
								/>
							</label>
						)
					})}
				</div>
			</div>
			<div className="grid gap-3 md:grid-cols-2">
				<label className="flex flex-col gap-1 text-sm text-text-2">
					<span className="text-[11px] text-text-3 uppercase tracking-[0.06em]">Proposed correct answer</span>
					<select
						value={formState.proposedCorrectAnswer}
						onChange={function onChange(event) {
							updateField("proposedCorrectAnswer", event.target.value)
						}}
						className="rounded-md border border-border-soft bg-bg px-3 py-2 text-sm text-text-1 focus-visible:outline focus-visible:outline-2 focus-visible:outline-cobalt focus-visible:outline-offset-2"
					>
						{formState.proposedOptions.map(function renderOption(option) {
							return (
								<option key={option.id} value={option.id}>
									{option.id}
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
				<span className="text-[11px] text-text-3 uppercase tracking-[0.06em]">Proposed explanation</span>
				<textarea
					value={formState.proposedExplanation}
					onChange={function onChange(event) {
						updateField("proposedExplanation", event.target.value)
					}}
					rows={4}
					className="min-h-28 rounded-md border border-border-soft bg-bg px-3 py-2 text-sm text-text-1 focus-visible:outline focus-visible:outline-2 focus-visible:outline-cobalt focus-visible:outline-offset-2"
				/>
			</label>
			<label className="flex flex-col gap-1 text-sm text-text-2">
				<span className="text-[11px] text-text-3 uppercase tracking-[0.06em]">Rationale</span>
				<textarea
					value={formState.rationale}
					onChange={function onChange(event) {
						updateField("rationale", event.target.value)
					}}
					rows={4}
					placeholder="Why should this item be revised?"
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

export { ExperimentalReviewProposalForm }
