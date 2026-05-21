import * as errors from "@superbuilders/errors"
import * as React from "react"
import { ExperimentalPracticeTestRunContent } from "@/app/(app)/experimental/practice-test/run/content"
import { ExperimentalDrillEmptyPane } from "@/components/experimental/experimental-drill-empty-pane"
import { ExperimentalPageFrame } from "@/components/experimental/experimental-page-frame"
import { loadExperimentalUserId } from "@/server/experimental/auth"
import {
	loadExperimentalPracticeTestPrimerData,
	parseExperimentalPracticeTestConfig
} from "@/server/experimental/practice-test-data"
import { startExperimentalPracticeTestSession } from "@/server/experimental/practice-test-session"
import { loadNavChrome } from "@/server/nav/chrome"

interface PageProps {
	searchParams: Promise<Record<string, string | string[] | undefined>>
}

function firstValue(value: string | string[] | undefined): string | undefined {
	if (Array.isArray(value)) return value[0]
	return value
}

async function loadRunState(searchParamsPromise: Promise<Record<string, string | string[] | undefined>>) {
	const [userId, primer, searchParams] = await Promise.all([
		loadExperimentalUserId(),
		loadExperimentalPracticeTestPrimerData(),
		searchParamsPromise
	])
	const configResult = parseExperimentalPracticeTestConfig({
		questionCount: firstValue(searchParams.questionCount),
		durationMinutes: firstValue(searchParams.durationMinutes),
		primer
	})
	if (!configResult.ok) {
		return { kind: "empty" as const, primer, userId, reason: configResult.reason }
	}
	const initResult = await errors.try(
		startExperimentalPracticeTestSession({
			userId,
			targetQuestionCount: configResult.config.questionCount,
			durationMinutes: configResult.config.durationMinutes
		})
	)
	if (initResult.error) {
		return { kind: "empty" as const, primer, userId, reason: "The requested Experimental practice test could not be started with the current pool. Lower the question count or try again after refreshing the pool." }
	}
	return { kind: "ready" as const, init: initResult.data, userId }
}

function Page(props: PageProps) {
	const runStatePromise = loadRunState(props.searchParams)
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
				description="The requested Experimental run could not be started with the current pool. Adjust the requested settings on the primer page and try again."
			>
				<ExperimentalDrillEmptyPane
					title="No Experimental practice test available for this configuration"
					body={runState.reason}
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
