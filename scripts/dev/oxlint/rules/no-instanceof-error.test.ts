import { ruleTester } from "#scripts/dev/oxlint/rule-tester.ts"
import { noInstanceofError } from "#scripts/dev/oxlint/rules/no-instanceof-error.ts"

ruleTester.run("no-instanceof-error", noInstanceofError, {
	valid: ["const dated = value instanceof Date"],
	invalid: [
		{
			code: "const failed = value instanceof Error",
			errors: [{ message: /^instanceof Error is banned/ }]
		}
	]
})
