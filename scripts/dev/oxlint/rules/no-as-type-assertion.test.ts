import { ruleTester } from "#scripts/dev/oxlint/rule-tester.ts"
import { noAsTypeAssertion } from "#scripts/dev/oxlint/rules/no-as-type-assertion.ts"

const ts = { filename: "assertion.ts" }

ruleTester.run("no-as-type-assertion", noAsTypeAssertion, {
	valid: [
		{ ...ts, code: "const tuple = [1, 2] as const" },
		{ ...ts, code: "const element = target as HTMLElement" },
		{ ...ts, code: "const custom = event as CustomEvent<string>" }
	],
	invalid: [
		{ ...ts, code: "const count = value as number", errors: [{ message: /^Type assertions/ }] },
		{ ...ts, code: "const count = <number>value", errors: [{ message: /^Type assertions/ }] },
		{
			...ts,
			code: "const mouse = event as MouseEvent<string>",
			errors: [{ message: /^Type assertions/ }]
		},
		{
			...ts,
			code: "const text = value as unknown as string",
			errors: [{ message: /^Type assertions/ }, { message: /^Type assertions/ }]
		}
	]
})
