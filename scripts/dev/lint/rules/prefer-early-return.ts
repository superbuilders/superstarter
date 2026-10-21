import { Predicate } from "effect"
import * as ts from "typescript/unstable/ast"
import type { LintRule, Violation } from "#scripts/dev/lint/types.ts"
import { violationAt } from "#scripts/dev/lint/violation.ts"

/** A body whose main path an early exit can dedent: a function's (generators included, so `Effect.gen` and
 * `Effect.fn` bodies) exits with `return`, a loop's with `continue`. */
type ExitScope = Readonly<{ kind: "function" | "loop"; body: ts.Block }>

const countStatements = (node: ts.Node): number => (ts.isBlock(node) ? node.statements.length : 1)

const isTrivialSetup = Predicate.or(ts.isVariableStatement, ts.isExpressionStatement)

/** The dominant if: the last statement, preceded only by declarations and expression statements. */
const wrappingIfOf = (statements: ts.NodeArray<ts.Statement>): ts.IfStatement | undefined => {
	for (const [index, statement] of statements.entries()) {
		if (ts.isIfStatement(statement) && index === statements.length - 1) {
			return statement
		}
		if (!isTrivialSetup(statement)) {
			return undefined
		}
	}
	return undefined
}

const functionBodyOf = (node: ts.Node): ts.Block | undefined => {
	if (
		ts.isFunctionDeclaration(node) ||
		ts.isMethodDeclaration(node) ||
		ts.isGetAccessorDeclaration(node) ||
		ts.isSetAccessorDeclaration(node)
	) {
		return node.body
	}
	if (ts.isArrowFunction(node) || ts.isFunctionExpression(node)) {
		return ts.isBlock(node.body) ? node.body : undefined
	}
	return undefined
}

const loopBodyOf = (node: ts.Node): ts.Block | undefined => {
	if (
		ts.isForStatement(node) ||
		ts.isForOfStatement(node) ||
		ts.isForInStatement(node) ||
		ts.isWhileStatement(node) ||
		ts.isDoStatement(node)
	) {
		return ts.isBlock(node.statement) ? node.statement : undefined
	}
	return undefined
}

const exitScopeOf = (node: ts.Node): ExitScope | undefined => {
	const functionBody = functionBodyOf(node)
	if (functionBody !== undefined) {
		return { kind: "function", body: functionBody }
	}
	const loopBody = loopBodyOf(node)
	return loopBody === undefined ? undefined : { kind: "loop", body: loopBody }
}

const MESSAGES = {
	function: {
		message: "Function body is wrapped in a single conditional",
		suggestion:
			"Invert the condition and return early (`return yield*` in a generator), then dedent the body."
	},
	loop: {
		message: "Loop body is wrapped in a single conditional",
		suggestion: "Invert the condition and `continue`, then dedent the body."
	}
} as const

/**
 * Early exits keep the main path unindented: a function or loop body wrapped in one else-less if whose branch has
 * 3+ statements is reported. oxlint's no-else-return and max-depth refuse an else after an exiting branch and deep
 * nesting.
 */
export const preferEarlyReturn: LintRule = ({ sourceFile }) => {
	const violations: Array<Violation> = []

	const checkWrappingIf = (scope: ExitScope): void => {
		const wrapping = wrappingIfOf(scope.body.statements)
		if (
			wrapping === undefined ||
			wrapping.elseStatement !== undefined ||
			countStatements(wrapping.thenStatement) < 3
		) {
			return
		}
		violations.push(
			violationAt({
				sourceFile,
				node: wrapping,
				rule: "prefer-early-return",
				...MESSAGES[scope.kind]
			})
		)
	}

	const walk = (node: ts.Node): void => {
		const scope = exitScopeOf(node)
		if (scope !== undefined && scope.body.statements.length > 0) {
			checkWrappingIf(scope)
		}
		node.forEachChild(walk)
	}

	walk(sourceFile)
	return violations
}
