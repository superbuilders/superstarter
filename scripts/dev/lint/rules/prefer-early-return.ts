import type { Violation } from "@scripts/dev/lint/types"
import * as ts from "typescript"

function check(sourceFile: ts.SourceFile): Violation[] {
	const violations: Violation[] = []

	// ── helpers ──────────────────────────────────────────────

	function countStatements(node: ts.Node): number {
		if (ts.isBlock(node)) {
			return node.statements.length
		}
		return 1
	}

	function elseDepthOf(ifNode: ts.IfStatement, depth: number): number {
		if (!ifNode.elseStatement) {
			return depth
		}
		// Else-if chains are syntactically flat — don't count them
		// as additional nesting. `if {} else if {}` reads at the
		// same indentation level, so the inner if stays at `depth`
		// rather than `depth + 1`. Only a bare `else { ... }` block
		// increments depth.
		if (ts.isIfStatement(ifNode.elseStatement)) {
			return getIfNestingDepth(ifNode.elseStatement, depth)
		}
		return getIfNestingDepth(ifNode.elseStatement, depth + 1)
	}

	function getIfNestingDepth(node: ts.Node, depth = 0): number {
		if (ts.isIfStatement(node)) {
			const thenDepth = getIfNestingDepth(node.thenStatement, depth + 1)
			return Math.max(thenDepth, elseDepthOf(node, depth))
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

	function terminates(node: ts.Node): boolean {
		if (ts.isReturnStatement(node) || ts.isThrowStatement(node)) {
			return true
		}
		if (ts.isContinueStatement(node) || ts.isBreakStatement(node)) {
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
		return terminates(lastStmt)
	}

	function isTrivialSetup(stmt: ts.Statement): boolean {
		if (ts.isVariableStatement(stmt)) {
			return true
		}
		if (ts.isExpressionStatement(stmt)) {
			return true
		}
		return false
	}

	// ── check 1: single if wrapping the entire function body ─

	// Find the dominant if: must be the last statement, preceded
	// only by trivial setup (variable declarations, expressions).
	function findWrappingIf(statements: ts.NodeArray<ts.Statement>): ts.IfStatement | undefined {
		for (let i = 0; i < statements.length; i++) {
			const stmt = statements[i]
			if (!stmt) {
				continue
			}
			if (ts.isIfStatement(stmt) && i === statements.length - 1) {
				return stmt
			}
			if (!isTrivialSetup(stmt)) {
				return undefined
			}
		}
		return undefined
	}

	function checkWrappingIf(body: ts.Block): void {
		const ifStmt = findWrappingIf(body.statements)
		if (!ifStmt) {
			return
		}

		// Must have no else branch. An if/else is a legitimate fork,
		// not a wrapping pattern.
		if (ifStmt.elseStatement) {
			return
		}

		// The then-branch must be substantial (3+ statements) to be
		// worth flagging. A 2-line if at the end of a function is fine.
		const thenSize = countStatements(ifStmt.thenStatement)
		if (thenSize < 3) {
			return
		}

		const { line, character } = sourceFile.getLineAndCharacterOfPosition(
			ifStmt.getStart(sourceFile)
		)
		violations.push({
			file: sourceFile.fileName,
			line: line + 1,
			column: character + 1,
			rule: "prefer-early-return",
			message: "Function body is wrapped in a single conditional",
			suggestion: "Invert the condition, return early, and dedent the body"
		})
	}

	// ── check 2: unnecessary else after terminating if ────────

	function isLoopStatement(
		stmt: ts.Statement
	): stmt is
		| ts.ForStatement
		| ts.ForOfStatement
		| ts.ForInStatement
		| ts.WhileStatement
		| ts.DoStatement {
		return (
			ts.isForStatement(stmt) ||
			ts.isForOfStatement(stmt) ||
			ts.isForInStatement(stmt) ||
			ts.isWhileStatement(stmt) ||
			ts.isDoStatement(stmt)
		)
	}

	function hasUnnecessaryElse(stmt: ts.IfStatement): boolean {
		if (!stmt.elseStatement) {
			return false
		}
		if (!terminates(stmt.thenStatement)) {
			return false
		}
		// Don't flag else-if chains — legitimate branching.
		if (ts.isIfStatement(stmt.elseStatement)) {
			return false
		}
		// Only flag when else is substantial (3+ statements).
		if (countStatements(stmt.elseStatement) < 3) {
			return false
		}
		// Don't flag symmetric forks — both branches are substantial.
		if (countStatements(stmt.thenStatement) >= 3) {
			return false
		}
		return true
	}

	function reportUnnecessaryElse(stmt: ts.IfStatement): void {
		const elseNode = stmt.elseStatement
		if (!elseNode) {
			return
		}
		const { line, character } = sourceFile.getLineAndCharacterOfPosition(
			elseNode.getStart(sourceFile)
		)
		violations.push({
			file: sourceFile.fileName,
			line: line + 1,
			column: character + 1,
			rule: "prefer-early-return",
			message: "Unnecessary else after return/throw. Dedent the else body.",
			suggestion: "Remove the else clause and dedent — the if already exits"
		})
	}

	function checkUnnecessaryElse(block: ts.Block): void {
		for (const stmt of block.statements) {
			if (isLoopStatement(stmt)) {
				if (ts.isBlock(stmt.statement)) {
					checkUnnecessaryElse(stmt.statement)
				}
				continue
			}
			if (ts.isIfStatement(stmt) && hasUnnecessaryElse(stmt)) {
				reportUnnecessaryElse(stmt)
			}
		}
	}

	// ── check 3: deep nesting ────────────────────────────────

	function checkDeepNesting(body: ts.Block, funcNode: ts.Node): void {
		const maxNesting = getIfNestingDepth(body)
		if (maxNesting < 3) {
			return
		}

		const { line, character } = sourceFile.getLineAndCharacterOfPosition(
			funcNode.getStart(sourceFile)
		)
		violations.push({
			file: sourceFile.fileName,
			line: line + 1,
			column: character + 1,
			rule: "prefer-early-return",
			message: `Deeply nested conditionals (${maxNesting} levels)`,
			suggestion: "Flatten nested ifs by returning early for edge cases"
		})
	}

	// ── walk ─────────────────────────────────────────────────

	function checkFunctionBody(body: ts.Block, funcNode: ts.Node): void {
		if (body.statements.length === 0) {
			return
		}

		checkWrappingIf(body)
		checkUnnecessaryElse(body)
		checkDeepNesting(body, funcNode)
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
