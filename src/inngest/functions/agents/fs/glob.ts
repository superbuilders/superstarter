import * as errors from "@superbuilders/errors"
import { inngest } from "@/inngest"
import { glob } from "@/lib/agent/fs/operations"

const globFunction = inngest.createFunction(
	{ id: "paul/agents/fs/glob" },
	{ event: "paul/agents/fs/glob" },
	async ({ event, logger }) => {
		logger.info("globbing directory", {
			dirPath: event.data.dirPath,
			pattern: event.data.pattern
		})

		const result = await errors.try(glob(event.data.dirPath, event.data.pattern))
		if (result.error) {
			logger.error("glob failed", {
				error: result.error,
				dirPath: event.data.dirPath,
				pattern: event.data.pattern
			})
			throw errors.wrap(result.error, "glob")
		}

		logger.info("glob complete", {
			basePath: result.data.basePath,
			pattern: result.data.pattern,
			matchCount: result.data.matches.length
		})

		return result.data
	}
)

export { globFunction }
