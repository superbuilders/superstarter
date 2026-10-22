import { String as Str } from "effect"
import * as ts from "typescript/unstable/ast"
import type { Semantics } from "#scripts/dev/shared/semantic.ts"

/** `receiver.method(…)`: the call shape of a Drizzle query-builder step. */
export type MethodCall = ts.CallExpression & Readonly<{ expression: ts.PropertyAccessExpression }>

/**
 * True for `receiver.<one of names>(…)` when drizzle-orm declares the method, whatever the receiver is named: the
 * checker resolves the method through the receiver's type, so a scope's `database`, a `db` and a `tx` all count.
 */
export const isDrizzleMethodCall = (
	input: Readonly<{ semantics: Semantics; node: ts.Node; names: ReadonlySet<string> }>
): input is typeof input & Readonly<{ node: MethodCall }> => {
	const { node, semantics } = input
	if (
		!ts.isCallExpression(node) ||
		!ts.isPropertyAccessExpression(node.expression) ||
		!input.names.has(node.expression.name.text)
	) {
		return false
	}
	const symbol = semantics.symbolAt(node.expression.name)
	if (symbol === undefined) {
		return false
	}
	const file = semantics.aliasTarget(symbol).declarations[0]?.path
	return file !== undefined && Str.includes("/node_modules/drizzle-orm/")(file)
}
