import type { CreateRule } from "#scripts/dev/oxlint/rule.ts"

export const noTry: CreateRule = {
	meta: { type: "problem" },
	create: (context) => ({
		TryStatement: (node) => {
			const handles = node.handler !== null
			const cleans = node.finalizer !== null
			if (handles && cleans) {
				context.report({
					node,
					message:
						"try...catch...finally is disallowed. Capture failures with Effect.try / Effect.tryPromise (Result.try outside Effect), mapping the cause to a Schema.TaggedError, and release resources with Effect.acquireRelease inside Effect.scoped."
				})
				return
			}
			if (handles) {
				context.report({
					node,
					message:
						"try...catch is disallowed. Use Effect.try for sync code or Effect.tryPromise for async code (Result.try outside Effect), mapping the cause to a Schema.TaggedError."
				})
				return
			}
			context.report({
				node,
				message:
					"try...finally is disallowed. Acquire the resource with Effect.acquireRelease inside Effect.scoped; the release runs when the scope closes, even on failure or interruption."
			})
		}
	})
}
