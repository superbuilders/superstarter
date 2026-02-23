import * as errors from "@superbuilders/errors"
import { Sandbox } from "@vercel/sandbox"
import { NonRetriableError } from "inngest"
import { inngest } from "@/inngest"

const createFunction = inngest.createFunction(
	{ id: "paul/sandbox/create" },
	{ event: "paul/sandbox/create" },
	async ({ event, logger, step }) => {
		logger.info("creating sandbox", { runtime: event.data.runtime })

		const sandboxData = await step.run("create-sandbox", async () => {
			const result = await errors.try(Sandbox.create({ runtime: event.data.runtime }))
			if (result.error) {
				logger.error("sandbox creation failed", { error: result.error })
				throw new NonRetriableError(String(result.error))
			}

			const sbx = result.data
			const description = {
				sandboxId: sbx.sandboxId,
				status: sbx.status,
				createdAt: sbx.createdAt,
				timeout: sbx.timeout,
				networkPolicy: sbx.networkPolicy,
				sourceSnapshotId: sbx.sourceSnapshotId,
				routes: sbx.routes,
				interactivePort: sbx.interactivePort
			}
			logger.info("sandbox created", description)
			return description
		})

		await step.sendEvent("echo-sandbox", [
			{
				name: "paul/debug/echo" as const,
				data: {
					source: "paul/sandbox/create",
					payload: sandboxData
				}
			}
		])

		logger.info("sandbox create complete", {
			sandboxId: sandboxData.sandboxId
		})

		return { sandboxId: sandboxData.sandboxId }
	}
)

export { createFunction }
