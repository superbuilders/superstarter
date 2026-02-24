import * as errors from "@superbuilders/errors"
import { Sandbox } from "@vercel/sandbox"
import { NonRetriableError } from "inngest"
import { env } from "@/env"
import { inngest } from "@/inngest"

function buildCreateParams(
	runtime: string,
	github?: { repoUrl: string; branch: string; token?: string }
) {
	if (!github) {
		return { runtime }
	}

	const { repoUrl, branch } = github
	const token = github.token ? github.token : env.GITHUB_PAT_TOKEN

	if (token) {
		return {
			runtime,
			source: {
				type: "git" as const,
				url: repoUrl,
				revision: branch,
				depth: 1,
				username: "x-access-token",
				password: token
			}
		}
	}

	return {
		runtime,
		source: {
			type: "git" as const,
			url: repoUrl,
			revision: branch,
			depth: 1
		}
	}
}

const createFunction = inngest.createFunction(
	{ id: "paul/sandbox/create" },
	{ event: "paul/sandbox/create" },
	async ({ event, logger, step }) => {
		logger.info("creating sandbox", {
			runtime: event.data.runtime,
			repoUrl: event.data.github?.repoUrl,
			branch: event.data.github?.branch
		})

		const sandboxData = await step.run("create-sandbox", async () => {
			const params = buildCreateParams(event.data.runtime, event.data.github)
			logger.info("sandbox create params", { params: JSON.stringify(params) })
			const result = await errors.try(Sandbox.create(params))
			if (result.error) {
				const detail = {
					error: result.error,
					params: JSON.stringify(params)
				}
				logger.error("sandbox creation failed", detail)
				throw new NonRetriableError(JSON.stringify(detail))
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
				interactivePort: sbx.interactivePort,
				repoUrl: event.data.github?.repoUrl,
				branch: event.data.github?.branch
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
