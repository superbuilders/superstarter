import * as errors from "@superbuilders/errors"
import { inngest } from "@/inngest"
import { grep } from "@/lib/agent/fs/operations"

const grepFunction = inngest.createFunction(
	{ id: "paul/agents/fs/grep" },
	{ event: "paul/agents/fs/grep" },
	async ({ event, logger }) => {
		logger.info("grepping directory", {
			dirPath: event.data.dirPath,
			pattern: event.data.pattern,
			glob: event.data.glob
		})

		const result = await errors.try(
			grep(event.data.dirPath, event.data.pattern, {
				glob: event.data.glob,
				maxResults: event.data.maxResults
			})
		)
		if (result.error) {
			logger.error("grep failed", {
				error: result.error,
				dirPath: event.data.dirPath,
				pattern: event.data.pattern
			})
			throw errors.wrap(result.error, "grep")
		}

		logger.info("grep complete", {
			pattern: result.data.pattern,
			matchCount: result.data.matches.length
		})

		return result.data
	}
)

export { grepFunction }
