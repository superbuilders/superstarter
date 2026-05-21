import Link from "next/link"
import { loadNavChrome } from "@/server/nav/chrome"
import { loadExperimentalUserId } from "@/server/experimental/auth"
import { ExperimentalPageFrame } from "@/components/experimental/experimental-page-frame"

const CARDS: ReadonlyArray<{
	href: "/experimental/practice-test" | "/experimental/drills" | "/experimental/audit" | "/experimental/review"
	title: string
	body: string
}> = [
	{
		href: "/experimental/practice-test",
		title: "Experimental Practice Test",
		body: "Configure question count and test length, then run a mixed experimental session that writes only to the Experimental tables."
	},
	{
		href: "/experimental/drills",
		title: "Experimental Drills",
		body: "Subtype-specific drill runs stay isolated from canonical mastery and canonical practice-session history."
	},
	{
		href: "/experimental/audit",
		title: "Experimental Audit",
		body: "Audit completed experimental sessions, submit structured feedback, and record edit proposals without mutating canonical practice data."
	},
	{
		href: "/experimental/review",
		title: "Experimental Review",
		body: "Browse experimental session history and open a read-only post-session review that mirrors the normal review/history flow."
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
			description="A separate authenticated surface for generated-question practice, review, and auditing. Experimental sessions stay isolated from canonical practice-session writes and canonical mastery."
		>
			<div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
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
