import { type CreateRule, docs } from "#scripts/dev/oxlint/rule.ts"

const NEW_ERROR_MESSAGE = `Constructing Error is disallowed. Define a Schema.TaggedError class (its tag equals its name) and fail with \`yield* Failure.make({ ... })\` or \`Effect.fail(...)\`, so the failure is typed and can be handled with Effect.catchTag. ${docs("no-new-error")}`

export const noNewError: CreateRule = {
	meta: { type: "problem" },
	create: (context) => ({
		NewExpression: (node) => {
			if (node.callee.type === "Identifier" && node.callee.name === "Error") {
				context.report({ node, message: NEW_ERROR_MESSAGE })
			}
		},
		CallExpression: (node) => {
			if (node.callee.type === "Identifier" && node.callee.name === "Error") {
				context.report({ node, message: NEW_ERROR_MESSAGE })
			}
		}
	})
}
