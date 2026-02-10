import type { Violation } from "@scripts/dev/lint/types"
import * as ts from "typescript"

/**
 * Checks for types that include both null and undefined.
 *
 * Only checks function boundaries (parameters, return types) and property signatures.
 * Does NOT check variable declarations - this allows Zod schemas to use
 * .nullable().optional() for normalization at API boundaries.
 */
function check(sourceFile: ts.SourceFile, checker: ts.TypeChecker): Violation[] {
	const violations: Violation[] = []

	function hasBothNullAndUndefined(type: ts.Type): boolean {
		const typeStr = checker.typeToString(type)
		return typeStr.includes("null") && typeStr.includes("undefined")
	}

	function typeIncludesNull(typeNode: ts.TypeNode): boolean {
		if (ts.isUnionTypeNode(typeNode)) {
			return typeNode.types.some(typeIncludesNull)
		}
		if (ts.isLiteralTypeNode(typeNode)) {
			return typeNode.literal.kind === ts.SyntaxKind.NullKeyword
		}
		return typeNode.kind === ts.SyntaxKind.NullKeyword
	}

	function getPropertyName(node: ts.PropertySignature | ts.PropertyDeclaration): string {
		if (ts.isIdentifier(node.name)) {
			return node.name.text
		}
		return node.name.getText(sourceFile)
	}

	function getParamName(node: ts.ParameterDeclaration): string {
		if (ts.isIdentifier(node.name)) {
			return node.name.text
		}
		return node.name.getText(sourceFile)
	}

	function getFunctionName(
		node: ts.FunctionDeclaration | ts.MethodDeclaration | ts.ArrowFunction | ts.FunctionExpression
	): string {
		if (ts.isFunctionDeclaration(node) || ts.isMethodDeclaration(node)) {
			if (!node.name) {
				return "(anonymous)"
			}
			return node.name.getText(sourceFile)
		}
		const parent = node.parent
		if (ts.isVariableDeclaration(parent) && ts.isIdentifier(parent.name)) {
			return parent.name.text
		}
		return "(anonymous)"
	}

	function checkPropertyNode(node: ts.PropertySignature | ts.PropertyDeclaration): void {
		const isOptional = node.questionToken !== undefined
		if (!isOptional || !node.type || !typeIncludesNull(node.type)) {
			return
		}
		const { line, character } = sourceFile.getLineAndCharacterOfPosition(
			node.name.getStart(sourceFile)
		)
		const propName = getPropertyName(node)
		const typeStr = node.type.getText(sourceFile)
		const baseType = typeStr
			.replace(/\s*\|\s*null/g, "")
			.replace(/\s*\|\s*undefined/g, "")
			.replace(/null\s*\|\s*/g, "")
			.replace(/undefined\s*\|\s*/g, "")
			.trim()
		violations.push({
			file: sourceFile.fileName,
			line: line + 1,
			column: character + 1,
			rule: "no-null-undefined-union",
			message: `Optional property '${propName}' with '| null' creates triple-branch confusion (undefined, null, or value).`,
			suggestion: `Change to '${propName}: ${baseType} | null' (nullable) or '${propName}?: ${baseType}' (optional)`
		})
	}

	function checkParameterNode(node: ts.ParameterDeclaration): void {
		if (!node.type) {
			return
		}
		const isOptional = node.questionToken !== undefined
		const paramName = getParamName(node)
		const typeStr = node.type.getText(sourceFile)
		const baseType = typeStr
			.replace(/\s*\|\s*null/g, "")
			.replace(/\s*\|\s*undefined/g, "")
			.replace(/null\s*\|\s*/g, "")
			.replace(/undefined\s*\|\s*/g, "")
			.trim()

		if (isOptional && typeIncludesNull(node.type)) {
			const { line, character } = sourceFile.getLineAndCharacterOfPosition(
				node.name.getStart(sourceFile)
			)
			violations.push({
				file: sourceFile.fileName,
				line: line + 1,
				column: character + 1,
				rule: "no-null-undefined-union",
				message: `Optional parameter '${paramName}' with '| null' creates triple-branch confusion.`,
				suggestion: `Change to '${paramName}: ${baseType} | null' (nullable) or '${paramName}?: ${baseType}' (optional)`
			})
			return
		}

		if (isOptional) {
			return
		}

		const type = checker.getTypeFromTypeNode(node.type)
		if (!hasBothNullAndUndefined(type) || !ts.isUnionTypeNode(node.type)) {
			return
		}
		const { line, character } = sourceFile.getLineAndCharacterOfPosition(
			node.name.getStart(sourceFile)
		)
		violations.push({
			file: sourceFile.fileName,
			line: line + 1,
			column: character + 1,
			rule: "no-null-undefined-union",
			message: `Parameter '${paramName}' has type '${typeStr}' with both null and undefined.`,
			suggestion: `Change to '${paramName}: ${baseType} | null' or '${paramName}: ${baseType} | undefined'`
		})
	}

	function checkFunctionReturnType(
		node: ts.FunctionDeclaration | ts.MethodDeclaration | ts.ArrowFunction | ts.FunctionExpression
	): void {
		if (!node.type || !ts.isUnionTypeNode(node.type)) {
			return
		}
		const type = checker.getTypeFromTypeNode(node.type)
		if (!hasBothNullAndUndefined(type)) {
			return
		}
		const { line, character } = sourceFile.getLineAndCharacterOfPosition(
			node.type.getStart(sourceFile)
		)
		const funcName = getFunctionName(node)
		const typeStr = node.type.getText(sourceFile)
		const baseType = typeStr
			.replace(/\s*\|\s*null/g, "")
			.replace(/\s*\|\s*undefined/g, "")
			.replace(/null\s*\|\s*/g, "")
			.replace(/undefined\s*\|\s*/g, "")
			.trim()
		violations.push({
			file: sourceFile.fileName,
			line: line + 1,
			column: character + 1,
			rule: "no-null-undefined-union",
			message: `Function '${funcName}' return type '${typeStr}' has both null and undefined.`,
			suggestion: `Change return type to '${baseType} | null' or '${baseType} | undefined'`
		})
	}

	function walk(node: ts.Node): void {
		if (ts.isPropertySignature(node) || ts.isPropertyDeclaration(node)) {
			checkPropertyNode(node)
		}

		if (ts.isParameter(node)) {
			checkParameterNode(node)
		}

		if (
			ts.isFunctionDeclaration(node) ||
			ts.isMethodDeclaration(node) ||
			ts.isArrowFunction(node) ||
			ts.isFunctionExpression(node)
		) {
			checkFunctionReturnType(node)
		}

		ts.forEachChild(node, walk)
	}

	walk(sourceFile)
	return violations
}

export { check }
