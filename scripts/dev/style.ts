#!/usr/bin/env bun

/**
 * Style Linter - Design Token Enforcement
 *
 * Enforces Shadcn design tokens by parsing globals.css and validating
 * that color-related Tailwind classes only use allowed theme tokens.
 *
 * Rules:
 *   - no-invalid-color: Require colors from theme (ban blue-500, gray-700, etc.)
 *   - no-arbitrary-color: Ban arbitrary color values (bg-[#fff], text-[rgb(...)])
 *   - require-data-slot: Components must have data-slot on top-level element
 *
 * Usage:
 *   bun scripts/dev/style.ts              # Check all TSX files
 *   bun scripts/dev/style.ts --json       # Output JSON for tooling
 *   bun scripts/dev/style.ts src/app/     # Check specific directory
 */

import { parseTsConfig } from "@scripts/dev/shared/files"
import { extractClassesFromFile } from "@scripts/dev/style/class-extractor"
import { loadDesignSystem } from "@scripts/dev/style/design-system"
import * as noInvalidColor from "@scripts/dev/style/rules/no-invalid-color"
import * as requireDataSlot from "@scripts/dev/style/rules/require-data-slot"
import type { Violation } from "@scripts/dev/style/types"
import * as errors from "@superbuilders/errors"
import * as logger from "@superbuilders/slog"
import * as ts from "typescript"

function parseArgs(): { useJsonOutput: boolean; specificPaths: string[] } {
	const args = process.argv.slice(2)
	const useJsonOutput = args.includes("--json")
	const specificPaths = args.filter((a) => !a.startsWith("--"))
	return { useJsonOutput, specificPaths }
}

function collectSourceFiles(program: ts.Program, specificPaths: string[]): ts.SourceFile[] {
	const sourceFiles: ts.SourceFile[] = []

	for (const sf of program.getSourceFiles()) {
		if (sf.isDeclarationFile) continue
		if (sf.fileName.includes("node_modules")) continue
		if (!sf.fileName.endsWith(".tsx")) continue
		if (!matchesAnyPath(sf.fileName, specificPaths)) continue
		sourceFiles.push(sf)
	}

	return sourceFiles
}

function matchesAnyPath(fileName: string, specificPaths: string[]): boolean {
	if (specificPaths.length === 0) return true

	for (const p of specificPaths) {
		if (fileName.includes(p)) return true
	}

	return false
}

function outputJson(violations: Violation[]): void {
	process.stdout.write(JSON.stringify(violations, null, 2))
	process.stdout.write("\n")
}

function outputText(violations: Violation[]): void {
	for (const v of violations) {
		const location = `${v.file}:${v.line}:${v.column}`
		const details: Record<string, unknown> = {
			location,
			rule: v.rule,
			message: v.message
		}
		if (v.className) {
			details.class = v.className
		}
		if (v.componentName) {
			details.component = v.componentName
		}
		logger.warn("style violation", details)
	}

	if (violations.length === 0) {
		logger.info("no style violations found")
	} else {
		logger.info("style check complete", { violations: violations.length })
	}
}

async function main(): Promise<void> {
	const { useJsonOutput, specificPaths } = parseArgs()

	logger.info("loading design system from globals.css")
	const designSystem = await loadDesignSystem()
	logger.info("loaded design tokens", { colors: designSystem.allowedColors.size })

	logger.info("creating TypeScript program")
	const config = parseTsConfig()
	const program = ts.createProgram(config.fileNames, config.options)
	const sourceFiles = collectSourceFiles(program, specificPaths)

	logger.info("checking TSX files", { count: sourceFiles.length })

	const allViolations: Violation[] = []

	for (const sourceFile of sourceFiles) {
		// Check data-slot requirement
		const dataSlotViolations = requireDataSlot.check(sourceFile)
		allViolations.push(...dataSlotViolations)

		// Check color violations
		const classes = extractClassesFromFile(sourceFile)
		if (classes.length > 0) {
			const colorViolations = noInvalidColor.check(classes, designSystem, sourceFile.fileName)
			allViolations.push(...colorViolations)
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

const result = await errors.try(main())
if (result.error) {
	logger.error("failed", {
		error: String(result.error),
		stack: result.error.stack
	})
	process.exit(1)
}
