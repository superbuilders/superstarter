import type { Violation } from "@scripts/dev/lint/types"
import * as ts from "typescript"

/**
 * Detects pointless indirection - functions that simply wrap another function call
 * without doing any computation or type narrowing.
 *
 * A function is pointless indirection if:
 *   1. Its body is a single statement that is just a function call
 *   2. It doesn't perform type narrowing (no type predicates)
 *
 * Examples:
 *   function handleClick() { doThing() }  // just use doThing directly
 *   const open = () => setOpen(true)  // inline the call
 *   function log(msg: string) { console.log(msg) }  // just use console.log
 *   function enrichWithId(x: Foo) { return enrich(x, id) }  // inline the call
 *   function parseIt() { return JSON.parse(data) }  // inline the call
 *
 * Does NOT flag:
 *   - Type guards (return type is `value is Type`)
 *   - Functions with multiple statements
 *   - Functions that do computation (operators, conditionals, object creation)
 */
function check(sourceFile: ts.SourceFile): Violation[] {
	const violations: Violation[] = []

	function hasTypePredicateReturn(
		node: ts.FunctionDeclaration | ts.ArrowFunction | ts.FunctionExpression
	): boolean {
		if (node.type && ts.isTypePredicateNode(node.type)) {
			return true
		}
		return false
	}

	function isTrivialLeaf(expr: ts.Expression): boolean {
		if (ts.isStringLiteral(expr)) {
			return true
		}
		if (ts.isNumericLiteral(expr)) {
			return true
		}
		if (expr.kind === ts.SyntaxKind.TrueKeyword) {
			return true
		}
		if (expr.kind === ts.SyntaxKind.FalseKeyword) {
			return true
		}
		if (expr.kind === ts.SyntaxKind.NullKeyword) {
			return true
		}
		if (ts.isIdentifier(expr)) {
			return true
		}
		if (ts.isCallExpression(expr)) {
			return true
		}
		return false
	}

	function isTrivialObjectProperty(prop: ts.ObjectLiteralElementLike): boolean {
		if (ts.isPropertyAssignment(prop)) {
			return isTrivialExpression(prop.initializer)
		}
		if (ts.isShorthandPropertyAssignment(prop)) {
			return true
		}
		if (ts.isSpreadAssignment(prop)) {
			return isTrivialExpression(prop.expression)
		}
		return false
	}

	function isTrivialObjectLiteral(expr: ts.ObjectLiteralExpression): boolean {
		for (const prop of expr.properties) {
			if (!isTrivialObjectProperty(prop)) {
				return false
			}
		}
		return true
	}

	function isTrivialArrayElement(elem: ts.Expression): boolean {
		if (ts.isSpreadElement(elem)) {
			return isTrivialExpression(elem.expression)
		}
		return isTrivialExpression(elem)
	}

	function isTrivialArrayLiteral(expr: ts.ArrayLiteralExpression): boolean {
		for (const elem of expr.elements) {
			if (!isTrivialArrayElement(elem)) {
				return false
			}
		}
		return true
	}

	function isTrivialElementAccess(expr: ts.ElementAccessExpression): boolean {
		const arg = expr.argumentExpression
		const isStringKey = ts.isStringLiteral(arg)
		const isNumericKey = ts.isNumericLiteral(arg)
		if (!isStringKey && !isNumericKey) {
			return false
		}
		return isTrivialExpression(expr.expression)
	}

	function isTrivialExpression(expr: ts.Expression): boolean {
		if (isTrivialLeaf(expr)) {
			return true
		}
		if (ts.isPropertyAccessExpression(expr)) {
			return isTrivialExpression(expr.expression)
		}
		if (ts.isParenthesizedExpression(expr)) {
			return isTrivialExpression(expr.expression)
		}
		if (ts.isObjectLiteralExpression(expr)) {
			return isTrivialObjectLiteral(expr)
		}
		if (ts.isArrayLiteralExpression(expr)) {
			return isTrivialArrayLiteral(expr)
		}
		if (ts.isElementAccessExpression(expr)) {
			return isTrivialElementAccess(expr)
		}
		return false
	}

	function getTrivialExpressionFromArrowBody(body: ts.ConciseBody): ts.Expression | null {
		if (ts.isBlock(body)) {
			return null
		}
		if (isTrivialExpression(body)) {
			return body
		}
		return null
	}

	function getTrivialExpressionFromBlock(body: ts.Block): ts.Expression | null {
		if (body.statements.length !== 1) {
			return null
		}

		const stmt = body.statements[0]
		if (!stmt) {
			return null
		}

		if (ts.isReturnStatement(stmt) && stmt.expression && isTrivialExpression(stmt.expression)) {
			return stmt.expression
		}

		if (ts.isExpressionStatement(stmt) && ts.isCallExpression(stmt.expression)) {
			return stmt.expression
		}

		return null
	}

	function getTrivialExpressionFromBody(
		node: ts.FunctionDeclaration | ts.ArrowFunction | ts.FunctionExpression
	): ts.Expression | null {
		const body = node.body
		if (!body) {
			return null
		}

		if (ts.isArrowFunction(node) && !ts.isBlock(body)) {
			return getTrivialExpressionFromArrowBody(body)
		}

		if (!ts.isBlock(body)) {
			return null
		}

		return getTrivialExpressionFromBlock(body)
	}

	function isPointlessIndirection(
		node: ts.FunctionDeclaration | ts.ArrowFunction | ts.FunctionExpression
	): boolean {
		if (hasTypePredicateReturn(node)) {
			return false
		}

		const expr = getTrivialExpressionFromBody(node)
		if (!expr) {
			return false
		}

		return true
	}

	// Build set of exported names from export { name } declarations
	const exportedNames = new Set<string>()
	function collectExportedNames(node: ts.Node): void {
		if (ts.isExportDeclaration(node) && node.exportClause) {
			if (ts.isNamedExports(node.exportClause)) {
				for (const element of node.exportClause.elements) {
					exportedNames.add(element.name.text)
				}
			}
		}
		ts.forEachChild(node, collectExportedNames)
	}
	collectExportedNames(sourceFile)

	function hasExportModifier(node: ts.Node): boolean {
		const modifiers = ts.canHaveModifiers(node) ? ts.getModifiers(node) : undefined
		if (!modifiers) {
			return false
		}
		for (const mod of modifiers) {
			if (mod.kind === ts.SyntaxKind.ExportKeyword) {
				return true
			}
		}
		return false
	}

	function isExported(name: string, node: ts.Node): boolean {
		if (hasExportModifier(node)) {
			return true
		}
		return exportedNames.has(name)
	}

	function isExportedVariable(name: string, node: ts.VariableDeclaration): boolean {
		const parent = node.parent
		if (!ts.isVariableDeclarationList(parent)) {
			return false
		}
		const grandparent = parent.parent
		if (!ts.isVariableStatement(grandparent)) {
			return false
		}
		if (hasExportModifier(grandparent)) {
			return true
		}
		return exportedNames.has(name)
	}

	function addViolation(nameNode: ts.Node): void {
		const { line, character } = sourceFile.getLineAndCharacterOfPosition(
			nameNode.getStart(sourceFile)
		)
		violations.push({
			file: sourceFile.fileName,
			line: line + 1,
			column: character + 1,
			rule: "no-pointless-indirection",
			message:
				"Pointless indirection. This function just wraps a value or call without computation.",
			suggestion: "Inline the expression or use the value directly"
		})
	}

	function checkFunctionDeclaration(node: ts.FunctionDeclaration): void {
		if (!node.name) {
			return
		}
		const name = node.name.text
		if (isExported(name, node)) {
			return
		}
		if (!isPointlessIndirection(node)) {
			return
		}
		addViolation(node.name)
	}

	function checkVariableDeclaration(node: ts.VariableDeclaration): void {
		if (!node.initializer) {
			return
		}
		if (!ts.isArrowFunction(node.initializer) && !ts.isFunctionExpression(node.initializer)) {
			return
		}
		const name = ts.isIdentifier(node.name) ? node.name.text : ""
		if (isExportedVariable(name, node)) {
			return
		}
		if (!isPointlessIndirection(node.initializer)) {
			return
		}
		addViolation(node.name)
	}

	function walk(node: ts.Node): void {
		if (ts.isFunctionDeclaration(node)) {
			checkFunctionDeclaration(node)
		}

		if (ts.isVariableDeclaration(node)) {
			checkVariableDeclaration(node)
		}

		ts.forEachChild(node, walk)
	}

	walk(sourceFile)
	return violations
}

export { check }
