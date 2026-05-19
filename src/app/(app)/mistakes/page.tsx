import { redirect } from "next/navigation"
import * as React from "react"
import { auth } from "@/auth"
import { FocusTutorialBeforePrimerGate } from "@/components/focus-shell/focus-shell"
import { WoopWizard } from "@/components/full-length/woop-wizard"
import { MistakesEmptyPane } from "@/components/mistakes/mistakes-empty-pane"
import { PageNav } from "@/components/nav/page-nav"
import { countMistakes } from "@/server/dashboard/mistakes"
import { loadNavChrome } from "@/server/nav/chrome"

async function loadUserId(): Promise<string> {
	const session = await auth()
	if (!session?.user?.id) {
		redirect("/login")
	}
	return session.user.id
}

async function loadMistakesCount(): Promise<number> {
	const userId = await loadUserId()
	return countMistakes(userId)
}

function Page() {
	const userIdPromise = loadUserId()
	const chromePromise = userIdPromise.then(function load(userId) {
		return loadNavChrome(userId)
	})
	const mistakesCountPromise = loadMistakesCount()
	return (
		<div className="min-h-screen bg-bg text-text-1">
			<React.Suspense fallback={null}>
				<PageNav chromePromise={chromePromise} />
			</React.Suspense>
			<main className="mx-auto max-w-[1100px] px-7 pb-12">
				<React.Suspense fallback={null}>
					<MistakesPrimer mistakesCountPromise={mistakesCountPromise} />
				</React.Suspense>
			</main>
		</div>
	)
}

async function MistakesPrimer(props: { mistakesCountPromise: Promise<number> }) {
	const mistakesCount = await props.mistakesCountPromise
	if (mistakesCount === 0) {
		return <MistakesEmptyPane />
	}
	return (
		<>
			<header className="mb-6 flex flex-col gap-1 border-border-soft border-b pt-6 pb-4">
				<h1 className="font-medium font-serif text-2xl text-text-1 tracking-tight">
					Mistakes review
				</h1>
				<p className="max-w-[60ch] text-sm text-text-2">
					Review unresolved misses with the standard 18-second pacing target. Use the WOOP
					primer first so you go into the redrill with a clear plan for recovery.
				</p>
			</header>
			<FocusTutorialBeforePrimerGate>
				<WoopWizard runHref="/mistakes/run" startLabel="Start mistakes review" />
			</FocusTutorialBeforePrimerGate>
		</>
	)
}

export default Page
