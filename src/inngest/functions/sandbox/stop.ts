import * as errors from "@superbuilders/errors"
import { Sandbox } from "@vercel/sandbox"
import { NonRetriableError } from "inngest"
import { inngest } from "@/inngest"

const stopFunction = inngest.createFunction(
	{ id: "paul/sandbox/stop" },
	{ event: "paul/sandbox/stop" },
	async ({ event, logger, step }) => {
		logger.info("stopping sandbox", { sandboxId: event.data.sandboxId })

		const sandboxData = await step.run("stop-sandbox", async () => {
			const connectResult = await errors.try(Sandbox.get({ sandboxId: event.data.sandboxId }))
			if (connectResult.error) {
				logger.error("sandbox connection failed", {
					error: connectResult.error,
					sandboxId: event.data.sandboxId
				})
				throw new NonRetriableError(String(connectResult.error))
			}

			const sbx = connectResult.data
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
			logger.info("sandbox connected", description)

			const stopResult = await errors.try(sbx.stop())
			if (stopResult.error) {
				logger.error("sandbox stop failed", {
					error: stopResult.error,
					sandboxId: event.data.sandboxId
				})
				throw errors.wrap(stopResult.error, "sandbox stop")
			}

			return description
		})

		await step.sendEvent("echo-sandbox", [
			{
				name: "paul/debug/echo" as const,
				data: {
					source: "paul/sandbox/stop",
					payload: sandboxData
				}
			}
		])

		logger.info("sandbox stop complete", {
			sandboxId: event.data.sandboxId
		})

		return { sandboxId: event.data.sandboxId }
	}
)

export { stopFunction }
