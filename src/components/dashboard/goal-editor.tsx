"use client"

// <GoalEditor> — popover content for editing the user's target_score.
// Practice round commit 9. Wires to updateGoal Server Action from
// commit 4.
//
// **Form shape:** single number input (1..50) + "Save" button.
// useState for the input value (initialized from the current goal).
// On submit, calls updateGoal action; on success, calls the parent's
// onSaved callback (which closes the popover via the
// <ScoreStripPopover> close handler) and the Server Action's
// revalidatePath("/") triggers an SSR refresh on next paint.
//
// **Validation:** native input min/max + Zod re-validates server-side.
// The server action throws on out-of-range; we display the error
// message inline.

import * as React from "react"
import { updateGoal } from "@/app/(app)/actions"
import { logger } from "@/logger"

interface GoalEditorProps {
	initial: number
	onSaved: () => void
}

function GoalEditor({ initial, onSaved }: GoalEditorProps) {
	const [value, setValue] = React.useState<string>(String(initial))
	const [isPending, startTransition] = React.useTransition()
	const [error, setError] = React.useState<string | undefined>(undefined)
	const inputRef = React.useRef<HTMLInputElement>(null)
	React.useEffect(function focusOnMount() {
		inputRef.current?.focus()
	}, [])

	function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
		event.preventDefault()
		const parsed = Number.parseInt(value, 10)
		if (Number.isNaN(parsed) || parsed < 1 || parsed > 50) {
			setError("Goal must be between 1 and 50.")
			return
		}
		setError(undefined)
		startTransition(function dispatch() {
			void updateGoal({ goal: parsed })
				.then(function onSuccess() {
					onSaved()
				})
				.catch(function onError(err: unknown) {
					logger.error({ err }, "GoalEditor: updateGoal action failed")
					setError("Couldn't save. Try again.")
				})
		})
	}

	const errorNode =
		error === undefined ? null : (
			<p className="text-[12px] text-pace-over" role="alert">
				{error}
			</p>
		)

	return (
		<form onSubmit={handleSubmit} className="flex flex-col gap-3">
			<div className="flex flex-col gap-1">
				<label
					htmlFor="goal-editor-input"
					className="text-[11px] text-text-3 uppercase tracking-[0.06em]"
				>
					Goal score (1–50)
				</label>
				<input
					id="goal-editor-input"
					ref={inputRef}
					type="number"
					min={1}
					max={50}
					step={1}
					value={value}
					onChange={function handleChange(e) {
						setValue(e.target.value)
					}}
					required
					className="w-full rounded-md border border-border-strong bg-surface px-3 py-[6px] text-[14px] text-text-1 focus-visible:outline focus-visible:outline-2 focus-visible:outline-cobalt focus-visible:outline-offset-2"
				/>
			</div>
			{errorNode}
			<button
				type="submit"
				disabled={isPending}
				className="rounded-md border border-text-1 bg-text-1 px-3 py-[7px] font-medium text-[13px] text-bg transition-opacity hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-cobalt focus-visible:outline-offset-2 disabled:opacity-60"
			>
				{isPending ? "Saving…" : "Save"}
			</button>
		</form>
	)
}

export type { GoalEditorProps }
export { GoalEditor }
