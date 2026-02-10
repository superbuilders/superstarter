import type { ClassLocation } from "@scripts/dev/style/types"
import * as ts from "typescript"

const CN_FUNCTION_NAMES = new Set(["cn", "clsx", "classNames", "cva"])

/**
 * Extracts class strings from JSX className attributes.
 * Handles:
 * - String literals: className="bg-primary text-white"
 * - Template literals: className={`bg-primary ${condition ? "active" : ""}`}
 * - cn() calls: className={cn("base", condition && "conditional")}
 * - clsx() calls: same as cn()
 */
function extractClassesFromFile(sourceFile: ts.SourceFile): ClassLocation[] {
	const classes: ClassLocation[] = []

	function walk(node: ts.Node): void {
		if (ts.isJsxAttribute(node)) {
			const name = node.name.getText(sourceFile)
			if (name === "className" && node.initializer) {
				extractFromInitializer(node.initializer, classes, sourceFile)
			}
		}
		ts.forEachChild(node, walk)
	}

	walk(sourceFile)
	return classes
}

function extractFromInitializer(
	node: ts.Node,
	classes: ClassLocation[],
	sourceFile: ts.SourceFile
): void {
	if (ts.isStringLiteral(node)) {
		addClassesFromString(node.text, node, classes, sourceFile)
		return
	}

	if (ts.isJsxExpression(node) && node.expression) {
		extractFromExpression(node.expression, classes, sourceFile)
	}
}

function extractFromExpression(
	node: ts.Node,
	classes: ClassLocation[],
	sourceFile: ts.SourceFile
): void {
	if (ts.isStringLiteral(node)) {
		addClassesFromString(node.text, node, classes, sourceFile)
		return
	}

	if (ts.isTemplateExpression(node)) {
		extractFromTemplateExpression(node, classes, sourceFile)
		return
	}

	if (ts.isNoSubstitutionTemplateLiteral(node)) {
		addClassesFromString(node.text, node, classes, sourceFile)
		return
	}

	if (ts.isCallExpression(node) && isCnCall(node)) {
		extractFromCnCall(node, classes, sourceFile)
		return
	}

	if (ts.isConditionalExpression(node)) {
		extractFromExpression(node.whenTrue, classes, sourceFile)
		extractFromExpression(node.whenFalse, classes, sourceFile)
		return
	}

	if (ts.isBinaryExpression(node)) {
		extractFromBinaryExpression(node, classes, sourceFile)
		return
	}

	if (ts.isParenthesizedExpression(node)) {
		extractFromExpression(node.expression, classes, sourceFile)
	}
}

function extractFromTemplateExpression(
	node: ts.TemplateExpression,
	classes: ClassLocation[],
	sourceFile: ts.SourceFile
): void {
	if (node.head.text.trim()) {
		addClassesFromString(node.head.text, node.head, classes, sourceFile)
	}
	for (const span of node.templateSpans) {
		extractFromExpression(span.expression, classes, sourceFile)
		if (span.literal.text.trim()) {
			addClassesFromString(span.literal.text, span.literal, classes, sourceFile)
		}
	}
}

function extractFromBinaryExpression(
	node: ts.BinaryExpression,
	classes: ClassLocation[],
	sourceFile: ts.SourceFile
): void {
	if (node.operatorToken.kind === ts.SyntaxKind.AmpersandAmpersandToken) {
		extractFromExpression(node.right, classes, sourceFile)
		return
	}
	if (node.operatorToken.kind === ts.SyntaxKind.BarBarToken) {
		extractFromExpression(node.left, classes, sourceFile)
		extractFromExpression(node.right, classes, sourceFile)
	}
}

function extractFromCnCall(
	node: ts.CallExpression,
	classes: ClassLocation[],
	sourceFile: ts.SourceFile
): void {
	for (const arg of node.arguments) {
		extractFromCnArgument(arg, classes, sourceFile)
	}
}

function extractFromCnArgument(
	node: ts.Node,
	classes: ClassLocation[],
	sourceFile: ts.SourceFile
): void {
	if (ts.isStringLiteral(node)) {
		addClassesFromString(node.text, node, classes, sourceFile)
		return
	}

	if (ts.isObjectLiteralExpression(node)) {
		extractFromObjectLiteral(node, classes, sourceFile)
		return
	}

	if (ts.isArrayLiteralExpression(node)) {
		for (const element of node.elements) {
			extractFromCnArgument(element, classes, sourceFile)
		}
		return
	}

	if (ts.isConditionalExpression(node)) {
		extractFromCnArgument(node.whenTrue, classes, sourceFile)
		extractFromCnArgument(node.whenFalse, classes, sourceFile)
		return
	}

	if (
		ts.isBinaryExpression(node) &&
		node.operatorToken.kind === ts.SyntaxKind.AmpersandAmpersandToken
	) {
		extractFromCnArgument(node.right, classes, sourceFile)
		return
	}

	if (ts.isTemplateExpression(node)) {
		extractFromTemplateExpression(node, classes, sourceFile)
		return
	}

	if (ts.isNoSubstitutionTemplateLiteral(node)) {
		addClassesFromString(node.text, node, classes, sourceFile)
	}
}

function extractFromObjectLiteral(
	node: ts.ObjectLiteralExpression,
	classes: ClassLocation[],
	sourceFile: ts.SourceFile
): void {
	for (const prop of node.properties) {
		if (ts.isPropertyAssignment(prop)) {
			const key = getPropertyKey(prop.name)
			if (key) {
				addClassesFromString(key, prop.name, classes, sourceFile)
			}
		}
		if (ts.isShorthandPropertyAssignment(prop)) {
			addClassesFromString(prop.name.text, prop.name, classes, sourceFile)
		}
	}
}

function getPropertyKey(keyNode: ts.PropertyName): string | undefined {
	if (ts.isStringLiteral(keyNode)) {
		return keyNode.text
	}
	if (ts.isIdentifier(keyNode)) {
		return keyNode.text
	}
	return undefined
}

function isCnCall(node: ts.CallExpression): boolean {
	if (ts.isIdentifier(node.expression)) {
		return CN_FUNCTION_NAMES.has(node.expression.text)
	}
	return false
}

function addClassesFromString(
	text: string,
	node: ts.Node,
	classes: ClassLocation[],
	sourceFile: ts.SourceFile
): void {
	const { line, character } = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile))
	const classNames = text.split(/\s+/).filter(Boolean)

	for (const className of classNames) {
		classes.push({
			text: className,
			line: line + 1,
			column: character + 1
		})
	}
}

export { extractClassesFromFile }
