const LIMITS: ReadonlyMap<string, number> = new Map([["max", 10]])

const NAMES: ReadonlyArray<string> = ["a", "b"]

const PAIR = [0, 0] as const

declare global {
	var fixtureAnchor: number | undefined
}

export const anchor = (): number => {
	globalThis.fixtureAnchor = 1
	return (LIMITS.get("max") === undefined ? 0 : 1) + NAMES.length + PAIR[0]
}

export const local = (): number => {
	const scratch = new Map<string, number>()
	scratch.set("a", 1)
	return scratch.size
}
