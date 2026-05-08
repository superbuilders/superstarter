"use client"

// <DaysToTestEditor> — popover content for editing
// users.target_date_ms. Practice round commit 9. Wires to
// updateTargetDate Server Action from commit 4.
//
// **Form shape:** native <input type="date"> (renders OS-native date
// picker, accessible across browsers per decision 5) + "Save" button.
// The current target-date (epoch ms) is converted to a YYYY-MM-DD
// string for the input's `value`. On submit, parsed back to epoch ms
// at midnight UTC and passed to updateTargetDate.
//
// **Validation:** the action allows past dates (decision per redline 5
// — post-test review users may set their target in the past). The
// input itself accepts any date; server-action logs a warn for past
// dates but writes regardless.

import * as React from "react"
import { updateTargetDate } from "@/app/(app)/actions"
import { logger } from "@/logger"

interface DaysToTestEditorProps {
	/** Current target date as epoch ms; undefined when no date set. */
	currentMs: number | undefined
	onSaved: () => void
}

function epochMsToDateInputValue(ms: number | undefined): string {
	if (ms === undefined) return ""
	const date = new Date(ms)
	const year = date.getUTCFullYear()
	const month = String(date.getUTCMonth() + 1).padStart(2, "0")
	const day = String(date.getUTCDate()).padStart(2, "0")
	return `${year}-${month}-${day}`
}

function dateInputValueToEpochMs(value: string): number | undefined {
	if (value.length === 0) return undefined
	const parsed = Date.parse(`${value}T00:00:00Z`)
	if (Number.isNaN(parsed)) return undefined
	return parsed
}

function DaysToTestEditor({ currentMs, onSaved }: DaysToTestEditorProps) {
	const [value, setValue] = React.useState<string>(epochMsToDateInputValue(currentMs))
	const [isPending, startTransition] = React.useTransition()
	const [error, setError] = React.useState<string | undefined>(undefined)
	const inputRef = React.useRef<HTMLInputElement>(null)
	React.useEffect(function focusOnMount() {
		inputRef.current?.focus()
	}, [])

	function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
		event.preventDefault()
		const targetDateMs = dateInputValueToEpochMs(value)
		if (targetDateMs === undefined) {
			setError("Pick a valid date.")
			return
		}
		setError(undefined)
		startTransition(function dispatch() {
			void updateTargetDate({ targetDateMs })
				.then(function onSuccess() {
					onSaved()
				})
				.catch(function onError(err: unknown) {
					logger.error({ err }, "DaysToTestEditor: updateTargetDate action failed")
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
					htmlFor="days-editor-input"
					className="text-[11px] text-text-3 uppercase tracking-[0.06em]"
				>
					Test date
				</label>
				<input
					id="days-editor-input"
					ref={inputRef}
					type="date"
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

export type { DaysToTestEditorProps }
export { DaysToTestEditor }
