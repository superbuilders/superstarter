import * as errors from "@superbuilders/errors"
import * as logger from "@superbuilders/slog"
import { tool } from "ai"
import { z } from "zod"
import { extractSandbox } from "@/lib/agent/fs/context"
import { bash, edit, glob, grep, read, write } from "@/lib/agent/fs/operations"

async function executeRead(
	{ path }: { path: string },
	{ experimental_context }: { experimental_context?: unknown }
) {
	const sandbox = extractSandbox(experimental_context)
	const result = await errors.try(read(sandbox, path))
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

async function executeGlob(
	{ dirPath, pattern }: { dirPath: string; pattern: string },
	{ experimental_context }: { experimental_context?: unknown }
) {
	const sandbox = extractSandbox(experimental_context)
	const result = await errors.try(glob(sandbox, dirPath, pattern))
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

async function executeGrep(
	{
		dirPath,
		pattern,
		glob: globFilter,
		maxResults
	}: {
		dirPath: string
		pattern: string
		glob?: string
		maxResults?: number
	},
	{ experimental_context }: { experimental_context?: unknown }
) {
	const sandbox = extractSandbox(experimental_context)
	const result = await errors.try(grep(sandbox, dirPath, pattern, { glob: globFilter, maxResults }))
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

async function executeWrite(
	{ path, content }: { path: string; content: string },
	{ experimental_context }: { experimental_context?: unknown }
) {
	const sandbox = extractSandbox(experimental_context)
	const result = await errors.try(write(sandbox, path, content))
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

async function executeEdit(
	{
		path,
		oldString,
		newString,
		replaceAll
	}: {
		path: string
		oldString: string
		newString: string
		replaceAll?: boolean
	},
	{ experimental_context }: { experimental_context?: unknown }
) {
	const sandbox = extractSandbox(experimental_context)
	const result = await errors.try(edit(sandbox, path, oldString, newString, replaceAll))
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

const BANNED_COMMANDS = [
	{
		pattern: /\bgit\s+push\b/,
		message:
			"BANNED: git push is not allowed. The sandbox GitHub token is read-only. " +
			"All code changes stay local to the sandbox. If you need to persist changes, " +
			"create a patch or diff and return it to the orchestrator."
	},
	{
		pattern: /\bgit\s+remote\s+(add|set-url)\b/,
		message:
			"BANNED: modifying git remotes is not allowed. " +
			"The sandbox operates on a read-only clone."
	}
]

function checkBannedCommand(command: string): string | undefined {
	for (const banned of BANNED_COMMANDS) {
		if (banned.pattern.test(command)) {
			return banned.message
		}
	}
	return undefined
}

async function executeBash(
	{ command }: { command: string },
	{ experimental_context }: { experimental_context?: unknown }
) {
	const bannedMessage = checkBannedCommand(command)
	if (bannedMessage) {
		logger.warn("banned command intercepted", { command: command.slice(0, 80) })
		return { error: bannedMessage, stdout: "", stderr: bannedMessage, exitCode: 1 }
	}

	const sandbox = extractSandbox(experimental_context)
	const result = await errors.try(bash(sandbox, command))
	if (result.error) {
		logger.warn("bash tool failed", { error: result.error, command: command.slice(0, 80) })
		return { error: String(result.error) }
	}
	return {
		stdout: result.data.stdout,
		stderr: result.data.stderr,
		exitCode: result.data.exitCode
	}
}

const bashTool = tool({
	description:
		"Execute a bash command in the sandbox. Returns stdout, stderr, and exit code. Use for running tests, installing dependencies, build commands, git operations, and any task requiring shell execution. Prefer structured tools (read, write, edit, glob, grep) for file operations.",
	inputSchema: z.object({
		command: z.string().min(1).describe("The bash command to execute")
	}),
	strict: true,
	execute: executeBash
})

export { bashTool, editTool, globTool, grepTool, readTool, writeTool }
