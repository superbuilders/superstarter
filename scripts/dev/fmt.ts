#!/usr/bin/env bun
/**
 * Super Fumpt
 *
 * TypeScript/TSX formatter - exact port of gofumpt rules.
 *
 * Blank line rules (exact gofumpt port):
 *   - No empty lines in empty blocks
 *   - No empty lines at start/end of function bodies
 *   - No empty lines around lone statements (blocks with exactly 1 statement)
 *   - Exception: preserve blank after multiline conditions (if/for/while)
 *   - Add blank line between consecutive multiline top-level declarations (only add, never remove)
 *   - No blank line before error checks (errors.try + if result.error pattern)
 *   - Normalize multiple blank lines to one inside blocks
 *   - No empty lines in JSX children
 *
 * TypeScript-specific:
 *   - String directives at file start get a blank line after (e.g. "use server", "use client")
 *   - All control flow must use curly braces (if, else, while, for, do...while)
 *
 * Export separation:
 *   - Moves inline exports to end of file (export const X -> const X + export { X })
 *   - Preserves re-exports (export { ... } from "..."), star exports, and default exports
 *   - Skips exports with biome-ignore comments
 *
 * Comment stripping (--strip-comments):
 *   - Removes all comments except: hashbang (#!), JSDoc (/**), biome-ignore, ts-ignore directives, @ts-expect-error
 *
 * Usage:
 *   bun scripts/dev/fmt.ts                      # Dry run
 *   bun scripts/dev/fmt.ts --write              # Apply fixes
 *   bun scripts/dev/fmt.ts --strip-comments     # Dry run with comment stripping
 *   bun scripts/dev/fmt.ts --write --strip-comments  # Apply all fixes
 */

import { processFile, reportResults } from "@scripts/dev/fmt/processor"
import type { FileResult } from "@scripts/dev/fmt/types"
import { getFilesToCheck } from "@scripts/dev/shared/files"
import * as errors from "@superbuilders/errors"
import * as logger from "@superbuilders/slog"

async function main() {
	const args = process.argv.slice(2)
	const shouldWrite = args.includes("--write")
	const stripComments = args.includes("--strip-comments")
	const mode = shouldWrite ? "formatting" : "checking"
	logger.info("super-fumpt: starting", {
		mode,
		stripComments
	})
	const files = getFilesToCheck()
	logger.info("super-fumpt: scanning files", { count: files.length })
	const allResults: FileResult[] = []
	let totalComments = 0
	let totalBlankLines = 0
	let totalCurlyBraces = 0
	let totalExports = 0
	let totalReactImports = 0
	for (const file of files) {
		const fileResult = await processFile(file, shouldWrite, stripComments)
		if (fileResult) {
			allResults.push(fileResult)
			totalComments += fileResult.commentViolations.length
			totalBlankLines += fileResult.blankLineViolations.length
			totalCurlyBraces += fileResult.curlyBraceViolations.length
			for (const v of fileResult.exportViolations) {
				totalExports += v.count
			}
			for (const v of fileResult.reactImportViolations) {
				totalReactImports += v.namedImports.length
			}
		}
	}
	reportResults(
		allResults,
		totalComments,
		totalBlankLines,
		totalCurlyBraces,
		totalExports,
		totalReactImports,
		shouldWrite
	)
}

const result = await errors.try(main())
if (result.error) {
	logger.error("super-fumpt: failed", { error: result.error })
	process.exit(1)
}
