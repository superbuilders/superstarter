function isAllowedComment(text: string): boolean {
	const trimmed = text.trim()
	if (trimmed.startsWith("#!")) {
		return true
	}
	if (trimmed.startsWith("/**")) {
		return true
	}
	if (text.includes("biome-ignore")) {
		return true
	}
	if (text.includes("@ts-ignore")) {
		return true
	}
	if (text.includes("@ts-expect-error")) {
		return true
	}
	return false
}

function findLineStart(text: string, pos: number): number {
	let lineStart = pos
	while (lineStart > 0 && text[lineStart - 1] !== "\n") {
		lineStart--
	}
	return lineStart
}

function findLineEnd(text: string, pos: number): number {
	let lineEnd = pos
	while (lineEnd < text.length && text[lineEnd] !== "\n") {
		lineEnd++
	}
	return lineEnd
}

function computeRemovalRange(
	text: string,
	commentStart: number,
	commentEnd: number
): { start: number; end: number } {
	const lineStart = findLineStart(text, commentStart)
	const lineEnd = findLineEnd(text, commentEnd)
	const beforeComment = text.slice(lineStart, commentStart)
	const afterComment = text.slice(commentEnd, lineEnd)
	const isOnlyThingOnLine = beforeComment.trim() === "" && afterComment.trim() === ""
	if (isOnlyThingOnLine) {
		const adjustedEnd = lineEnd < text.length && text[lineEnd] === "\n" ? lineEnd + 1 : lineEnd
		return { start: lineStart, end: adjustedEnd }
	}
	if (beforeComment.trim() === "") {
		return { start: lineStart, end: commentEnd }
	}
	let spaceStart = commentStart
	while (
		spaceStart > lineStart &&
		(text[spaceStart - 1] === " " || text[spaceStart - 1] === "\t")
	) {
		spaceStart--
	}
	return { start: spaceStart, end: commentEnd }
}

export { computeRemovalRange, findLineEnd, findLineStart, isAllowedComment }
