"use client"

// <OnboardingTargets> — single-purpose form rendered by
// <PostSessionShell> on the diagnostic post-session screen.
//
// Plan §6.2 / §3.7. Captures:
//   - target percentile from the discrete set { 50, 30, 20, 10, 5 }.
//   - target date (date picker → unix-ms timestamp).
//
// Two submit paths:
//   "Save and continue" — submits the form, action writes both columns,
//   then router.push('/').
//   "Skip for now"      — router.push('/') without writing. The
//                          users.target_percentile / target_date_ms
//                          columns stay null.
//
// `saveOnboardingTargets` is the canonical action surface (lives in
// src/app/(app)/actions.ts). It's reachable from this client component
// via a direct import per Next.js Server Actions semantics.

import { useRouter } from "next/navigation"
import * as React from "react"
import { saveOnboardingTargets } from "@/app/(app)/actions"
import { Button } from "@/components/ui/button"
import { logger } from "@/logger"

const TARGET_PERCENTILES = [50, 30, 20, 10, 5] as const
type TargetPercentile = (typeof TARGET_PERCENTILES)[number]

function isPercentile(n: number): n is TargetPercentile {
	for (const v of TARGET_PERCENTILES) {
		if (v === n) return true
	}
	return false
}

// Submit-failure error copy per ALPHA_DESIGN §9 Error Formula. The
// `.catch()` boundary doesn't surface error-type info (Network vs Server
// vs SchemaThrow), so we render the generic fallback that covers
// (1) what happened + (3) how to fix; (2) why is implicit. Per Round 2
// §5.6 + audit doc §A.4.f2.
const SUBMIT_ERROR_COPY = "We couldn't save your targets. Please try again."

// Past-date validation copy per ALPHA_DESIGN §9 Error Formula. Per Round 2
// §5.7 + audit doc §A.4.f3 + ALPHA_DESIGN §7 ("Validate on blur, not every
// keystroke"). Covers (1) what happened: "Target date can't be in the
// past." + (3) how to fix: "Pick a future date."; (2) why is implicit
// (past dates aren't valid for a future-target form).
const DATE_PAST_ERROR_COPY = "Target date can't be in the past. Pick a future date."

const ONBOARDING_ERROR_ID = "onboarding-targets-error"
const DATE_ERROR_ID = "onboarding-date-error"

// Validates an ISO date-string from <input type="date"> against today
// (local midnight). Returns an error string if past, `null` if valid or
// empty. Empty is allowed (skip-for-now path; the date field is optional).
//
// Date parsing nuance: `<input type="date">` produces "YYYY-MM-DD"
// strings; `new Date("2026-04-15")` would parse as UTC midnight (per
// ECMAScript spec for date-only ISO strings). The user's mental model is
// local-calendar — so we manually parse Y/M/D and construct a local-
// midnight Date. Comparing against local startOfToday gives the
// user-intended semantic.
function validateDateNotPast(value: string): string | null {
	if (value === "") return null
	const parts = value.split("-")
	if (parts.length !== 3) return null
	const yStr = parts[0]
	const mStr = parts[1]
	const dStr = parts[2]
	if (yStr === undefined || mStr === undefined || dStr === undefined) return null
	const y = Number(yStr)
	const m = Number(mStr)
	const d = Number(dStr)
	if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) return null
	const picked = new Date(y, m - 1, d)
	const today = new Date()
	today.setHours(0, 0, 0, 0)
	if (picked < today) {
		return DATE_PAST_ERROR_COPY
	}
	return null
}

function OnboardingTargets() {
	const router = useRouter()
	const [percentile, setPercentile] = React.useState<TargetPercentile | null>(null)
	const [dateString, setDateString] = React.useState<string>("")
	const [submitting, setSubmitting] = React.useState(false)
	const [submitError, setSubmitError] = React.useState<string | null>(null)
	const [dateError, setDateError] = React.useState<string | null>(null)

	async function onSave() {
		// Submit-time re-validation defense (closes the type-and-submit-
		// without-blurring edge case). If the date field has a past value
		// the user typed but never blurred, validation fires here.
		const dateValidationError = validateDateNotPast(dateString)
		if (dateValidationError !== null) {
			setDateError(dateValidationError)
			return
		}
		// Clear any prior error at retry boundary; success would navigate
		// away so no clear-on-success path needed.
		setSubmitError(null)
		setSubmitting(true)
		const targetDateMs = dateString === "" ? undefined : Date.parse(dateString)
		const targetPercentile = percentile === null ? undefined : percentile
		const validDate = targetDateMs !== undefined && Number.isFinite(targetDateMs)
		const finalDate = validDate ? targetDateMs : undefined
		const result = await saveOnboardingTargets({
			targetPercentile,
			targetDateMs: finalDate
		}).catch(function onErr(error: unknown) {
			logger.error({ error }, "OnboardingTargets: saveOnboardingTargets threw")
			return null
		})
		if (result === null) {
			setSubmitError(SUBMIT_ERROR_COPY)
			setSubmitting(false)
			return
		}
		router.push("/")
	}

	function onSelectPercentile(value: string) {
		const n = Number.parseInt(value, 10)
		if (!Number.isFinite(n) || !isPercentile(n)) {
			setPercentile(null)
			return
		}
		setPercentile(n)
	}

	const percentileSelectValue = percentile === null ? "" : String(percentile)
	const submitLabel = submitting ? "Saving…" : "Save and continue"
	const formDescribedBy = submitError !== null ? ONBOARDING_ERROR_ID : undefined
	const dateDescribedBy = dateError !== null ? DATE_ERROR_ID : undefined

	return (
		<form
			aria-describedby={formDescribedBy}
			className="space-y-6"
			onSubmit={async function onSubmit(event) {
				event.preventDefault()
				await onSave()
			}}
		>
			<div className="space-y-2">
				<label className="block font-medium text-sm" htmlFor="onboarding-percentile">
					Target percentile
				</label>
				<select
					id="onboarding-percentile"
					name="percentile"
					value={percentileSelectValue}
					onChange={function onPercentileChange(event) {
						onSelectPercentile(event.target.value)
					}}
					className="block w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
				>
					<option value="">Select…</option>
					{TARGET_PERCENTILES.map(function renderOption(p) {
						return (
							<option key={p} value={p}>
								Top {p}%
							</option>
						)
					})}
				</select>
			</div>

			<div className="space-y-2">
				<label className="block font-medium text-sm" htmlFor="onboarding-date">
					Target date
				</label>
				<input
					aria-describedby={dateDescribedBy}
					className="block w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
					id="onboarding-date"
					name="targetDate"
					onBlur={function onDateBlur(event) {
						setDateError(validateDateNotPast(event.target.value))
					}}
					onChange={function onDateChange(event) {
						setDateString(event.target.value)
						// Clear error on next interaction; re-validates on next blur.
						setDateError(null)
					}}
					type="date"
					value={dateString}
				/>
				{dateError !== null && (
					<p
						className="text-foreground/80 text-sm"
						data-testid="onboarding-date-error"
						id={DATE_ERROR_ID}
						role="alert"
					>
						{dateError}
					</p>
				)}
			</div>

			{submitError !== null && (
				<p
					className="text-foreground/80 text-sm"
					data-testid="onboarding-targets-error"
					id={ONBOARDING_ERROR_ID}
					role="alert"
				>
					{submitError}
				</p>
			)}

			<div className="flex items-center justify-between gap-4">
				<button
					type="button"
					onClick={function onSkip() {
						router.push("/")
					}}
					className="text-muted-foreground text-sm underline-offset-4 hover:text-foreground hover:underline"
				>
					Skip for now
				</button>
				<Button type="submit" disabled={submitting}>
					{submitLabel}
				</Button>
			</div>
		</form>
	)
}

export type { TargetPercentile }
export { OnboardingTargets, TARGET_PERCENTILES }
