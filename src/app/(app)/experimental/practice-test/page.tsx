import { ExperimentalPracticeTestPrimerCard } from "@/components/experimental/experimental-practice-test-primer-card"
import { ExperimentalDrillEmptyPane } from "@/components/experimental/experimental-drill-empty-pane"
import { ExperimentalPageFrame } from "@/components/experimental/experimental-page-frame"
import { loadExperimentalUserId } from "@/server/experimental/auth"
import { loadExperimentalPracticeTestPrimerData } from "@/server/experimental/practice-test-data"
import { loadNavChrome } from "@/server/nav/chrome"

async function Page() {
	const userId = await loadExperimentalUserId()
	const [chrome, primer] = await Promise.all([
		loadNavChrome(userId),
		loadExperimentalPracticeTestPrimerData()
	])
	return (
		<ExperimentalPageFrame
			chromePromise={Promise.resolve(chrome)}
			eyebrow="Mixed-session primer"
			title="Experimental Practice Test"
			description="Configure the Experimental mixed-question pool, then launch a practice test that writes only to the Experimental session and attempt tables."
		>
			{primer.readyToStart ? (
				<ExperimentalPracticeTestPrimerCard primer={primer} />
			) : (
				<ExperimentalDrillEmptyPane
					title="Experimental pool not ready yet"
					body={`The current experimental pool has ${primer.availableCount} eligible items across ${primer.availableSubTypeCount} subtypes. You need at least ${primer.minimumReadyCount} items across ${primer.minimumSubTypeCount} subtypes before a mixed practice test can start.`}
				/>
			)}
		</ExperimentalPageFrame>
	)
}

export default Page
