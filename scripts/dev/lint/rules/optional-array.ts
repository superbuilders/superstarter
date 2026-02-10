import type { Violation } from "@scripts/dev/lint/types"
import * as ts from "typescript"

/**
 * Detects arrays that are optional or nullable.
 * Arrays should use empty array [] as the empty state, not null/undefined.
 */
function check(sourceFile: ts.SourceFile, checker: ts.TypeChecker): Violation[] {
	const violations: Violation[] = []

	function isArrayType(type: ts.Type): boolean {
		if (checker.isArrayType(type)) {
			return true
		}
		const symbol = type.getSymbol()
		if (symbol && symbol.getName() === "Array") {
			return true
		}
		return false
	}

	function hasNullishInUnion(type: ts.Type): {
		hasNull: boolean
		hasUndefined: boolean
	} {
		let hasNull = false
		let hasUndefined = false

		if (type.isUnion()) {
			for (const member of type.types) {
				if (member.flags & ts.TypeFlags.Null) {
					hasNull = true
				}
				if (member.flags & ts.TypeFlags.Undefined) {
					hasUndefined = true
				}
			}
		}

		return { hasNull, hasUndefined }
	}

	function checkType(node: ts.Node, type: ts.Type): void {
		if (!type.isUnion()) {
			return
		}

		const hasArray = type.types.some(isArrayType)
		if (!hasArray) {
			return
		}

		const { hasNull, hasUndefined } = hasNullishInUnion(type)
		if (!hasNull && !hasUndefined) {
			return
		}

		const { line, character } = sourceFile.getLineAndCharacterOfPosition(node.getStart())
		const nullishPart =
			hasNull && hasUndefined ? "null | undefined" : hasNull ? "null" : "undefined"

		violations.push({
			file: sourceFile.fileName,
			line: line + 1,
			column: character + 1,
			rule: "no-optional-array",
			message: `Array type includes ${nullishPart}. Use empty array [] as the empty state.`,
			suggestion: "Remove the nullish type and use [] at boundaries instead"
		})
	}

	function walk(node: ts.Node): void {
		if (ts.isVariableDeclaration(node) && node.type) {
			const type = checker.getTypeAtLocation(node)
			checkType(node.name, type)
		}

		if (ts.isPropertySignature(node)) {
			const type = checker.getTypeAtLocation(node)
			checkType(node.name, type)
		}

		if (ts.isPropertyDeclaration(node)) {
			const type = checker.getTypeAtLocation(node)
			checkType(node.name, type)
		}

		if (ts.isParameter(node)) {
			const type = checker.getTypeAtLocation(node)
			checkType(node.name, type)
		}

		if (
			(ts.isFunctionDeclaration(node) ||
				ts.isMethodDeclaration(node) ||
				ts.isArrowFunction(node)) &&
			node.type
		) {
			const type = checker.getTypeFromTypeNode(node.type)
			checkType(node.type, type)
		}

		ts.forEachChild(node, walk)
	}

	walk(sourceFile)
	return violations
}

export { check }
