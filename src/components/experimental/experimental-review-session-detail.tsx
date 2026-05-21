import Link from "next/link"
import { ExperimentalReviewAuditForm } from "@/components/experimental/experimental-review-audit-form"
import { ExperimentalReviewProposalForm } from "@/components/experimental/experimental-review-proposal-form"
import type { ExperimentalReviewSessionDetail } from "@/server/experimental/review-data"

interface ExperimentalReviewSessionDetailProps {
	detail: ExperimentalReviewSessionDetail | null
	mode: "audit" | "review"
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

function labelForSessionType(type: ExperimentalReviewSessionDetail["session"]["type"]): string {
	if (type === "practice_test") return "Practice test"
	if (type === "review") return "Review"
	return "Drill"
}

function outcomeLabelFor(item: ExperimentalReviewSessionDetail["items"][number]): string {
	if (item.correct) return "Correct"
	if (item.selectedAnswer === undefined) return "Skipped"
	return "Incorrect"
}

function ItemFeedbackPanels(props: {
	sessionId: string
	item: ExperimentalReviewSessionDetail["items"][number]
}) {
	return (
		<div className="grid gap-4 xl:grid-cols-2">
			<section className="rounded-xl border border-border-soft bg-surface-1 p-4">
				<div className="mb-4 space-y-1">
					<p className="text-[11px] text-text-3 uppercase tracking-[0.06em]">Optional audit</p>
					<h5 className="font-medium text-text-1">Structured feedback</h5>
					<p className="text-sm text-text-2">
						Submit feedback only if you have something useful to record. You can also leave this blank and move on.
					</p>
				</div>
				<ExperimentalReviewAuditForm sessionId={props.sessionId} item={props.item} />
			</section>
			<section className="rounded-xl border border-border-soft bg-surface-1 p-4">
				<div className="mb-4 space-y-1">
					<p className="text-[11px] text-text-3 uppercase tracking-[0.06em]">Optional proposal</p>
					<h5 className="font-medium text-text-1">Propose edit</h5>
					<p className="text-sm text-text-2">
						Proposals are additive. Saving here records a suggested revision without changing the experimental item itself.
					</p>
				</div>
				<ExperimentalReviewProposalForm sessionId={props.sessionId} item={props.item} />
			</section>
		</div>
	)
}

function ExperimentalReviewSessionDetailView(props: ExperimentalReviewSessionDetailProps) {
	const listPath = props.mode === "audit" ? "/experimental/audit" : "/experimental/review"
	const listLabel = props.mode === "audit" ? "Audit" : "Review"
	if (props.detail === null) {
		return (
			<section className="rounded-2xl border border-border-soft bg-surface-1 p-6 shadow-[0_18px_60px_rgba(31,41,55,0.06)]">
				<h2 className="font-medium font-serif text-text-1 text-xl tracking-tight">
					Experimental session not found
				</h2>
				<p className="mt-2 max-w-[62ch] text-sm text-text-2 leading-6">
					This page only renders completed experimental sessions owned by the current user.
				</p>
				<Link
					href={{ pathname: listPath }}
					className="mt-4 inline-block text-cobalt text-sm hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-cobalt focus-visible:outline-offset-2"
				>
					Back to Experimental {listLabel}
				</Link>
			</section>
		)
	}
	const session = props.detail.session
	const reviewMode = props.mode === "review"
	return (
		<div className="space-y-4">
			<section className="rounded-2xl border border-border-soft bg-surface-1 p-6 shadow-[0_18px_60px_rgba(31,41,55,0.06)]">
				<div className="flex flex-wrap items-start justify-between gap-4">
					<div>
						<p className="text-[11px] text-text-3 uppercase tracking-[0.06em]">Completed session</p>
						<h2 className="mt-1 font-medium font-serif text-text-1 text-xl tracking-tight">
							Experimental {reviewMode ? "review" : "audit"} detail
						</h2>
						<p className="mt-2 text-sm text-text-2 leading-6">
							{reviewMode
								? "Read-only post-session review for an Experimental run. Audit and edit-proposal actions live under the Audit tab."
								: "Review the completed session item by item, then optionally submit structured audits or edit proposals for the generated questions you want to flag."}
						</p>
					</div>
					{reviewMode ? (
						<a
							href={`/experimental/audit/${session.id}`}
							className="inline-flex rounded-md border border-border-soft bg-surface-2 px-3 py-2 text-sm text-text-1 transition-colors hover:bg-lavender focus-visible:outline focus-visible:outline-2 focus-visible:outline-cobalt focus-visible:outline-offset-2"
						>
							Open in Audit
						</a>
					) : null}
				</div>
				<div className="mt-4 grid gap-3 text-sm text-text-2 md:grid-cols-2 xl:grid-cols-3">
					<p>Type: {labelForSessionType(session.type)}</p>
					<p>Ended: {formatWhen(session.endedAtMs)}</p>
					<p>Questions: {session.targetQuestionCount}</p>
					<p>Score: {session.correctAttempts}/{session.totalAttempts}</p>
					{session.durationMinutes === undefined ? null : <p>Length: {session.durationMinutes} minutes</p>}
				</div>
			</section>
			<section className="rounded-2xl border border-border-soft bg-surface-1 shadow-[0_18px_60px_rgba(31,41,55,0.06)]">
				<header className="border-border-soft border-b px-6 py-4">
					<h3 className="font-medium font-serif text-lg text-text-1 tracking-tight">Question review</h3>
					<p className="mt-1 text-sm text-text-2">
						{reviewMode
							? "Review each attempted item, including answer selection and explanation, without changing audit state."
							: "Review each attempted item and optionally submit structured audit feedback or an edit proposal below it."}
					</p>
				</header>
				{props.detail.items.length === 0 ? (
					<div className="p-6 text-sm text-text-2">No attempts were recorded for this experimental session.</div>
				) : (
					<ul className="divide-y divide-border-soft">
						{props.detail.items.map(function renderItem(item, index) {
							const outcome = outcomeLabelFor(item)
							return (
								<li key={item.attemptId} className="space-y-5 px-6 py-5">
									<div className="flex flex-wrap items-center justify-between gap-3">
										<div>
											<p className="text-[11px] text-text-3 uppercase tracking-[0.06em]">
												Item {index + 1} • {item.subTypeId} • {item.difficulty}
											</p>
											<h4 className="mt-1 font-medium text-text-1">{outcome}</h4>
										</div>
										<div className="text-right text-sm text-text-2">
											<p>{item.latencyMs} ms</p>
											<p>Correct answer: {item.correctAnswerText}</p>
										</div>
									</div>
									<div className="space-y-3 rounded-xl border border-border-soft bg-bg/50 p-4">
										<div className="space-y-2">
											<h5 className="font-medium text-text-1">Prompt</h5>
											<p className="whitespace-pre-wrap text-sm text-text-2 leading-6">{item.prompt}</p>
										</div>
										<div className="space-y-2">
											<h5 className="font-medium text-text-1">Options</h5>
											<ul className="space-y-2 text-sm text-text-2">
												{item.options.map(function renderOption(option) {
													const isSelected = item.selectedAnswer === option.id
													const isCorrect = item.correctAnswer === option.id
													const roleLabel = isCorrect
														? isSelected
															? "Correct answer • Your choice"
															: "Correct answer"
														: isSelected
															? "Your choice"
															: "Option"
													return (
														<li key={option.id} className="rounded-md border border-border-soft bg-surface-1 px-3 py-2">
															<p className="text-text-1">{option.text}</p>
															<p className="mt-1 text-[11px] text-text-3 uppercase tracking-[0.06em]">{roleLabel}</p>
														</li>
													)
												})}
											</ul>
										</div>
										<div className="grid gap-3 text-sm text-text-2 md:grid-cols-2">
											<p>
												Your answer: {item.selectedAnswerText === undefined ? "Skipped" : item.selectedAnswerText}
											</p>
											<p>Correct answer: {item.correctAnswerText}</p>
										</div>
										{item.explanation === undefined ? null : (
											<div className="space-y-2">
												<h5 className="font-medium text-text-1">Explanation</h5>
												<p className="whitespace-pre-wrap text-sm text-text-2 leading-6">{item.explanation}</p>
											</div>
										)}
									</div>
									{reviewMode ? null : <ItemFeedbackPanels sessionId={session.id} item={item} />}
								</li>
							)
						})}
					</ul>
				)}
			</section>
		</div>
	)
}

export { ExperimentalReviewSessionDetailView }
