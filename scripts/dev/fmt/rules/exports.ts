import type {
	ExistingExportClause,
	ExportAnalysis,
	ExportCollector,
	ExportToMove,
	ExportViolation,
	InlineDefaultExport
} from "@scripts/dev/fmt/types"
import { getScriptKind, sortByStartDescTop } from "@scripts/dev/shared/ts-utils"
import * as ts from "typescript"

function isExportKeyword(m: ts.Modifier): boolean {
	return m.kind === ts.SyntaxKind.ExportKeyword
}

function isDefaultKeywordModifier(m: ts.Modifier): boolean {
	return m.kind === ts.SyntaxKind.DefaultKeyword
}

function getExportModifier(stmt: ts.Statement): ts.Modifier | undefined {
	const modifiers = ts.canHaveModifiers(stmt) ? ts.getModifiers(stmt) : undefined
	const exportModifier = modifiers?.find(isExportKeyword)
	if (!exportModifier) {
		return undefined
	}
	const defaultModifier = modifiers?.find(isDefaultKeywordModifier)
	if (defaultModifier) {
		return undefined
	}
	if (ts.isExportDeclaration(stmt)) {
		return undefined
	}
	return exportModifier
}

function extractNameAndType(stmt: ts.Statement): { name: string; isType: boolean } | undefined {
	if (ts.isTypeAliasDeclaration(stmt)) {
		return { name: stmt.name.text, isType: true }
	}
	if (ts.isInterfaceDeclaration(stmt)) {
		return { name: stmt.name.text, isType: true }
	}
	if (ts.isFunctionDeclaration(stmt) && stmt.name) {
		return { name: stmt.name.text, isType: false }
	}
	if (ts.isClassDeclaration(stmt) && stmt.name) {
		return { name: stmt.name.text, isType: false }
	}
	if (ts.isEnumDeclaration(stmt)) {
		return { name: stmt.name.text, isType: false }
	}
	return undefined
}

function hasBiomeIgnoreComment(stmt: ts.Statement, sourceFile: ts.SourceFile): boolean {
	const leadingComments = ts.getLeadingCommentRanges(sourceFile.text, stmt.getFullStart())
	if (!leadingComments) {
		return false
	}
	for (const comment of leadingComments) {
		const commentText = sourceFile.text.slice(comment.pos, comment.end)
		if (commentText.includes("biome-ignore")) {
			return true
		}
	}
	return false
}

function collectVariableExports(
	stmt: ts.VariableStatement,
	exportModifier: ts.Modifier
): ExportToMove[] {
	const results: ExportToMove[] = []
	for (const decl of stmt.declarationList.declarations) {
		if (ts.isIdentifier(decl.name)) {
			results.push({
				name: decl.name.text,
				isType: false,
				start: exportModifier.getStart(),
				exportKeywordEnd: exportModifier.getEnd()
			})
		}
	}
	return results
}

function isDefaultExportStatement(stmt: ts.Statement): boolean {
	if (ts.isExportAssignment(stmt)) {
		return true
	}
	const modifiers = ts.canHaveModifiers(stmt) ? ts.getModifiers(stmt) : undefined
	if (!modifiers) {
		return false
	}
	return modifiers.some(isDefaultKeywordModifier)
}

function processExportDeclaration(stmt: ts.ExportDeclaration, collector: ExportCollector): void {
	if (stmt.moduleSpecifier) {
		return
	}
	if (!stmt.exportClause) {
		return
	}
	if (!ts.isNamedExports(stmt.exportClause)) {
		return
	}
	const names: string[] = []
	for (const element of stmt.exportClause.elements) {
		const exportedName = element.name.text
		const originalName = element.propertyName?.text
		if (originalName) {
			collector.aliases.push({
				originalName,
				aliasName: exportedName,
				isType: stmt.isTypeOnly
			})
		}
		names.push(exportedName)
		if (stmt.isTypeOnly) {
			collector.allTypeNames.push(exportedName)
		} else {
			collector.allValueNames.push(exportedName)
		}
	}
	collector.existingClauses.push({
		names,
		isType: stmt.isTypeOnly,
		start: stmt.getFullStart(),
		end: stmt.getEnd()
	})
}

function processInlineExport(
	stmt: ts.Statement,
	exportModifier: ts.Modifier,
	sourceFile: ts.SourceFile,
	collector: ExportCollector
): void {
	if (hasBiomeIgnoreComment(stmt, sourceFile)) {
		return
	}
	if (ts.isVariableStatement(stmt)) {
		const varExports = collectVariableExports(stmt, exportModifier)
		for (const exp of varExports) {
			collector.inlineExports.push(exp)
			collector.allValueNames.push(exp.name)
		}
		return
	}
	const nameAndType = extractNameAndType(stmt)
	if (!nameAndType) {
		return
	}
	collector.inlineExports.push({
		name: nameAndType.name,
		isType: nameAndType.isType,
		start: exportModifier.getStart(),
		exportKeywordEnd: exportModifier.getEnd()
	})
	if (nameAndType.isType) {
		collector.allTypeNames.push(nameAndType.name)
	} else {
		collector.allValueNames.push(nameAndType.name)
	}
}

function isClauseSorted(clause: ExistingExportClause): boolean {
	const sorted = [...clause.names].sort()
	function nameMatchesSorted(n: string, i: number): boolean {
		return n === sorted[i]
	}
	return clause.names.every(nameMatchesSorted)
}

function isValueClause(c: ExistingExportClause): boolean {
	return !c.isType
}

function extractInlineDefaultExport(stmt: ts.Statement): InlineDefaultExport | null {
	if (ts.isExportAssignment(stmt)) {
		return null
	}
	const modifiers = ts.canHaveModifiers(stmt) ? ts.getModifiers(stmt) : undefined
	if (!modifiers) {
		return null
	}
	const exportMod = modifiers.find(isExportKeyword)
	const defaultMod = modifiers.find(isDefaultKeywordModifier)
	if (!exportMod || !defaultMod) {
		return null
	}
	let name: string | null = null
	if (ts.isFunctionDeclaration(stmt) && stmt.name) {
		name = stmt.name.text
	} else if (ts.isClassDeclaration(stmt) && stmt.name) {
		name = stmt.name.text
	}
	if (!name) {
		return null
	}
	return {
		name,
		exportStart: exportMod.getStart(),
		defaultEnd: defaultMod.getEnd()
	}
}

function processStatement(
	stmt: ts.Statement,
	sourceFile: ts.SourceFile,
	collector: ExportCollector
): void {
	if (isDefaultExportStatement(stmt)) {
		collector.hasDefault = true
		collector.inlineDefault = extractInlineDefaultExport(stmt)
		return
	}
	if (ts.isExportDeclaration(stmt)) {
		processExportDeclaration(stmt, collector)
		return
	}
	const exportModifier = getExportModifier(stmt)
	if (exportModifier) {
		processInlineExport(stmt, exportModifier, sourceFile, collector)
	}
}

function checkNeedsReorganization(collector: ExportCollector): boolean {
	if (collector.inlineExports.length > 0) {
		return true
	}
	if (collector.inlineDefault) {
		return true
	}
	if (collector.aliases.length > 0) {
		return true
	}
	const hasMultipleValueClauses = collector.existingClauses.filter(isValueClause).length > 1
	const hasMultipleTypeClauses = collector.existingClauses.filter((c) => c.isType).length > 1
	if (hasMultipleValueClauses || hasMultipleTypeClauses) {
		return true
	}
	if (collector.existingClauses.length > 0 && !collector.existingClauses.every(isClauseSorted)) {
		return true
	}
	return false
}

function analyzeExports(sourceFile: ts.SourceFile): ExportAnalysis {
	const collector: ExportCollector = {
		inlineExports: [],
		existingClauses: [],
		allValueNames: [],
		allTypeNames: [],
		aliases: [],
		hasDefault: false,
		inlineDefault: null
	}

	for (const stmt of sourceFile.statements) {
		processStatement(stmt, sourceFile, collector)
	}

	return {
		inlineExports: collector.inlineExports,
		existingClauses: collector.existingClauses,
		allValueNames: [...new Set(collector.allValueNames)].sort(),
		allTypeNames: [...new Set(collector.allTypeNames)].sort(),
		hasDefault: collector.hasDefault,
		inlineDefault: collector.inlineDefault,
		needsReorganization: checkNeedsReorganization(collector),
		aliases: collector.aliases
	}
}

// Files where the end-of-file export pattern breaks Next.js parsing
const SKIP_EXPORT_REORGANIZATION = ["src/proxy.ts"]

function shouldSkipExportReorganization(filePath: string): boolean {
	for (const skip of SKIP_EXPORT_REORGANIZATION) {
		if (filePath.endsWith(skip)) {
			return true
		}
	}
	return false
}

function findExportViolations(filePath: string, sourceText: string): ExportViolation[] {
	if (shouldSkipExportReorganization(filePath)) {
		return []
	}

	const scriptKind = getScriptKind(filePath)
	const sourceFile = ts.createSourceFile(
		filePath,
		sourceText,
		ts.ScriptTarget.Latest,
		true,
		scriptKind
	)

	const analysis = analyzeExports(sourceFile)
	if (!analysis.needsReorganization) {
		return []
	}

	const totalIssues =
		analysis.inlineExports.length +
		(analysis.existingClauses.length > 1 ? analysis.existingClauses.length - 1 : 0) +
		(analysis.inlineDefault ? 1 : 0)

	if (totalIssues === 0 && analysis.existingClauses.length <= 2) {
		let needsSort = false
		for (const clause of analysis.existingClauses) {
			const sorted = [...clause.names].sort()
			function matchesSorted(n: string, i: number): boolean {
				return n === sorted[i]
			}
			if (!clause.names.every(matchesSorted)) {
				needsSort = true
				break
			}
		}
		if (!needsSort) {
			return []
		}
	}

	return [
		{
			file: filePath,
			line: 1,
			count: analysis.inlineExports.length + analysis.existingClauses.length
		}
	]
}

function applyExportFixes(sourceText: string, filePath: string): string {
	const scriptKind = getScriptKind(filePath)
	const sourceFile = ts.createSourceFile(
		filePath,
		sourceText,
		ts.ScriptTarget.Latest,
		true,
		scriptKind
	)

	const analysis = analyzeExports(sourceFile)
	if (!analysis.needsReorganization) {
		return sourceText
	}

	if (analysis.aliases.length > 0) {
		return sourceText
	}

	interface Removal {
		start: number
		end: number
		trimNewline: boolean
		trimWhitespace: boolean
	}

	const removals: Removal[] = []

	for (const clause of analysis.existingClauses) {
		removals.push({
			start: clause.start,
			end: clause.end,
			trimNewline: true,
			trimWhitespace: false
		})
	}

	for (const exp of analysis.inlineExports) {
		removals.push({
			start: exp.start,
			end: exp.exportKeywordEnd,
			trimNewline: false,
			trimWhitespace: true
		})
	}

	if (analysis.inlineDefault) {
		removals.push({
			start: analysis.inlineDefault.exportStart,
			end: analysis.inlineDefault.defaultEnd,
			trimNewline: false,
			trimWhitespace: true
		})
	}

	removals.sort(sortByStartDescTop)

	let result = sourceText
	for (const removal of removals) {
		const before = result.slice(0, removal.start)
		let after = result.slice(removal.end)
		if (removal.trimNewline) {
			after = after.replace(/^\n/, "")
		}
		if (removal.trimWhitespace) {
			after = after.replace(/^\s*/, "")
		}
		result = before + after
	}

	const newExports: string[] = []
	if (analysis.allValueNames.length > 0) {
		newExports.push(`export { ${analysis.allValueNames.join(", ")} }`)
	}
	if (analysis.allTypeNames.length > 0) {
		newExports.push(`export type { ${analysis.allTypeNames.join(", ")} }`)
	}
	if (analysis.inlineDefault) {
		newExports.push(`export default ${analysis.inlineDefault.name}`)
	}

	if (newExports.length > 0) {
		result = result.trimEnd()
		result += `\n\n${newExports.join("\n")}\n`
	}

	return result
}

export { applyExportFixes, findExportViolations }
