import * as errors from "@superbuilders/errors"
import { inngest } from "@/inngest"
import { edit } from "@/lib/agent/fs/operations"

const editFunction = inngest.createFunction(
	{ id: "paul/agents/fs/edit" },
	{ event: "paul/agents/fs/edit" },
	async ({ event, logger }) => {
		logger.info("editing file", { path: event.data.path })

		const result = await errors.try(
			edit(event.data.path, event.data.oldString, event.data.newString, event.data.replaceAll)
		)
		if (result.error) {
			logger.error("edit failed", { error: result.error, path: event.data.path })
			throw errors.wrap(result.error, "edit")
		}

		logger.info("edit complete", {
			path: result.data.path,
			replacements: result.data.replacements
		})

		return result.data
	}
)

export { editFunction }
