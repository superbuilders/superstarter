import type { BlankLineViolation } from "@scripts/dev/fmt/types"
import {
	getLineAndColumn,
	getScriptKind,
	sortByStartAsc,
	sortByStartDescTop
} from "@scripts/dev/shared/ts-utils"
import * as ts from "typescript"

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

export { findBlankLineViolations, normalizeBlankLines }
