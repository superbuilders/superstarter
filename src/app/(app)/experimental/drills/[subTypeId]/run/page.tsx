import { notFound } from "next/navigation"
import * as React from "react"
import { ExperimentalDrillRunContent } from "@/app/(app)/experimental/drills/[subTypeId]/run/content"
import { ExperimentalDrillEmptyPane } from "@/components/experimental/experimental-drill-empty-pane"
import { ExperimentalPageFrame } from "@/components/experimental/experimental-page-frame"
import { loadExperimentalUserId } from "@/server/experimental/auth"
import {
	asExperimentalDrillSubTypeId,
	loadExperimentalDrillPrimerData
} from "@/server/experimental/drill-data"
import { startExperimentalDrillSession } from "@/server/experimental/drill-session"
import { loadNavChrome } from "@/server/nav/chrome"

interface PageProps {
	params: Promise<{ subTypeId: string }>
}

async function loadRunState(paramsPromise: Promise<{ subTypeId: string }>) {
	const params = await paramsPromise
	const subTypeId = asExperimentalDrillSubTypeId(params.subTypeId)
	if (subTypeId === undefined) notFound()
	const userId = await loadExperimentalUserId()
	const primer = await loadExperimentalDrillPrimerData(subTypeId)
	if (!primer.readyToStart) {
		return { kind: "empty" as const, primer, userId }
	}
	const init = await startExperimentalDrillSession({ userId, subTypeId })
	return { kind: "ready" as const, init, userId }
}

function Page(props: PageProps) {
	const runStatePromise = loadRunState(props.params)
	return (
		<React.Suspense fallback={<RunSkeleton />}>
			<ExperimentalDrillRunGate runStatePromise={runStatePromise} />
		</React.Suspense>
	)
}

async function ExperimentalDrillRunGate(props: {
	runStatePromise: ReturnType<typeof loadRunState>
}) {
	const runState = await props.runStatePromise
	if (runState.kind === "empty") {
		const chrome = await loadNavChrome(runState.userId)
		return (
			<ExperimentalPageFrame
				chromePromise={Promise.resolve(chrome)}
				eyebrow="Experimental run unavailable"
				title={`${runState.primer.displayName} Experimental Drill`}
				description="This subtype route is live, but the experimental pool is still below the MVP threshold required to start a drill."
			>
				<ExperimentalDrillEmptyPane
					title="No Experimental drill available yet"
					body={`This subtype currently has ${runState.primer.availableCount} unaudited experimental items. The run path stays read-safe and shows this empty state until at least 5 exist.`}
				/>
			</ExperimentalPageFrame>
		)
	}
	return <ExperimentalDrillRunContent initPromise={Promise.resolve(runState.init)} />
}

function RunSkeleton() {
	return (
		<main className="mx-auto flex min-h-dvh max-w-xl items-center justify-center px-6">
			<p className="text-muted-foreground text-sm">Preparing your Experimental drill…</p>
		</main>
	)
}

export default Page
