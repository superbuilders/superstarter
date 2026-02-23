import * as errors from "@superbuilders/errors"
import * as logger from "@superbuilders/slog"
import type { Sandbox } from "@vercel/sandbox"

const MAX_FILE_SIZE = 100 * 1024
const MAX_GLOB_RESULTS = 1000
const MAX_GREP_RESULTS = 100

const ErrNotFound = errors.new("not found")
const ErrNotAFile = errors.new("path is not a file")
const ErrNotADirectory = errors.new("path is not a directory")
const ErrTooLarge = errors.new("file too large for context")
const ErrTooManyResults = errors.new("too many results")
const ErrInvalidPattern = errors.new("invalid regex pattern")
const ErrWriteFailed = errors.new("write failed")
const ErrNoMatch = errors.new("old string not found in file")
const ErrAmbiguousMatch = errors.new("old string found multiple times without replaceAll")

interface ReadResult {
	content: string
	path: string
	size: number
	lineCount: number
}

async function read(sandbox: Sandbox, filePath: string): Promise<ReadResult> {
	const bufResult = await errors.try(sandbox.readFileToBuffer({ path: filePath }))
	if (bufResult.error) {
		logger.error("file read failed", { error: bufResult.error, path: filePath })
		throw errors.wrap(bufResult.error, `read '${filePath}'`)
	}

	if (bufResult.data === null) {
		logger.error("file not found", { path: filePath })
		throw errors.wrap(ErrNotFound, filePath)
	}

	const buf = bufResult.data

	if (buf.length > MAX_FILE_SIZE) {
		logger.error("file too large", { path: filePath, size: buf.length, maxSize: MAX_FILE_SIZE })
		throw errors.wrap(ErrTooLarge, `${filePath} (${buf.length} bytes, max ${MAX_FILE_SIZE})`)
	}

	const content = buf.toString("utf-8")
	const lineCount = content.length === 0 ? 0 : content.split("\n").length

	logger.debug("read complete", { path: filePath, size: buf.length, lineCount })

	return { content, path: filePath, size: buf.length, lineCount }
}

interface GlobMatch {
	path: string
	name: string
	size: number
}

interface GlobResult {
	pattern: string
	basePath: string
	matches: GlobMatch[]
}

function buildFindArgs(dirPath: string, pattern: string): string[] {
	if (pattern.startsWith("**/")) {
		const namePattern = pattern.slice(3)
		return [dirPath, "-type", "f", "-name", namePattern, "-printf", "%p\\t%s\\n"]
	}
	if (pattern.includes("/")) {
		logger.error("unsupported glob pattern", { pattern, dirPath })
		throw errors.wrap(
			ErrInvalidPattern,
			`pattern '${pattern}' contains '/'; use dirPath to scope instead`
		)
	}
	return [dirPath, "-maxdepth", "1", "-type", "f", "-name", pattern, "-printf", "%p\\t%s\\n"]
}

function parseGlobLine(line: string, basePath: string): GlobMatch {
	const tabIndex = line.lastIndexOf("\t")
	if (tabIndex === -1) {
		return { path: line, name: line, size: 0 }
	}
	const filePath = line.slice(0, tabIndex)
	const size = Number.parseInt(line.slice(tabIndex + 1), 10)
	const prefix = basePath.endsWith("/") ? basePath : `${basePath}/`
	const name = filePath.startsWith(prefix) ? filePath.slice(prefix.length) : filePath
	return { path: filePath, name, size }
}

async function glob(sandbox: Sandbox, dirPath: string, pattern: string): Promise<GlobResult> {
	const args = buildFindArgs(dirPath, pattern)
	const cmdResult = await errors.try(sandbox.runCommand("find", args))
	if (cmdResult.error) {
		logger.error("glob command failed", { error: cmdResult.error, dirPath, pattern })
		throw errors.wrap(cmdResult.error, `glob '${pattern}' in '${dirPath}'`)
	}

	const cmd = cmdResult.data

	const stdoutResult = await errors.try(cmd.stdout())
	if (stdoutResult.error) {
		logger.error("glob stdout failed", { error: stdoutResult.error })
		throw errors.wrap(stdoutResult.error, "glob stdout")
	}

	const stderrResult = await errors.try(cmd.stderr())
	if (stderrResult.error) {
		logger.error("glob stderr failed", { error: stderrResult.error })
		throw errors.wrap(stderrResult.error, "glob stderr")
	}

	logger.debug("glob command complete", {
		cmdId: cmd.cmdId,
		cwd: cmd.cwd,
		startedAt: cmd.startedAt,
		exitCode: cmd.exitCode,
		stdoutLength: stdoutResult.data.length,
		stderr: stderrResult.data
	})

	if (cmd.exitCode !== 0 && stdoutResult.data.length === 0) {
		logger.error("glob find returned non-zero", {
			exitCode: cmd.exitCode,
			stderr: stderrResult.data,
			dirPath,
			pattern
		})
		throw errors.wrap(ErrNotFound, `find in '${dirPath}'`)
	}

	const lines = stdoutResult.data.trim().split("\n").filter(Boolean)

	if (lines.length >= MAX_GLOB_RESULTS) {
		logger.warn("glob result limit reached", { dirPath, pattern, limit: MAX_GLOB_RESULTS })
		throw errors.wrap(
			ErrTooManyResults,
			`pattern '${pattern}' in '${dirPath}' (limit ${MAX_GLOB_RESULTS})`
		)
	}

	const matches = lines.map(function parseMatch(line) {
		return parseGlobLine(line, dirPath)
	})

	logger.debug("glob complete", { dirPath, pattern, matchCount: matches.length })

	return { pattern, basePath: dirPath, matches }
}

interface GrepMatch {
	path: string
	lineNumber: number
	lineContent: string
}

interface GrepOptions {
	glob?: string
	maxResults?: number
}

interface GrepResult {
	pattern: string
	matches: GrepMatch[]
}

function parseGrepLine(line: string): GrepMatch {
	const nullIndex = line.indexOf("\0")
	if (nullIndex === -1) {
		return { path: line, lineNumber: 0, lineContent: line }
	}
	const path = line.slice(0, nullIndex)
	const rest = line.slice(nullIndex + 1)
	const colonIndex = rest.indexOf(":")
	if (colonIndex === -1) {
		return { path, lineNumber: 0, lineContent: rest }
	}
	const lineNumber = Number.parseInt(rest.slice(0, colonIndex), 10)
	const lineContent = rest.slice(colonIndex + 1)
	return { path, lineNumber, lineContent }
}

async function grep(
	sandbox: Sandbox,
	dirPath: string,
	pattern: string,
	options?: GrepOptions
): Promise<GrepResult> {
	const limit = options?.maxResults ? options.maxResults : MAX_GREP_RESULTS
	const args = ["-rnZ", pattern, dirPath]
	if (options?.glob) {
		args.push("--include", options.glob)
	}

	const cmdResult = await errors.try(sandbox.runCommand("grep", args))
	if (cmdResult.error) {
		logger.error("grep command failed", { error: cmdResult.error, dirPath, pattern })
		throw errors.wrap(cmdResult.error, `grep '${pattern}' in '${dirPath}'`)
	}

	const cmd = cmdResult.data

	const stdoutResult = await errors.try(cmd.stdout())
	if (stdoutResult.error) {
		logger.error("grep stdout failed", { error: stdoutResult.error })
		throw errors.wrap(stdoutResult.error, "grep stdout")
	}

	const stderrResult = await errors.try(cmd.stderr())
	if (stderrResult.error) {
		logger.error("grep stderr failed", { error: stderrResult.error })
		throw errors.wrap(stderrResult.error, "grep stderr")
	}

	logger.debug("grep command complete", {
		cmdId: cmd.cmdId,
		cwd: cmd.cwd,
		startedAt: cmd.startedAt,
		exitCode: cmd.exitCode,
		stdoutLength: stdoutResult.data.length,
		stderr: stderrResult.data
	})

	if (cmd.exitCode === 2) {
		logger.error("grep pattern error", { stderr: stderrResult.data, pattern })
		throw errors.wrap(ErrInvalidPattern, pattern)
	}

	if (cmd.exitCode === 1) {
		return { pattern, matches: [] }
	}

	const lines = stdoutResult.data.trim().split("\n").filter(Boolean)
	const truncated = lines.slice(0, limit)
	const matches = truncated.map(function parseMatch(line) {
		return parseGrepLine(line)
	})

	logger.debug("grep complete", { dirPath, pattern, matchCount: matches.length })

	return { pattern, matches }
}

interface WriteResult {
	path: string
	size: number
	created: boolean
}

async function write(sandbox: Sandbox, filePath: string, content: string): Promise<WriteResult> {
	const testResult = await errors.try(sandbox.runCommand("test", ["-f", filePath]))
	let created = true
	if (!testResult.error && testResult.data.exitCode === 0) {
		created = false
	}

	const buf = Buffer.from(content, "utf-8")
	const writeResult = await errors.try(sandbox.writeFiles([{ path: filePath, content: buf }]))
	if (writeResult.error) {
		logger.error("write failed", { error: writeResult.error, path: filePath })
		throw errors.wrap(ErrWriteFailed, filePath)
	}

	logger.debug("write complete", { path: filePath, size: buf.length, created })

	return { path: filePath, size: buf.length, created }
}

interface EditResult {
	path: string
	replacements: number
}

async function edit(
	sandbox: Sandbox,
	filePath: string,
	oldString: string,
	newString: string,
	replaceAll?: boolean
): Promise<EditResult> {
	const bufResult = await errors.try(sandbox.readFileToBuffer({ path: filePath }))
	if (bufResult.error) {
		logger.error("file read failed", { error: bufResult.error, path: filePath })
		throw errors.wrap(bufResult.error, `read '${filePath}'`)
	}

	if (bufResult.data === null) {
		logger.error("file not found", { path: filePath })
		throw errors.wrap(ErrNotFound, filePath)
	}

	const content = bufResult.data.toString("utf-8")

	let count = 0
	let searchFrom = 0
	while (true) {
		const idx = content.indexOf(oldString, searchFrom)
		if (idx === -1) {
			break
		}
		count++
		searchFrom = idx + oldString.length
	}

	if (count === 0) {
		logger.error("old string not found", { path: filePath, oldString })
		throw errors.wrap(ErrNoMatch, filePath)
	}

	if (count > 1 && !replaceAll) {
		logger.error("ambiguous match", { path: filePath, oldString, count })
		throw errors.wrap(ErrAmbiguousMatch, `${count} occurrences in '${filePath}'`)
	}

	let newContent: string
	let replacements: number
	if (replaceAll) {
		newContent = content.replaceAll(oldString, newString)
		replacements = count
	} else {
		newContent = content.replace(oldString, newString)
		replacements = 1
	}

	const buf = Buffer.from(newContent, "utf-8")
	const writeResult = await errors.try(sandbox.writeFiles([{ path: filePath, content: buf }]))
	if (writeResult.error) {
		logger.error("file write failed", { error: writeResult.error, path: filePath })
		throw errors.wrap(writeResult.error, `write '${filePath}'`)
	}

	logger.debug("edit complete", { path: filePath, replacements })

	return { path: filePath, replacements }
}

export {
	ErrAmbiguousMatch,
	ErrInvalidPattern,
	ErrNoMatch,
	ErrNotADirectory,
	ErrNotAFile,
	ErrNotFound,
	ErrTooLarge,
	ErrTooManyResults,
	ErrWriteFailed,
	MAX_FILE_SIZE,
	MAX_GLOB_RESULTS,
	MAX_GREP_RESULTS,
	edit,
	glob,
	grep,
	read,
	write
}

export type {
	EditResult,
	GlobMatch,
	GlobResult,
	GrepMatch,
	GrepOptions,
	GrepResult,
	ReadResult,
	WriteResult
}
