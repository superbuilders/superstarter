import * as errors from "@superbuilders/errors"
import { Sandbox } from "@vercel/sandbox"
import { NonRetriableError } from "inngest"

type InngestLogger = {
	info: (message: string, context?: Record<string, unknown>) => void
	error: (message: string, context?: Record<string, unknown>) => void
}

async function connectSandbox(sandboxId: string, logger: InngestLogger): Promise<Sandbox> {
	const result = await errors.try(Sandbox.get({ sandboxId }))
	if (result.error) {
		logger.error("sandbox connection failed", {
			error: result.error,
			sandboxId
		})
		throw new NonRetriableError(`sandbox connection failed: ${String(result.error)}`)
	}
	logger.info("sandbox connected", { sandboxId: result.data.sandboxId })
	return result.data
}

export { connectSandbox }
export type { InngestLogger }
