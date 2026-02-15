import type { Violation } from "@scripts/dev/lint/types"
import * as ts from "typescript"

/**
 * Bans the logical OR operator (||) for fallbacks/defaults.
 * Exception: Allowed in conditionals (if, while, for, do-while, ternary tests) for boolean logic.
 *
 * This rule was migrated from GritQL because GritQL has bugs with complex nested
 * `not(or{and{...}})` patterns and cannot reliably enumerate all conditional contexts.
 */

function isConditionOfParent(current: ts.Node, parent: ts.Node): boolean {
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
	if (ts.isConditionalExpression(parent)) {
		return parent.condition === current
	}
	return false
}

function isInReturnTernary(current: ts.Node, parent: ts.Node): boolean {
	// Allow || inside ternary that is directly returned: return a ? b : c
	if (ts.isReturnStatement(parent)) {
		return ts.isConditionalExpression(current)
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

function shouldContinueUpTernary(parent: ts.Node): boolean {
	// For return ternary check, also continue through conditional expressions
	if (ts.isConditionalExpression(parent)) {
		return true
	}
	return shouldContinueUp(parent)
}

function isInConditionPosition(node: ts.Node): boolean {
	let current: ts.Node = node
	let parent = current.parent

	while (parent) {
		if (isConditionOfParent(current, parent)) {
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

function isInReturnTernaryPosition(node: ts.Node): boolean {
	let current: ts.Node = node
	let parent = current.parent

	while (parent) {
		if (isInReturnTernary(current, parent)) {
			return true
		}

		if (shouldContinueUpTernary(parent)) {
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
			if (!isInConditionPosition(node) && !isInReturnTernaryPosition(node)) {
				const { line, character } = sourceFile.getLineAndCharacterOfPosition(
					node.operatorToken.getStart(sourceFile)
				)
				violations.push({
					file: sourceFile.fileName,
					line: line + 1,
					column: character + 1,
					rule: "no-logical-or-fallback",
					message:
						"Logical OR (||) banned for fallbacks. Only allowed in conditionals (if/while/for/ternary test).",
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
