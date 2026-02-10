import type { Violation } from "@scripts/dev/lint/types"
import * as ts from "typescript"

function check(sourceFile: ts.SourceFile, checker: ts.TypeChecker): Violation[] {
	const violations: Violation[] = []

	function isNullishCheck(
		node: ts.BinaryExpression
	): { variable: ts.Node; isNegated: boolean } | null {
		const op = node.operatorToken.kind
		if (
			op !== ts.SyntaxKind.EqualsEqualsEqualsToken &&
			op !== ts.SyntaxKind.ExclamationEqualsEqualsToken
		) {
			return null
		}

		const isNegated = op === ts.SyntaxKind.ExclamationEqualsEqualsToken

		if (
			node.right.kind === ts.SyntaxKind.NullKeyword ||
			(ts.isIdentifier(node.right) && node.right.text === "undefined")
		) {
			return { variable: node.left, isNegated }
		}
		if (
			node.left.kind === ts.SyntaxKind.NullKeyword ||
			(ts.isIdentifier(node.left) && node.left.text === "undefined")
		) {
			return { variable: node.right, isNegated }
		}

		return null
	}

	function isNonLiteralElementAccess(node: ts.ElementAccessExpression): boolean {
		const arg = node.argumentExpression
		return !ts.isStringLiteral(arg) && !ts.isNumericLiteral(arg)
	}

	function isDeclDynamic(decl: ts.VariableDeclaration): boolean {
		if (decl.initializer && ts.isElementAccessExpression(decl.initializer)) {
			if (isNonLiteralElementAccess(decl.initializer)) {
				return true
			}
		}

		const parent = decl.parent?.parent
		if (parent && ts.isForOfStatement(parent)) {
			return true
		}
		if (parent && ts.isForInStatement(parent)) {
			return true
		}

		return false
	}

	function isIdentifierDynamic(node: ts.Identifier): boolean {
		const symbol = checker.getSymbolAtLocation(node)
		if (!symbol) {
			return false
		}

		const decls = symbol.getDeclarations()
		if (!decls || decls.length === 0) {
			return false
		}

		const decl = decls[0]
		if (!decl) {
			return false
		}

		if (ts.isBindingElement(decl)) {
			return true
		}

		if (!ts.isVariableDeclaration(decl) || !decl.initializer) {
			return false
		}

		return isDeclDynamic(decl)
	}

	function isDynamicAccess(node: ts.Node): boolean {
		if (ts.isElementAccessExpression(node)) {
			return isNonLiteralElementAccess(node)
		}

		if (!ts.isIdentifier(node)) {
			return false
		}

		return isIdentifierDynamic(node)
	}

	function hasNullishFlag(t: ts.Type): boolean {
		if ((t.flags & ts.TypeFlags.Null) !== 0) {
			return true
		}
		return (t.flags & ts.TypeFlags.Undefined) !== 0
	}

	function canBeNullish(type: ts.Type, typeStr: string): boolean {
		if (type.flags & ts.TypeFlags.Any) {
			return true
		}
		if (type.flags & ts.TypeFlags.Unknown) {
			return true
		}

		if (typeStr.includes("null") || typeStr.includes("undefined")) {
			return true
		}

		if (type.isUnion()) {
			return type.types.some(hasNullishFlag)
		}

		return false
	}

	function checkBinaryExpression(node: ts.BinaryExpression): void {
		const nullishCheck = isNullishCheck(node)
		if (!nullishCheck) {
			return
		}

		if (isDynamicAccess(nullishCheck.variable)) {
			ts.forEachChild(node, walk)
			return
		}

		const type = checker.getTypeAtLocation(nullishCheck.variable)
		const typeStr = checker.typeToString(type)

		if (!canBeNullish(type, typeStr)) {
			const { line, character } = sourceFile.getLineAndCharacterOfPosition(
				node.getStart(sourceFile)
			)
			violations.push({
				file: sourceFile.fileName,
				line: line + 1,
				column: character + 1,
				rule: "no-unnecessary-condition",
				message: `Unnecessary null/undefined check. Type '${typeStr}' is never nullish.`,
				suggestion: "Remove the redundant check"
			})
		}
	}

	function walk(node: ts.Node): void {
		if (ts.isBinaryExpression(node)) {
			checkBinaryExpression(node)
		}

		ts.forEachChild(node, walk)
	}

	walk(sourceFile)
	return violations
}

export { check }
