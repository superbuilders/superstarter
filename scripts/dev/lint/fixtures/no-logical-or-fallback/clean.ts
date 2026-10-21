export const isEmpty = (title: string, max: number): boolean => {
	if (title.length === 0 || title.length > max) {
		return true
	}
	return false
}

export const either = (left: boolean, right: boolean): boolean => {
	return left || right
}
