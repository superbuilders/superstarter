import * as errors from "@superbuilders/errors"
import { inngest } from "@/inngest"
import { write } from "@/lib/agent/fs/operations"

const writeFunction = inngest.createFunction(
	{ id: "paul/agents/fs/write" },
	{ event: "paul/agents/fs/write" },
	async ({ event, logger }) => {
		logger.info("writing file", { path: event.data.path })

		const result = await errors.try(write(event.data.path, event.data.content))
		if (result.error) {
			logger.error("write failed", { error: result.error, path: event.data.path })
			throw errors.wrap(result.error, "write")
		}

		logger.info("write complete", {
			path: result.data.path,
			size: result.data.size,
			created: result.data.created
		})

		return result.data
	}
)

export { writeFunction }
