import type { ExperimentalReviewSession } from "@/server/experimental/review-data"

interface ExperimentalReviewListProps {
	sessions: ReadonlyArray<ExperimentalReviewSession>
	detailBasePath: `/experimental/${string}`
	emptyTitle: string
	emptyBody: string
	rowTitle: string
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
				<h2 className="font-medium font-serif text-text-1 text-xl tracking-tight">{props.emptyTitle}</h2>
				<p className="mt-2 max-w-[62ch] text-sm text-text-2 leading-6">{props.emptyBody}</p>
			</section>
		)
	}
	return (
		<section className="rounded-2xl border border-border-soft bg-surface-1 shadow-[0_18px_60px_rgba(31,41,55,0.06)]">
			<ul className="divide-y divide-border-soft">
				{props.sessions.map(function renderSession(session) {
					return (
						<li key={session.id} className="p-5">
							<a
								href={`${props.detailBasePath}/${session.id}`}
								className="block rounded-xl p-1 transition-colors hover:bg-lavender focus-visible:outline focus-visible:outline-2 focus-visible:outline-cobalt focus-visible:outline-offset-2"
							>
								<div className="flex flex-wrap items-center justify-between gap-3">
									<div>
										<p className="text-[11px] text-text-3 uppercase tracking-[0.06em]">{labelFor(session)}</p>
										<h2 className="mt-1 font-medium font-serif text-lg text-text-1">{props.rowTitle}</h2>
									</div>
									<div className="text-right text-sm text-text-2">
										<p>{session.correctAttempts}/{session.totalAttempts} correct</p>
										<p>{formatWhen(session.endedAtMs)}</p>
									</div>
								</div>
							</a>
						</li>
					)
				})}
			</ul>
		</section>
	)
}

export { ExperimentalReviewList }
