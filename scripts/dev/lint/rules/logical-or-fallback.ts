import { Predicate } from "effect"
import * as ts from "typescript/unstable/ast"
import type { LintRule, Violation } from "#scripts/dev/lint/types.ts"
import { violationAt } from "#scripts/dev/lint/violation.ts"

const isAllowedParent = (current: ts.Node, parent: ts.Node): boolean => {
	if (ts.isIfStatement(parent) || ts.isWhileStatement(parent) || ts.isDoStatement(parent)) {
		return parent.expression === current
	}
	if (ts.isForStatement(parent)) {
		return parent.condition === current
	}
	return ts.isReturnStatement(parent)
}

const continuesUp = Predicate.or(
	Predicate.or(ts.isParenthesizedExpression, ts.isBinaryExpression),
	ts.isPrefixUnaryExpression
)

/** Walks up through parentheses, operators and negations to the statement that consumes the expression. */
const isInAllowedPosition = (node: ts.Node): boolean => {
	let current: ts.Node = node
	while (!ts.isSourceFile(current)) {
		const parent = current.parent
		if (isAllowedParent(current, parent)) {
			return true
		}
		if (!continuesUp(parent)) {
			return false
		}
		current = parent
	}
	return false
}

/**
 * `||` treats 0, "" and false as missing, so it is banned as a fallback. It stays legal as boolean logic in the
 * condition of an if, while, do-while or for statement, and in a return statement's expression. A concise arrow
 * body is not a return statement, and neither is a ternary's test: a predicate that needs `||` branches in an if or
 * composes with `Predicate.or`.
 */
export const noLogicalOrFallback: LintRule = ({ sourceFile }) => {
	const violations: Array<Violation> = []

	const walk = (node: ts.Node): void => {
		if (
			ts.isBinaryExpression(node) &&
			node.operatorToken.kind === ts.SyntaxKind.BarBarToken &&
			!isInAllowedPosition(node)
		) {
			violations.push(
				violationAt({
					sourceFile,
					node: node.operatorToken,
					rule: "no-logical-or-fallback",
					message:
						"Logical OR (||) banned for fallbacks. Only allowed in conditionals and return statements.",
					suggestion:
						"Branch in an if, or compose named predicates with Predicate.or. See rules/no-logical-or-fallback.md."
				})
			)
		}
		node.forEachChild(walk)
	}

	walk(sourceFile)
	return violations
}
