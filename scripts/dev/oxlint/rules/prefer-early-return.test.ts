import { ruleTester } from "#scripts/dev/oxlint/rule-tester.ts"
import { preferEarlyReturn } from "#scripts/dev/oxlint/rules/prefer-early-return.ts"

const ts = { filename: "early-return.ts" }

const WRAPPED = `import { Effect } from "effect"

export const total = (values: ReadonlyArray<number>, report: (value: number) => void): void => {
	const start = 0
	if (values.length > 0) {
		const doubled = values.length * 2
		const halved = doubled / 2
		report(start + halved)
	}
}

export const sum = (values: ReadonlyArray<number>): number => {
	let result = 0
	for (const value of values) {
		if (value > 0) {
			const squared = value * value
			const shifted = squared + 1
			result += shifted
		}
	}
	return result
}

export const program = Effect.gen(function* () {
	const ready = yield* Effect.succeed(true)
	if (ready) {
		const first = yield* Effect.succeed(1)
		const second = yield* Effect.succeed(2)
		yield* Effect.log(first + second)
	}
})
`

const EARLY = `export const total = (values: ReadonlyArray<number>, enabled: boolean): number => {
	if (!enabled) {
		return 0
	}
	const doubled = values.length * 2
	const halved = doubled / 2
	return halved
}

export const sum = (values: ReadonlyArray<number>): number => {
	let result = 0
	for (const value of values) {
		if (value <= 0) {
			continue
		}
		result += value
	}
	return result
}

export const short = (flag: boolean): number => {
	if (flag) {
		return 1
	}
	return 0
}
`

const FUNCTION = /^Function body is wrapped in a single conditional\./
const LOOP = /^Loop body is wrapped in a single conditional\./

ruleTester.run("prefer-early-return", preferEarlyReturn, {
	valid: [
		{ ...ts, code: EARLY },
		{
			...ts,
			code: "export const kept = (a: boolean) => {\n\tif (a) {\n\t\tf()\n\t\tg()\n\t\th()\n\t} else {\n\t\ti()\n\t}\n}"
		}
	],
	invalid: [
		{
			...ts,
			code: WRAPPED,
			errors: [
				{ message: FUNCTION, line: 5 },
				{ message: LOOP, line: 15 },
				{ message: FUNCTION, line: 26 }
			]
		}
	]
})
