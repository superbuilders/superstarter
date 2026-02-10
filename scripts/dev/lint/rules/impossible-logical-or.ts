import type { Violation } from "@scripts/dev/lint/types"
import * as ts from "typescript"

function check(sourceFile: ts.SourceFile, checker: ts.TypeChecker): Violation[] {
	const violations: Violation[] = []

	function isPossiblyFalsyPrimitive(type: ts.Type): boolean {
		const falsyFlags =
			ts.TypeFlags.String | ts.TypeFlags.Number | ts.TypeFlags.Boolean | ts.TypeFlags.BigInt
		return (type.flags & falsyFlags) !== 0
	}

	function isLiteralTruthy(type: ts.Type): boolean {
		if (type.isStringLiteral()) {
			return type.value !== ""
		}
		if (type.isNumberLiteral()) {
			return type.value !== 0 && !Number.isNaN(type.value)
		}
		return false
	}

	function isAlwaysTruthy(type: ts.Type): boolean {
		const typeStr = checker.typeToString(type)

		if (typeStr.includes("null") || typeStr.includes("undefined")) {
			return false
		}

		if (isPossiblyFalsyPrimitive(type)) {
			return false
		}

		if (type.isUnion()) {
			return type.types.every(isAlwaysTruthy)
		}

		if (type.flags & ts.TypeFlags.Object) {
			return true
		}

		return isLiteralTruthy(type)
	}

	function walk(node: ts.Node): void {
		if (ts.isBinaryExpression(node) && node.operatorToken.kind === ts.SyntaxKind.BarBarToken) {
			const leftType = checker.getTypeAtLocation(node.left)

			if (isAlwaysTruthy(leftType)) {
				const { line, character } = sourceFile.getLineAndCharacterOfPosition(
					node.operatorToken.getStart(sourceFile)
				)
				const typeStr = checker.typeToString(leftType)
				violations.push({
					file: sourceFile.fileName,
					line: line + 1,
					column: character + 1,
					rule: "no-impossible-logical-or",
					message: `Right side of || is unreachable. Left side '${typeStr}' is always truthy.`,
					suggestion: "Remove the || fallback or fix the type"
				})
			}
		}

		ts.forEachChild(node, walk)
	}

	walk(sourceFile)
	return violations
}

export { check }
