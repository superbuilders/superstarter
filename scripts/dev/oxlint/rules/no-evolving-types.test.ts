import { ruleTester } from "#scripts/dev/oxlint/rule-tester.ts"
import { noEvolvingTypes } from "#scripts/dev/oxlint/rules/no-evolving-types.ts"

const ts = { filename: "evolving.ts" }

ruleTester.run("no-evolving-types", noEvolvingTypes, {
	valid: [
		{ ...ts, code: "const rows: number[] = []" },
		{ ...ts, code: "let held: string | null = null" }
	],
	invalid: [
		{ ...ts, code: "const rows = []", errors: [{ message: /may evolve implicitly to any/ }] },
		{ ...ts, code: "let held = null", errors: [{ message: /may evolve implicitly to any/ }] }
	]
})
