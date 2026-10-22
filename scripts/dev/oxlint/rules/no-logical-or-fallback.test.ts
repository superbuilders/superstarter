import { ruleTester } from "#scripts/dev/oxlint/rule-tester.ts"
import { noLogicalOrFallback } from "#scripts/dev/oxlint/rules/no-logical-or-fallback.ts"

const ts = { filename: "fallback.ts" }

const FALLBACK = /^Logical OR \(\|\|\) banned for fallbacks\./

ruleTester.run("no-logical-or-fallback", noLogicalOrFallback, {
	valid: [
		{
			...ts,
			code: "export const isEmpty = (title: string, max: number): boolean => {\n\tif (title.length === 0 || title.length > max) {\n\t\treturn true\n\t}\n\treturn false\n}"
		},
		{
			...ts,
			code: "export const either = (left: boolean, right: boolean): boolean => {\n\treturn left || right\n}"
		},
		{ ...ts, code: "while (!(ready || done)) {\n\twait()\n}" },
		{ ...ts, code: "for (let i = 0; i < n || more; i++) {\n\tstep()\n}" }
	],
	invalid: [
		{
			...ts,
			code: "export const timeout = (configured: number): number => configured || 5000",
			errors: [{ message: FALLBACK }]
		},
		{
			...ts,
			code: "export const isStaff = (admin: boolean, moderator: boolean): boolean => admin || moderator",
			errors: [{ message: FALLBACK }]
		},
		{
			...ts,
			code: 'export const label = (admin: boolean, moderator: boolean): string => {\n\tconst staff = admin || moderator\n\treturn staff ? "Staff" : "User"\n}',
			errors: [{ message: FALLBACK, line: 2 }]
		},
		{
			...ts,
			code: 'export const role = (admin: boolean, moderator: boolean): string => (admin || moderator ? "Staff" : "User")',
			errors: [{ message: FALLBACK }]
		}
	]
})
