import { ruleTester } from "#scripts/dev/oxlint/rule-tester.ts"
import { noUselessContinue } from "#scripts/dev/oxlint/rules/no-useless-continue.ts"

ruleTester.run("no-useless-continue", noUselessContinue, {
	valid: [
		"for (const item of items) { if (item) { continue } use(item) }",
		"outer: for (const item of items) { for (const part of item) { continue outer } }"
	],
	invalid: [
		{
			code: "for (const item of items) { use(item); continue }",
			errors: [{ message: /^This continue ends its loop body/ }]
		},
		{
			code: "while (more()) { if (ready()) { use() } else { continue } }",
			errors: [{ message: /^This continue ends its loop body/ }]
		}
	]
})
