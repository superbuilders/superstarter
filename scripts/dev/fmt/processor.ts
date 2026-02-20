import * as path from "node:path"
import {
	applyCurlyBraceFixes,
	applyExportFixes,
	applyReactImportFixes,
	findBlankLineViolations,
	findCurlyBraceViolations,
	findExportViolations,
	findReactImportViolations,
	findViolatingComments,
	normalizeBlankLines,
	removeComments
} from "@scripts/dev/fmt/rules"
import type { ExportViolation, FileResult, ReactImportViolation } from "@scripts/dev/fmt/types"
import * as logger from "@superbuilders/slog"

async function processFile(
	file: string,
	shouldWrite: boolean,
	stripComments: boolean
): Promise<FileResult | null> {
	let content = await Bun.file(file).text()
	const relativePath = path.relative(process.cwd(), file)
	let commentViolations: ReturnType<typeof findViolatingComments> = []
	if (stripComments) {
		commentViolations = findViolatingComments(file, content)
		if (shouldWrite && commentViolations.length > 0) {
			content = removeComments(content, commentViolations)
		}
	}
	const blankLineViolations = findBlankLineViolations(file, content)
	if (shouldWrite && blankLineViolations.length > 0) {
		content = normalizeBlankLines(content, blankLineViolations)
		content = content.replace(/\n{3,}/g, "\n\n")
	}
	const curlyBraceViolations = findCurlyBraceViolations(file, content)
	if (shouldWrite && curlyBraceViolations.length > 0) {
		content = applyCurlyBraceFixes(content, curlyBraceViolations)
	}
	const exportViolations = findExportViolations(file, content)
	if (shouldWrite && exportViolations.length > 0) {
		content = applyExportFixes(content, file)
	}
	const reactImportViolations = findReactImportViolations(file, content)
	if (shouldWrite && reactImportViolations.length > 0) {
		content = applyReactImportFixes(content, file)
	}
	if (
		commentViolations.length === 0 &&
		blankLineViolations.length === 0 &&
		curlyBraceViolations.length === 0 &&
		exportViolations.length === 0 &&
		reactImportViolations.length === 0
	) {
		return null
	}
	if (shouldWrite) {
		await Bun.write(file, content)
	}
	return {
		file: relativePath,
		commentViolations: commentViolations.map((v) => ({
			...v,
			file: relativePath
		})),
		blankLineViolations: blankLineViolations.map((v) => ({
			...v,
			file: relativePath
		})),
		curlyBraceViolations: curlyBraceViolations.map((v) => ({
			...v,
			file: relativePath
		})),
		exportViolations: exportViolations.map((v) => ({
			...v,
			file: relativePath
		})),
		reactImportViolations: reactImportViolations.map((v) => ({
			...v,
			file: relativePath
		}))
	}
}

function reportResults(
	allResults: FileResult[],
	totalComments: number,
	totalBlankLines: number,
	totalCurlyBraces: number,
	totalExports: number,
	totalReactImports: number,
	shouldWrite: boolean
) {
	const total =
		totalComments + totalBlankLines + totalCurlyBraces + totalExports + totalReactImports
	if (total === 0) {
		logger.info("super-fumpt: complete", { violations: 0 })
		process.stdout.write("No formatting issues found.\n")
		process.exit(0)
	}
	if (shouldWrite) {
		logger.info("super-fumpt: applied fixes", {
			comments: totalComments,
			blankLines: totalBlankLines,
			curlyBraces: totalCurlyBraces,
			exports: totalExports,
			reactImports: totalReactImports,
			files: allResults.length
		})
		process.stdout.write(`Fixed ${total} issue(s) in ${allResults.length} file(s).\n`)
		process.exit(0)
	}
	logger.info("super-fumpt: found issues", {
		comments: totalComments,
		blankLines: totalBlankLines,
		curlyBraces: totalCurlyBraces,
		exports: totalExports,
		reactImports: totalReactImports,
		files: allResults.length
	})
	process.stdout.write(`Found ${total} issue(s) in ${allResults.length} file(s).\n\n`)
	function sumExportCounts(sum: number, v: ExportViolation): number {
		return sum + v.count
	}
	function sumNamedImports(sum: number, v: ReactImportViolation): number {
		return sum + v.namedImports.length
	}
	for (const r of allResults) {
		const issues: string[] = []
		if (r.commentViolations.length > 0) {
			issues.push(`${r.commentViolations.length} comment(s)`)
		}
		if (r.blankLineViolations.length > 0) {
			issues.push(`${r.blankLineViolations.length} blank line(s)`)
		}
		if (r.curlyBraceViolations.length > 0) {
			issues.push(`${r.curlyBraceViolations.length} inline if(s)`)
		}
		if (r.exportViolations.length > 0) {
			const exportCount = r.exportViolations.reduce(sumExportCounts, 0)
			issues.push(`${exportCount} export(s) to reorganize`)
		}
		if (r.reactImportViolations.length > 0) {
			const importCount = r.reactImportViolations.reduce(sumNamedImports, 0)
			issues.push(`${importCount} React import(s) need namespace`)
		}
		process.stdout.write(`${r.file}: ${issues.join(", ")}\n`)
	}
	process.stdout.write("\nRun with --write to fix these issues.\n")
	process.exit(1)
}

export { processFile, reportResults }
