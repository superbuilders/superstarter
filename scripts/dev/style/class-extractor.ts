import { Array as Arr, String as Str } from "effect"
import * as ts from "typescript/unstable/ast"
import type { SyntaxSource } from "#scripts/dev/shared/native-syntax.ts"
import type { ClassLocation } from "#scripts/dev/style/types.ts"

const CLASS_HELPERS: ReadonlyArray<string> = ["cn", "clsx", "classNames", "cva"]

const isClassHelperCall = (node: ts.CallExpression): boolean =>
	ts.isIdentifier(node.expression) && Arr.contains(CLASS_HELPERS, node.expression.text)

const isAnd = (node: ts.BinaryExpression): boolean =>
	node.operatorToken.kind === ts.SyntaxKind.AmpersandAmpersandToken

/**
 * Extracts the class names written in JSX `className` attributes: string literals, template literals, the
 * branches of conditionals and logical operators, and the arguments of cn, clsx, classNames and cva calls,
 * object keys and arrays included. Each class is located at the literal it came from.
 */
export const extractClasses = (source: SyntaxSource): ReadonlyArray<ClassLocation> => {
	const { sourceFile, file } = source
	const classes: Array<ClassLocation> = []

	const addClasses = (text: string, node: ts.Node): void => {
		const { line, character } = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile))
		for (const className of Arr.filter(Str.split(/\s+/)(text), Str.isNonEmpty)) {
			classes.push({ file, text: className, line: line + 1, column: character + 1 })
		}
	}

	const fromTemplate = (node: ts.TemplateExpression): void => {
		if (Str.isNonEmpty(Str.trim(node.head.text))) {
			addClasses(node.head.text, node.head)
		}
		for (const span of node.templateSpans) {
			fromExpression(span.expression)
			if (Str.isNonEmpty(Str.trim(span.literal.text))) {
				addClasses(span.literal.text, span.literal)
			}
		}
	}

	const fromObjectLiteral = (node: ts.ObjectLiteralExpression): void => {
		for (const property of node.properties) {
			if (
				ts.isPropertyAssignment(property) &&
				(ts.isStringLiteral(property.name) || ts.isIdentifier(property.name))
			) {
				addClasses(property.name.text, property.name)
			}
			if (ts.isShorthandPropertyAssignment(property) && ts.isIdentifier(property.name)) {
				addClasses(property.name.text, property.name)
			}
		}
	}

	const fromLiteral = (node: ts.Expression): boolean => {
		if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
			addClasses(node.text, node)
			return true
		}
		if (ts.isTemplateExpression(node)) {
			fromTemplate(node)
			return true
		}
		return false
	}

	const fromHelperArgument = (node: ts.Expression): void => {
		if (fromLiteral(node)) {
			return
		}
		if (ts.isObjectLiteralExpression(node)) {
			fromObjectLiteral(node)
			return
		}
		if (ts.isArrayLiteralExpression(node)) {
			for (const element of node.elements) {
				fromHelperArgument(element)
			}
			return
		}
		if (ts.isConditionalExpression(node)) {
			fromHelperArgument(node.whenTrue)
			fromHelperArgument(node.whenFalse)
			return
		}
		if (ts.isBinaryExpression(node) && isAnd(node)) {
			fromHelperArgument(node.right)
		}
	}

	const fromBinary = (node: ts.BinaryExpression): void => {
		if (isAnd(node)) {
			fromExpression(node.right)
			return
		}
		if (node.operatorToken.kind === ts.SyntaxKind.BarBarToken) {
			fromExpression(node.left)
			fromExpression(node.right)
		}
	}

	const fromCall = (node: ts.CallExpression): void => {
		if (!isClassHelperCall(node)) {
			return
		}
		for (const argument of node.arguments) {
			fromHelperArgument(argument)
		}
	}

	const fromExpression = (node: ts.Expression): void => {
		if (fromLiteral(node)) {
			return
		}
		if (ts.isCallExpression(node)) {
			fromCall(node)
			return
		}
		if (ts.isConditionalExpression(node)) {
			fromExpression(node.whenTrue)
			fromExpression(node.whenFalse)
			return
		}
		if (ts.isBinaryExpression(node)) {
			fromBinary(node)
			return
		}
		if (ts.isParenthesizedExpression(node)) {
			fromExpression(node.expression)
		}
	}

	const walk = (node: ts.Node): void => {
		if (ts.isJsxAttribute(node) && node.name.getText(sourceFile) === "className") {
			const initializer = node.initializer
			if (initializer !== undefined && ts.isStringLiteral(initializer)) {
				addClasses(initializer.text, initializer)
			}
			if (
				initializer !== undefined &&
				ts.isJsxExpression(initializer) &&
				initializer.expression !== undefined
			) {
				fromExpression(initializer.expression)
			}
		}
		node.forEachChild(walk)
	}

	walk(sourceFile)
	return classes
}
