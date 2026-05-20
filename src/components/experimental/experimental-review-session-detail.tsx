import Link from "next/link"
import { ExperimentalReviewAuditForm } from "@/components/experimental/experimental-review-audit-form"
import { ExperimentalReviewProposalForm } from "@/components/experimental/experimental-review-proposal-form"
import type { ExperimentalReviewSessionDetail } from "@/server/experimental/review-data"

interface ExperimentalReviewSessionDetailProps {
	detail: ExperimentalReviewSessionDetail | null
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

function ExperimentalReviewSessionDetailView(props: ExperimentalReviewSessionDetailProps) {
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
					href={{ pathname: "/experimental/review" }}
					className="mt-4 inline-block text-cobalt text-sm hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-cobalt focus-visible:outline-offset-2"
				>
					Back to Experimental Review
				</Link>
			</section>
		)
	}
	const session = props.detail.session
	return (
		<div className="space-y-4">
			<section className="rounded-2xl border border-border-soft bg-surface-1 p-6 shadow-[0_18px_60px_rgba(31,41,55,0.06)]">
				<p className="text-[11px] text-text-3 uppercase tracking-[0.06em]">Completed session</p>
				<h2 className="mt-1 font-medium font-serif text-text-1 text-xl tracking-tight">
					Experimental session detail
				</h2>
				<p className="mt-2 text-sm text-text-2 leading-6">
					Optional item-level audits are submitted here. Leaving every item unaudited is valid;
					submitting an audit records feedback only and does not mutate the experimental item.
				</p>
				<div className="mt-4 grid gap-3 text-sm text-text-2 md:grid-cols-2">
					<p>Type: {session.type}</p>
					<p>Ended: {formatWhen(session.endedAtMs)}</p>
					<p>Questions: {session.targetQuestionCount}</p>
					<p>Score: {session.correctAttempts}/{session.totalAttempts}</p>
				</div>
			</section>
			<section className="rounded-2xl border border-border-soft bg-surface-1 shadow-[0_18px_60px_rgba(31,41,55,0.06)]">
				<header className="border-border-soft border-b px-6 py-4">
					<h3 className="font-medium font-serif text-lg text-text-1 tracking-tight">Question review</h3>
					<p className="mt-1 text-sm text-text-2">
						Review each attempted item and optionally submit structured audit feedback below it.
					</p>
				</header>
				{props.detail.items.length === 0 ? (
					<div className="p-6 text-sm text-text-2">No attempts were recorded for this experimental session.</div>
				) : (
					<ul className="divide-y divide-border-soft">
						{props.detail.items.map(function renderItem(item, index) {
							const outcome = item.correct
								? "Correct"
								: item.selectedAnswer === undefined
									? "Skipped"
									: "Incorrect"
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
									<div className="grid gap-4 xl:grid-cols-2">
										<section className="rounded-xl border border-border-soft bg-surface-1 p-4">
											<div className="mb-4 space-y-1">
												<p className="text-[11px] text-text-3 uppercase tracking-[0.06em]">Optional audit</p>
												<h5 className="font-medium text-text-1">Structured feedback</h5>
												<p className="text-sm text-text-2">
													Submit feedback only if you have something useful to record. You can also leave this blank and move on.
												</p>
											</div>
											<ExperimentalReviewAuditForm sessionId={session.id} item={item} />
										</section>
										<section className="rounded-xl border border-border-soft bg-surface-1 p-4">
											<div className="mb-4 space-y-1">
												<p className="text-[11px] text-text-3 uppercase tracking-[0.06em]">Optional proposal</p>
												<h5 className="font-medium text-text-1">Propose edit</h5>
												<p className="text-sm text-text-2">
													Proposals are additive. Saving here records a suggested revision without changing the experimental item itself.
												</p>
											</div>
											<ExperimentalReviewProposalForm sessionId={session.id} item={item} />
										</section>
									</div>
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
