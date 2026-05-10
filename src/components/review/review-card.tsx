// <ReviewCard> — outer card wrapping a header (title + meta eyebrow)
// and a list of <ReviewRow>s. Mirrors <DojoCard>'s surface shape
// (rounded-lg + bg-surface + border-border-soft) so the /review page
// reads as the same visual family as the dashboard.
//
// No nested cards: the rows are list items inside <ul>, not Card
// primitives. The card surface itself is the only "card" boundary.
// When the list is empty, the body collapses to a single muted
// paragraph instead of an empty <ul>.

import { ReviewRow } from "@/components/review/review-row"
import type { ReviewSession } from "@/server/review/data"

interface ReviewCardProps {
	title: string
	meta: string
	sessions: ReadonlyArray<ReviewSession>
	/** Unix-ms snapshot of "now" — threaded through to every <ReviewRow>'s
	 * relative-time formatter so all rows in the card agree on a single
	 * clock per render (resolved once at the view root). */
	nowMs: number
	emptyText: string
}

function ReviewCard({ title, meta, sessions, nowMs, emptyText }: ReviewCardProps) {
	const body =
		sessions.length === 0 ? (
			<p className="px-4 py-4 text-[13px] text-text-3">{emptyText}</p>
		) : (
			<ul className="divide-none">
				{sessions.map(function renderRow(session) {
					return (
						<li key={session.id}>
							<ReviewRow session={session} nowMs={nowMs} />
						</li>
					)
				})}
			</ul>
		)
	return (
		<section className="overflow-hidden rounded-lg border border-border-soft bg-surface">
			<header className="flex items-baseline justify-between border-border-soft border-b px-4 pt-2 pb-1">
				<h3 className="font-medium font-serif text-[15px] text-text-1 tracking-[-0.005em]">
					{title}
				</h3>
				<span className="text-[11px] text-text-3 uppercase tracking-[0.06em]">{meta}</span>
			</header>
			{body}
		</section>
	)
}

export type { ReviewCardProps }
export { ReviewCard }
