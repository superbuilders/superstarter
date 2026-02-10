import type { Violation } from "@scripts/dev/lint/types"
import * as ts from "typescript"

function isFunctionProperty(prop: ts.ObjectLiteralElementLike): boolean {
	if (!ts.isPropertyAssignment(prop)) {
		return false
	}
	const init = prop.initializer
	if (ts.isArrowFunction(init)) {
		return true
	}
	return ts.isFunctionExpression(init)
}

function isDataProperty(prop: ts.ObjectLiteralElementLike): boolean {
	if (ts.isShorthandPropertyAssignment(prop)) {
		return true
	}
	if (!ts.isPropertyAssignment(prop)) {
		return false
	}
	const init = prop.initializer
	return !ts.isArrowFunction(init) && !ts.isFunctionExpression(init)
}

/**
 * Analyzes an object literal and returns function/data counts.
 */
function analyzeObjectLiteral(obj: ts.ObjectLiteralExpression): {
	functionCount: number
	dataCount: number
} {
	let functionCount = 0
	let dataCount = 0
	for (const prop of obj.properties) {
		if (isFunctionProperty(prop)) {
			functionCount++
		} else if (ts.isMethodDeclaration(prop)) {
			functionCount++
		} else if (isDataProperty(prop)) {
			dataCount++
		}
	}
	return { functionCount, dataCount }
}

type FunctionLikeNode =
	| ts.FunctionDeclaration
	| ts.FunctionExpression
	| ts.ArrowFunction
	| ts.MethodDeclaration

function findEnclosingFunction(node: ts.Node): FunctionLikeNode | null {
	let current = node.parent
	while (current) {
		if (
			ts.isFunctionDeclaration(current) ||
			ts.isFunctionExpression(current) ||
			ts.isArrowFunction(current) ||
			ts.isMethodDeclaration(current)
		) {
			return current
		}
		current = current.parent
	}
	return null
}

/**
 * Detects patterns that should be ESM modules instead:
 *   1. Object namespaces - objects with only function properties
 *   2. Object classes - objects mixing functions and state
 *   3. Class definitions - class declarations and expressions
 *
 * All three should be converted to ESM modules with exported functions
 * and module-level state.
 */
function check(sourceFile: ts.SourceFile): Violation[] {
	const violations: Violation[] = []

	function checkObjectLiteral(
		obj: ts.ObjectLiteralExpression,
		node: ts.Node,
		isReturn: boolean
	): void {
		const { functionCount, dataCount } = analyzeObjectLiteral(obj)

		// Object namespace: only functions, no data
		if (functionCount >= 2 && dataCount === 0) {
			const { line, character } = sourceFile.getLineAndCharacterOfPosition(
				node.getStart(sourceFile)
			)
			violations.push({
				file: sourceFile.fileName,
				line: line + 1,
				column: character + 1,
				rule: "no-object-module",
				message: "Object namespace detected. Convert to ESM module with exported functions.",
				suggestion: "Create a module file with exported functions: export function fn1() { ... }"
			})
			return
		}

		// Object class: functions + state
		if (functionCount >= 2 && dataCount >= 1) {
			const { line, character } = sourceFile.getLineAndCharacterOfPosition(
				node.getStart(sourceFile)
			)
			const message = isReturn
				? "Factory returns object with functions and state. Convert to ESM module."
				: "Object mixes functions and state. Convert to ESM module."
			violations.push({
				file: sourceFile.fileName,
				line: line + 1,
				column: character + 1,
				rule: "no-object-module",
				message,
				suggestion: "Create a module with module-level state and exported functions"
			})
		}
	}

	function checkClassNode(node: ts.ClassDeclaration | ts.ClassExpression): void {
		const { line, character } = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile))
		const name = ts.isClassDeclaration(node) && node.name ? node.name.text : "(anonymous)"
		violations.push({
			file: sourceFile.fileName,
			line: line + 1,
			column: character + 1,
			rule: "no-object-module",
			message: `Class '${name}' detected. Convert to ESM module with exported functions.`,
			suggestion:
				"Create a module with module-level state and exported functions instead of a class"
		})
	}

	function walk(node: ts.Node): void {
		// Check object literals in variable declarations
		// Skip if variable has type annotation (implementing an interface)
		if (
			ts.isVariableDeclaration(node) &&
			node.initializer &&
			ts.isObjectLiteralExpression(node.initializer) &&
			!node.type
		) {
			checkObjectLiteral(node.initializer, node.name, false)
		}

		// Check object literals in return statements (factory pattern)
		// Skip if the enclosing function has a return type annotation (implementing an interface)
		if (
			ts.isReturnStatement(node) &&
			node.expression &&
			ts.isObjectLiteralExpression(node.expression)
		) {
			const func = findEnclosingFunction(node)
			if (!func || !func.type) {
				checkObjectLiteral(node.expression, node.expression, true)
			}
		}

		// Check class declarations
		if (ts.isClassDeclaration(node)) {
			checkClassNode(node)
		}

		// Check class expressions
		if (ts.isClassExpression(node)) {
			checkClassNode(node)
		}

		ts.forEachChild(node, walk)
	}

	walk(sourceFile)
	return violations
}

export { check }
