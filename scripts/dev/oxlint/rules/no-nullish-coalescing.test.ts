import { ruleTester } from "#scripts/dev/oxlint/rule-tester.ts"
import { noNullishCoalescing } from "#scripts/dev/oxlint/rules/no-nullish-coalescing.ts"

ruleTester.run("no-nullish-coalescing", noNullishCoalescing, {
	valid: ["const value = present ? a : b"],
	invalid: [
		{ code: "const value = a ?? b", errors: [{ message: /^Nullish coalescing/ }] },
		{ code: "value ??= b", errors: [{ message: /^Nullish coalescing/ }] }
	]
})
