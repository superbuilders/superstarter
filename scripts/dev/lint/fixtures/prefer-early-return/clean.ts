export const total = (values: ReadonlyArray<number>, enabled: boolean): number => {
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
