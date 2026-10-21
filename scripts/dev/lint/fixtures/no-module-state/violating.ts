let counter = 0 // violation

var legacy = 1 // violation

const cache = new Map<string, number>() // violation

const pending: Array<string> = [] // violation

const pair: [number, number] = [0, 0] // violation

export const touch = (): number => {
	globalThis.undeclaredSlot = counter // violation
	return legacy + cache.size + pending.length + pair[0]
}

export const reflect = (): void => {
	Object.assign(globalThis, { other: 1 }) // violation
}

