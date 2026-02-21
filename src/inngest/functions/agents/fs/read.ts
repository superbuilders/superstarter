import * as errors from "@superbuilders/errors"
import { inngest } from "@/inngest"
import { read } from "@/lib/agent/fs/operations"

const readFunction = inngest.createFunction(
	{ id: "paul/agents/fs/read" },
	{ event: "paul/agents/fs/read" },
	async ({ event, logger }) => {
		logger.info("reading file", { path: event.data.path })

		const result = await errors.try(read(event.data.path))
		if (result.error) {
			logger.error("read failed", { error: result.error, path: event.data.path })
			throw errors.wrap(result.error, "read")
		}

		logger.info("read complete", {
			path: result.data.path,
			size: result.data.size,
			lineCount: result.data.lineCount
		})

		return result.data
	}
)

export { readFunction }
