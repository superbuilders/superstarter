import { notFound } from "next/navigation"
import { ExperimentalDrillEmptyPane } from "@/components/experimental/experimental-drill-empty-pane"
import { ExperimentalDrillPrimerCard } from "@/components/experimental/experimental-drill-primer-card"
import { ExperimentalPageFrame } from "@/components/experimental/experimental-page-frame"
import { loadExperimentalUserId } from "@/server/experimental/auth"
import {
	asExperimentalDrillSubTypeId,
	loadExperimentalDrillPrimerData
} from "@/server/experimental/drill-data"
import { loadNavChrome } from "@/server/nav/chrome"

interface PageProps {
	params: Promise<{ subTypeId: string }>
}

async function Page(props: PageProps) {
	const params = await props.params
	const subTypeId = asExperimentalDrillSubTypeId(params.subTypeId)
	if (subTypeId === undefined) notFound()
	const userId = await loadExperimentalUserId()
	const [chrome, primer] = await Promise.all([
		loadNavChrome(userId),
		loadExperimentalDrillPrimerData(subTypeId)
	])
	return (
		<ExperimentalPageFrame
			chromePromise={Promise.resolve(chrome)}
			eyebrow="Subtype primer"
			title={`${primer.displayName} Experimental Drill`}
			description="Review the experimental pool size for this subtype, then launch a drill that writes only to the Experimental session and attempt tables."
		>
			{primer.readyToStart ? (
				<ExperimentalDrillPrimerCard primer={primer} />
			) : (
				<ExperimentalDrillEmptyPane
					title="Experimental pool not ready yet"
					body={`This subtype has ${primer.availableCount} unaudited experimental items right now. The MVP drill run needs at least 5 before it can start.`}
				/>
			)}
		</ExperimentalPageFrame>
	)
}

export default Page
