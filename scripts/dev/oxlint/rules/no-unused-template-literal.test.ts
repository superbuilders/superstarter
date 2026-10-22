import { ruleTester } from "#scripts/dev/oxlint/rule-tester.ts"
import { noUnusedTemplateLiteral } from "#scripts/dev/oxlint/rules/no-unused-template-literal.ts"

ruleTester.run("no-unused-template-literal", noUnusedTemplateLiteral, {
	valid: [
		`const greeting = \`hello \${name}\`
`,
		"const quoted = `it's`",
		"const lines = `one\ntwo`",
		"const tagged = sql`select 1`"
	],
	invalid: [
		{ code: "const plain = `hello`", errors: [{ message: /^Unnecessary template literal/ }] }
	]
})
