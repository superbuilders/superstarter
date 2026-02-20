import { readFile as fsReadFile, stat } from "node:fs/promises"
import * as errors from "@superbuilders/errors"
import * as logger from "@superbuilders/slog"

// Max file size for LLM context — 100KB keeps token usage reasonable
const MAX_FILE_SIZE = 100 * 1024

const ErrNotFound = errors.new("file not found")
const ErrNotAFile = errors.new("path is not a file")
const ErrTooLarge = errors.new("file too large for context")

interface ReadFileResult {
	content: string
	path: string
	size: number
	lineCount: number
}

async function readFile(filePath: string): Promise<ReadFileResult> {
	const statResult = await errors.try(stat(filePath))
	if (statResult.error) {
		logger.error("file not found", { error: statResult.error, path: filePath })
		throw errors.wrap(ErrNotFound, filePath)
	}

	if (!statResult.data.isFile()) {
		logger.error("path is not a file", { path: filePath })
		throw errors.wrap(ErrNotAFile, filePath)
	}

	if (statResult.data.size > MAX_FILE_SIZE) {
		logger.error("file too large", {
			path: filePath,
			size: statResult.data.size,
			maxSize: MAX_FILE_SIZE
		})
		throw errors.wrap(
			ErrTooLarge,
			`${filePath} (${statResult.data.size} bytes, max ${MAX_FILE_SIZE})`
		)
	}

	const readResult = await errors.try(fsReadFile(filePath, "utf-8"))
	if (readResult.error) {
		logger.error("file read failed", { error: readResult.error, path: filePath })
		throw errors.wrap(readResult.error, `read '${filePath}'`)
	}

	const content = readResult.data
	const lineCount = content.length === 0 ? 0 : content.split("\n").length

	return { content, path: filePath, size: statResult.data.size, lineCount }
}

export { readFile, ErrNotFound, ErrNotAFile, ErrTooLarge, MAX_FILE_SIZE }
export type { ReadFileResult }
