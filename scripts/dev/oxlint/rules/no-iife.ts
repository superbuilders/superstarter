import type { CreateRule } from "#scripts/dev/oxlint/rule.ts"

export const noIife: CreateRule = {
	meta: { type: "problem" },
	create: (context) => ({
		CallExpression: (node) => {
			if (
				node.callee.type === "FunctionExpression" ||
				node.callee.type === "ArrowFunctionExpression"
			) {
				context.report({
					node,
					message:
						"IIFE usage is disallowed. Define a named function and call it, or restructure the code so it needs no function."
				})
			}
		}
	})
}
