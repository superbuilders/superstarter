import * as React from "react"
import { ExperimentalPracticeTestRunContent } from "@/app/(app)/experimental/practice-test/run/content"
import { ExperimentalDrillEmptyPane } from "@/components/experimental/experimental-drill-empty-pane"
import { ExperimentalPageFrame } from "@/components/experimental/experimental-page-frame"
import { loadExperimentalUserId } from "@/server/experimental/auth"
import { loadExperimentalPracticeTestPrimerData } from "@/server/experimental/practice-test-data"
import { startExperimentalPracticeTestSession } from "@/server/experimental/practice-test-session"
import { loadNavChrome } from "@/server/nav/chrome"

async function loadRunState() {
	const userId = await loadExperimentalUserId()
	const primer = await loadExperimentalPracticeTestPrimerData()
	if (!primer.readyToStart) {
		return { kind: "empty" as const, primer, userId }
	}
	const init = await startExperimentalPracticeTestSession({ userId })
	return { kind: "ready" as const, init, userId }
}

function Page() {
	const runStatePromise = loadRunState()
	return (
		<React.Suspense fallback={<RunSkeleton />}>
			<ExperimentalPracticeTestRunGate runStatePromise={runStatePromise} />
		</React.Suspense>
	)
}

async function ExperimentalPracticeTestRunGate(props: {
	runStatePromise: ReturnType<typeof loadRunState>
}) {
	const runState = await props.runStatePromise
	if (runState.kind === "empty") {
		const chrome = await loadNavChrome(runState.userId)
		return (
			<ExperimentalPageFrame
				chromePromise={Promise.resolve(chrome)}
				eyebrow="Experimental run unavailable"
				title="Experimental Practice Test"
				description="This mixed experimental route is live, but the experimental pool is still below the MVP threshold required to start a realistic practice-test session."
			>
				<ExperimentalDrillEmptyPane
					title="No Experimental practice test available yet"
					body={`The current experimental pool has ${runState.primer.availableCount} eligible items across ${runState.primer.availableSubTypeCount} subtypes. The MVP mixed run needs at least ${runState.primer.minimumReadyCount} items across ${runState.primer.minimumSubTypeCount} subtypes before it can start.`}
				/>
			</ExperimentalPageFrame>
		)
	}
	return <ExperimentalPracticeTestRunContent initPromise={Promise.resolve(runState.init)} />
}

function RunSkeleton() {
	return (
		<main className="mx-auto flex min-h-dvh max-w-xl items-center justify-center px-6">
			<p className="text-muted-foreground text-sm">Preparing your Experimental practice test…</p>
		</main>
	)
}

export default Page
