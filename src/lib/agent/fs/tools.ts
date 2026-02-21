import * as errors from "@superbuilders/errors"
import * as logger from "@superbuilders/slog"
import { tool } from "ai"
import { z } from "zod"
import { edit, glob, grep, read, write } from "@/lib/agent/fs/operations"

// ---------------------------------------------------------------------------
// read
// ---------------------------------------------------------------------------

async function executeRead({ path }: { path: string }) {
	const result = await errors.try(read(path))
	if (result.error) {
		logger.warn("read tool failed", { error: result.error, path })
		return { error: String(result.error) }
	}
	return {
		content: result.data.content,
		path: result.data.path,
		size: result.data.size,
		lineCount: result.data.lineCount
	}
}

const readTool = tool({
	description:
		"Read the contents of a file at the given path. Returns the file content, byte size, and line count. Returns an error message if the file does not exist or exceeds the size limit.",
	inputSchema: z.object({
		path: z.string().describe("Absolute path to the file to read")
	}),
	strict: true,
	execute: executeRead
})

// ---------------------------------------------------------------------------
// glob
// ---------------------------------------------------------------------------

async function executeGlob({ dirPath, pattern }: { dirPath: string; pattern: string }) {
	const result = await errors.try(glob(dirPath, pattern))
	if (result.error) {
		logger.warn("glob tool failed", { error: result.error, dirPath, pattern })
		return { error: String(result.error) }
	}
	return {
		pattern: result.data.pattern,
		basePath: result.data.basePath,
		matches: result.data.matches
	}
}

const globTool = tool({
	description:
		"Find files matching a glob pattern in a directory tree. Supports *, **, ? wildcards. Returns matching file paths with names and sizes. Use pattern '*' to list a directory.",
	inputSchema: z.object({
		dirPath: z.string().describe("Absolute path to the directory to search"),
		pattern: z.string().describe("Glob pattern to match files against (e.g. '**/*.ts', '*.json')")
	}),
	strict: true,
	execute: executeGlob
})

// ---------------------------------------------------------------------------
// grep
// ---------------------------------------------------------------------------

async function executeGrep({
	dirPath,
	pattern,
	glob: globFilter,
	maxResults
}: {
	dirPath: string
	pattern: string
	glob?: string
	maxResults?: number
}) {
	const result = await errors.try(grep(dirPath, pattern, { glob: globFilter, maxResults }))
	if (result.error) {
		logger.warn("grep tool failed", { error: result.error, dirPath, pattern })
		return { error: String(result.error) }
	}
	return {
		pattern: result.data.pattern,
		matches: result.data.matches
	}
}

const grepTool = tool({
	description:
		"Search for a regex pattern across files in a directory tree. Returns matching lines with file path and line number. Optionally filter by glob pattern. Skips binary files.",
	inputSchema: z.object({
		dirPath: z.string().describe("Absolute path to the directory to search"),
		pattern: z.string().describe("Regex pattern to search for in file contents"),
		glob: z.string().describe("Optional glob pattern to filter which files to search").optional(),
		maxResults: z
			.number()
			.describe("Maximum number of matching lines to return (default 100)")
			.optional()
	}),
	execute: executeGrep
})

// ---------------------------------------------------------------------------
// write
// ---------------------------------------------------------------------------

async function executeWrite({ path, content }: { path: string; content: string }) {
	const result = await errors.try(write(path, content))
	if (result.error) {
		logger.warn("write tool failed", { error: result.error, path })
		return { error: String(result.error) }
	}
	return {
		path: result.data.path,
		size: result.data.size,
		created: result.data.created
	}
}

const writeTool = tool({
	description:
		"Write content to a file, creating parent directories if needed. Returns the file path, byte size, and whether the file was newly created. Overwrites existing content.",
	inputSchema: z.object({
		path: z.string().describe("Absolute path to the file to write"),
		content: z.string().describe("Content to write to the file")
	}),
	strict: true,
	execute: executeWrite
})

// ---------------------------------------------------------------------------
// edit
// ---------------------------------------------------------------------------

async function executeEdit({
	path,
	oldString,
	newString,
	replaceAll
}: {
	path: string
	oldString: string
	newString: string
	replaceAll?: boolean
}) {
	const result = await errors.try(edit(path, oldString, newString, replaceAll))
	if (result.error) {
		logger.warn("edit tool failed", { error: result.error, path })
		return { error: String(result.error) }
	}
	return {
		path: result.data.path,
		replacements: result.data.replacements
	}
}

const editTool = tool({
	description:
		"Replace exact string matches in a file. Finds oldString and replaces with newString. Fails if oldString is not found or is ambiguous (found multiple times without replaceAll). Use replaceAll to replace every occurrence.",
	inputSchema: z.object({
		path: z.string().describe("Absolute path to the file to edit"),
		oldString: z.string().describe("The exact string to find and replace"),
		newString: z.string().describe("The string to replace oldString with"),
		replaceAll: z
			.boolean()
			.describe("Replace all occurrences instead of failing on ambiguous matches")
			.optional()
	}),
	execute: executeEdit
})

export { readTool, globTool, grepTool, writeTool, editTool }
