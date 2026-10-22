import { ruleTester } from "#scripts/dev/oxlint/rule-tester.ts"
import { noNewError } from "#scripts/dev/oxlint/rules/no-new-error.ts"

ruleTester.run("no-new-error", noNewError, {
	valid: ["const failure = TodoNotFound.make({ id })"],
	invalid: [
		{ code: 'throw new Error("gone")', errors: [{ message: /^Constructing Error/ }] },
		{ code: 'const failure = Error("gone")', errors: [{ message: /^Constructing Error/ }] }
	]
})
