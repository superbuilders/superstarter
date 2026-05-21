// /lessons — index of interactive CCAT math drills. Each card links to a
// dedicated lesson route that pairs a "reveal shortcut" walkthrough with
// an infinite speed-drill generator. Surface matches the dashboard chrome
// (PageNav above; bordered header strip; lavender cards) so the route reads
// as a peer of /review, /stats, /practice-test.
//
// Server component, NOT async per rules/rsc-data-fetching-patterns.md.

import Link from "next/link"
import { redirect } from "next/navigation"
import * as React from "react"
import { auth } from "@/auth"
import { type LessonCard, LessonsGrid } from "@/components/lessons/shared/lessons-grid"
import { PageNav } from "@/components/nav/page-nav"
import { loadNavChrome } from "@/server/nav/chrome"

const LESSONS: ReadonlyArray<LessonCard> = [
	{
		href: "/lessons/balance-point",
		slug: "balance-point",
		eyebrow: "Averages",
		title: "The Balance Point",
		blurb: "Stop summing-and-dividing. Drag numbers onto a number line and watch the mean tip.",
		shortcut: "Sum of deviations = 0",
		eyebrowClass: "text-cobalt"
	},
	{
		href: "/lessons/butterfly",
		slug: "butterfly",
		eyebrow: "Fractions",
		title: "Butterfly Compare",
		blurb: "Cross-multiply upward — no common denominators, no division. Just two products.",
		shortcut: "a/b vs c/d → compare a·d vs b·c",
		eyebrowClass: "text-alpha-accent"
	},
	{
		href: "/lessons/percent-flip",
		slug: "percent-flip",
		eyebrow: "Percent",
		title: "Flip It",
		blurb: "X% of Y equals Y% of X. Turn 16% of 50 into 50% of 16 and solve it in one breath.",
		shortcut: "X% of Y = Y% of X",
		eyebrowClass: "text-indigo-deep"
	},
	{
		href: "/lessons/benchmarks",
		slug: "benchmarks",
		eyebrow: "Memory",
		title: "Anchor Drill",
		blurb: "Burn the CCAT fraction–decimal–percent table into recall under a 5-second clock.",
		shortcut: "1/8 = 0.125, 5/8 = 0.625, 3/16 = …",
		eyebrowClass: "text-good"
	}
]

async function loadUserId(): Promise<string> {
	const session = await auth()
	if (!session?.user?.id) {
		redirect("/login")
	}
	return session.user.id
}

function Page() {
	const chromePromise = loadUserId().then(function load(userId) {
		return loadNavChrome(userId)
	})
	return (
		<div className="min-h-screen bg-bg text-text-1">
			<React.Suspense fallback={null}>
				<PageNav chromePromise={chromePromise} />
			</React.Suspense>
			<main className="mx-auto max-w-[1100px] px-7 pb-12">
				<header className="mb-6 flex flex-col gap-1 border-border-soft border-b pt-6 pb-4">
					<p className="font-semibold text-[11px] text-cobalt uppercase tracking-[0.06em]">
						Speed-of-thought drills
					</p>
					<h1 className="font-medium font-serif text-2xl text-text-1 tracking-tight">Lessons</h1>
					<p className="max-w-[60ch] text-sm text-text-2">
						Each lesson teaches a single CCAT shortcut, then hands you a generator that throws
						infinite practice problems at it. The goal is mental shortcuts, not memorized
						procedures.
					</p>
				</header>
				<LessonsGrid lessons={LESSONS} />
				<Link
					href="/"
					className="mt-6 inline-block text-cobalt text-sm hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-cobalt focus-visible:outline-offset-2"
				>
					Back to dashboard
				</Link>
			</main>
		</div>
	)
}

export default Page
