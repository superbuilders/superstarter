import Link from "next/link"
import type { ExperimentalReviewSession } from "@/server/experimental/review-data"

interface ExperimentalReviewListProps {
	sessions: ReadonlyArray<ExperimentalReviewSession>
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

function labelFor(session: ExperimentalReviewSession): string {
	if (session.type === "practice_test") return "Practice Test"
	if (session.type === "review") return "Review"
	if (session.subTypeId) return `Drill • ${session.subTypeId}`
	return "Drill"
}

function ExperimentalReviewList(props: ExperimentalReviewListProps) {
	if (props.sessions.length === 0) {
		return (
			<section className="rounded-2xl border border-border-soft bg-surface-1 p-6 shadow-[0_18px_60px_rgba(31,41,55,0.06)]">
				<h2 className="font-medium font-serif text-text-1 text-xl tracking-tight">
					No experimental sessions yet
				</h2>
				<p className="mt-2 max-w-[62ch] text-sm text-text-2 leading-6">
					This read-only review shell is ready. Session history will appear here after the
					Experimental practice-test and drill start paths land in a later slice.
				</p>
			</section>
		)
	}
	return (
		<section className="rounded-2xl border border-border-soft bg-surface-1 shadow-[0_18px_60px_rgba(31,41,55,0.06)]">
			<ul className="divide-y divide-border-soft">
				{props.sessions.map(function renderSession(session) {
					return (
						<li key={session.id} className="p-5">
							<Link
								href={{ pathname: `/experimental/review/${session.id}` }}
								className="block rounded-xl p-1 transition-colors hover:bg-lavender focus-visible:outline focus-visible:outline-2 focus-visible:outline-cobalt focus-visible:outline-offset-2"
							>
								<div className="flex flex-wrap items-center justify-between gap-3">
									<div>
										<p className="text-[11px] text-text-3 uppercase tracking-[0.06em]">
											{labelFor(session)}
										</p>
										<h2 className="mt-1 font-medium font-serif text-lg text-text-1">
											Experimental session review
										</h2>
									</div>
									<div className="text-right text-sm text-text-2">
										<p>{session.correctAttempts}/{session.totalAttempts} correct</p>
										<p>{formatWhen(session.endedAtMs)}</p>
									</div>
								</div>
							</Link>
						</li>
					)
				})}
			</ul>
		</section>
	)
}

export { ExperimentalReviewList }
