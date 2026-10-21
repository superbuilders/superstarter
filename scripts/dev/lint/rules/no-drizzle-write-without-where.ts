import { Array as Arr } from "effect"
import * as ts from "typescript/unstable/ast"
import { isDrizzleMethodCall } from "#scripts/dev/lint/drizzle.ts"
import type { LintRule, Violation } from "#scripts/dev/lint/types.ts"
import { violationAt } from "#scripts/dev/lint/violation.ts"

const WRITES: ReadonlySet<string> = new Set(["delete", "update"])

/** The methods chained onto a call, in order: `database.update(t).set(v).where(c)` chains `set`, then `where`. */
const chainedMethodsOf = (call: ts.CallExpression): ReadonlyArray<string> => {
	const methods: Array<string> = []
	let current: ts.Expression = call
	while (
		ts.isPropertyAccessExpression(current.parent) &&
		ts.isCallExpression(current.parent.parent) &&
		current.parent.parent.expression === current.parent
	) {
		methods.push(current.parent.name.text)
		current = current.parent.parent
	}
	return methods
}

/**
 * A Drizzle `delete` or `update` chains a `.where(…)` in the same expression: without one it changes every row of
 * the table. The builder is recognised by the type its method resolves to, whatever the receiver is named.
 */
export const noDrizzleWriteWithoutWhere: LintRule = ({ sourceFile, semantics }) => {
	const violations: Array<Violation> = []

	const walk = (node: ts.Node): void => {
		const call = { semantics, node, names: WRITES }
		if (isDrizzleMethodCall(call) && !Arr.contains(chainedMethodsOf(call.node), "where")) {
			const method = call.node.expression.name.text
			violations.push(
				violationAt({
					sourceFile,
					node: call.node.expression.name,
					rule: "no-drizzle-write-without-where",
					message: `Drizzle \`.${method}()\` without \`.where()\` ${method === "delete" ? "deletes" : "updates"} every row of the table.`,
					suggestion: `Chain \`.where(…)\` onto the \`.${method}()\` in the same expression.`
				})
			)
		}
		node.forEachChild(walk)
	}

	walk(sourceFile)
	return violations
}
