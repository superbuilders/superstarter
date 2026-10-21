import { Array as Arr, Option, Result } from "effect"
import * as ts from "typescript/unstable/ast"
import type { Checker, Type } from "typescript/unstable/sync"
import type { LintRule, RuleContext, Violation } from "#scripts/dev/lint/types.ts"
import { violationAt } from "#scripts/dev/lint/violation.ts"

/** Containers whose contents change in place; their Readonly views (`ReadonlyMap`, `ReadonlySet`, `ReadonlyArray`)
 * are values. */
const MUTABLE_CONTAINERS: ReadonlyArray<string> = ["Map", "Set", "WeakMap", "WeakSet", "Array"]

/** The objects a write reaches the process through. */
const GLOBAL_OBJECTS: ReadonlyArray<string> = ["globalThis", "global"]

/** The reflective APIs that write a property by name. */
const REFLECTIVE_WRITERS: ReadonlyMap<string, ReadonlyArray<string>> = new Map([
	["Object", ["assign", "defineProperty", "defineProperties"]],
	["Reflect", ["set", "defineProperty"]]
])

const SUGGESTION =
	"Pass the value in, make it a readonly constant, or hold state that outlives one run in a Ref inside a Layer of the one web runtime."

const isAmbient = (statement: ts.VariableStatement): boolean =>
	Arr.some(
		statement.modifiers === undefined ? [] : statement.modifiers,
		(modifier) => modifier.kind === ts.SyntaxKind.DeclareKeyword
	)

const bindingKindOf = (statement: ts.VariableStatement): "let" | "var" | "const" => {
	const flags = statement.declarationList.flags
	if ((flags & ts.NodeFlags.Let) !== 0) {
		return "let"
	}
	return (flags & ts.NodeFlags.BlockScoped) === 0 ? "var" : "const"
}

/** The globals a file declares itself, in `declare global { var name: … }`: the process anchor's module. */
const declaredGlobalsOf = (sourceFile: ts.SourceFile): ReadonlyArray<string> =>
	Arr.flatMap(sourceFile.statements, (statement) => {
		if (
			!ts.isModuleDeclaration(statement) ||
			!ts.isIdentifier(statement.name) ||
			statement.name.text !== "global" ||
			statement.body === undefined ||
			!ts.isModuleBlock(statement.body)
		) {
			return []
		}
		return Arr.flatMap(statement.body.statements, (inner) =>
			ts.isVariableStatement(inner)
				? Arr.filterMap(inner.declarationList.declarations, (declaration) =>
						ts.isIdentifier(declaration.name)
							? Result.succeed(declaration.name.text)
							: Result.failVoid
					)
				: []
		)
	})

/** `globalThis.name` or `globalThis["name"]`: the property a write to the global object names. */
const globalPropertyOf = (target: ts.Expression): Option.Option<string> => {
	if (
		(!ts.isPropertyAccessExpression(target) && !ts.isElementAccessExpression(target)) ||
		!ts.isIdentifier(target.expression) ||
		!Arr.contains(GLOBAL_OBJECTS, target.expression.text)
	) {
		return Option.none()
	}
	if (ts.isPropertyAccessExpression(target)) {
		return Option.some(target.name.text)
	}
	const argument = target.argumentExpression
	return Option.some(ts.isStringLiteral(argument) ? argument.text : "[computed]")
}

const isAssignmentOperator = (kind: ts.SyntaxKind): boolean =>
	kind >= ts.SyntaxKind.FirstAssignment && kind <= ts.SyntaxKind.LastAssignment

/** The expression a statement writes: an assignment's left side, an increment's operand, a delete's target. */
const writtenTargetOf = (node: ts.Node): ts.Expression | undefined => {
	if (ts.isBinaryExpression(node) && isAssignmentOperator(node.operatorToken.kind)) {
		return node.left
	}
	if (
		(ts.isPrefixUnaryExpression(node) || ts.isPostfixUnaryExpression(node)) &&
		(node.operator === ts.SyntaxKind.PlusPlusToken ||
			node.operator === ts.SyntaxKind.MinusMinusToken)
	) {
		return node.operand
	}
	return ts.isDeleteExpression(node) ? node.expression : undefined
}

/** `Object.assign(globalThis, …)`, `Object.defineProperty(globalThis, …)`, `Reflect.set(globalThis, …)`: a write
 * whose property names no declaration can be checked against. */
const isReflectiveGlobalWrite = (node: ts.Node): node is ts.CallExpression => {
	if (!ts.isCallExpression(node) || !ts.isPropertyAccessExpression(node.expression)) {
		return false
	}
	const callee = node.expression
	const methods = ts.isIdentifier(callee.expression)
		? REFLECTIVE_WRITERS.get(callee.expression.text)
		: undefined
	const reflective = methods !== undefined && Arr.contains(methods, callee.name.text)
	const [first] = node.arguments
	return (
		reflective &&
		first !== undefined &&
		ts.isIdentifier(first) &&
		Arr.contains(GLOBAL_OBJECTS, first.text)
	)
}

/**
 * A module holds no state that every request of the process shares. It refuses a module-level `let` or `var`, a
 * module-level constant whose type (by the checker) is a mutable container, and a write to the global object
 * unless the same file declares that global in `declare global`. There is one such declaration in the
 * application: the web runtime's anchor. See rules/no-module-state.md.
 */
/** The mutable container a type holds, a union member included: a `Map`, `Set`, `WeakMap`, `WeakSet`, array or
 * tuple that is not readonly. */
const mutableContainerOf = (checker: Checker, type: Type): Option.Option<string> =>
	Arr.findFirst(type.isUnionType() ? type.getTypes() : [type], (member) => {
		const name = member.getSymbol()?.name
		if (name !== undefined && Arr.contains(MUTABLE_CONTAINERS, name)) {
			return Option.some(name)
		}
		if (!checker.isTupleType(member) || !member.isTypeReference()) {
			return Option.none()
		}
		const target = member.getTarget()
		return target.isTupleType() && !target.readonly ? Option.some("tuple") : Option.none()
	})

/** What a module-level declaration holds that every run shares: a reassignable binding, or a constant's mutable
 * container. */
const sharedStateOf = (
	context: RuleContext,
	kind: "let" | "var" | "const",
	declaration: ts.VariableDeclaration
): Option.Option<string> => {
	if (kind !== "const") {
		return Option.some(`Module-level '${kind}' is state shared by every run in the process.`)
	}
	const type = context.semantics.typeAt(declaration.name)
	const container =
		type === undefined ? Option.none<string>() : mutableContainerOf(context.checker, type)
	return Option.map(
		container,
		(held) => `Module-level constant holds a mutable ${held}, shared by every run in the process.`
	)
}

/** Every module-level binding that holds shared state, ambient declarations aside. */
const moduleBindingsOf = (
	context: RuleContext
): ReadonlyArray<Readonly<{ node: ts.Node; message: string }>> =>
	Arr.flatMap(context.sourceFile.statements, (statement) => {
		if (!ts.isVariableStatement(statement) || isAmbient(statement)) {
			return []
		}
		const kind = bindingKindOf(statement)
		return Arr.filterMap(statement.declarationList.declarations, (declaration) =>
			Option.match(sharedStateOf(context, kind, declaration), {
				onNone: () => Result.failVoid,
				onSome: (message) => Result.succeed({ node: declaration.name, message })
			})
		)
	})

/**
 * A module holds no state that every request of the process shares. It refuses a module-level `let` or `var`, a
 * module-level constant whose type (by the checker) is a mutable container, and a write to the global object
 * unless the same file declares that global in `declare global`. There is one such declaration in the
 * application: the web runtime's anchor. See rules/no-module-state.md.
 */
export const noModuleState: LintRule = (context: RuleContext) => {
	const { sourceFile } = context
	const violations: Array<Violation> = []
	const declaredGlobals = declaredGlobalsOf(sourceFile)

	const report = (input: Readonly<{ node: ts.Node; message: string }>): void => {
		violations.push(
			violationAt({
				sourceFile,
				node: input.node,
				rule: "no-module-state",
				message: input.message,
				suggestion: SUGGESTION
			})
		)
	}

	for (const binding of moduleBindingsOf(context)) {
		report(binding)
	}

	const walk = (node: ts.Node): void => {
		const target = writtenTargetOf(node)
		const property = target === undefined ? Option.none<string>() : globalPropertyOf(target)
		if (Option.isSome(property) && !Arr.contains(declaredGlobals, property.value)) {
			report({
				node,
				message: `Write to the global object's '${property.value}', which this module does not declare in \`declare global\`.`
			})
		}
		if (isReflectiveGlobalWrite(node)) {
			report({
				node,
				message: "Reflective write to the global object; its property cannot be checked."
			})
		}
		node.forEachChild(walk)
	}

	walk(sourceFile)
	return violations
}
