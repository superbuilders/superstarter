"use client"

import * as React from "react"
import * as errors from "@superbuilders/errors"
import { ingestItemAction, suggestTagsAction } from "@/app/(admin)/admin/ingest/actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
	type Difficulty,
	subTypeIds,
	type SubTypeId,
	type SubTypeConfig
} from "@/config/sub-types"

const DIFFICULTY_VALUES = ["easy", "medium", "hard", "brutal"] as const

function isSubTypeId(value: string): value is SubTypeId {
	return subTypeIds.some(function matches(id) {
		return id === value
	})
}

function isDifficulty(value: string): value is Difficulty {
	return DIFFICULTY_VALUES.some(function matches(d) {
		return d === value
	})
}

const OPTION_IDS = ["A", "B", "C", "D", "E"] as const

type OptionId = (typeof OPTION_IDS)[number]

interface OptionRow {
	id: OptionId
	text: string
}

const RECENT_LIMIT = 5

function addOptionDisabled(optionCount: number, busy: boolean): boolean {
	if (optionCount >= 5) return true
	return busy
}

function removeOptionDisabled(optionCount: number, busy: boolean): boolean {
	if (optionCount <= 4) return true
	return busy
}

interface FeedbackOk {
	kind: "ok"
	itemId: string
}

interface FeedbackErr {
	kind: "err"
	message: string
}

type Feedback = FeedbackOk | FeedbackErr

interface IngestFormProps {
	subTypes: ReadonlyArray<SubTypeConfig>
}

function IngestForm(props: IngestFormProps) {
	const [bodyText, setBodyText] = React.useState("")
	const [options, setOptions] = React.useState<OptionRow[]>([
		{ id: "A", text: "" },
		{ id: "B", text: "" },
		{ id: "C", text: "" },
		{ id: "D", text: "" }
	])
	const [correctAnswer, setCorrectAnswer] = React.useState<OptionId>("A")
	const [subTypeId, setSubTypeId] = React.useState<SubTypeId | "">("")
	const [difficulty, setDifficulty] = React.useState<Difficulty | "">("")
	const [explanation, setExplanation] = React.useState("")
	const [recent, setRecent] = React.useState<string[]>([])
	const [feedback, setFeedback] = React.useState<Feedback | undefined>(undefined)
	const [isSubmitting, startSubmitTransition] = React.useTransition()
	const [isSuggesting, startSuggestTransition] = React.useTransition()

	function setOptionText(id: OptionId, text: string) {
		setOptions(function applyEdit(prev) {
			return prev.map(function rewrite(row) {
				if (row.id !== id) return row
				return { id, text }
			})
		})
	}

	function addOption() {
		setOptions(function applyAdd(prev) {
			if (prev.length >= 5) return prev
			const nextId = OPTION_IDS[prev.length]
			if (!nextId) return prev
			return [...prev, { id: nextId, text: "" }]
		})
	}

	function removeOption() {
		setOptions(function applyRemove(prev) {
			if (prev.length <= 4) return prev
			const next = prev.slice(0, prev.length - 1)
			const last = next[next.length - 1]
			if (correctAnswer === prev[prev.length - 1]?.id && last) {
				setCorrectAnswer(last.id)
			}
			return next
		})
	}

	function handleSuggest() {
		if (!bodyText.trim()) return
		const optionTexts = options.map(function pickText(o) {
			return o.text
		})
		startSuggestTransition(async function runSuggest() {
			const result = await errors.try(
				suggestTagsAction({ prompt: bodyText, options: optionTexts })
			)
			if (result.error) {
				setFeedback({ kind: "err", message: "Suggest failed; check logs." })
				return
			}
			const tags = result.data
			// Only fill empty fields — never override what the admin already set.
			if (subTypeId === "") setSubTypeId(tags.subTypeId)
			if (difficulty === "") setDifficulty(tags.difficulty)
		})
	}

	function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
		event.preventDefault()
		setFeedback(undefined)

		if (!subTypeId) {
			setFeedback({ kind: "err", message: "Pick a sub-type." })
			return
		}
		if (!difficulty) {
			setFeedback({ kind: "err", message: "Pick a difficulty." })
			return
		}
		const trimmedBody = bodyText.trim()
		if (!trimmedBody) {
			setFeedback({ kind: "err", message: "Question prompt is required." })
			return
		}
		const cleanedOptions = options
			.map(function trim(row) {
				return { id: row.id, text: row.text.trim() }
			})
			.filter(function notEmpty(row) {
				return row.text.length > 0
			})
		if (cleanedOptions.length < 2) {
			setFeedback({ kind: "err", message: "At least two options with text are required." })
			return
		}
		const correctMatch = cleanedOptions.find(function match(o) {
			return o.id === correctAnswer
		})
		if (!correctMatch) {
			setFeedback({ kind: "err", message: "Correct answer must reference a non-empty option." })
			return
		}

		const trimmedExplanation = explanation.trim()
		const explanationField = trimmedExplanation.length > 0 ? trimmedExplanation : undefined

		startSubmitTransition(async function runSubmit() {
			const result = await errors.try(
				ingestItemAction({
					subTypeId,
					difficulty,
					body: { kind: "text", text: trimmedBody },
					options: cleanedOptions,
					correctAnswer,
					explanation: explanationField
				})
			)
			if (result.error) {
				setFeedback({ kind: "err", message: "Ingest failed; check logs." })
				return
			}
			const itemId = result.data.itemId
			setFeedback({ kind: "ok", itemId })
			setBodyText("")
			setExplanation("")
			setOptions([
				{ id: "A", text: "" },
				{ id: "B", text: "" },
				{ id: "C", text: "" },
				{ id: "D", text: "" }
			])
			setCorrectAnswer("A")
			setSubTypeId("")
			setDifficulty("")
			setRecent(function pushRecent(prev) {
				return [itemId, ...prev].slice(0, RECENT_LIMIT)
			})
		})
	}

	function eitherPending(): boolean {
		return isSubmitting || isSuggesting
	}
	const submitDisabled = eitherPending()
	function computeSuggestDisabled(): boolean {
		if (eitherPending()) return true
		return bodyText.trim().length === 0
	}
	const suggestDisabled = computeSuggestDisabled()

	return (
		<form onSubmit={handleSubmit} className="flex flex-col gap-6">
			<div className="flex flex-col gap-2">
				<Label htmlFor="ingest-body">Question prompt</Label>
				<Textarea
					id="ingest-body"
					value={bodyText}
					onChange={function onBodyChange(event) {
						setBodyText(event.target.value)
					}}
					placeholder="Paste or type the question text here."
					rows={4}
				/>
			</div>

			<fieldset className="flex flex-col gap-3">
				<legend className="font-medium text-sm">Options</legend>
				<div className="flex flex-col gap-2">
					{options.map(function renderOption(row) {
						return (
							<div key={row.id} className="flex items-center gap-2">
								<input
									type="radio"
									name="correct-answer"
									value={row.id}
									checked={correctAnswer === row.id}
									onChange={function onSelectCorrect() {
										setCorrectAnswer(row.id)
									}}
									aria-label={`Mark option ${row.id} as correct`}
								/>
								<span className="w-6 font-mono text-muted-foreground text-sm">
									{row.id}.
								</span>
								<Input
									value={row.text}
									onChange={function onOptionChange(event) {
										setOptionText(row.id, event.target.value)
									}}
									placeholder={`Option ${row.id}`}
								/>
							</div>
						)
					})}
				</div>
				<div className="flex gap-2">
					<Button
						type="button"
						variant="outline"
						size="sm"
						onClick={addOption}
						disabled={addOptionDisabled(options.length, submitDisabled)}
					>
						Add option
					</Button>
					<Button
						type="button"
						variant="outline"
						size="sm"
						onClick={removeOption}
						disabled={removeOptionDisabled(options.length, submitDisabled)}
					>
						Remove option
					</Button>
				</div>
			</fieldset>

			<div className="grid grid-cols-1 gap-4 md:grid-cols-2">
				<div className="flex flex-col gap-2">
					<Label htmlFor="ingest-sub-type">Sub-type</Label>
					<select
						id="ingest-sub-type"
						value={subTypeId}
						onChange={function onSubTypeChange(event) {
							const value = event.target.value
							if (value === "") {
								setSubTypeId("")
								return
							}
							if (!isSubTypeId(value)) return
							setSubTypeId(value)
						}}
						className="h-8 w-full rounded-lg border border-input bg-background px-2 text-sm"
					>
						<option value="">— select —</option>
						{props.subTypes.map(function renderSubType(entry) {
							return (
								<option key={entry.id} value={entry.id}>
									{entry.displayName} ({entry.section})
								</option>
							)
						})}
					</select>
				</div>
				<div className="flex flex-col gap-2">
					<Label htmlFor="ingest-difficulty">Difficulty</Label>
					<select
						id="ingest-difficulty"
						value={difficulty}
						onChange={function onDifficultyChange(event) {
							const value = event.target.value
							if (value === "") {
								setDifficulty("")
								return
							}
							if (!isDifficulty(value)) return
							setDifficulty(value)
						}}
						className="h-8 w-full rounded-lg border border-input bg-background px-2 text-sm"
					>
						<option value="">— select —</option>
						{DIFFICULTY_VALUES.map(function renderDifficulty(d) {
							return (
								<option key={d} value={d}>
									{d}
								</option>
							)
						})}
					</select>
				</div>
			</div>

			<div className="flex flex-col gap-2">
				<Label htmlFor="ingest-explanation">Explanation (optional)</Label>
				<Textarea
					id="ingest-explanation"
					value={explanation}
					onChange={function onExplanationChange(event) {
						setExplanation(event.target.value)
					}}
					placeholder="Why is the correct answer correct?"
					rows={3}
				/>
			</div>

			<div className="flex items-center gap-2">
				<Button
					type="button"
					variant="outline"
					onClick={handleSuggest}
					disabled={suggestDisabled}
				>
					{isSuggesting ? "Suggesting…" : "Suggest"}
				</Button>
				<Button type="submit" disabled={submitDisabled}>
					{isSubmitting ? "Ingesting…" : "Ingest item"}
				</Button>
			</div>

			{feedback?.kind === "ok" ? (
				<p className="text-green-600 text-sm dark:text-green-400">
					Saved. Item id: <code className="font-mono">{feedback.itemId}</code>
				</p>
			) : null}
			{feedback?.kind === "err" ? (
				<p className="text-destructive text-sm">{feedback.message}</p>
			) : null}

			{recent.length > 0 ? (
				<div className="flex flex-col gap-1 border-border border-t pt-4">
					<p className="font-medium text-sm">Last {recent.length} ingested:</p>
					<ul className="list-disc pl-5 text-muted-foreground text-xs">
						{recent.map(function renderRecent(id) {
							return (
								<li key={id}>
									<code className="font-mono">{id}</code>
								</li>
							)
						})}
					</ul>
				</div>
			) : null}
		</form>
	)
}

export type { IngestFormProps }
export { IngestForm }
