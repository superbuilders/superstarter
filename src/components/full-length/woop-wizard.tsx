"use client"

// <WoopWizard> — pre-test "mental primer".
//
// Four steps (Wish, Outcome, Obstacle, Plan) that run the learner
// through the WOOP / MCII protocol before they hit the active session.
// The wizard is purely declarative — there are no inputs. Each step
// poses a question and shows worked examples; the research effect is in
// the thinking, not the writing.

import Link from "next/link"
import * as React from "react"
import { unlockAudio } from "@/components/focus-shell/audio-ticker"
import { useFocusPrefs } from "@/components/focus-shell/focus-prefs"

interface StepDef {
	eyebrow: string
	title: string
	prompt: string
	examplesLabel: string
	examples: ReadonlyArray<string>
}

interface WoopWizardProps {
	runHref: string
	startLabel: string
}

const STEPS: ReadonlyArray<StepDef> = [
	{
		eyebrow: "Step 1 · Wish",
		title: "What is your goal for this session?",
		prompt: "One specific outcome — not 'do well', but a thing you can verify.",
		examplesLabel: "For example, your wish could be",
		examples: [
			"Finish all questions",
			"Hold my pace through the middle",
			"Stay calm when I hit a hard item"
		]
	},
	{
		eyebrow: "Step 2 · Outcome",
		title: "How will you feel once that's done?",
		prompt: "Picture the moment after the session ends. The feeling is the fuel.",
		examplesLabel: "For example, the outcome could feel like",
		examples: [
			"Confident going into the real test",
			"Relieved that I held my pace",
			"Proud I followed through"
		]
	},
	{
		eyebrow: "Step 3 · Obstacle",
		title: "What internal habit might stop you?",
		prompt: "Be specific — name the move your brain pulls when it wants to escape.",
		examplesLabel: "Common obstacles",
		examples: [
			"Perfectionism — re-reading until I'm sure",
			"Rushing — guessing without checking",
			"Sunk cost fallacy — staying too long on one problem"
		]
	},
	{
		eyebrow: "Step 4 · Plan",
		title: "Build your If-Then.",
		prompt:
			"Implementation intentions work because the response is automated. Pre-decide the move so your brain has nothing to negotiate.",
		examplesLabel: "Worked examples",
		examples: [
			"If I start rushing, then I will pause and re-read the question once.",
			"If I freeze on a hard question, then I will eliminate what I can and move on.",
			"If I get distracted, then I will take three breaths and refocus."
		]
	}
]

const TOTAL_STEPS = STEPS.length

function WoopWizard({ runHref, startLabel }: WoopWizardProps) {
	const { prefs } = useFocusPrefs()
	const [stepIndex, setStepIndex] = React.useState(0)
	const [submitting, setSubmitting] = React.useState(false)

	const isLast = stepIndex === TOTAL_STEPS - 1
	const step = STEPS[stepIndex]
	if (!step) return null

	function primeAudioForStart() {
		if (submitting) return
		setSubmitting(true)
		if (prefs.tickingSoundEnabled || prefs.warningSoundEnabled) {
			unlockAudio()
		}
	}

	function handleStartNavigation(event: React.MouseEvent<HTMLAnchorElement>) {
		if (submitting) {
			event.preventDefault()
			return
		}
		primeAudioForStart()
	}

	function next() {
		if (isLast) return
		setStepIndex(function inc(i) {
			return Math.min(i + 1, TOTAL_STEPS - 1)
		})
	}
	function back() {
		setStepIndex(function dec(i) {
			return Math.max(i - 1, 0)
		})
	}

	let primaryLabel = "Next"
	if (isLast) primaryLabel = `${startLabel} →`
	if (submitting) primaryLabel = "Starting…"

	let backDisabled = stepIndex === 0
	if (submitting) backDisabled = true

	return (
		<section
			className="rounded-lg border border-border-soft bg-surface"
			aria-labelledby="woop-wizard-heading"
			data-testid="woop-wizard"
		>
			<header className="flex items-center justify-between border-border-soft border-b px-5 py-3">
				<div>
					<p
						className="font-semibold text-[11px] text-text-3 uppercase tracking-[0.06em]"
						id="woop-wizard-heading"
					>
						Mental primer · {stepIndex + 1} of {TOTAL_STEPS}
					</p>
					<p className="mt-0.5 text-[13px] text-text-2">
						A 30-second WOOP (Wish, Outcome, Obstacle, Plan) — research-backed,
						optional, skippable.
					</p>
				</div>
				<ScienceTooltip />
			</header>
			<StepDots stepIndex={stepIndex} />
			<div
				key={stepIndex}
				className="fade-in slide-in-from-right-1 animate-in px-6 py-7 duration-200"
			>
				<p
					className={`font-semibold text-[10px] uppercase tracking-[0.08em] ${
						isLast ? "text-cobalt" : "text-text-3"
					}`}
				>
					{step.eyebrow}
				</p>
				<h2 className="mt-1 font-medium font-serif text-[22px] text-text-1 tracking-tight">
					{step.title}
				</h2>
				<p className="mt-2 max-w-[58ch] text-[13px] text-text-2 leading-relaxed">
					{step.prompt}
				</p>
				<ExamplesPanel
					label={step.examplesLabel}
					examples={step.examples}
					emphasized={isLast}
				/>
			</div>
			<footer className="flex flex-wrap items-center justify-between gap-2 border-border-soft border-t px-5 py-3">
				<div className="flex items-center gap-2">
					<button
						type="button"
						onClick={back}
						disabled={backDisabled}
						className="rounded-md border border-border-strong bg-surface px-3 py-1.5 font-medium text-[13px] text-text-1 transition-colors hover:bg-lavender focus-visible:outline focus-visible:outline-2 focus-visible:outline-cobalt focus-visible:outline-offset-2 disabled:cursor-default disabled:opacity-30"
					>
						← Back
					</button>
					<Link
						href={{ pathname: runHref }}
						onClick={handleStartNavigation}
						aria-disabled={submitting}
						className="rounded-md px-3 py-1.5 font-medium text-[13px] text-text-3 transition-colors hover:text-text-1 focus-visible:outline focus-visible:outline-2 focus-visible:outline-cobalt focus-visible:outline-offset-2 aria-disabled:pointer-events-none aria-disabled:opacity-50"
					>
						Skip primer
					</Link>
				</div>
				{isLast ? (
					<Link
						href={{ pathname: runHref }}
						onClick={handleStartNavigation}
						aria-disabled={submitting}
						className="rounded-md border border-text-1 bg-text-1 px-5 py-2 font-medium text-[14px] text-bg transition-opacity hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-cobalt focus-visible:outline-offset-2 aria-disabled:pointer-events-none aria-disabled:opacity-50"
					>
						{primaryLabel}
					</Link>
				) : (
					<button
						type="button"
						onClick={next}
						disabled={submitting}
						className="rounded-md border border-text-1 bg-text-1 px-5 py-2 font-medium text-[14px] text-bg transition-opacity hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-cobalt focus-visible:outline-offset-2 disabled:opacity-50"
					>
						{primaryLabel}
					</button>
				)}
			</footer>
		</section>
	)
}

interface StepDotsProps {
	stepIndex: number
}
function StepDots({ stepIndex }: StepDotsProps) {
	return (
		<ol
			className="flex items-center gap-2 px-6 pt-5"
			aria-label="Wizard progress"
		>
			{STEPS.map(function renderDot(_step, i) {
				const isActive = i === stepIndex
				const isPast = i < stepIndex
				let tone = "bg-border-soft"
				if (isPast) tone = "bg-cobalt/40"
				else if (isActive) tone = "bg-cobalt"
				return (
					<li
						key={i}
						aria-current={isActive ? "step" : undefined}
						className={`h-1.5 flex-1 rounded-full transition-colors ${tone}`}
					/>
				)
			})}
		</ol>
	)
}

interface ExamplesPanelProps {
	label: string
	examples: ReadonlyArray<string>
	emphasized: boolean
}
function ExamplesPanel({ label, examples, emphasized }: ExamplesPanelProps) {
	let frame = "border border-border-soft bg-bg"
	let labelTone = "text-text-3"
	if (emphasized) {
		frame = "border border-cobalt/30 bg-lavender"
		labelTone = "text-cobalt"
	}
	return (
		<aside
			aria-label={label}
			className={`mt-5 rounded-md px-4 py-3 ${frame}`}
		>
			<p className={`font-semibold text-[10px] uppercase tracking-[0.08em] ${labelTone}`}>
				{label}
			</p>
			<ul className="mt-2 space-y-1.5 text-[13px] text-text-2 leading-relaxed">
				{examples.map(function renderExample(ex) {
					return (
						<li key={ex} className="flex items-start gap-2">
							<span
								aria-hidden="true"
								className="mt-2 inline-block size-1 shrink-0 rounded-full bg-text-3"
							/>
							<span>{ex}</span>
						</li>
					)
				})}
			</ul>
		</aside>
	)
}

const WOOP_RESOURCE_URL = "https://woopmylife.org"

function ScienceTooltip() {
	return (
		<a
			href={WOOP_RESOURCE_URL}
			target="_blank"
			rel="noreferrer"
			className="rounded-full border border-border-soft px-2 py-1 text-[11px] text-text-3 transition-colors hover:bg-lavender hover:text-text-1 focus-visible:outline focus-visible:outline-2 focus-visible:outline-cobalt focus-visible:outline-offset-2"
		>
			Why this works
		</a>
	)
}

export type { WoopWizardProps }
export { WoopWizard }
