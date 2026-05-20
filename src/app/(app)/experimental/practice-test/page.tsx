import { loadNavChrome } from "@/server/nav/chrome"
import { loadExperimentalUserId } from "@/server/experimental/auth"
import { ExperimentalEmptyPane } from "@/components/experimental/experimental-empty-pane"
import { ExperimentalPageFrame } from "@/components/experimental/experimental-page-frame"

function Page() {
	const userIdPromise = loadExperimentalUserId()
	const chromePromise = userIdPromise.then(function load(userId) {
		return loadNavChrome(userId)
	})
	return (
		<ExperimentalPageFrame
			chromePromise={chromePromise}
			eyebrow="Read-only shell"
			title="Experimental Practice Test"
			description="This page reserves the practice-test configure surface for the unaudited Experimental pool. Start and run behavior are intentionally not implemented in this slice."
		>
			<ExperimentalEmptyPane
				title="Practice-test shell only"
				body="The route is live and authenticated, but read-only. Experimental session start, item selection, and review writes will land in later slices."
			/>
		</ExperimentalPageFrame>
	)
}

export default Page
