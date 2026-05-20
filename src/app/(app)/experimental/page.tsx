import Link from "next/link"
import { loadNavChrome } from "@/server/nav/chrome"
import { loadExperimentalUserId } from "@/server/experimental/auth"
import { ExperimentalPageFrame } from "@/components/experimental/experimental-page-frame"

const CARDS: ReadonlyArray<{ href: "/experimental/practice-test" | "/experimental/drills" | "/experimental/review"; title: string; body: string }> = [
	{
		href: "/experimental/practice-test",
		title: "Experimental Practice Test",
		body: "Read-only shell in this slice. Session start and run behavior land later."
	},
	{
		href: "/experimental/drills",
		title: "Experimental Drills",
		body: "Read-only shell for the future subtype drill surface. No run paths are enabled yet."
	},
	{
		href: "/experimental/review",
		title: "Experimental Review",
		body: "Session-list and session-detail review shells are live and read-only. Audit writes come later."
	}
]

function Page() {
	const userIdPromise = loadExperimentalUserId()
	const chromePromise = userIdPromise.then(function load(userId) {
		return loadNavChrome(userId)
	})
	return (
		<ExperimentalPageFrame
			chromePromise={chromePromise}
			eyebrow="Parallel item pool"
			title="Experimental"
			description="A separate surface for unaudited questions. This slice adds the authenticated read-only shell only: no session start, no audit submission, and no admin moderation yet."
		>
			<div className="grid grid-cols-1 gap-4 md:grid-cols-3">
				{CARDS.map(function renderCard(card) {
					return (
						<Link
							key={card.href}
							href={{ pathname: card.href }}
							className="rounded-2xl border border-border-soft bg-surface-1 p-6 shadow-[0_18px_60px_rgba(31,41,55,0.06)] transition-colors hover:bg-lavender focus-visible:outline focus-visible:outline-2 focus-visible:outline-cobalt focus-visible:outline-offset-2"
						>
							<h2 className="font-medium font-serif text-text-1 text-xl tracking-tight">{card.title}</h2>
							<p className="mt-2 text-sm text-text-2 leading-6">{card.body}</p>
						</Link>
					)
				})}
			</div>
		</ExperimentalPageFrame>
	)
}

export default Page
