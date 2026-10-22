import { type CreateRule, docs } from "#scripts/dev/oxlint/rule.ts"

export const noInstanceofError: CreateRule = {
	meta: { type: "problem" },
	create: (context) => ({
		BinaryExpression: (node) => {
			if (
				node.operator === "instanceof" &&
				node.right.type === "Identifier" &&
				node.right.name === "Error"
			) {
				context.report({
					node,
					message: `instanceof Error is banned. Failures are Schema.TaggedError values: recognise one with Schema.is(Failure) or handle it with Effect.catchTag("Failure", ...). ${docs("no-instanceof-error")}`
				})
			}
		}
	})
}
