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
 *   bun scripts/super-fumpt.ts                      # Dry run
 *   bun scripts/super-fumpt.ts --write              # Apply fixes
 *   bun scripts/super-fumpt.ts --strip-comments     # Dry run with comment stripping
 *   bun scripts/super-fumpt.ts --write --strip-comments  # Apply all fixes
 */

import * as fs from "node:fs"
import * as path from "node:path"
import * as errors from "@superbuilders/errors"
import * as logger from "@superbuilders/slog"
import * as ts from "typescript"

interface CommentViolation {
	file: string
	line: number
	column: number
	text: string
	start: number
	end: number
}

interface BlankLineViolation {
	file: string
	line: number
	currentBlankLines: number
	targetBlankLines: number
	start: number
	end: number
}

interface CurlyBraceViolation {
	file: string
	line: number
	start: number
	end: number
	replacement: string
}

interface ExportToMove {
	name: string
	isType: boolean
	start: number
	exportKeywordEnd: number
}

interface ExistingExportClause {
	names: string[]
	isType: boolean
	start: number
	end: number
}

interface ExportAlias {
	originalName: string
	aliasName: string
	isType: boolean
}

interface InlineDefaultExport {
	name: string
	exportStart: number
	defaultEnd: number
}

interface ExportAnalysis {
	inlineExports: ExportToMove[]
	existingClauses: ExistingExportClause[]
	allValueNames: string[]
	allTypeNames: string[]
	hasDefault: boolean
	inlineDefault: InlineDefaultExport | null
	needsReorganization: boolean
	aliases: ExportAlias[]
}

interface ExportViolation {
	file: string
	line: number
	count: number
}

interface ReactImportViolation {
	file: string
	line: number
	/** The full import statement text */
	importText: string
	/** Names that need React. prefix */
	namedImports: string[]
}

interface FileResult {
	file: string
	commentViolations: CommentViolation[]
	blankLineViolations: BlankLineViolation[]
	curlyBraceViolations: CurlyBraceViolation[]
	exportViolations: ExportViolation[]
	reactImportViolations: ReactImportViolation[]
}

function sortByStartAsc(a: { start: number }, b: { start: number }): number {
	return a.start - b.start
}

function sortByStartDescTop(a: { start: number }, b: { start: number }): number {
	return b.start - a.start
}

function isAllowedComment(text: string): boolean {
	const trimmed = text.trim()
	if (trimmed.startsWith("#!")) {
		return true
	}
	if (trimmed.startsWith("/**")) {
		return true
	}
	if (text.includes("biome-ignore")) {
		return true
	}
	if (text.includes("@ts-ignore")) {
		return true
	}
	if (text.includes("@ts-expect-error")) {
		return true
	}
	return false
}

function getLineAndColumn(sourceText: string, position: number): { line: number; column: number } {
	let line = 1
	let column = 1
	for (let i = 0; i < position && i < sourceText.length; i++) {
		if (sourceText[i] === "\n") {
			line++
			column = 1
		} else {
			column++
		}
	}
	return { line, column }
}

function getScriptKind(filePath: string): ts.ScriptKind {
	if (filePath.endsWith(".tsx")) {
		return ts.ScriptKind.TSX
	}
	if (filePath.endsWith(".jsx")) {
		return ts.ScriptKind.JSX
	}
	if (filePath.endsWith(".ts")) {
		return ts.ScriptKind.TS
	}
	return ts.ScriptKind.JS
}

function findViolatingComments(filePath: string, sourceText: string): CommentViolation[] {
	const violations: CommentViolation[] = []
	const scriptKind = getScriptKind(filePath)
	const sourceFile = ts.createSourceFile(
		filePath,
		sourceText,
		ts.ScriptTarget.Latest,
		true,
		scriptKind
	)
	const commentRanges: Array<{
		pos: number
		end: number
		kind: ts.SyntaxKind
	}> = []
	const jsxCommentExpressions: Array<{
		pos: number
		end: number
		commentText: string
	}> = []
	function collectCommentRanges(node: ts.Node) {
		const leading = ts.getLeadingCommentRanges(sourceText, node.getFullStart())
		if (leading) {
			for (const range of leading) {
				commentRanges.push({
					pos: range.pos,
					end: range.end,
					kind: range.kind
				})
			}
		}
		const trailing = ts.getTrailingCommentRanges(sourceText, node.getEnd())
		if (trailing) {
			for (const range of trailing) {
				commentRanges.push({
					pos: range.pos,
					end: range.end,
					kind: range.kind
				})
			}
		}
	}
	function isJsxCommentExpression(innerText: string): boolean {
		if (innerText.startsWith("/*") && innerText.endsWith("*/")) {
			return true
		}
		return innerText.startsWith("//")
	}
	function scanForComments(node: ts.Node) {
		collectCommentRanges(node)
		if (ts.isJsxExpression(node)) {
			const exprText = sourceText.slice(node.pos, node.end)
			const innerText = exprText.slice(1, -1).trim()
			if (isJsxCommentExpression(innerText)) {
				jsxCommentExpressions.push({
					pos: node.pos,
					end: node.end,
					commentText: innerText
				})
			}
		}
		ts.forEachChild(node, scanForComments)
	}
	const fileLeading = ts.getLeadingCommentRanges(sourceText, 0)
	if (fileLeading) {
		for (const range of fileLeading) {
			commentRanges.push({ pos: range.pos, end: range.end, kind: range.kind })
		}
	}
	scanForComments(sourceFile)
	const seen = new Set<string>()
	function isUniqueRange(r: { pos: number; end: number; kind: ts.SyntaxKind }): boolean {
		const key = `${r.pos}:${r.end}`
		if (seen.has(key)) {
			return false
		}
		seen.add(key)
		return true
	}
	const uniqueRanges = commentRanges.filter(isUniqueRange)
	for (const range of uniqueRanges) {
		const commentText = sourceText.slice(range.pos, range.end)
		if (!isAllowedComment(commentText)) {
			const { line, column } = getLineAndColumn(sourceText, range.pos)
			violations.push({
				file: filePath,
				line,
				column,
				text: commentText,
				start: range.pos,
				end: range.end
			})
		}
	}
	for (const jsx of jsxCommentExpressions) {
		if (!isAllowedComment(jsx.commentText)) {
			const fullText = sourceText.slice(jsx.pos, jsx.end)
			const { line, column } = getLineAndColumn(sourceText, jsx.pos)
			violations.push({
				file: filePath,
				line,
				column,
				text: fullText,
				start: jsx.pos,
				end: jsx.end
			})
		}
	}
	violations.sort(sortByStartAsc)
	return violations
}

function findLineStart(text: string, pos: number): number {
	let lineStart = pos
	while (lineStart > 0 && text[lineStart - 1] !== "\n") {
		lineStart--
	}
	return lineStart
}

function findLineEnd(text: string, pos: number): number {
	let lineEnd = pos
	while (lineEnd < text.length && text[lineEnd] !== "\n") {
		lineEnd++
	}
	return lineEnd
}

function computeRemovalRange(
	text: string,
	commentStart: number,
	commentEnd: number
): { start: number; end: number } {
	const lineStart = findLineStart(text, commentStart)
	const lineEnd = findLineEnd(text, commentEnd)
	const beforeComment = text.slice(lineStart, commentStart)
	const afterComment = text.slice(commentEnd, lineEnd)
	const isOnlyThingOnLine = beforeComment.trim() === "" && afterComment.trim() === ""
	if (isOnlyThingOnLine) {
		const adjustedEnd = lineEnd < text.length && text[lineEnd] === "\n" ? lineEnd + 1 : lineEnd
		return { start: lineStart, end: adjustedEnd }
	}
	if (beforeComment.trim() === "") {
		return { start: lineStart, end: commentEnd }
	}
	let spaceStart = commentStart
	while (
		spaceStart > lineStart &&
		(text[spaceStart - 1] === " " || text[spaceStart - 1] === "\t")
	) {
		spaceStart--
	}
	return { start: spaceStart, end: commentEnd }
}

function removeComments(sourceText: string, violations: CommentViolation[]): string {
	if (violations.length === 0) {
		return sourceText
	}

	const ranges: Array<{ start: number; end: number }> = []
	for (const v of violations) {
		ranges.push(computeRemovalRange(sourceText, v.start, v.end))
	}

	ranges.sort(sortByStartDescTop)

	let result = sourceText
	for (const range of ranges) {
		result = result.slice(0, range.start) + result.slice(range.end)
	}
	return result
}

function isErrorsTryAssignment(node: ts.Statement): string | null {
	if (!ts.isVariableStatement(node)) {
		return null
	}
	const decl = node.declarationList.declarations[0]
	if (!decl || !decl.initializer) {
		return null
	}
	if (!ts.isIdentifier(decl.name)) {
		return null
	}
	const initText = decl.initializer.getText()
	if (initText.includes("errors.try(") || initText.includes("errors.trySync(")) {
		return decl.name.text
	}
	return null
}

function isErrorCheckIf(node: ts.Statement, varName: string): boolean {
	if (!ts.isIfStatement(node)) {
		return false
	}
	const condText = node.expression.getText()
	if (condText === `${varName}.error`) {
		return true
	}
	return condText === `!${varName}.success`
}

function findBlankLineViolations(filePath: string, sourceText: string): BlankLineViolation[] {
	const violations: BlankLineViolation[] = []
	const scriptKind = getScriptKind(filePath)
	const sourceFile = ts.createSourceFile(
		filePath,
		sourceText,
		ts.ScriptTarget.Latest,
		true,
		scriptKind
	)
	function addViolation(gapStart: number, gapEnd: number, current: number, target: number) {
		const { line } = getLineAndColumn(sourceText, gapStart)
		violations.push({
			file: filePath,
			line,
			currentBlankLines: current,
			targetBlankLines: target,
			start: gapStart,
			end: gapEnd
		})
	}
	function countBlankLines(gap: string): number {
		const newlineMatches = gap.match(/\n/g)
		const newlineCount = newlineMatches ? newlineMatches.length : 0
		return Math.max(0, newlineCount - 1)
	}
	function isMultiline(node: ts.Node): boolean {
		const startLine = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line
		const endLine = sourceFile.getLineAndCharacterOfPosition(node.getEnd() - 1).line
		return startLine < endLine
	}
	function isStringDirective(node: ts.Node): boolean {
		if (!ts.isExpressionStatement(node)) {
			return false
		}
		return ts.isStringLiteral(node.expression)
	}
	function needsBlankLineAfterDirective(
		prevIsDirective: boolean,
		currIsDirective: boolean,
		blankLineCount: number
	): boolean {
		return prevIsDirective && !currIsDirective && blankLineCount === 0
	}
	function needsBlankLineBetweenMultiline(
		inDirectivePrologue: boolean,
		lastMulti: boolean,
		currMulti: boolean,
		blankLineCount: number
	): boolean {
		return !inDirectivePrologue && lastMulti && currMulti && blankLineCount === 0
	}
	function checkTopLevelGap(
		prev: ts.Statement,
		curr: ts.Statement,
		inDirectivePrologue: boolean,
		lastMulti: boolean,
		currMulti: boolean,
		currIsDirective: boolean
	) {
		const gapStart = prev.getEnd()
		const gapEnd = curr.getStart(sourceFile)
		const gap = sourceText.slice(gapStart, gapEnd)
		const blankLineCount = countBlankLines(gap)
		const prevIsDirective = isStringDirective(prev)
		if (needsBlankLineAfterDirective(prevIsDirective, currIsDirective, blankLineCount)) {
			addViolation(gapStart, gapEnd, 0, 1)
		} else if (
			needsBlankLineBetweenMultiline(inDirectivePrologue, lastMulti, currMulti, blankLineCount)
		) {
			addViolation(gapStart, gapEnd, 0, 1)
		}
	}
	function processTopLevelStatements(statements: ts.NodeArray<ts.Statement>) {
		let lastMulti = false
		let inDirectivePrologue = true
		for (let i = 0; i < statements.length; i++) {
			const curr = statements[i]
			if (!curr) {
				continue
			}
			const currMulti = isMultiline(curr)
			const currIsDirective = isStringDirective(curr)
			if (!currIsDirective) {
				inDirectivePrologue = false
			}
			if (i > 0) {
				const prev = statements[i - 1]
				if (!prev) {
					continue
				}
				checkTopLevelGap(prev, curr, inDirectivePrologue, lastMulti, currMulti, currIsDirective)
			}
			lastMulti = currMulti
		}
	}
	function processBlockStatements(statements: ts.NodeArray<ts.Statement>) {
		for (let i = 1; i < statements.length; i++) {
			const prev = statements[i - 1]
			const curr = statements[i]
			if (!prev || !curr) {
				continue
			}
			const gapStart = prev.getEnd()
			const gapEnd = curr.getStart(sourceFile)
			const gap = sourceText.slice(gapStart, gapEnd)
			const blankLineCount = countBlankLines(gap)
			const errorVar = isErrorsTryAssignment(prev)
			if (errorVar && isErrorCheckIf(curr, errorVar) && blankLineCount > 0) {
				addViolation(gapStart, gapEnd, blankLineCount, 0)
				continue
			}
			if (blankLineCount > 1) {
				addViolation(gapStart, gapEnd, blankLineCount, 1)
			}
		}
	}
	function isFunctionBody(block: ts.Block): boolean {
		const parent = block.parent
		if (ts.isFunctionDeclaration(parent)) {
			return true
		}
		if (ts.isFunctionExpression(parent)) {
			return true
		}
		if (ts.isArrowFunction(parent)) {
			return true
		}
		if (ts.isMethodDeclaration(parent)) {
			return true
		}
		if (ts.isConstructorDeclaration(parent)) {
			return true
		}
		if (ts.isGetAccessorDeclaration(parent)) {
			return true
		}
		return ts.isSetAccessorDeclaration(parent)
	}
	function isConditionMultiline(node: ts.Expression): boolean {
		const condStart = node.getStart(sourceFile)
		const condEnd = node.getEnd()
		const condStartLine = sourceText.slice(0, condStart).split("\n").length
		const condEndLine = sourceText.slice(0, condEnd).split("\n").length
		return condStartLine !== condEndLine
	}
	function hasMultilineParentCondition(block: ts.Block): boolean {
		const parent = block.parent
		if (ts.isIfStatement(parent) || ts.isWhileStatement(parent)) {
			return isConditionMultiline(parent.expression)
		}
		if (ts.isForStatement(parent) && parent.condition) {
			return isConditionMultiline(parent.condition)
		}
		return false
	}
	function checkEmptyBlock(block: ts.Block) {
		const openBrace = block.getStart(sourceFile)
		const closeBrace = block.getEnd() - 1
		const gap = sourceText.slice(openBrace + 1, closeBrace)
		const blankLines = countBlankLines(gap)
		if (blankLines > 0) {
			addViolation(openBrace + 1, closeBrace, blankLines, 0)
		}
	}
	function checkBlockBoundaries(block: ts.Block) {
		const statements = block.statements
		if (statements.length === 0) {
			checkEmptyBlock(block)
			return
		}
		const isLoneStatement = statements.length === 1
		const isFuncBody = isFunctionBody(block)
		if (!isLoneStatement && !isFuncBody) {
			return
		}
		const openBrace = block.getStart(sourceFile)
		const firstStmt = statements[0]
		if (!firstStmt) {
			return
		}
		const firstStmtStart = firstStmt.getStart(sourceFile)
		const openGap = sourceText.slice(openBrace + 1, firstStmtStart)
		const openBlankLines = countBlankLines(openGap)
		if (openBlankLines > 0 && !hasMultilineParentCondition(block)) {
			addViolation(openBrace + 1, firstStmtStart, openBlankLines, 0)
		}
		const lastStmt = statements[statements.length - 1]
		if (!lastStmt) {
			return
		}
		const lastStmtEnd = lastStmt.getEnd()
		const closeBrace = block.getEnd() - 1
		const closeGap = sourceText.slice(lastStmtEnd, closeBrace)
		const closeBlankLines = countBlankLines(closeGap)
		if (closeBlankLines > 0) {
			addViolation(lastStmtEnd, closeBrace, closeBlankLines, 0)
		}
	}
	function checkJsxChildren(children: ts.NodeArray<ts.JsxChild>) {
		function isSignificantChild(child: ts.JsxChild): boolean {
			if (ts.isJsxText(child)) {
				return child.getText(sourceFile).trim() !== ""
			}
			return true
		}
		const significantChildren = children.filter(isSignificantChild)
		for (let i = 1; i < significantChildren.length; i++) {
			const prev = significantChildren[i - 1]
			const curr = significantChildren[i]
			if (!prev || !curr) {
				continue
			}
			const gapStart = prev.getEnd()
			const gapEnd = curr.getStart(sourceFile)
			const gap = sourceText.slice(gapStart, gapEnd)
			const blankLineCount = countBlankLines(gap)
			if (blankLineCount > 0) {
				addViolation(gapStart, gapEnd, blankLineCount, 0)
			}
		}
	}
	function walk(node: ts.Node) {
		if (ts.isSourceFile(node)) {
			processTopLevelStatements(node.statements)
		}
		if (ts.isBlock(node)) {
			checkBlockBoundaries(node)
			processBlockStatements(node.statements)
		}
		if (ts.isCaseClause(node) || ts.isDefaultClause(node)) {
			processBlockStatements(node.statements)
		}
		if (ts.isModuleBlock(node)) {
			processTopLevelStatements(node.statements)
		}
		if (ts.isJsxElement(node)) {
			checkJsxChildren(node.children)
		}
		if (ts.isJsxFragment(node)) {
			checkJsxChildren(node.children)
		}
		ts.forEachChild(node, walk)
	}
	walk(sourceFile)
	violations.sort(sortByStartAsc)
	return violations
}

function normalizeBlankLines(sourceText: string, violations: BlankLineViolation[]): string {
	if (violations.length === 0) {
		return sourceText
	}
	const sorted = [...violations].sort(sortByStartDescTop)
	let result = sourceText
	for (const v of sorted) {
		const gap = result.slice(v.start, v.end)
		const firstNewline = gap.indexOf("\n")
		if (firstNewline === -1) {
			continue
		}
		const lastNewline = gap.lastIndexOf("\n")
		const indent = gap.slice(lastNewline + 1)
		const newGap = `\n${"\n".repeat(v.targetBlankLines)}${indent}`
		result = result.slice(0, v.start) + newGap + result.slice(v.end)
	}
	return result
}

function findCurlyBraceViolations(filePath: string, sourceText: string): CurlyBraceViolation[] {
	const violations: CurlyBraceViolation[] = []
	const scriptKind = getScriptKind(filePath)
	const sourceFile = ts.createSourceFile(
		filePath,
		sourceText,
		ts.ScriptTarget.Latest,
		true,
		scriptKind
	)
	function getIndent(pos: number): string {
		let lineStart = pos
		while (lineStart > 0 && sourceText[lineStart - 1] !== "\n") {
			lineStart--
		}
		const lineText = sourceText.slice(lineStart, pos)
		const match = lineText.match(/^(\s*)/)
		if (!match) {
			return ""
		}
		const indent = match[1]
		if (indent === undefined) {
			return ""
		}
		return indent
	}
	function pushViolation(node: ts.Node, replacement: string) {
		const start = node.getStart(sourceFile)
		const { line } = getLineAndColumn(sourceText, start)
		violations.push({
			file: filePath,
			line,
			start,
			end: node.getEnd(),
			replacement
		})
	}
	function buildElseReplacement(
		elseStmt: ts.Statement,
		condText: string,
		bodyText: string,
		indent: string
	): string {
		if (ts.isIfStatement(elseStmt)) {
			const elseIfText = sourceText.slice(elseStmt.getStart(sourceFile), elseStmt.parent.getEnd())
			return `if (${condText}) {\n${indent}\t${bodyText}\n${indent}} else ${elseIfText}`
		}
		if (ts.isBlock(elseStmt)) {
			const elseBlockText = elseStmt.getText(sourceFile)
			return `if (${condText}) {\n${indent}\t${bodyText}\n${indent}} else ${elseBlockText}`
		}
		const elseBodyText = elseStmt.getText(sourceFile).trim()
		return `if (${condText}) {\n${indent}\t${bodyText}\n${indent}} else {\n${indent}\t${elseBodyText}\n${indent}}`
	}
	function checkIfStatement(node: ts.IfStatement): boolean {
		const thenStmt = node.thenStatement
		if (!ts.isBlock(thenStmt)) {
			const ifStart = node.getStart(sourceFile)
			const indent = getIndent(ifStart)
			const condText = node.expression.getText(sourceFile)
			const bodyText = thenStmt.getText(sourceFile).trim()
			let replacement: string
			if (node.elseStatement) {
				replacement = buildElseReplacement(node.elseStatement, condText, bodyText, indent)
			} else {
				replacement = `if (${condText}) {\n${indent}\t${bodyText}\n${indent}}`
			}
			pushViolation(node, replacement)
			if (node.elseStatement) {
				walk(node.elseStatement)
			}
			return true
		}
		if (
			!node.elseStatement ||
			ts.isBlock(node.elseStatement) ||
			ts.isIfStatement(node.elseStatement)
		) {
			return false
		}
		const elseStmt = node.elseStatement
		const indent = getIndent(node.getStart(sourceFile))
		const elseBodyText = elseStmt.getText(sourceFile).trim()
		const thenBlockText = node.thenStatement.getText(sourceFile)
		const condText = node.expression.getText(sourceFile)
		const replacement = `if (${condText}) ${thenBlockText} else {\n${indent}\t${elseBodyText}\n${indent}}`
		pushViolation(node, replacement)
		return true
	}
	function checkSimpleLoopBody(node: ts.Node, body: ts.Statement, headerText: string): boolean {
		if (ts.isBlock(body)) {
			return false
		}
		const start = node.getStart(sourceFile)
		const indent = getIndent(start)
		const bodyText = body.getText(sourceFile).trim()
		const replacement = `${headerText} {\n${indent}\t${bodyText}\n${indent}}`
		pushViolation(node, replacement)
		return true
	}
	function checkWhileStatement(node: ts.WhileStatement): boolean {
		const condText = node.expression.getText(sourceFile)
		return checkSimpleLoopBody(node, node.statement, `while (${condText})`)
	}
	function buildForHeader(node: ts.ForStatement): string {
		const initText = node.initializer ? node.initializer.getText(sourceFile) : ""
		const condText = node.condition ? node.condition.getText(sourceFile) : ""
		const incrText = node.incrementor ? node.incrementor.getText(sourceFile) : ""
		return `for (${initText}; ${condText}; ${incrText})`
	}
	function checkForOfStatement(node: ts.ForOfStatement): boolean {
		const initText = node.initializer.getText(sourceFile)
		const exprText = node.expression.getText(sourceFile)
		const awaitText = node.awaitModifier ? "await " : ""
		return checkSimpleLoopBody(node, node.statement, `for ${awaitText}(${initText} of ${exprText})`)
	}
	function checkForInStatement(node: ts.ForInStatement): boolean {
		const initText = node.initializer.getText(sourceFile)
		const exprText = node.expression.getText(sourceFile)
		return checkSimpleLoopBody(node, node.statement, `for (${initText} in ${exprText})`)
	}
	function checkDoStatement(node: ts.DoStatement): boolean {
		const body = node.statement
		if (ts.isBlock(body)) {
			return false
		}
		const doStart = node.getStart(sourceFile)
		const indent = getIndent(doStart)
		const condText = node.expression.getText(sourceFile)
		const bodyText = body.getText(sourceFile).trim()
		const replacement = `do {\n${indent}\t${bodyText}\n${indent}} while (${condText})`
		pushViolation(node, replacement)
		return true
	}
	function checkStatementNode(node: ts.Node): boolean {
		if (ts.isIfStatement(node) && checkIfStatement(node)) {
			return true
		}
		if (ts.isWhileStatement(node) && checkWhileStatement(node)) {
			return true
		}
		if (ts.isDoStatement(node) && checkDoStatement(node)) {
			return true
		}
		return false
	}
	function checkLoopNode(node: ts.Node): boolean {
		if (
			ts.isForStatement(node) &&
			checkSimpleLoopBody(node, node.statement, buildForHeader(node))
		) {
			return true
		}
		if (ts.isForOfStatement(node) && checkForOfStatement(node)) {
			return true
		}
		if (ts.isForInStatement(node) && checkForInStatement(node)) {
			return true
		}
		return false
	}
	function walk(node: ts.Node) {
		if (checkStatementNode(node)) {
			return
		}
		if (checkLoopNode(node)) {
			return
		}
		ts.forEachChild(node, walk)
	}
	walk(sourceFile)
	violations.sort(sortByStartAsc)
	return violations
}

function applyCurlyBraceFixes(sourceText: string, violations: CurlyBraceViolation[]): string {
	if (violations.length === 0) {
		return sourceText
	}
	const sorted = [...violations].sort(sortByStartDescTop)
	let result = sourceText
	for (const v of sorted) {
		result = result.slice(0, v.start) + v.replacement + result.slice(v.end)
	}
	return result
}

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

interface ExportCollector {
	inlineExports: ExportToMove[]
	existingClauses: ExistingExportClause[]
	allValueNames: string[]
	allTypeNames: string[]
	aliases: ExportAlias[]
	hasDefault: boolean
	inlineDefault: InlineDefaultExport | null
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

function findExportViolations(filePath: string, sourceText: string): ExportViolation[] {
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

/**
 * Detects React imports that don't use the namespace import pattern.
 *
 * CORRECT: import * as React from "react"
 * WRONG: import { useState, useEffect } from "react"
 * WRONG: import React from "react"
 */
function isReactImport(statement: ts.ImportDeclaration): boolean {
	const moduleSpecifier = statement.moduleSpecifier
	if (!ts.isStringLiteral(moduleSpecifier)) {
		return false
	}
	return moduleSpecifier.text === "react"
}

function isNamespaceReactImport(importClause: ts.ImportClause): boolean {
	if (!importClause.namedBindings) {
		return false
	}
	return ts.isNamespaceImport(importClause.namedBindings)
}

function collectNamedImportsFromClause(importClause: ts.ImportClause): string[] {
	const namedImports: string[] = []
	if (importClause.name) {
		namedImports.push(importClause.name.text)
	}
	if (importClause.namedBindings && ts.isNamedImports(importClause.namedBindings)) {
		for (const element of importClause.namedBindings.elements) {
			namedImports.push(element.name.text)
		}
	}
	return namedImports
}

function findReactImportViolations(file: string, content: string): ReactImportViolation[] {
	const violations: ReactImportViolation[] = []
	const scriptKind = getScriptKind(file)
	const sourceFile = ts.createSourceFile(file, content, ts.ScriptTarget.Latest, true, scriptKind)

	for (const statement of sourceFile.statements) {
		if (!ts.isImportDeclaration(statement)) {
			continue
		}
		if (!isReactImport(statement)) {
			continue
		}
		const importClause = statement.importClause
		if (!importClause) {
			continue
		}
		if (isNamespaceReactImport(importClause)) {
			continue
		}
		const namedImports = collectNamedImportsFromClause(importClause)
		if (namedImports.length === 0) {
			continue
		}
		const { line } = sourceFile.getLineAndCharacterOfPosition(statement.getStart())
		violations.push({
			file,
			line: line + 1,
			importText: statement.getText(sourceFile),
			namedImports
		})
	}

	return violations
}

/**
 * Fixes React imports to use namespace pattern and updates all usages.
 *
 * Changes: import { useState, useEffect } from "react"
 * To: import * as React from "react"
 * And updates: useState() -> React.useState()
 */
interface ReactImportCollection {
	importsToFix: Map<string, string>
	hasNamespaceImport: boolean
	importRangesToRemove: Array<{ start: number; end: number }>
}

function collectImportNamesToFix(
	importClause: ts.ImportClause,
	importsToFix: Map<string, string>
): void {
	if (importClause.name) {
		if (importClause.name.text !== "React") {
			importsToFix.set(importClause.name.text, importClause.name.text)
		}
	}
	if (importClause.namedBindings && ts.isNamedImports(importClause.namedBindings)) {
		for (const element of importClause.namedBindings.elements) {
			const localName = element.name.text
			const hasAlias = element.propertyName !== undefined
			const originalName = hasAlias ? element.propertyName.text : element.name.text
			importsToFix.set(localName, originalName)
		}
	}
}

function collectReactImports(sourceFile: ts.SourceFile, content: string): ReactImportCollection {
	const importsToFix = new Map<string, string>()
	let hasNamespaceImport = false
	const importRangesToRemove: Array<{ start: number; end: number }> = []

	for (const statement of sourceFile.statements) {
		if (!ts.isImportDeclaration(statement)) {
			continue
		}
		if (!isReactImport(statement)) {
			continue
		}
		const importClause = statement.importClause
		if (!importClause) {
			continue
		}
		if (isNamespaceReactImport(importClause)) {
			hasNamespaceImport = true
			continue
		}
		if (statement.importClause?.isTypeOnly) {
			continue
		}
		collectImportNamesToFix(importClause, importsToFix)
		let start = statement.getStart()
		let end = statement.getEnd()
		if (content[end] === "\n") {
			end++
		}
		importRangesToRemove.push({ start, end })
	}

	return { importsToFix, hasNamespaceImport, importRangesToRemove }
}

function isImportContext(parent: ts.Node): boolean {
	if (ts.isImportSpecifier(parent)) {
		return true
	}
	if (ts.isImportClause(parent)) {
		return true
	}
	return false
}

function isNameOfParent(parent: ts.Node, node: ts.Node): boolean {
	if (ts.isVariableDeclaration(parent)) {
		return parent.name === node
	}
	if (ts.isParameter(parent)) {
		return parent.name === node
	}
	if (ts.isFunctionDeclaration(parent)) {
		return parent.name === node
	}
	if (ts.isPropertyAssignment(parent)) {
		return parent.name === node
	}
	if (ts.isShorthandPropertyAssignment(parent)) {
		return parent.name === node
	}
	if (ts.isBindingElement(parent)) {
		return parent.name === node
	}
	if (ts.isPropertySignature(parent)) {
		return parent.name === node
	}
	if (ts.isMethodDeclaration(parent)) {
		return parent.name === node
	}
	return false
}

function isLabelOfParent(parent: ts.Node, node: ts.Node): boolean {
	if (ts.isLabeledStatement(parent)) {
		return parent.label === node
	}
	return false
}

function isDeclarationContext(node: ts.Node): boolean {
	const parent = node.parent
	if (isImportContext(parent)) {
		return true
	}
	if (ts.isTypeReferenceNode(parent)) {
		return true
	}
	if (isNameOfParent(parent, node)) {
		return true
	}
	return isLabelOfParent(parent, node)
}

function findNamespaceInsertPosition(
	sourceFile: ts.SourceFile,
	importRangesToRemove: Array<{ start: number; end: number }>,
	result: string
): number {
	let insertPos = 0
	for (const statement of sourceFile.statements) {
		if (!ts.isExpressionStatement(statement)) {
			break
		}
		if (!ts.isStringLiteral(statement.expression)) {
			break
		}
		insertPos = statement.getEnd()
		for (const removal of importRangesToRemove) {
			if (removal.end <= statement.getEnd()) {
				insertPos -= removal.end - removal.start
			}
		}
		if (result[insertPos] === "\n") {
			insertPos++
		}
	}
	return insertPos
}

function applyReactImportFixes(content: string, file: string): string {
	const scriptKind = getScriptKind(file)
	const sourceFile = ts.createSourceFile(file, content, ts.ScriptTarget.Latest, true, scriptKind)

	const collection = collectReactImports(sourceFile, content)
	if (collection.importsToFix.size === 0 && collection.importRangesToRemove.length === 0) {
		return content
	}

	const replacements: Array<{ start: number; end: number; text: string }> = []

	function walk(node: ts.Node): void {
		if (!ts.isIdentifier(node)) {
			ts.forEachChild(node, walk)
			return
		}
		const localName = node.text
		const originalName = collection.importsToFix.get(localName)
		if (originalName === undefined) {
			ts.forEachChild(node, walk)
			return
		}
		if (isDeclarationContext(node)) {
			ts.forEachChild(node, walk)
			return
		}
		const parent = node.parent
		if (ts.isPropertyAccessExpression(parent) && parent.name === node) {
			ts.forEachChild(node, walk)
			return
		}
		replacements.push({
			start: node.getStart(),
			end: node.getEnd(),
			text: `React.${originalName}`
		})
		ts.forEachChild(node, walk)
	}

	walk(sourceFile)

	const allChanges = [
		...replacements,
		...collection.importRangesToRemove.map((r) => ({ ...r, text: "" }))
	]
	allChanges.sort(sortByStartDescTop)

	let result = content
	for (const change of allChanges) {
		result = result.slice(0, change.start) + change.text + result.slice(change.end)
	}

	if (!collection.hasNamespaceImport && collection.importsToFix.size > 0) {
		const insertPos = findNamespaceInsertPosition(
			sourceFile,
			collection.importRangesToRemove,
			result
		)
		const importStatement = 'import * as React from "react"\n'
		result = result.slice(0, insertPos) + importStatement + result.slice(insertPos)
	}

	return result
}

function getFilesToCheck(): string[] {
	const configPath = path.resolve(process.cwd(), "tsconfig.json")
	const configFile = ts.readConfigFile(configPath, ts.sys.readFile)
	if (configFile.error) {
		const errorMessage =
			typeof configFile.error.messageText === "string"
				? configFile.error.messageText
				: configFile.error.messageText.messageText
		logger.error("tsconfig read failed", { error: errorMessage })
		throw errors.new("tsconfig read failed")
	}
	const parsed = ts.parseJsonConfigFileContent(configFile.config, ts.sys, process.cwd())
	function isCheckableFile(f: string): boolean {
		if (f.endsWith(".d.ts")) {
			return false
		}
		if (f.includes("node_modules")) {
			return false
		}
		if (f.includes(".next")) {
			return false
		}
		if (f.includes("/scripts/")) {
			return false
		}
		if (f.endsWith(".ts")) {
			return true
		}
		if (f.endsWith(".tsx")) {
			return true
		}
		if (f.endsWith(".js")) {
			return true
		}
		return f.endsWith(".jsx")
	}
	return parsed.fileNames.filter(isCheckableFile)
}

function processFile(
	file: string,
	shouldWrite: boolean,
	stripComments: boolean
): FileResult | null {
	let content = fs.readFileSync(file, "utf-8")
	const relativePath = path.relative(process.cwd(), file)
	let commentViolations: CommentViolation[] = []
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
		fs.writeFileSync(file, content, "utf-8")
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

function main() {
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
		const fileResult = processFile(file, shouldWrite, stripComments)
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

const result = errors.trySync(function runMain() {
	return main()
})

if (result.error) {
	logger.error("super-fumpt: failed", { error: result.error })
	process.exit(1)
}
