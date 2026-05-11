"use client"

// <WoopWizard> — pre-test "mental primer".
//
// Four steps (Wish, Outcome, Obstacle, Plan) that run the learner
// through the WOOP / MCII protocol before they hit the 15-minute
// full-length test. The wizard is purely declarative — there are no
// inputs. Each step poses a question and shows worked examples; the
// research effect is in the *thinking*, not the writing (Oettingen
// 2014). The user reads, reflects, and clicks Next.
//
// Step 4's examples are full "If [obstacle], then I will [action]"
// sentences so the implementation-intentions construction is concrete.
// The primary CTA on step 4 flips from "Next" to "Start full-length
// test" and posts a navigation to /full-length/run. Skip primer is
// always available.

import { useRouter } from "next/navigation"
import * as React from "react"

const RUN_ROUTE = "/full-length/run"

interface StepDef {
	eyebrow: string
	title: string
	prompt: string
	examplesLabel: string
	examples: ReadonlyArray<string>
}

const STEPS: ReadonlyArray<StepDef> = [
	{
		eyebrow: "Step 1 · Wish",
		title: "What is your goal for this 15-minute session?",
		prompt: "One specific outcome — not 'do well', but a thing you can verify.",
		examplesLabel: "For example, your wish could be",
		examples: [
			"Finish all 50 questions",
			"Get 80% on verbal",
			"Beat my last score by 5 points"
		]
	},
	{
		eyebrow: "Step 2 · Outcome",
		title: "How will you feel once that's done?",
		prompt: "Picture the moment after the timer ends. The feeling is the fuel.",
		examplesLabel: "For example, the outcome could feel like",
		examples: [
			"Confident going into the real test",
			"Relieved that I finished",
			"Proud I held my pace"
		]
	},
	{
		eyebrow: "Step 3 · Obstacle",
		title: "What internal habit might stop you?",
		prompt: "Be specific — name the move your brain pulls when it wants to escape.",
		examplesLabel: "Common obstacles",
		examples: [
			"Perfectionism — re-reading questions until I'm sure",
			"Rushing — guessing without checking",
			"Sunk cost fallacy — continuing to stay on a problem"
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

function WoopWizard() {
	const [stepIndex, setStepIndex] = React.useState(0)
	const [submitting, setSubmitting] = React.useState(false)
	const router = useRouter()

	const isLast = stepIndex === TOTAL_STEPS - 1
	const step = STEPS[stepIndex]
	if (!step) return null

	function startTest() {
		if (submitting) return
		setSubmitting(true)
		router.push(RUN_ROUTE)
	}
	function next() {
		if (isLast) {
			startTest()
			return
		}
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
	if (isLast) primaryLabel = "Start full-length test →"
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
					<button
						type="button"
						onClick={startTest}
						disabled={submitting}
						className="rounded-md px-3 py-1.5 font-medium text-[13px] text-text-3 transition-colors hover:text-text-1 focus-visible:outline focus-visible:outline-2 focus-visible:outline-cobalt focus-visible:outline-offset-2"
					>
						Skip primer
					</button>
				</div>
				<button
					type="button"
					onClick={next}
					disabled={submitting}
					className="rounded-md border border-text-1 bg-text-1 px-5 py-2 font-medium text-[14px] text-bg transition-opacity hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-cobalt focus-visible:outline-offset-2 disabled:opacity-50"
				>
					{primaryLabel}
				</button>
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
	const [open, setOpen] = React.useState(false)
	const wrapperRef = React.useRef<HTMLDivElement>(null)
	React.useEffect(
		function clickAway() {
			if (!open) return
			function onDocClick(e: MouseEvent) {
				const wrapper = wrapperRef.current
				if (!wrapper) return
				const target = e.target
				if (!(target instanceof Node)) return
				if (wrapper.contains(target)) return
				setOpen(false)
			}
			document.addEventListener("mousedown", onDocClick)
			return function cleanup() {
				document.removeEventListener("mousedown", onDocClick)
			}
		},
		[open]
	)
	return (
		<div ref={wrapperRef} className="relative">
			<button
				type="button"
				aria-expanded={open}
				aria-controls="woop-science-popover"
				onClick={function toggle() {
					setOpen(function flip(o) {
						return !o
					})
				}}
				className="rounded-full border border-border-strong bg-bg px-2.5 py-0.5 font-semibold text-[10px] text-text-2 uppercase tracking-[0.08em] transition-colors hover:border-cobalt hover:text-cobalt focus-visible:outline focus-visible:outline-2 focus-visible:outline-cobalt focus-visible:outline-offset-2"
			>
				Dive deeper
			</button>
			{open ? (
				<div
					id="woop-science-popover"
					role="tooltip"
					className="fade-in absolute right-0 z-10 mt-2 w-[340px] animate-in rounded-md border border-border-soft bg-surface p-4 text-left shadow-lg duration-150"
				>
					<p className="font-semibold text-[10px] text-text-3 uppercase tracking-[0.08em]">
						The MCII edge
					</p>
					<p className="mt-1 text-[12px] text-text-2 leading-relaxed">
						18seconds uses the WOOP framework — Mental Contrasting with
						Implementation Intentions. Pre-deciding your response to the moment
						you'd normally falter automates the bypass.
					</p>
					<p className="mt-2 text-[12px] text-text-2 leading-relaxed">
						WOOP was developed by Dr. Gabriele Oettingen at NYU. You can find
						more resources and the official practice tool at{" "}
						<a
							href={WOOP_RESOURCE_URL}
							target="_blank"
							rel="noreferrer noopener"
							className="font-medium text-cobalt underline-offset-2 hover:underline"
						>
							woopmylife.org
						</a>
						.
					</p>
				</div>
			) : null}
		</div>
	)
}

export { WoopWizard }
