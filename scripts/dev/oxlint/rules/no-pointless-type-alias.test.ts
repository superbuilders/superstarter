import { ruleTester } from "#scripts/dev/oxlint/rule-tester.ts"
import { noPointlessTypeAlias } from "#scripts/dev/oxlint/rules/no-pointless-type-alias.ts"

const ts = { filename: "alias.ts" }

const POINTLESS = /^Pointless type alias\./

ruleTester.run("no-pointless-type-alias", noPointlessTypeAlias, {
	valid: [
		{ ...ts, code: "type Pair = readonly [string, number]" },
		{ ...ts, code: "type Lookup = ReadonlyMap<string, number>" },
		{ ...ts, code: "type Point = Readonly<{ x: number; y: number }>" },
		{ ...ts, code: "export type TodoId = typeof TodoId.Type" },
		{ ...ts, code: "declare namespace NodeJS {\n\ttype Name = string\n}" }
	],
	invalid: [
		{ ...ts, code: "type Name = string", errors: [{ message: POINTLESS }] },
		{ ...ts, code: "type Flag = true", errors: [{ message: POINTLESS }] },
		{
			...ts,
			code: "interface Shape {\n\treadonly kind: string\n}\n\ntype Alias = Shape",
			errors: [{ message: POINTLESS, line: 5 }]
		},
		{ ...ts, code: "type Wrapped = (number)", errors: [{ message: POINTLESS }] }
	]
})
