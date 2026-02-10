import * as ts from "typescript"

function getScriptKind(filePath: string): ts.ScriptKind {
	if (filePath.endsWith(".tsx")) {
		return ts.ScriptKind.TSX
	}
	if (filePath.endsWith(".jsx")) {
		return ts.ScriptKind.JSX
	}
	if (filePath.endsWith(".ts")) {
		return ts.ScriptKind.TS
	}
	return ts.ScriptKind.JS
}

function getLineAndColumn(sourceText: string, position: number): { line: number; column: number } {
	let line = 1
	let column = 1
	for (let i = 0; i < position && i < sourceText.length; i++) {
		if (sourceText[i] === "\n") {
			line++
			column = 1
		} else {
			column++
		}
	}
	return { line, column }
}

function sortByStartAsc(a: { start: number }, b: { start: number }): number {
	return a.start - b.start
}

function sortByStartDescTop(a: { start: number }, b: { start: number }): number {
	return b.start - a.start
}

export { getLineAndColumn, getScriptKind, sortByStartAsc, sortByStartDescTop }
