import { readFile as fsReadFile, mkdir, readdir, stat, writeFile } from "node:fs/promises"
import { relative, resolve } from "node:path"
import * as errors from "@superbuilders/errors"
import * as logger from "@superbuilders/slog"

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

async function* walkDirectoryFromBase(
	basePath: string,
	currentPath: string
): AsyncGenerator<{ relativePath: string; absolutePath: string; size: number }> {
	const entries = await readdir(currentPath, { withFileTypes: true })
	for (const entry of entries) {
		const absolutePath = resolve(currentPath, entry.name)
		const relPath = relative(basePath, absolutePath)
		if (entry.isDirectory()) {
			yield* walkDirectoryFromBase(basePath, absolutePath)
		} else if (entry.isFile()) {
			const fileStat = await stat(absolutePath)
			yield { relativePath: relPath, absolutePath, size: fileStat.size }
		}
	}
}

function convertGlobChar(char: string): string {
	if (char === "?") {
		return "[^/]"
	}
	if (char === ".") {
		return "\\."
	}
	if (char === "{") {
		return "("
	}
	if (char === "}") {
		return ")"
	}
	if (char === ",") {
		return "|"
	}
	return char
}

function globToRegex(pattern: string): RegExp {
	let regex = ""
	let i = 0
	while (i < pattern.length) {
		const char = pattern.charAt(i)
		if (char === "*" && pattern.charAt(i + 1) === "*") {
			regex += ".*"
			i += 2
			if (pattern.charAt(i) === "/") {
				i++
			}
		} else if (char === "*") {
			regex += "[^/]*"
			i++
		} else {
			regex += convertGlobChar(char)
			i++
		}
	}
	return new RegExp(`^${regex}$`)
}

interface ReadResult {
	content: string
	path: string
	size: number
	lineCount: number
}

async function read(filePath: string): Promise<ReadResult> {
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

async function glob(dirPath: string, pattern: string): Promise<GlobResult> {
	const statResult = await errors.try(stat(dirPath))
	if (statResult.error) {
		logger.error("directory not found", { error: statResult.error, path: dirPath })
		throw errors.wrap(ErrNotFound, dirPath)
	}

	if (!statResult.data.isDirectory()) {
		logger.error("path is not a directory", { path: dirPath })
		throw errors.wrap(ErrNotADirectory, dirPath)
	}

	const regex = globToRegex(pattern)
	const matches: GlobMatch[] = []

	for await (const entry of walkDirectoryFromBase(dirPath, dirPath)) {
		if (regex.test(entry.relativePath)) {
			matches.push({
				path: entry.absolutePath,
				name: entry.relativePath,
				size: entry.size
			})
			if (matches.length >= MAX_GLOB_RESULTS) {
				logger.warn("glob result limit reached", {
					path: dirPath,
					pattern,
					limit: MAX_GLOB_RESULTS
				})
				throw errors.wrap(
					ErrTooManyResults,
					`pattern '${pattern}' in '${dirPath}' (limit ${MAX_GLOB_RESULTS})`
				)
			}
		}
	}

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

function searchFileLines(
	content: string,
	filePath: string,
	regex: RegExp,
	matches: GrepMatch[],
	limit: number
): boolean {
	const lines = content.split("\n")
	for (let i = 0; i < lines.length; i++) {
		const line = lines[i]
		if (line === undefined) {
			continue
		}
		if (regex.test(line)) {
			matches.push({ path: filePath, lineNumber: i + 1, lineContent: line })
			if (matches.length >= limit) {
				return true
			}
		}
	}
	return false
}

function resolveGrepOptions(options?: GrepOptions): {
	globRegex: RegExp | undefined
	limit: number
} {
	const globRegex = options?.glob ? globToRegex(options.glob) : undefined
	if (options !== undefined && options.maxResults !== undefined) {
		return { globRegex, limit: options.maxResults }
	}
	return { globRegex, limit: MAX_GREP_RESULTS }
}

async function grep(dirPath: string, pattern: string, options?: GrepOptions): Promise<GrepResult> {
	const statResult = await errors.try(stat(dirPath))
	if (statResult.error) {
		logger.error("directory not found", { error: statResult.error, path: dirPath })
		throw errors.wrap(ErrNotFound, dirPath)
	}

	if (!statResult.data.isDirectory()) {
		logger.error("path is not a directory", { path: dirPath })
		throw errors.wrap(ErrNotADirectory, dirPath)
	}

	const patternResult = errors.trySync(() => new RegExp(pattern))
	if (patternResult.error) {
		logger.error("invalid regex pattern", { error: patternResult.error, pattern })
		throw errors.wrap(ErrInvalidPattern, pattern)
	}
	const regex = patternResult.data

	const { globRegex, limit } = resolveGrepOptions(options)
	const matches: GrepMatch[] = []

	for await (const entry of walkDirectoryFromBase(dirPath, dirPath)) {
		if (globRegex && !globRegex.test(entry.relativePath)) {
			continue
		}
		if (entry.size > MAX_FILE_SIZE) {
			continue
		}

		const readResult = await errors.try(fsReadFile(entry.absolutePath, "utf-8"))
		if (readResult.error) {
			continue
		}

		if (readResult.data.slice(0, 512).includes("\0")) {
			continue
		}

		const limitReached = searchFileLines(readResult.data, entry.absolutePath, regex, matches, limit)
		if (limitReached) {
			return { pattern, matches }
		}
	}

	return { pattern, matches }
}

interface WriteResult {
	path: string
	size: number
	created: boolean
}

async function write(filePath: string, content: string): Promise<WriteResult> {
	const existsResult = await errors.try(stat(filePath))
	const created = existsResult.error !== undefined

	const dir = filePath.substring(0, filePath.lastIndexOf("/"))
	if (dir) {
		const mkdirResult = await errors.try(mkdir(dir, { recursive: true }))
		if (mkdirResult.error) {
			logger.error("mkdir failed", { error: mkdirResult.error, path: dir })
			throw errors.wrap(ErrWriteFailed, `mkdir '${dir}'`)
		}
	}

	const writeResult = await errors.try(writeFile(filePath, content, "utf-8"))
	if (writeResult.error) {
		logger.error("write failed", { error: writeResult.error, path: filePath })
		throw errors.wrap(ErrWriteFailed, filePath)
	}

	const size = Buffer.byteLength(content, "utf-8")
	return { path: filePath, size, created }
}

interface EditResult {
	path: string
	replacements: number
}

async function edit(
	filePath: string,
	oldString: string,
	newString: string,
	replaceAll?: boolean
): Promise<EditResult> {
	const statResult = await errors.try(stat(filePath))
	if (statResult.error) {
		logger.error("file not found", { error: statResult.error, path: filePath })
		throw errors.wrap(ErrNotFound, filePath)
	}

	if (!statResult.data.isFile()) {
		logger.error("path is not a file", { path: filePath })
		throw errors.wrap(ErrNotAFile, filePath)
	}

	const readResult = await errors.try(fsReadFile(filePath, "utf-8"))
	if (readResult.error) {
		logger.error("file read failed", { error: readResult.error, path: filePath })
		throw errors.wrap(readResult.error, `read '${filePath}'`)
	}

	const content = readResult.data

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

	const writeResult = await errors.try(writeFile(filePath, newContent, "utf-8"))
	if (writeResult.error) {
		logger.error("file write failed", { error: writeResult.error, path: filePath })
		throw errors.wrap(writeResult.error, `write '${filePath}'`)
	}

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
