import type { Violation } from "@scripts/dev/lint/types"
import * as ts from "typescript"

/**
 * Bans unused function parameters and ALL underscore-prefixed parameters.
 *
 * Exactly one exemption, syntactic and narrow: a parameter named `_` or
 * `_`-prefixed inside an INLINE callback argument (function expression or
 * arrow passed directly in a call/new/JSX-attribute position) where a LATER
 * parameter of the same callback is referenced. Trailing unused callback
 * params are still violations — TypeScript allows callbacks to declare fewer
 * parameters, so they can always be deleted.
 *
 * There is no suppression mechanism, deliberately.
 */
type FunctionLike =
	| ts.FunctionDeclaration
	| ts.FunctionExpression
	| ts.ArrowFunction
	| ts.MethodDeclaration

function isFunctionLike(node: ts.Node): node is FunctionLike {
	return (
		ts.isFunctionDeclaration(node) ||
		ts.isFunctionExpression(node) ||
		ts.isArrowFunction(node) ||
		ts.isMethodDeclaration(node)
	)
}

function isInlineCallbackArgument(node: FunctionLike): boolean {
	if (!ts.isFunctionExpression(node) && !ts.isArrowFunction(node)) {
		return false
	}
	const parent = node.parent
	if (ts.isCallExpression(parent) || ts.isNewExpression(parent)) {
		const args = parent.arguments
		if (args === undefined) {
			return false
		}
		for (const arg of args) {
			if (arg === node) {
				return true
			}
		}
		return false
	}
	return ts.isJsxExpression(parent)
}

function check(sourceFile: ts.SourceFile, checker: ts.TypeChecker): Violation[] {
	const violations: Violation[] = []

	function addViolation(nameNode: ts.Node, message: string, suggestion: string): void {
		const { line, character } = sourceFile.getLineAndCharacterOfPosition(
			nameNode.getStart(sourceFile)
		)
		violations.push({
			file: sourceFile.fileName,
			line: line + 1,
			column: character + 1,
			rule: "no-unused-params",
			message,
			suggestion
		})
	}

	function collectParamIdentifiers(name: ts.BindingName, into: ts.Identifier[]): void {
		if (ts.isIdentifier(name)) {
			into.push(name)
			return
		}
		for (const element of name.elements) {
			if (ts.isBindingElement(element)) {
				collectParamIdentifiers(element.name, into)
			}
		}
	}

	function countReferences(fn: FunctionLike, declaration: ts.Identifier): number {
		const symbol = checker.getSymbolAtLocation(declaration)
		if (symbol === undefined) {
			return 1
		}
		let count = 0
		function resolveValueSymbol(node: ts.Identifier): ts.Symbol | undefined {
			if (ts.isShorthandPropertyAssignment(node.parent)) {
				return checker.getShorthandAssignmentValueSymbol(node.parent)
			}
			return checker.getSymbolAtLocation(node)
		}
		function visit(node: ts.Node): void {
			if (ts.isIdentifier(node) && node !== declaration && node.text === declaration.text) {
				const nodeSymbol = resolveValueSymbol(node)
				if (nodeSymbol === symbol) {
					count++
				}
			}
			ts.forEachChild(node, visit)
		}
		if (fn.body !== undefined) {
			visit(fn.body)
		}
		for (const param of fn.parameters) {
			if (param.initializer !== undefined) {
				visit(param.initializer)
			}
		}
		return count
	}

	function checkFunction(fn: FunctionLike): void {
		if (fn.body === undefined) {
			return
		}
		const paramUsage: boolean[] = []
		const paramIdentifiers: ts.Identifier[][] = []
		for (const param of fn.parameters) {
			if (ts.isIdentifier(param.name) && param.name.text === "this") {
				paramUsage.push(true)
				paramIdentifiers.push([])
				continue
			}
			const identifiers: ts.Identifier[] = []
			collectParamIdentifiers(param.name, identifiers)
			paramIdentifiers.push(identifiers)
			let used = false
			for (const id of identifiers) {
				if (countReferences(fn, id) > 0) {
					used = true
					break
				}
			}
			paramUsage.push(used)
		}

		const inlineCallback = isInlineCallbackArgument(fn)

		for (let index = 0; index < fn.parameters.length; index++) {
			const identifiers = paramIdentifiers[index]
			if (identifiers === undefined) {
				continue
			}
			for (const id of identifiers) {
				if (id.text === "this") {
					continue
				}
				const underscore = id.text.startsWith("_")
				const used = countReferences(fn, id) > 0

				if (underscore && inlineCallback && !used) {
					let laterUsed = false
					for (let later = index + 1; later < fn.parameters.length; later++) {
						if (paramUsage[later] === true) {
							laterUsed = true
							break
						}
					}
					if (laterUsed) {
						continue
					}
				}

				if (underscore) {
					if (used) {
						addViolation(
							id,
							`Underscore-prefixed parameter '${id.text}'. Underscore parameters are banned.`,
							"Parameter is actually used: rename it without the underscore."
						)
					} else {
						addViolation(
							id,
							`Underscore-prefixed parameter '${id.text}'. Underscore parameters are banned.`,
							"Remove the parameter and update call sites (callbacks may simply declare fewer parameters)."
						)
					}
					continue
				}
				if (!used) {
					addViolation(
						id,
						`Parameter '${id.text}' is never used.`,
						"Remove the parameter; if it is positionally required by an inline callback, name it '_' and ensure a later parameter is used."
					)
				}
			}
		}
	}

	function walk(node: ts.Node): void {
		if (isFunctionLike(node)) {
			checkFunction(node)
		}
		ts.forEachChild(node, walk)
	}

	walk(sourceFile)
	return violations
}

export { check }
