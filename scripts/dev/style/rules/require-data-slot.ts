import { Array as Arr, Option, Predicate } from "effect"
import * as ts from "typescript/unstable/ast"
import type { SyntaxSource } from "#scripts/dev/shared/native-syntax.ts"
import {
	dataSlotAttributesOf,
	isComponentFile,
	type JsxRoot
} from "#scripts/dev/style/components.ts"
import type { StyleViolation } from "#scripts/dev/style/types.ts"

type ComponentFunction = ts.FunctionDeclaration | ts.FunctionExpression | ts.ArrowFunction

const jsxOf = (expression: ts.Expression): JsxRoot | undefined => {
	if (
		ts.isJsxElement(expression) ||
		ts.isJsxSelfClosingElement(expression) ||
		ts.isJsxFragment(expression)
	) {
		return expression
	}
	return ts.isParenthesizedExpression(expression) ? jsxOf(expression.expression) : undefined
}

/** The JSX of an arrow's expression body, or of the first return statement of a block body. */
const returnedJsxOf = (node: ComponentFunction): JsxRoot | undefined => {
	const body = node.body
	if (body === undefined) {
		return undefined
	}
	if (!ts.isBlock(body)) {
		return jsxOf(body)
	}
	const returned = Arr.findFirst(body.statements, ts.isReturnStatement)
	if (Option.isNone(returned) || returned.value.expression === undefined) {
		return undefined
	}
	return jsxOf(returned.value.expression)
}

const isJsxRoot = Predicate.or(
	Predicate.or(ts.isJsxElement, ts.isJsxSelfClosingElement),
	ts.isJsxFragment
)

const childrenHaveDataSlot = (children: ts.NodeArray<ts.JsxChild>): boolean =>
	Arr.some(children, (child) => isJsxRoot(child) && hasDataSlotAnywhere(child))

const hasDataSlotAnywhere = (jsx: JsxRoot): boolean => {
	if (ts.isJsxFragment(jsx)) {
		return childrenHaveDataSlot(jsx.children)
	}
	if (Arr.isReadonlyArrayNonEmpty(dataSlotAttributesOf(jsx))) {
		return true
	}
	return ts.isJsxElement(jsx) && childrenHaveDataSlot(jsx.children)
}

/**
 * A component function (a capitalized name) in a component directory carries a data-slot attribute somewhere in
 * the JSX it returns: on its top-level element, or nested, for compositions that wrap a primitive.
 */
export const requireDataSlot = (source: SyntaxSource): ReadonlyArray<StyleViolation> => {
	const { sourceFile, file } = source
	if (!isComponentFile(file)) {
		return []
	}
	const violations: Array<StyleViolation> = []

	const checkComponent = (node: ComponentFunction, name: string): void => {
		const returned = /^[A-Z]/.test(name) ? returnedJsxOf(node) : undefined
		if (returned === undefined || hasDataSlotAnywhere(returned)) {
			return
		}
		const { line, character } = sourceFile.getLineAndCharacterOfPosition(
			returned.getStart(sourceFile)
		)
		violations.push({
			file,
			line: line + 1,
			column: character + 1,
			rule: "require-data-slot",
			message: `Component "${name}" missing data-slot attribute.`,
			componentName: name
		})
	}

	const checkDeclaration = (declaration: ts.VariableDeclaration): void => {
		const initializer = declaration.initializer
		if (
			ts.isIdentifier(declaration.name) &&
			initializer !== undefined &&
			(ts.isFunctionExpression(initializer) || ts.isArrowFunction(initializer))
		) {
			checkComponent(initializer, declaration.name.text)
		}
	}

	const walk = (node: ts.Node): void => {
		if (ts.isFunctionDeclaration(node) && node.name !== undefined) {
			checkComponent(node, node.name.text)
		}
		if (ts.isVariableStatement(node)) {
			for (const declaration of node.declarationList.declarations) {
				checkDeclaration(declaration)
			}
		}
		node.forEachChild(walk)
	}

	walk(sourceFile)
	return violations
}
