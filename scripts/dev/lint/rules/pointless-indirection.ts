import { Array as Arr } from "effect"
import * as ts from "typescript/unstable/ast"
import type { Symbol as NativeSymbol } from "typescript/unstable/sync"
import type { RuleContext, Visit } from "#scripts/dev/lint/types.ts"
import type { Report } from "#scripts/dev/shared/finding.ts"

type Wrapper = ts.FunctionDeclaration | ts.ArrowFunction | ts.FunctionExpression

const POINTLESS: Omit<Report, "node"> = {
	message: "Pointless indirection. This function just wraps a value or call without computation.",
	suggestion: "Inline the expression or use the value directly"
}

const isTrivialCall = (expression: ts.CallExpression): boolean =>
	Arr.every(
		expression.arguments,
		(argument) =>
			!ts.isArrowFunction(argument) &&
			!ts.isFunctionExpression(argument) &&
			isTrivialExpression(argument)
	)

const isTrivialLeaf = (expression: ts.Expression): boolean => {
	if (
		ts.isStringLiteral(expression) ||
		ts.isNumericLiteral(expression) ||
		ts.isIdentifier(expression) ||
		expression.kind === ts.SyntaxKind.TrueKeyword ||
		expression.kind === ts.SyntaxKind.FalseKeyword ||
		expression.kind === ts.SyntaxKind.NullKeyword
	) {
		return true
	}
	return ts.isCallExpression(expression) && isTrivialCall(expression)
}

const isTrivialObjectProperty = (property: ts.ObjectLiteralElementLike): boolean => {
	if (ts.isPropertyAssignment(property)) {
		return isTrivialExpression(property.initializer)
	}
	if (ts.isShorthandPropertyAssignment(property)) {
		return true
	}
	return ts.isSpreadAssignment(property) && isTrivialExpression(property.expression)
}

const isTrivialArrayElement = (element: ts.Expression): boolean =>
	ts.isSpreadElement(element)
		? isTrivialExpression(element.expression)
		: isTrivialExpression(element)

const isTrivialElementAccess = (expression: ts.ElementAccessExpression): boolean => {
	const argument = expression.argumentExpression
	if (!ts.isStringLiteral(argument) && !ts.isNumericLiteral(argument)) {
		return false
	}
	return isTrivialExpression(expression.expression)
}

/** Literals, names, member reads and calls of those: values that need no computation of their own. */
const isTrivialExpression = (expression: ts.Expression): boolean => {
	if (isTrivialLeaf(expression)) {
		return true
	}
	if (ts.isPropertyAccessExpression(expression) || ts.isParenthesizedExpression(expression)) {
		return isTrivialExpression(expression.expression)
	}
	if (ts.isObjectLiteralExpression(expression)) {
		return Arr.every(expression.properties, isTrivialObjectProperty)
	}
	if (ts.isArrayLiteralExpression(expression)) {
		return Arr.every(expression.elements, isTrivialArrayElement)
	}
	return ts.isElementAccessExpression(expression) && isTrivialElementAccess(expression)
}

const isTrivialBlock = (body: ts.Block): boolean => {
	const statement = body.statements.length === 1 ? body.statements[0] : undefined
	if (statement === undefined) {
		return false
	}
	if (ts.isReturnStatement(statement)) {
		return statement.expression !== undefined && isTrivialExpression(statement.expression)
	}
	return (
		ts.isExpressionStatement(statement) &&
		ts.isCallExpression(statement.expression) &&
		isTrivialCall(statement.expression)
	)
}

const hasTrivialBody = (node: Wrapper): boolean => {
	const body = node.body
	if (body === undefined) {
		return false
	}
	if (ts.isArrowFunction(node) && !ts.isBlock(body)) {
		return isTrivialExpression(body)
	}
	return ts.isBlock(body) && isTrivialBlock(body)
}

/** A type guard narrows, so it earns its wrapper even when its body is one call. */
const isPointlessIndirection = (node: Wrapper): boolean => {
	if (node.type !== undefined && ts.isTypePredicateNode(node.type)) {
		return false
	}
	return hasTrivialBody(node)
}

const hasExportModifier = (node: ts.FunctionDeclaration | ts.VariableStatement): boolean =>
	node.modifiers !== undefined &&
	Arr.some(node.modifiers, (modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword)

/** Names exported through the file's `export { name }` clauses. */
const exportedNamesOf = (sourceFile: ts.SourceFile): ReadonlySet<string> =>
	new Set(
		Arr.flatMap(sourceFile.statements, (statement) =>
			ts.isExportDeclaration(statement) &&
			statement.exportClause !== undefined &&
			ts.isNamedExports(statement.exportClause)
				? Arr.map(statement.exportClause.elements, (element) => element.name.text)
				: []
		)
	)

/** How many times the file names each symbol, declarations included, by the checker's symbol identity: a shadowed
 * or same-named binding is a different symbol. A shorthand property `{ run }` names the value it reads. */
const referenceCountsOf = (context: RuleContext): ReadonlyMap<number, number> => {
	const counts = new Map<number, number>()
	const record = (symbol: NativeSymbol | undefined): void => {
		if (symbol === undefined) {
			return
		}
		const seen = counts.get(symbol.id)
		counts.set(symbol.id, seen === undefined ? 1 : seen + 1)
	}
	const count = (node: ts.Node): void => {
		if (ts.isShorthandPropertyAssignment(node)) {
			record(context.checker.getShorthandAssignmentValueSymbol(node))
		} else if (ts.isIdentifier(node)) {
			record(context.semantics.symbolAt(node))
		}
		node.forEachChild(count)
	}
	count(context.sourceFile)
	return counts
}

/**
 * A local function whose body only returns a value or makes one call, without computation or narrowing, and that
 * is used once (counted by the checker's symbols), is indirection: inline the expression where it is used. A
 * wrapper used in several places names a shared expression, which inlining would duplicate, and exported functions
 * are public API; both stay. The file's reference counts are taken once, at its first candidate.
 */
export const noPointlessIndirection: Visit = (context) => {
	const { sourceFile, semantics } = context
	const exportedNames = exportedNamesOf(sourceFile)
	let referenceCounts: ReadonlyMap<number, number> | undefined = undefined
	const countsOf = (): ReadonlyMap<number, number> => {
		if (referenceCounts === undefined) {
			referenceCounts = referenceCountsOf(context)
		}
		return referenceCounts
	}
	/** Named by its declaration and more than one use; an unresolved name is left alone. */
	const isReused = (name: ts.Identifier): boolean => {
		const symbol = semantics.symbolAt(name)
		const references = symbol === undefined ? undefined : countsOf().get(symbol.id)
		return references === undefined || references > 2
	}

	const isExportedVariable = (name: string, node: ts.VariableDeclaration): boolean => {
		const list = node.parent
		if (!ts.isVariableDeclarationList(list) || !ts.isVariableStatement(list.parent)) {
			return false
		}
		return hasExportModifier(list.parent) || exportedNames.has(name)
	}

	const checkFunctionDeclaration = (node: ts.FunctionDeclaration): ReadonlyArray<Report> => {
		const name = node.name
		if (
			name === undefined ||
			hasExportModifier(node) ||
			exportedNames.has(name.text) ||
			!isPointlessIndirection(node) ||
			isReused(name)
		) {
			return []
		}
		return [{ node: name, ...POINTLESS }]
	}

	const checkVariableDeclaration = (node: ts.VariableDeclaration): ReadonlyArray<Report> => {
		const initializer = node.initializer
		if (
			initializer === undefined ||
			(!ts.isArrowFunction(initializer) && !ts.isFunctionExpression(initializer))
		) {
			return []
		}
		if (
			!ts.isIdentifier(node.name) ||
			isExportedVariable(node.name.text, node) ||
			!isPointlessIndirection(initializer) ||
			isReused(node.name)
		) {
			return []
		}
		return [{ node: node.name, ...POINTLESS }]
	}

	return (node) => {
		if (ts.isFunctionDeclaration(node)) {
			return checkFunctionDeclaration(node)
		}
		return ts.isVariableDeclaration(node) ? checkVariableDeclaration(node) : []
	}
}
