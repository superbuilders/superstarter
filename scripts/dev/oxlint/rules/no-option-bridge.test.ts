import { ruleTester } from "#scripts/dev/oxlint/rule-tester.ts"
import { noOptionBridge } from "#scripts/dev/oxlint/rules/no-option-bridge.ts"

const barrel = 'import { Option } from "effect"\n'

ruleTester.run("no-option-bridge", noOptionBridge, {
	valid: [
		`${barrel}const label = Option.match(found, { onNone: () => "none", onSome: (todo) => todo.title })`,
		`${barrel}const present = Option.isSome(Arr.findFirst(todos, isDone))`,
		`${barrel}const count = Option.getOrElse(found, () => 0)`,
		`${barrel}const text = Option.getOrElse(found, () => "")`,
		`${barrel}const other = Thing.getOrUndefined(found)`,
		"const Option = { getOrUndefined: (x) => x }\nconst value = Option.getOrUndefined(found)"
	],
	invalid: [
		{
			code: `${barrel}const todo = Option.getOrUndefined(found)`,
			errors: [{ message: /^An Option is bridged/ }]
		},
		{
			code: `${barrel}const todo = Option.getOrNull(found)`,
			errors: [{ message: /^An Option is bridged/ }]
		},
		{
			code: `${barrel}const todo = found.pipe(Option.getOrUndefined)`,
			errors: [{ message: /^An Option is bridged/ }]
		},
		{
			code: 'import { Option as O } from "effect"\nconst todo = O.getOrUndefined(found)',
			errors: [{ message: /^An Option is bridged/ }]
		},
		{
			code: `${barrel}const index = Option.getOrElse(Arr.findFirstIndex(todos, isDone), () => -1)`,
			errors: [{ message: /^An Option is bridged/ }]
		},
		{
			code: `${barrel}const code = Option.getOrElse(Str.charCodeAt(text, 0), () => Number.NaN)`,
			errors: [{ message: /^An Option is bridged/ }]
		},
		{
			code: `${barrel}const code = Option.getOrElse(found, () => { return NaN })`,
			errors: [{ message: /^An Option is bridged/ }]
		},
		{
			code: `${barrel}const todo = Option.getOrElse(found, () => undefined)`,
			errors: [{ message: /^An Option is bridged/ }]
		},
		{
			code: `${barrel}const todo = found.pipe(Option.getOrElse(() => null))`,
			errors: [{ message: /^An Option is bridged/ }]
		},
		{
			code: 'import * as O from "effect/Option"\nconst todo = O.getOrElse(found, () => void 0)',
			errors: [{ message: /^An Option is bridged/ }]
		},
		{
			code: 'import { getOrUndefined } from "effect/Option"',
			errors: [{ message: /^An Option is bridged/ }]
		}
	]
})
