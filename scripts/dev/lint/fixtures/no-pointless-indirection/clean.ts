const compute = (value: number): number => value * 2

const shared = (value: number): number => compute(value)

export const twice = (value: number): number => shared(value) + shared(value + 1)

const isPositive = (value: number): value is number => value > 0

export const positive = (values: ReadonlyArray<number>): ReadonlyArray<number> => values.filter(isPositive)

export const exported = (value: number): number => compute(value)

const reshaped = (value: number): number => compute(value) + 1

export const used = (value: number): number => reshaped(value)
