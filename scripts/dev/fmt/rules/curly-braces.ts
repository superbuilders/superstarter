import type { CurlyBraceViolation } from "@scripts/dev/fmt/types"
import { getLineAndColumn, getScriptKind, sortByStartAsc } from "@scripts/dev/shared/ts-utils"
import * as ts from "typescript"

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
	const sorted = [...violations].sort((a, b) => b.start - a.start)
	let result = sourceText
	for (const v of sorted) {
		result = result.slice(0, v.start) + v.replacement + result.slice(v.end)
	}
	return result
}

export { applyCurlyBraceFixes, findCurlyBraceViolations }
