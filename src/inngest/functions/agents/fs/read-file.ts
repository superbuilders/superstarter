import * as errors from "@superbuilders/errors"
import { inngest } from "@/inngest"
import { readFile } from "@/lib/agent/fs/operations"

const readFileFunction = inngest.createFunction(
	{ id: "paul/agents/fs/read-file" },
	{ event: "superstarter/file.read" },
	async ({ event, logger }) => {
		logger.info("reading file", { path: event.data.path })

		const result = await errors.try(readFile(event.data.path))
		if (result.error) {
			logger.error("read file failed", { error: result.error, path: event.data.path })
			throw errors.wrap(result.error, "read file")
		}

		logger.info("file read complete", {
			path: result.data.path,
			size: result.data.size,
			lineCount: result.data.lineCount
		})

		return result.data
	}
)

export { readFileFunction }
