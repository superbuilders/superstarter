import { repositoryFile, ruleTester } from "#scripts/dev/oxlint/rule-tester.ts"
import { noLiteralAttributeKey } from "#scripts/dev/oxlint/rules/no-literal-attribute-key.ts"

const application = { filename: repositoryFile("packages/product/nextjs-app/src/server/todos.ts") }
const telemetry = {
	filename: repositoryFile("packages/platform/operational-telemetry/src/effect.ts")
}

ruleTester.run("no-literal-attribute-key", noLiteralAttributeKey, {
	valid: [
		{ ...application, code: 'span.attribute("http.request.method", method)' },
		{ ...telemetry, code: 'span.attribute("superstarter.todo.id", id)' }
	],
	invalid: [
		{
			...application,
			code: 'span.attribute("superstarter.todo.id", id)',
			errors: [{ message: /^Span attributes go through observed or annotateOperation/ }]
		}
	]
})
