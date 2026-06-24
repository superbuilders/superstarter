import type { Violation } from "@scripts/dev/lint/types"
import * as ts from "typescript"

function violation(sourceFile: ts.SourceFile, node: ts.TypeAliasDeclaration): Violation {
	const { line, character } = sourceFile.getLineAndCharacterOfPosition(node.name.getStart(sourceFile))
	return {
		file: sourceFile.fileName,
		line: line + 1,
		column: character + 1,
		rule: "no-pointless-type-alias",
		message: "Pointless type alias. Direct aliases to primitives, literals, or bare types are banned.",
		suggestion: "Use the underlying type directly or define real structure/composition."
	}
}

function unparenthesizedType(node: ts.TypeNode): ts.TypeNode {
	let current = node
	while (ts.isParenthesizedTypeNode(current)) {
		current = current.type
	}
	return current
}

function isPrimitiveKeywordType(node: ts.TypeNode): boolean {
	switch (node.kind) {
		case ts.SyntaxKind.AnyKeyword:
		case ts.SyntaxKind.BigIntKeyword:
		case ts.SyntaxKind.BooleanKeyword:
		case ts.SyntaxKind.NeverKeyword:
		case ts.SyntaxKind.NumberKeyword:
		case ts.SyntaxKind.ObjectKeyword:
		case ts.SyntaxKind.StringKeyword:
		case ts.SyntaxKind.SymbolKeyword:
		case ts.SyntaxKind.UndefinedKeyword:
		case ts.SyntaxKind.UnknownKeyword:
		case ts.SyntaxKind.VoidKeyword:
			return true
		default:
			return false
	}
}

function isBareTypeReference(node: ts.TypeNode): boolean {
	if (!ts.isTypeReferenceNode(node)) {
		return false
	}
	return node.typeArguments === undefined || node.typeArguments.length === 0
}

function isValidateInferType(node: ts.TypeNode): boolean {
	if (!ts.isTypeReferenceNode(node)) {
		return false
	}
	const name = node.typeName
	if (!ts.isQualifiedName(name)) {
		return false
	}
	return ts.isIdentifier(name.left) && name.left.text === "validate" && name.right.text === "Infer"
}

function isPointlessTypeAlias(node: ts.TypeAliasDeclaration): boolean {
	const aliasedType = unparenthesizedType(node.type)
	if (isValidateInferType(aliasedType)) {
		return false
	}
	return (
		isPrimitiveKeywordType(aliasedType) ||
		ts.isLiteralTypeNode(aliasedType) ||
		isBareTypeReference(aliasedType)
	)
}

function isInsideNamespace(node: ts.Node): boolean {
	let current: ts.Node = node.parent
	while (!ts.isSourceFile(current)) {
		if (ts.isModuleDeclaration(current)) {
			return true
		}
		current = current.parent
	}
	return false
}

function check(sourceFile: ts.SourceFile): Violation[] {
	const violations: Violation[] = []

	function walk(node: ts.Node): void {
		if (ts.isTypeAliasDeclaration(node) && !isInsideNamespace(node) && isPointlessTypeAlias(node)) {
			violations.push(violation(sourceFile, node))
		}
		ts.forEachChild(node, walk)
	}

	walk(sourceFile)
	return violations
}

export { check }
