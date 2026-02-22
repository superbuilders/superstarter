#!/usr/bin/env bun

/**
 * Super Lint - Type-Aware Linter
 *
 * Complements Biome with rules requiring TypeScript's type checker.
 * Detects impossible/dead branches that static analysis alone cannot find.
 *
 * Rules:
 *   - no-null-undefined-union: Ban types with both null and undefined
 *   - no-unnecessary-condition: Flag always-true/false conditions
 *   - no-unnecessary-default-case: Flag unreachable default in exhaustive switch
 *   - prefer-early-return: Enforce early return pattern
 *   - no-impossible-logical-or: Flag || where left is always truthy
 *   - no-arrow-functions: Use named function declarations
 *   - no-object-module: Ban object namespaces, object classes, and class definitions - use ESM modules
 *   - no-pointless-indirection: Don't wrap function calls without adding value
 *
 * Usage:
 *   bun scripts/dev/lint.ts              # Check all files
 *   bun scripts/dev/lint.ts --json       # Output JSON for tooling
 *   bun scripts/dev/lint.ts src/foo.ts   # Check specific file
 */

import { outputJson, outputText } from "@scripts/dev/lint/output"
import { createProgram } from "@scripts/dev/lint/program"
import { rules } from "@scripts/dev/lint/rules"
import type { Violation } from "@scripts/dev/lint/types"
import { getStagedFiles, isSkippedPath } from "@scripts/dev/shared/files"
import * as errors from "@superbuilders/errors"
import * as logger from "@superbuilders/slog"
import type * as ts from "typescript"

function main(): void {
	const args = process.argv.slice(2)
	const useJsonOutput = args.includes("--json")
	const useStaged = args.includes("--staged")
	function isNotFlag(a: string): boolean {
		return !a.startsWith("--")
	}

	const specificFiles = useStaged ? getStagedFiles() : args.filter(isNotFlag)

	if (useStaged && specificFiles.length === 0) {
		logger.info("no staged TypeScript files")
		return
	}

	logger.info("creating TypeScript program")
	const program = createProgram()
	const checker = program.getTypeChecker()

	function isNotDeclarationFile(sf: ts.SourceFile): boolean {
		return !sf.isDeclarationFile
	}

	function matchesSpecificFile(sf: ts.SourceFile): boolean {
		for (const f of specificFiles) {
			if (sf.fileName.includes(f)) {
				return true
			}
		}
		return false
	}

	let sourceFiles = program.getSourceFiles().filter(isNotDeclarationFile)

	if (specificFiles.length > 0) {
		sourceFiles = sourceFiles.filter(matchesSpecificFile)
	}

	const allViolations: Violation[] = []

	for (const sourceFile of sourceFiles) {
		if (isSkippedPath(sourceFile.fileName)) {
			continue
		}

		for (const rule of rules) {
			allViolations.push(...rule.check(sourceFile, checker))
		}
	}

	if (useJsonOutput) {
		outputJson(allViolations)
	} else {
		outputText(allViolations)
	}

	const exitCode = allViolations.length > 0 ? 1 : 0
	process.exit(exitCode)
}

const result = errors.trySync(main)
if (result.error) {
	logger.error("failed", { error: result.error })
	process.exit(1)
}
