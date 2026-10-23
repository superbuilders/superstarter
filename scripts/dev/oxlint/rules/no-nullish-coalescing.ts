import type { CreateRule } from "#scripts/dev/oxlint/rule.ts"

const NULLISH_MESSAGE =
	"Nullish coalescing (??) is banned. A ternary is the same problem. Find out why the value can be missing and fix the source."

export const noNullishCoalescing: CreateRule = {
	meta: { type: "problem" },
	create: (context) => ({
		LogicalExpression: (node) => {
			if (node.operator === "??") {
				context.report({ node, message: NULLISH_MESSAGE })
			}
		},
		AssignmentExpression: (node) => {
			if (node.operator === "??=") {
				context.report({ node, message: NULLISH_MESSAGE })
			}
		}
	})
}
