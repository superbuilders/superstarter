import * as errors from "@superbuilders/errors"
import * as logger from "@superbuilders/slog"
import { Sandbox } from "@vercel/sandbox"
import { z } from "zod"

const ErrSandboxContext = errors.new("sandbox missing from tool context")

const sandboxContextSchema = z.object({
	sandbox: z.instanceof(Sandbox)
})

function extractSandbox(context: unknown): Sandbox {
	const parsed = sandboxContextSchema.safeParse(context)
	if (!parsed.success) {
		logger.error("sandbox context extraction failed", { error: parsed.error })
		throw ErrSandboxContext
	}
	return parsed.data.sandbox
}

export { ErrSandboxContext, extractSandbox }
