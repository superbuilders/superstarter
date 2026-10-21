const compute = (value: number): number => value * 2

const doubled = (value: number): number => compute(value) // violation

function wrapped(): string { // violation
	return "fixed"
}

export const run = (value: number): string => `${doubled(value)} ${wrapped()}`

export const shadowed = (value: number): number => {
	const helper = (input: number): number => compute(input) // violation
	const outer = (helper: number): number => helper + 1
	return outer(helper(value))
}
