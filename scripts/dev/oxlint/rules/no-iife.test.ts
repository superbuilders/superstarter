import { ruleTester } from "#scripts/dev/oxlint/rule-tester.ts"
import { noIife } from "#scripts/dev/oxlint/rules/no-iife.ts"

ruleTester.run("no-iife", noIife, {
	valid: ["const compute = () => 1\ncompute()"],
	invalid: [
		{ code: "const value = (() => 1)()", errors: [{ message: /^IIFE usage is disallowed/ }] },
		{ code: "(function () {})()", errors: [{ message: /^IIFE usage is disallowed/ }] }
	]
})
