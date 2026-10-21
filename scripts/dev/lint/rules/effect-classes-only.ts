import { Array as Arr, Option, Record } from "effect"
import * as ts from "typescript/unstable/ast"
import { declaringModuleOf, packageOfSymbol } from "#scripts/dev/lint/packages.ts"
import type { LintRule, Violation } from "#scripts/dev/lint/types.ts"
import { violationAt } from "#scripts/dev/lint/violation.ts"

/** The factories Effect declares types with, by the module of `effect` that exports them: Schema classes and
 * errors, Context services, and every Data class. */
const EFFECT_CLASS_FACTORIES: Readonly<Record<string, ReadonlyArray<string> | "any">> = {
	schema: ["TaggedError", "TaggedClass", "Class", "Opaque", "Error", "ErrorClass"],
	context: ["Service"],
	data: "any"
}

/** `Schema.TaggedError<Self>()("Tag", {...})` and `Data.TaggedError("Tag")<{...}>` both reduce to a member access. */
const heritageFactoryOf = (expression: ts.Expression): ts.PropertyAccessExpression | undefined => {
	let current = expression
	while (ts.isCallExpression(current) || ts.isExpressionWithTypeArguments(current)) {
		current = current.expression
	}
	return ts.isPropertyAccessExpression(current) ? current : undefined
}

const admits = (allowed: ReadonlyArray<string> | "any", name: string): boolean => {
	if (allowed === "any") {
		return true
	}
	return Arr.contains(allowed, name)
}

const extendedOf = (node: ts.ClassDeclaration | ts.ClassExpression): ts.Expression | undefined => {
	const clause = Arr.findFirst(
		node.heritageClauses === undefined ? [] : node.heritageClauses,
		(heritage) => heritage.token === ts.SyntaxKind.ExtendsKeyword
	)
	return Option.isSome(clause) ? clause.value.types[0] : undefined
}

/**
 * Effect owns the classes a module declares. A class is one of Effect's class idioms (a Schema class or error, a
 * Context service, a Data class), resolved through the checker to its `effect` export, so a renamed import neither
 * hides one nor fakes one; behaviour is module functions. See rules/effect-classes-only.md.
 */
export const effectClassesOnly: LintRule = ({ sourceFile, semantics }) => {
	const violations: Array<Violation> = []

	const isEffectClassFactory = (factory: ts.PropertyAccessExpression): boolean => {
		const member = semantics.symbolAt(factory.name)
		if (member === undefined) {
			return false
		}
		const resolved = semantics.aliasTarget(member)
		if (packageOfSymbol(resolved) !== "effect") {
			return false
		}
		const members = Option.flatMap(declaringModuleOf(resolved), (module) =>
			Record.get(EFFECT_CLASS_FACTORIES, module)
		)
		return Option.match(members, {
			onNone: () => false,
			onSome: (allowed) => admits(allowed, factory.name.text)
		})
	}

	const checkClass = (node: ts.ClassDeclaration | ts.ClassExpression): void => {
		const extended = extendedOf(node)
		const factory = extended === undefined ? undefined : heritageFactoryOf(extended)
		if (factory !== undefined && isEffectClassFactory(factory)) {
			return
		}
		const name =
			ts.isClassDeclaration(node) && node.name !== undefined ? node.name.text : "(anonymous)"
		violations.push(
			violationAt({
				sourceFile,
				node,
				rule: "effect-classes-only",
				message: `Class '${name}' is not an Effect class.`,
				suggestion:
					"Declare data as a Schema class or Schema.TaggedError, a swappable dependency as a Context.Service, and behaviour as module functions."
			})
		)
	}

	const walk = (node: ts.Node): void => {
		if (ts.isClassDeclaration(node) || ts.isClassExpression(node)) {
			checkClass(node)
		}
		node.forEachChild(walk)
	}

	walk(sourceFile)
	return violations
}
