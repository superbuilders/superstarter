import { ExperimentalDrillList } from "@/components/experimental/experimental-drill-list"
import { ExperimentalPageFrame } from "@/components/experimental/experimental-page-frame"
import { loadExperimentalUserId } from "@/server/experimental/auth"
import { loadExperimentalDrillIndexData } from "@/server/experimental/drill-data"
import { loadNavChrome } from "@/server/nav/chrome"

async function Page() {
	const userId = await loadExperimentalUserId()
	const [chrome, data] = await Promise.all([
		loadNavChrome(userId),
		loadExperimentalDrillIndexData()
	])
	return (
		<ExperimentalPageFrame
			chromePromise={Promise.resolve(chrome)}
			eyebrow="Experimental drills"
			title="Experimental Drills"
			description="Browse subtype-specific drill entry points backed only by the experimental item pool. This slice starts isolated experimental sessions and leaves canonical mastery, stats, and review flows untouched."
		>
			<ExperimentalDrillList data={data} />
		</ExperimentalPageFrame>
	)
}

export default Page
