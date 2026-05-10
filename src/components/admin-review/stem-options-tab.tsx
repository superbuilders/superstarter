"use client"

// <StemOptionsTab> — admin candidate stem + options display + edit (Phase
// 4 sub-phase b §2.3 commit 0).
//
// View mode: read-only display preserved verbatim from §2.2 commit-0
// (post-aesthetic state at commit 800a989). Options listed with the
// 8-character generator IDs left-aligned in a w-20 column and a "Correct"
// cobalt badge marking the correctAnswer row.
//
// Edit mode: controlled form for stem body, option text (per-option),
// correct-answer selection, sub-type, difficulty, plus an optional reason
// note. Save flow:
//   1. Compute the editedFields delta vs the original candidate.
//   2. If sub-type or difficulty changed → open <BucketChangeConfirm>
//      modal (Q5 ratification — explicit acknowledgement before
//      submission).
//   3. Confirmed (or non-bucket-change): call submitEditAction with the
//      computed delta.
//   4. The stub action throws ErrEditNotYetImplemented after pre-flight
//      validation; surface that error inline as feedback so the admin
//      sees the affordance is wired but the persistence path is pending
//      §2.3 commit-1.
//
// State boundary: form state lives entirely in <StemOptionsEdit>. The
// parent <AdminItemDetailContent> drives tab routing only; switching to
// another tab unmounts this component and discards in-progress edits.
// Redirector ratified this trade-off (NO global form state across tabs;
// cancellation per tab discards independently); UX gap surfaced for
// commit-1 if the discard-on-tab-switch friction matters.

import * as errors from "@superbuilders/errors"
import * as React from "react"
import { BucketChangeConfirm } from "@/components/admin-review/bucket-change-confirm"
import { NumberSeriesBody } from "@/components/item/body-renderers/number-series"
import { TextBody } from "@/components/item/body-renderers/text"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { type Difficulty, type SubTypeConfig, type SubTypeId, subTypes } from "@/config/sub-types"
import { logger } from "@/logger"
import { submitEditAction } from "@/server/admin/edit-actions"
import type { AdminCandidateRow } from "@/server/admin/item-detail-data"
import type { ItemBody } from "@/server/items/body-schema"

const NUMBER_SERIES_SUB_TYPE_ID = "numerical.number_series"
const DIFFICULTY_VALUES: ReadonlyArray<Difficulty> = ["easy", "medium", "hard", "brutal"]
const SUB_TYPE_LIST: ReadonlyArray<SubTypeConfig> = subTypes

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

function difficultyLabelFor(diff: Difficulty): string {
	if (diff === "easy") return "Easy"
	if (diff === "medium") return "Medium"
	if (diff === "hard") return "Hard"
	return "Brutal"
}

interface StemOptionsTabProps {
	readonly candidate: AdminCandidateRow
}

function StemOptionsTab({ candidate }: StemOptionsTabProps) {
	const [mode, setMode] = React.useState<"view" | "edit">("view")
	if (mode === "view") {
		return (
			<StemOptionsView
				candidate={candidate}
				onEdit={function startEdit() {
					setMode("edit")
				}}
			/>
		)
	}
	return (
		<StemOptionsEdit
			candidate={candidate}
			onCancel={function cancelEdit() {
				setMode("view")
			}}
		/>
	)
}

interface StemOptionsViewProps {
	readonly candidate: AdminCandidateRow
	readonly onEdit: () => void
}

function StemOptionsView({ candidate, onEdit }: StemOptionsViewProps) {
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
				<span className="text-[11px] text-text-3 uppercase tracking-[0.06em]">{sectionTag}</span>
				<span className="inline-flex items-center justify-center rounded-sm border border-border-soft bg-surface-2 px-[6px] py-[2px] font-medium text-[10px] text-text-2 uppercase tracking-[0.06em]">
					{difficultyLabel}
				</span>
				{pressureBadge}
				{statusBadge}
				<div className="ml-auto">
					<Button variant="outline" size="sm" onClick={onEdit}>
						Edit
					</Button>
				</div>
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
								<span
									className="w-20 shrink-0 font-mono text-[11px] text-text-3 tabular-nums"
									title={`option id: ${option.id}`}
								>
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

interface EditOption {
	readonly id: string
	text: string
}

interface FeedbackOk {
	readonly kind: "ok"
}

interface FeedbackErr {
	readonly kind: "err"
	readonly message: string
}

type Feedback = FeedbackOk | FeedbackErr

interface StemOptionsEditProps {
	readonly candidate: AdminCandidateRow
	readonly onCancel: () => void
}

function StemOptionsEdit({ candidate, onCancel }: StemOptionsEditProps) {
	const originalBodyText = candidate.body.kind === "text" ? candidate.body.text : ""
	const originalOptions: ReadonlyArray<EditOption> = candidate.options.map(function toEdit(o) {
		return { id: o.id, text: o.text }
	})

	const [bodyText, setBodyText] = React.useState<string>(originalBodyText)
	const [options, setOptions] = React.useState<ReadonlyArray<EditOption>>(originalOptions)
	const [correctAnswer, setCorrectAnswer] = React.useState<string>(candidate.correctAnswer)
	const [subTypeId, setSubTypeId] = React.useState<SubTypeId>(candidate.subTypeId)
	const [difficulty, setDifficulty] = React.useState<Difficulty>(candidate.difficulty)
	const [reasonNote, setReasonNote] = React.useState<string>("")
	const [feedback, setFeedback] = React.useState<Feedback | undefined>(undefined)
	const [pendingBucketChange, setPendingBucketChange] = React.useState<boolean>(false)
	const [isSubmitting, startSubmitTransition] = React.useTransition()

	function buildEditedFieldsDelta() {
		const delta: Record<string, unknown> = {}
		const trimmedBody = bodyText.trim()
		if (trimmedBody !== originalBodyText.trim()) {
			delta.body = { kind: "text", text: trimmedBody }
		}
		const optionsChanged = options.some(function diff(o, i) {
			const original = originalOptions[i]
			if (original === undefined) return true
			return o.text.trim() !== original.text.trim()
		})
		if (optionsChanged) {
			delta.options = options.map(function clean(o) {
				return { id: o.id, text: o.text.trim() }
			})
		}
		if (correctAnswer !== candidate.correctAnswer) {
			delta.correctAnswer = correctAnswer
		}
		if (subTypeId !== candidate.subTypeId) {
			delta.subTypeId = subTypeId
		}
		if (difficulty !== candidate.difficulty) {
			delta.difficulty = difficulty
		}
		return delta
	}

	function dispatchSubmit(bucketChangeAcknowledged: boolean) {
		const editedFields = buildEditedFieldsDelta()
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
			bucketChangeAcknowledged
		}
		startSubmitTransition(async function runSubmit() {
			const result = await errors.try(submitEditAction(input))
			if (result.error) {
				logger.warn(
					{ itemId: candidate.id, error: result.error },
					"StemOptionsEdit: submitEditAction returned error (expected stub at commit-0)"
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

	function onSaveClick() {
		setFeedback(undefined)
		if (subTypeId !== candidate.subTypeId || difficulty !== candidate.difficulty) {
			setPendingBucketChange(true)
			return
		}
		dispatchSubmit(false)
	}

	function onBucketChangeConfirm() {
		setPendingBucketChange(false)
		dispatchSubmit(true)
	}

	function setOptionText(id: string, text: string) {
		setOptions(function applyEdit(prev) {
			return prev.map(function rewrite(row) {
				if (row.id !== id) return row
				return { id, text }
			})
		})
	}

	const feedbackNode = feedback === undefined ? null : <FeedbackBanner feedback={feedback} />
	const saveLabel = isSubmitting ? "Saving…" : "Save"

	return (
		<section className="overflow-hidden rounded-lg border border-border-soft bg-surface">
			<header className="flex flex-wrap items-center gap-3 border-border-soft border-b px-4 py-2">
				<span className="font-medium text-[13px] text-text-1">Editing stem &amp; options</span>
				<span className="inline-flex items-center rounded-sm bg-lavender px-[6px] py-[1px] font-medium text-[10px] text-indigo uppercase tracking-[0.06em]">
					Edit mode
				</span>
				<div className="ml-auto flex items-center gap-2">
					<Button
						variant="outline"
						size="sm"
						onClick={onCancel}
						disabled={isSubmitting}
					>
						Cancel
					</Button>
					<Button size="sm" onClick={onSaveClick} disabled={isSubmitting}>
						{saveLabel}
					</Button>
				</div>
			</header>
			<div className="flex flex-col gap-5 px-5 py-5">
				<div className="flex flex-col gap-2">
					<Label htmlFor="edit-stem-body">Stem prompt</Label>
					<Textarea
						id="edit-stem-body"
						value={bodyText}
						rows={4}
						onChange={function onBodyChange(event) {
							setBodyText(event.target.value)
						}}
					/>
				</div>

				<fieldset className="flex flex-col gap-2">
					<legend className="font-medium text-[13px] text-text-1">Options</legend>
					{options.map(function renderOptionInput(option) {
						const isCorrect = option.id === correctAnswer
						return (
							<div
								key={option.id}
								className="flex w-full items-center gap-3 rounded-md border border-border-soft bg-surface px-3 py-2"
							>
								<input
									type="radio"
									name="edit-correct-answer"
									value={option.id}
									checked={isCorrect}
									aria-label={`Mark option ${option.id} as correct`}
									onChange={function onCorrect() {
										setCorrectAnswer(option.id)
									}}
								/>
								<span
									className="w-20 shrink-0 font-mono text-[11px] text-text-3 tabular-nums"
									title={`option id: ${option.id}`}
								>
									{option.id}
								</span>
								<Input
									value={option.text}
									onChange={function onOptText(event) {
										setOptionText(option.id, event.target.value)
									}}
								/>
							</div>
						)
					})}
				</fieldset>

				<div className="grid grid-cols-1 gap-4 md:grid-cols-2">
					<div className="flex flex-col gap-2">
						<Label htmlFor="edit-sub-type">Sub-type</Label>
						<select
							id="edit-sub-type"
							value={subTypeId}
							onChange={function onSubTypeChange(event) {
								const next = readSubTypeId(event.target.value)
								if (next === undefined) return
								setSubTypeId(next)
							}}
							className="h-8 w-full rounded-md border border-border-soft bg-surface px-2 text-[12px] text-text-1"
						>
							{SUB_TYPE_LIST.map(function renderSubType(s) {
								return (
									<option key={s.id} value={s.id}>
										{s.displayName} ({s.section})
									</option>
								)
							})}
						</select>
					</div>
					<div className="flex flex-col gap-2">
						<Label htmlFor="edit-difficulty">Difficulty</Label>
						<select
							id="edit-difficulty"
							value={difficulty}
							onChange={function onDifficultyChange(event) {
								const next = readDifficulty(event.target.value)
								if (next === undefined) return
								setDifficulty(next)
							}}
							className="h-8 w-full rounded-md border border-border-soft bg-surface px-2 text-[12px] text-text-1"
						>
							{DIFFICULTY_VALUES.map(function renderDifficulty(d) {
								return (
									<option key={d} value={d}>
										{difficultyLabelFor(d)}
									</option>
								)
							})}
						</select>
					</div>
				</div>

				<div className="flex flex-col gap-2">
					<Label htmlFor="edit-reason-note">Reason (optional, max 500 chars)</Label>
					<Textarea
						id="edit-reason-note"
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

			<BucketChangeConfirm
				open={pendingBucketChange}
				currentSubType={candidate.subTypeId}
				currentDifficulty={candidate.difficulty}
				newSubType={subTypeId}
				newDifficulty={difficulty}
				onConfirm={onBucketChangeConfirm}
				onCancel={function dismissBucketChange() {
					setPendingBucketChange(false)
				}}
			/>
		</section>
	)
}

function readSubTypeId(raw: string): SubTypeId | undefined {
	const match = SUB_TYPE_LIST.find(function eq(s) {
		return s.id === raw
	})
	if (match === undefined) return undefined
	return match.id
}

function readDifficulty(raw: string): Difficulty | undefined {
	const match = DIFFICULTY_VALUES.find(function eq(d) {
		return d === raw
	})
	return match
}

interface FeedbackBannerProps {
	readonly feedback: Feedback
}

function FeedbackBanner({ feedback }: FeedbackBannerProps) {
	if (feedback.kind === "ok") {
		return (
			<p className="rounded-md border border-cobalt/40 bg-lavender px-3 py-2 text-[12px] text-indigo">
				Saved.
			</p>
		)
	}
	return (
		<p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-[12px] text-destructive">
			{feedback.message}
		</p>
	)
}

export type { StemOptionsTabProps }
export { StemOptionsTab }
