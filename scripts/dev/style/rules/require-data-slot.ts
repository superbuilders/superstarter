import type { Violation } from "@scripts/dev/style/types"
import * as ts from "typescript"

/**
 * Requires that component functions in src/components have a data-slot attribute
 * somewhere in their returned JSX structure.
 *
 * The data-slot can be on:
 * - The top-level element directly
 * - A nested element (for composition patterns like wrapping with Portal/Button)
 *
 * BAD:  function Button() { return <button className="...">Click</button> }
 * GOOD: function Button() { return <button data-slot="button" className="...">Click</button> }
 * GOOD: function AlertDialogAction() { return <Button><Primitive data-slot="action" /></Button> }
 */
function check(sourceFile: ts.SourceFile): Violation[] {
	// Only check files in src/components
	if (!sourceFile.fileName.includes("src/components")) {
		return []
	}

	const violations: Violation[] = []
	walkNode(sourceFile, violations, sourceFile)
	return violations
}

function walkNode(node: ts.Node, violations: Violation[], sourceFile: ts.SourceFile): void {
	if (ts.isFunctionDeclaration(node) && node.name) {
		checkAndAddViolation(node, node.name.text, violations, sourceFile)
	}

	if (ts.isVariableStatement(node)) {
		checkVariableStatement(node, violations, sourceFile)
	}

	ts.forEachChild(node, (child) => walkNode(child, violations, sourceFile))
}

function checkVariableStatement(
	node: ts.VariableStatement,
	violations: Violation[],
	sourceFile: ts.SourceFile
): void {
	for (const decl of node.declarationList.declarations) {
		if (!ts.isIdentifier(decl.name)) continue
		if (!decl.initializer) continue
		if (!ts.isFunctionExpression(decl.initializer) && !ts.isArrowFunction(decl.initializer))
			continue

		checkAndAddViolation(decl.initializer, decl.name.text, violations, sourceFile)
	}
}

function checkAndAddViolation(
	node: ts.FunctionDeclaration | ts.FunctionExpression | ts.ArrowFunction,
	name: string,
	violations: Violation[],
	sourceFile: ts.SourceFile
): void {
	const violation = checkComponentFunction(node, name, sourceFile)
	if (violation) {
		violations.push(violation)
	}
}

function checkComponentFunction(
	node: ts.FunctionDeclaration | ts.FunctionExpression | ts.ArrowFunction,
	name: string,
	sourceFile: ts.SourceFile
): Violation | undefined {
	// Component names start with uppercase
	if (!/^[A-Z]/.test(name)) {
		return undefined
	}

	const returnedJsx = findReturnedJsx(node)
	if (!returnedJsx) {
		return undefined
	}

	if (hasDataSlotAnywhere(returnedJsx)) {
		return undefined
	}

	const { line, character } = sourceFile.getLineAndCharacterOfPosition(
		returnedJsx.getStart(sourceFile)
	)

	return {
		file: sourceFile.fileName,
		line: line + 1,
		column: character + 1,
		rule: "require-data-slot",
		message: `Component "${name}" missing data-slot attribute.`,
		componentName: name
	}
}

function findReturnedJsx(
	node: ts.FunctionDeclaration | ts.FunctionExpression | ts.ArrowFunction
): ts.JsxElement | ts.JsxSelfClosingElement | ts.JsxFragment | undefined {
	const body = node.body
	if (!body) {
		return undefined
	}

	// Arrow function with expression body
	if (ts.isArrowFunction(node) && !ts.isBlock(body)) {
		return extractJsxFromExpression(body)
	}

	if (!ts.isBlock(body)) {
		return undefined
	}

	// Look for return statement
	for (const stmt of body.statements) {
		if (ts.isReturnStatement(stmt) && stmt.expression) {
			return extractJsxFromExpression(stmt.expression)
		}
	}

	return undefined
}

function extractJsxFromExpression(
	expr: ts.Expression
): ts.JsxElement | ts.JsxSelfClosingElement | ts.JsxFragment | undefined {
	if (ts.isJsxElement(expr)) return expr
	if (ts.isJsxSelfClosingElement(expr)) return expr
	if (ts.isJsxFragment(expr)) return expr
	if (ts.isParenthesizedExpression(expr)) return extractJsxFromExpression(expr.expression)
	return undefined
}

function hasDataSlotAnywhere(
	jsx: ts.JsxElement | ts.JsxSelfClosingElement | ts.JsxFragment
): boolean {
	if (ts.isJsxFragment(jsx)) {
		return checkFragmentChildren(jsx)
	}

	if (hasDataSlotAttribute(jsx)) {
		return true
	}

	if (ts.isJsxElement(jsx)) {
		return checkElementChildren(jsx)
	}

	return false
}

function checkFragmentChildren(jsx: ts.JsxFragment): boolean {
	for (const child of jsx.children) {
		if (ts.isJsxElement(child) || ts.isJsxSelfClosingElement(child) || ts.isJsxFragment(child)) {
			if (hasDataSlotAnywhere(child)) {
				return true
			}
		}
	}
	return false
}

function checkElementChildren(jsx: ts.JsxElement): boolean {
	for (const child of jsx.children) {
		if (ts.isJsxElement(child) || ts.isJsxSelfClosingElement(child) || ts.isJsxFragment(child)) {
			if (hasDataSlotAnywhere(child)) {
				return true
			}
		}
	}
	return false
}

function hasDataSlotAttribute(jsx: ts.JsxElement | ts.JsxSelfClosingElement): boolean {
	const attributes = ts.isJsxElement(jsx) ? jsx.openingElement.attributes : jsx.attributes

	for (const attr of attributes.properties) {
		if (ts.isJsxAttribute(attr) && ts.isIdentifier(attr.name)) {
			if (attr.name.text === "data-slot") {
				return true
			}
		}
	}

	return false
}

export { check }
