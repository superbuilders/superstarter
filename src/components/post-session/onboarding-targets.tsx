"use client"

// <OnboardingTargets> — single-purpose form rendered by
// <PostSessionShell> on the diagnostic post-session screen.
//
// Plan §6.2 / §3.7; sidecar §1 replaced the percentile-select with a
// score-input per `docs/plans/score-based-target-goals-sidecar.md`
// §0.13 + §5.1. Captures:
//   - target score (1-50; the project's exams are always 50 questions).
//   - target date (date picker → unix-ms timestamp).
//
// Two submit paths:
//   "Save and continue"          — submits the form, action writes both
//                                  columns, then router.push('/').
//   "Skip and go to dashboard"   — router.push('/') without writing. The
//                                  users.target_score / target_date_ms
//                                  columns retain their existing values
//                                  (target_score defaults to 40 NOT NULL
//                                  per migration 0004). Round 2 §5.14
//                                  refined the copy from "Skip for now"
//                                  to specify destination per
//                                  ALPHA_DESIGN §9 verb+object guidance.
//
// `saveOnboardingTargets` is the canonical action surface (lives in
// src/app/(app)/actions.ts). It's reachable from this client component
// via a direct import per Next.js Server Actions semantics. The
// dashboard `<GoalEditor>` (`src/components/dashboard/goal-editor.tsx`)
// + its `updateGoal` action are the per-field dashboard-edit path for
// the same `users.target_score` column, post-onboarding.

import { useRouter } from "next/navigation"
import * as React from "react"
import { saveOnboardingTargets } from "@/app/(app)/actions"
import { Button } from "@/components/ui/button"
import { logger } from "@/logger"

// Target-score range — matches users.target_score column (1-50; the
// project's exams are always 50 questions). Mirror of <GoalEditor>'s
// 1-50 validation + the updateGoal action's range gate. Default 40 per
// the sidecar redirect's product framing (matches migration 0004's
// users.target_score DEFAULT 40 NOT NULL).
const TARGET_SCORE_MIN = 1
const TARGET_SCORE_MAX = 50
const TARGET_SCORE_DEFAULT = 40

// Score validation copy per ALPHA_DESIGN §9 Error Formula. Two cases
// split per audit-step (c) — integer-fail vs range-fail — for §9
// specific-over-generic. Mirror semantic of Round 2 §5.7's date-past
// validation (per-field blur-validation + clear-on-onChange + submit-
// time re-validation defense-in-depth).
const SCORE_NOT_INTEGER_COPY = "Score must be a whole number."
const SCORE_OUT_OF_RANGE_COPY = `Score must be between ${TARGET_SCORE_MIN} and ${TARGET_SCORE_MAX}.`

// TARGET_PERCENTILES + TargetPercentile — TRANSIENT module-top exports
// from the pre-sidecar percentile-select implementation. Sidecar commit
// 1 replaced the UI + action write path; commit 3 deletes these
// declarations + the users.target_percentile column + every consumer
// of the percentile types end-to-end. They stay as module-top exports
// here so external imports compile (audit step (a) §6.14.42 grep:
// zero external consumers; exports are retained per the sidecar
// redirect's commit-isolation framing).
//
// `isPercentile` (the type-guard predicate) was deleted at this commit
// — its only caller `onSelectPercentile` deleted with the <select>,
// and the project's noUnusedVariables (biome + typecheck) discipline
// enforces removal. Small benign §6.14.40 (redirector-vs-empirical-
// state, audit-step granularity): the redirect's clean separation of
// "TARGET_PERCENTILES + TargetPercentile + isPercentile UNCHANGED in
// this commit" doesn't survive the project's noUnusedVariables
// enforcement; pre-poned `isPercentile` deletion to commit 1.
const TARGET_PERCENTILES = [50, 30, 20, 10, 5] as const
type TargetPercentile = (typeof TARGET_PERCENTILES)[number]

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
const SCORE_ERROR_ID = "onboarding-score-error"

// Validates a score string from <input type="number"> against the 1-50
// range. Returns an error string if invalid, `null` if valid or empty.
// Empty allowed (skip-for-now path; the score field is optional). Split
// errors per ALPHA_DESIGN §9 specific-over-generic — integer-fail vs
// range-fail. Mirror semantic of validateDateNotPast (Round 2 §5.7).
function validateScoreRange(value: string): string | null {
	if (value === "") return null
	const parsed = Number(value)
	if (!Number.isInteger(parsed)) return SCORE_NOT_INTEGER_COPY
	if (parsed < TARGET_SCORE_MIN || parsed > TARGET_SCORE_MAX) return SCORE_OUT_OF_RANGE_COPY
	return null
}

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
	const [scoreString, setScoreString] = React.useState<string>(String(TARGET_SCORE_DEFAULT))
	const [dateString, setDateString] = React.useState<string>("")
	const [submitting, setSubmitting] = React.useState(false)
	const [submitError, setSubmitError] = React.useState<string | null>(null)
	const [dateError, setDateError] = React.useState<string | null>(null)
	const [scoreError, setScoreError] = React.useState<string | null>(null)

	async function onSave() {
		// Submit-time re-validation defense (closes the type-and-submit-
		// without-blurring edge case). Score gate runs before date gate;
		// both before the save call.
		const scoreValidationError = validateScoreRange(scoreString)
		if (scoreValidationError !== null) {
			setScoreError(scoreValidationError)
			return
		}
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
		// Empty score → undefined (skip-path); valid score parses to int.
		const targetScore = scoreString === "" ? undefined : Number(scoreString)
		const validDate = targetDateMs !== undefined && Number.isFinite(targetDateMs)
		const finalDate = validDate ? targetDateMs : undefined
		const result = await saveOnboardingTargets({
			targetScore,
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

	const submitLabel = submitting ? "Saving…" : "Save and continue"
	const formDescribedBy = submitError !== null ? ONBOARDING_ERROR_ID : undefined
	const dateDescribedBy = dateError !== null ? DATE_ERROR_ID : undefined
	const scoreDescribedBy = scoreError !== null ? SCORE_ERROR_ID : undefined

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
				<label className="block font-medium text-sm" htmlFor="onboarding-score">
					Target score (out of 50)
				</label>
				<input
					aria-describedby={scoreDescribedBy}
					className="block pointer-coarse:min-h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
					id="onboarding-score"
					max={TARGET_SCORE_MAX}
					min={TARGET_SCORE_MIN}
					name="targetScore"
					onBlur={function onScoreBlur(event) {
						setScoreError(validateScoreRange(event.target.value))
					}}
					onChange={function onScoreChange(event) {
						setScoreString(event.target.value)
						// Clear error on next interaction; re-validates on next blur.
						setScoreError(null)
					}}
					step={1}
					type="number"
					value={scoreString}
				/>
				{scoreError !== null && (
					<p
						className="text-foreground/80 text-sm"
						data-testid="onboarding-score-error"
						id={SCORE_ERROR_ID}
						role="alert"
					>
						{scoreError}
					</p>
				)}
			</div>

			<div className="space-y-2">
				<label className="block font-medium text-sm" htmlFor="onboarding-date">
					Target date
				</label>
				<input
					aria-describedby={dateDescribedBy}
					className="block pointer-coarse:min-h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
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
					className="relative text-muted-foreground text-sm underline-offset-4 pointer-coarse:before:absolute pointer-coarse:before:inset-x-0 pointer-coarse:before:-top-3 pointer-coarse:before:-bottom-3 pointer-coarse:before:content-[''] hover:text-foreground hover:underline focus-visible:outline-2 focus-visible:outline-foreground/30 focus-visible:outline-offset-2"
				>
					Skip and go to dashboard
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
