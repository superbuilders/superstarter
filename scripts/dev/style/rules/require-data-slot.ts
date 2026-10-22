import { Array as Arr, Option, Predicate } from "effect"
import * as ts from "typescript/unstable/ast"
import type { Report } from "#scripts/dev/shared/finding.ts"
import { dataSlotAttributesOf, type JsxRoot } from "#scripts/dev/style/components.ts"

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

/** A component: a function with a capitalized name, declared or bound to a constant. */
const componentOf = (
	node: ts.Node
): Readonly<{ name: string; component: ComponentFunction }> | undefined => {
	if (ts.isFunctionDeclaration(node) && node.name !== undefined) {
		return { name: node.name.text, component: node }
	}
	if (
		!ts.isVariableDeclaration(node) ||
		!ts.isIdentifier(node.name) ||
		node.initializer === undefined ||
		(!ts.isFunctionExpression(node.initializer) && !ts.isArrowFunction(node.initializer))
	) {
		return undefined
	}
	return { name: node.name.text, component: node.initializer }
}

/**
 * A component function (a capitalized name) carries a data-slot attribute somewhere in the JSX it returns: on its
 * top-level element, or nested, for compositions that wrap a primitive.
 */
export const requireDataSlot = (sourceFile: ts.SourceFile): ReadonlyArray<Report> => {
	const reports: Array<Report> = []
	const walk = (node: ts.Node): void => {
		const found = componentOf(node)
		const returned =
			found !== undefined && /^[A-Z]/.test(found.name) ? returnedJsxOf(found.component) : undefined
		if (found !== undefined && returned !== undefined && !hasDataSlotAnywhere(returned)) {
			reports.push({
				node: returned,
				message: `Component "${found.name}" carries no data-slot attribute.`,
				suggestion: "Give its root element a data-slot that names the component in kebab case."
			})
		}
		node.forEachChild(walk)
	}
	walk(sourceFile)
	return reports
}
