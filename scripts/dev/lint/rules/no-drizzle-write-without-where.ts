import { Array as Arr } from "effect"
import * as ts from "typescript/unstable/ast"
import { isDrizzleMethodCall } from "#scripts/dev/lint/drizzle.ts"
import type { Visit } from "#scripts/dev/lint/types.ts"

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
export const noDrizzleWriteWithoutWhere: Visit =
	({ semantics }) =>
	(node) => {
		const call = { semantics, node, names: WRITES }
		if (!isDrizzleMethodCall(call) || Arr.contains(chainedMethodsOf(call.node), "where")) {
			return []
		}
		const method = call.node.expression.name.text
		return [
			{
				node: call.node.expression.name,
				message: `Drizzle \`.${method}()\` without \`.where()\` ${method === "delete" ? "deletes" : "updates"} every row of the table.`,
				suggestion: `Chain \`.where(…)\` onto the \`.${method}()\` in the same expression.`
			}
		]
	}
