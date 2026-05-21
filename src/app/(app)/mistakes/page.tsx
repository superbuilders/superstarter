import { redirect } from "next/navigation"
import * as React from "react"
import { auth } from "@/auth"
import { FocusTutorialBeforePrimerGate } from "@/components/focus-shell/focus-shell"
import { WoopWizard } from "@/components/full-length/woop-wizard"
import { MistakesEmptyPane } from "@/components/mistakes/mistakes-empty-pane"
import { PageNav } from "@/components/nav/page-nav"
import { countMistakes } from "@/server/dashboard/mistakes"
import type { NavChrome } from "@/server/nav/chrome"
import { loadNavChrome } from "@/server/nav/chrome"

async function loadUserId(): Promise<string> {
	const session = await auth()
	if (!session?.user?.id) {
		redirect("/login")
	}
	return session.user.id
}

async function loadMistakesCount(userIdPromise: Promise<string>): Promise<number> {
	const userId = await userIdPromise
	return countMistakes(userId)
}

function Page() {
	const userIdPromise = loadUserId()
	const chromePromise = userIdPromise.then(function load(userId) {
		return loadNavChrome(userId)
	})
	const mistakesCountPromise = loadMistakesCount(userIdPromise)
	return (
		<React.Suspense fallback={null}>
			<MistakesPageBody
				chromePromise={chromePromise}
				mistakesCountPromise={mistakesCountPromise}
				userIdPromise={userIdPromise}
			/>
		</React.Suspense>
	)
}

async function MistakesPageBody(props: {
	chromePromise: Promise<NavChrome>
	mistakesCountPromise: Promise<number>
	userIdPromise: Promise<string>
}) {
	const [mistakesCount, userId] = await Promise.all([
		props.mistakesCountPromise,
		props.userIdPromise
	])
	if (mistakesCount === 0) {
		return (
			<div className="min-h-screen bg-bg text-text-1">
				<React.Suspense fallback={null}>
					<PageNav chromePromise={props.chromePromise} />
				</React.Suspense>
				<main className="mx-auto max-w-[1100px] px-7 pb-12">
					<MistakesEmptyPane />
				</main>
			</div>
		)
	}
	return (
		<FocusTutorialBeforePrimerGate userKey={userId}>
			<div className="min-h-screen bg-bg text-text-1">
				<React.Suspense fallback={null}>
					<PageNav chromePromise={props.chromePromise} />
				</React.Suspense>
				<main className="mx-auto max-w-[1100px] px-7 pb-12">
					<MistakesPrimer />
				</main>
			</div>
		</FocusTutorialBeforePrimerGate>
	)
}

function MistakesPrimer() {
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
			<WoopWizard runHref="/mistakes/run" startLabel="Start mistakes review" />
		</>
	)
}

export default Page
