import { Effect } from "effect"

export const total = (values: ReadonlyArray<number>, report: (value: number) => void): void => {
	const start = 0
	if (values.length > 0) { // violation
		const doubled = values.length * 2
		const halved = doubled / 2
		report(start + halved)
	}
}

export const sum = (values: ReadonlyArray<number>): number => {
	let result = 0
	for (const value of values) {
		if (value > 0) { // violation
			const squared = value * value
			const shifted = squared + 1
			result += shifted
		}
	}
	return result
}

export const program = Effect.gen(function* () {
	const ready = yield* Effect.succeed(true)
	if (ready) { // violation
		const first = yield* Effect.succeed(1)
		const second = yield* Effect.succeed(2)
		yield* Effect.log(first + second)
	}
})
