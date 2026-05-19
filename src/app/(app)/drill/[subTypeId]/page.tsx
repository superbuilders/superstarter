import { notFound, redirect } from "next/navigation"
import * as React from "react"
import { auth } from "@/auth"
import { DEFAULT_DRILL_QUESTIONS, type SubTypeId, subTypeIds, subTypes } from "@/config/sub-types"
import { PageNav } from "@/components/nav/page-nav"
import { FocusTutorialBeforePrimerGate } from "@/components/focus-shell/focus-shell"
import { WoopWizard } from "@/components/full-length/woop-wizard"
import { loadNavChrome } from "@/server/nav/chrome"

const subTypeIdSet: ReadonlySet<string> = new Set<string>(subTypeIds)

function asSubTypeId(value: string): SubTypeId | undefined {
	if (!subTypeIdSet.has(value)) return undefined
	return subTypeIds.find(function match(known) {
		return known === value
	})
}

interface PageProps {
	params: Promise<{ subTypeId: string }>
}

async function loadUserId(): Promise<string> {
	const session = await auth()
	if (!session?.user?.id) {
		redirect("/login")
	}
	return session.user.id
}

async function loadPrimer(paramsPromise: Promise<{ subTypeId: string }>): Promise<{
	subTypeId: SubTypeId
	displayName: string
}> {
	const params = await paramsPromise
	const subTypeId = asSubTypeId(params.subTypeId)
	if (subTypeId === undefined) notFound()
	const config = subTypes.find(function byId(entry) {
		return entry.id === subTypeId
	})
	if (!config) notFound()
	return { subTypeId, displayName: config.displayName }
}

function Page(props: PageProps) {
	const chromePromise = loadUserId().then(function load(userId) {
		return loadNavChrome(userId)
	})
	const primerPromise = loadPrimer(props.params)
	return (
		<div className="min-h-screen bg-bg text-text-1">
			<React.Suspense fallback={null}>
				<PageNav chromePromise={chromePromise} />
			</React.Suspense>
			<main className="mx-auto max-w-[1100px] px-7 pb-12">
				<React.Suspense fallback={null}>
					<DrillPrimer primerPromise={primerPromise} />
				</React.Suspense>
			</main>
		</div>
	)
}

async function DrillPrimer(props: {
	primerPromise: Promise<{ subTypeId: SubTypeId; displayName: string }>
}) {
	const primer = await props.primerPromise
	const runHref = `/drill/${encodeURIComponent(primer.subTypeId)}/run`
	return (
		<>
			<header className="mb-6 flex flex-col gap-1 border-border-soft border-b pt-6 pb-4">
				<h1 className="font-medium font-serif text-2xl text-text-1 tracking-tight">
					{primer.displayName} drill
				</h1>
				<p className="max-w-[60ch] text-sm text-text-2">
					{DEFAULT_DRILL_QUESTIONS} questions with the standard 18-second pacing target. Use the
					WOOP primer to lock in how you want to handle pressure before you start.
				</p>
			</header>
			<FocusTutorialBeforePrimerGate>
				<WoopWizard runHref={runHref} startLabel="Start drill" />
			</FocusTutorialBeforePrimerGate>
		</>
	)
}

export default Page
