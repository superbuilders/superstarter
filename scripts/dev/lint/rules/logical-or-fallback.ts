import type { Violation } from "@scripts/dev/lint/types"
import * as ts from "typescript"

/**
 * Bans the logical OR operator (||) for fallbacks/defaults.
 * Allowed in:
 *   - Conditionals (if, while, for, do-while) for boolean logic
 *   - Return statements (boolean expressions being returned)
 *
 * Ternary expressions are NOT an exception - mixing || with ternaries is confusing.
 *
 * This rule was migrated from GritQL because GritQL has bugs with complex nested
 * `not(or{and{...}})` patterns and cannot reliably enumerate all conditional contexts.
 */

function isAllowedParent(current: ts.Node, parent: ts.Node): boolean {
	if (ts.isIfStatement(parent)) {
		return parent.expression === current
	}
	if (ts.isWhileStatement(parent)) {
		return parent.expression === current
	}
	if (ts.isDoStatement(parent)) {
		return parent.expression === current
	}
	if (ts.isForStatement(parent)) {
		return parent.condition === current
	}
	if (ts.isReturnStatement(parent)) {
		return true
	}
	return false
}

function shouldContinueUp(parent: ts.Node): boolean {
	if (ts.isParenthesizedExpression(parent)) {
		return true
	}
	if (ts.isBinaryExpression(parent)) {
		return true
	}
	if (ts.isPrefixUnaryExpression(parent)) {
		return true
	}
	return false
}

function isInAllowedPosition(node: ts.Node): boolean {
	let current: ts.Node = node
	let parent = current.parent

	while (parent) {
		if (isAllowedParent(current, parent)) {
			return true
		}

		if (shouldContinueUp(parent)) {
			current = parent
			parent = parent.parent
			continue
		}

		break
	}

	return false
}

function check(sourceFile: ts.SourceFile, _checker: ts.TypeChecker): Violation[] {
	const violations: Violation[] = []

	function walk(node: ts.Node): void {
		if (ts.isBinaryExpression(node) && node.operatorToken.kind === ts.SyntaxKind.BarBarToken) {
			if (!isInAllowedPosition(node)) {
				const { line, character } = sourceFile.getLineAndCharacterOfPosition(
					node.operatorToken.getStart(sourceFile)
				)
				violations.push({
					file: sourceFile.fileName,
					line: line + 1,
					column: character + 1,
					rule: "no-logical-or-fallback",
					message:
						"Logical OR (||) banned for fallbacks. Only allowed in conditionals and return statements.",
					suggestion: "See rules/no-logical-or-fallback.md for fix patterns"
				})
			}
		}

		ts.forEachChild(node, walk)
	}

	walk(sourceFile)
	return violations
}

export { check }
