import { Array as Arr, Option, Predicate, String as Str } from "effect"
import * as ts from "typescript/unstable/ast"
import { type Checker, type Type, TypeFlags } from "typescript/unstable/sync"
import type { LintRule, RuleContext, Violation } from "#scripts/dev/lint/types.ts"
import { violationAt } from "#scripts/dev/lint/violation.ts"

type FunctionLike =
	| ts.FunctionDeclaration
	| ts.MethodDeclaration
	| ts.ArrowFunction
	| ts.FunctionExpression

type Boundary = ts.PropertySignatureDeclaration | ts.PropertyDeclaration | ts.ParameterDeclaration

/** A library's own union alias (React's `ReactNode`) is that library's contract, not a boundary this repository
 * chose; our own aliases are seen through. */
const isLibraryVocabulary = (type: Type): boolean => {
	const file = type.getAliasSymbol()?.declarations[0]?.path
	return file !== undefined && Str.includes("/node_modules/")(file)
}

/** A type's members as the checker resolved them: an alias such as `type Maybe<T> = T | null` is seen through. */
const membersOf = (type: Type): ReadonlyArray<Type> => {
	if (!type.isUnionType() || isLibraryVocabulary(type)) {
		return [type]
	}
	return type.getTypes()
}

const hasFlag =
	(flag: TypeFlags) =>
	(member: Type): boolean =>
		(member.flags & flag) !== 0

const includesNull = (members: ReadonlyArray<Type>): boolean =>
	Arr.some(members, hasFlag(TypeFlags.Null))

const includesUndefined = (members: ReadonlyArray<Type>): boolean =>
	Arr.some(members, hasFlag(TypeFlags.Undefined))

/** The type without its null and undefined members, for the suggestion text. */
const baseTypeOf = (checker: Checker, members: ReadonlyArray<Type>): string =>
	Arr.join(
		Arr.map(
			Arr.filter(members, (member) => !includesNull([member]) && !includesUndefined([member])),
			(member) => checker.typeToString(member)
		),
		" | "
	)

const isFunctionLike: (node: ts.Node) => node is FunctionLike = Predicate.or(
	Predicate.or(ts.isFunctionDeclaration, ts.isMethodDeclaration),
	Predicate.or(ts.isArrowFunction, ts.isFunctionExpression)
)

const hasExportModifier = (node: ts.FunctionDeclaration | ts.VariableStatement): boolean =>
	Arr.some(
		node.modifiers === undefined ? [] : node.modifiers,
		(modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword
	)

/** A function the module exports, whose return type is public API even when it is inferred: an exported function
 * declaration, or a function written as the initializer of an exported const. */
const isExportedFunction = (node: FunctionLike): boolean => {
	if (ts.isFunctionDeclaration(node)) {
		return hasExportModifier(node)
	}
	const declaration = node.parent
	if (!ts.isVariableDeclaration(declaration) || declaration.initializer !== node) {
		return false
	}
	const statement = declaration.parent.parent
	return ts.isVariableStatement(statement) && hasExportModifier(statement)
}

const functionNameOf = (node: FunctionLike, sourceFile: ts.SourceFile): string => {
	if (ts.isFunctionDeclaration(node)) {
		return node.name === undefined ? "(anonymous)" : node.name.getText(sourceFile)
	}
	if (ts.isMethodDeclaration(node)) {
		return node.name.getText(sourceFile)
	}
	const parent = node.parent
	if (ts.isVariableDeclaration(parent) && ts.isIdentifier(parent.name)) {
		return parent.name.text
	}
	return "(anonymous)"
}

/** A caller may leave out an optional or defaulted parameter, and may leave an optional property absent, so for the
 * caller its type already has an undefined arm. */
const isOmittable = (node: Boundary): boolean => {
	if (ts.isParameterDeclaration(node)) {
		return node.questionToken !== undefined || node.initializer !== undefined
	}
	return node.postfixToken?.kind === ts.SyntaxKind.QuestionToken
}

const boundaryKindOf = (node: Boundary): string => {
	if (ts.isParameterDeclaration(node)) {
		return "Parameter"
	}
	return "Property"
}

/**
 * A type at a function or object boundary never holds both null and undefined: three states every reader must
 * handle. The checker's resolved union decides, so an alias or a generic instantiation cannot hide an arm. An
 * omittable parameter or property already has the undefined arm, so it may not add null. Parameters, return types
 * (written, or inferred on an exported function) and property signatures are checked; local variables stay free.
 */
export const noNullUndefinedUnion: LintRule = (context: RuleContext) => {
	const { sourceFile, checker } = context
	const violations: Array<Violation> = []

	const checkBoundary = (node: Boundary): void => {
		const typeNode = node.type
		const type = typeNode === undefined ? undefined : checker.getTypeFromTypeNode(typeNode)
		if (type === undefined) {
			return
		}
		const members = membersOf(type)
		const omittable = isOmittable(node)
		if (!includesNull(members) || (!omittable && !includesUndefined(members))) {
			return
		}
		const name = ts.isIdentifier(node.name) ? node.name.text : node.name.getText(sourceFile)
		const base = baseTypeOf(checker, members)
		const reason = omittable
			? "can be omitted and also admits null"
			: "admits both null and undefined"
		violations.push(
			violationAt({
				sourceFile,
				node: node.name,
				rule: "no-null-undefined-union",
				message: `${boundaryKindOf(node)} '${name}' ${reason}: three states for every reader.`,
				suggestion: `Pick one absence: '${name}?: ${base}' (optional) or '${name}: ${base} | null' (nullable), or an Option.`
			})
		)
	}

	const returnTypeOf = (
		node: FunctionLike
	): Option.Option<Readonly<{ type: Type; at: ts.Node }>> => {
		if (node.type !== undefined) {
			return Option.map(Option.fromNullishOr(checker.getTypeFromTypeNode(node.type)), (type) => ({
				type,
				at: node.type === undefined ? node : node.type
			}))
		}
		if (!isExportedFunction(node)) {
			return Option.none()
		}
		const signature = checker.getSignatureFromDeclaration(node)
		const inferred =
			signature === undefined ? undefined : checker.getReturnTypeOfSignature(signature)
		return Option.map(Option.fromNullishOr(inferred), (type) => ({ type, at: node }))
	}

	const checkReturn = (node: FunctionLike): void => {
		const found = returnTypeOf(node)
		if (Option.isNone(found)) {
			return
		}
		const members = membersOf(found.value.type)
		if (!includesNull(members) || !includesUndefined(members)) {
			return
		}
		const base = baseTypeOf(checker, members)
		violations.push(
			violationAt({
				sourceFile,
				node: found.value.at,
				rule: "no-null-undefined-union",
				message: `Function '${functionNameOf(node, sourceFile)}' returns both null and undefined: three states for every caller.`,
				suggestion: `Return '${base} | undefined', '${base} | null' or an Option.`
			})
		)
	}

	const walk = (node: ts.Node): void => {
		if (
			ts.isPropertySignatureDeclaration(node) ||
			ts.isPropertyDeclaration(node) ||
			ts.isParameterDeclaration(node)
		) {
			checkBoundary(node)
		}
		if (isFunctionLike(node)) {
			checkReturn(node)
		}
		node.forEachChild(walk)
	}

	walk(sourceFile)
	return violations
}
