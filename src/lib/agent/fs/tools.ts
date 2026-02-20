import * as errors from "@superbuilders/errors"
import * as logger from "@superbuilders/slog"
import { tool } from "ai"
import { z } from "zod"
import { readFile } from "@/lib/agent/fs/operations"

async function executeReadFile({ path }: { path: string }) {
	const result = await errors.try(readFile(path))
	if (result.error) {
		logger.warn("read file tool failed", { error: result.error, path })
		return { error: String(result.error) }
	}
	return {
		content: result.data.content,
		path: result.data.path,
		size: result.data.size,
		lineCount: result.data.lineCount
	}
}

const readFileTool = tool({
	description:
		"Read the contents of a file at the given path. Returns the file content, byte size, and line count. Returns an error message if the file does not exist or exceeds the size limit.",
	inputSchema: z.object({
		path: z.string().describe("Absolute path to the file to read")
	}),
	strict: true,
	execute: executeReadFile
})

export { readFileTool }
