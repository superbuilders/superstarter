import type { Violation } from "@scripts/dev/lint/types"
import * as ts from "typescript"

function check(sourceFile: ts.SourceFile): Violation[] {
	const violations: Violation[] = []

	function countStatements(node: ts.Node): number {
		if (ts.isBlock(node)) {
			return node.statements.length
		}
		return 1
	}

	function getIfNestingDepth(node: ts.Node, depth = 0): number {
		if (ts.isIfStatement(node)) {
			const thenDepth = getIfNestingDepth(node.thenStatement, depth + 1)
			const elseDepth = node.elseStatement
				? getIfNestingDepth(node.elseStatement, depth + 1)
				: depth
			return Math.max(thenDepth, elseDepth)
		}

		if (!ts.isBlock(node)) {
			return depth
		}

		let maxDepth = depth
		for (const stmt of node.statements) {
			maxDepth = Math.max(maxDepth, getIfNestingDepth(stmt, depth))
		}
		return maxDepth
	}

	function endsWithReturn(node: ts.Node): boolean {
		if (ts.isReturnStatement(node)) {
			return true
		}
		if (!ts.isBlock(node)) {
			return false
		}
		const stmts = node.statements
		if (stmts.length === 0) {
			return false
		}
		const lastStmt = stmts[stmts.length - 1]
		if (!lastStmt) {
			return false
		}
		return endsWithReturn(lastStmt)
	}

	function checkFunctionBody(body: ts.Block, funcNode: ts.Node): void {
		const statements = body.statements
		if (statements.length < 2) {
			return
		}

		const lastStmt = statements[statements.length - 1]
		const secondLastStmt = statements[statements.length - 2]
		if (!lastStmt || !secondLastStmt) {
			return
		}

		if (
			ts.isIfStatement(secondLastStmt) &&
			!secondLastStmt.elseStatement &&
			ts.isReturnStatement(lastStmt)
		) {
			const thenSize = countStatements(secondLastStmt.thenStatement)

			if (thenSize >= 3 && endsWithReturn(secondLastStmt.thenStatement)) {
				const { line, character } = sourceFile.getLineAndCharacterOfPosition(
					secondLastStmt.getStart(sourceFile)
				)
				violations.push({
					file: sourceFile.fileName,
					line: line + 1,
					column: character + 1,
					rule: "prefer-early-return",
					message:
						"Consider inverting condition for early return. Main logic is wrapped in conditional.",
					suggestion: "Invert the condition, return early, and dedent the main logic"
				})
			}
		}

		const maxNesting = getIfNestingDepth(body)
		if (maxNesting >= 3) {
			const { line, character } = sourceFile.getLineAndCharacterOfPosition(
				funcNode.getStart(sourceFile)
			)
			violations.push({
				file: sourceFile.fileName,
				line: line + 1,
				column: character + 1,
				rule: "prefer-early-return",
				message: `Deeply nested conditionals (${maxNesting} levels). Consider using early returns.`,
				suggestion: "Flatten nested ifs by returning early for edge cases"
			})
		}
	}

	function walk(node: ts.Node): void {
		if (ts.isFunctionDeclaration(node) && node.body) {
			checkFunctionBody(node.body, node)
		}
		if (ts.isMethodDeclaration(node) && node.body) {
			checkFunctionBody(node.body, node)
		}
		if (ts.isArrowFunction(node) && ts.isBlock(node.body)) {
			checkFunctionBody(node.body, node)
		}
		if (ts.isFunctionExpression(node) && node.body) {
			checkFunctionBody(node.body, node)
		}

		ts.forEachChild(node, walk)
	}

	walk(sourceFile)
	return violations
}

export { check }
