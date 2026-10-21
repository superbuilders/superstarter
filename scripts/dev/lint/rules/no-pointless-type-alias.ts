import * as ts from "typescript/unstable/ast"
import type { LintRule, Violation } from "#scripts/dev/lint/types.ts"
import { violationAt } from "#scripts/dev/lint/violation.ts"

const unparenthesized = (node: ts.TypeNode): ts.TypeNode =>
	ts.isParenthesizedTypeNode(node) ? unparenthesized(node.type) : node

const PRIMITIVE_KEYWORDS: ReadonlySet<ts.SyntaxKind> = new Set([
	ts.SyntaxKind.AnyKeyword,
	ts.SyntaxKind.BigIntKeyword,
	ts.SyntaxKind.BooleanKeyword,
	ts.SyntaxKind.NeverKeyword,
	ts.SyntaxKind.NumberKeyword,
	ts.SyntaxKind.ObjectKeyword,
	ts.SyntaxKind.StringKeyword,
	ts.SyntaxKind.SymbolKeyword,
	ts.SyntaxKind.UndefinedKeyword,
	ts.SyntaxKind.UnknownKeyword,
	ts.SyntaxKind.VoidKeyword
])

const isBareTypeReference = (node: ts.TypeNode): boolean =>
	ts.isTypeReferenceNode(node) &&
	!(node.typeArguments !== undefined && node.typeArguments.length > 0)

const isPointlessTypeAlias = (node: ts.TypeAliasDeclaration): boolean => {
	const aliased = unparenthesized(node.type)
	return (
		PRIMITIVE_KEYWORDS.has(aliased.kind) ||
		ts.isLiteralTypeNode(aliased) ||
		isBareTypeReference(aliased)
	)
}

const isInsideNamespace = (node: ts.Node): boolean => {
	let current: ts.Node = node.parent
	while (!ts.isSourceFile(current)) {
		if (ts.isModuleDeclaration(current)) {
			return true
		}
		current = current.parent
	}
	return false
}

/** An alias of a primitive, a literal or a bare type adds a name without adding structure. */
export const noPointlessTypeAlias: LintRule = ({ sourceFile }) => {
	const violations: Array<Violation> = []

	const walk = (node: ts.Node): void => {
		if (ts.isTypeAliasDeclaration(node) && !isInsideNamespace(node) && isPointlessTypeAlias(node)) {
			violations.push(
				violationAt({
					sourceFile,
					node: node.name,
					rule: "no-pointless-type-alias",
					message:
						"Pointless type alias. Direct aliases to primitives, literals, or bare types are banned.",
					suggestion: "Use the underlying type directly or define real structure/composition."
				})
			)
		}
		node.forEachChild(walk)
	}

	walk(sourceFile)
	return violations
}
