import type { CommentViolation } from "@scripts/dev/fmt/types"
import { computeRemovalRange, isAllowedComment } from "@scripts/dev/fmt/utils"
import {
	getLineAndColumn,
	getScriptKind,
	sortByStartAsc,
	sortByStartDescTop
} from "@scripts/dev/shared/ts-utils"
import * as ts from "typescript"

function findViolatingComments(filePath: string, sourceText: string): CommentViolation[] {
	const violations: CommentViolation[] = []
	const scriptKind = getScriptKind(filePath)
	const sourceFile = ts.createSourceFile(
		filePath,
		sourceText,
		ts.ScriptTarget.Latest,
		true,
		scriptKind
	)
	const commentRanges: Array<{
		pos: number
		end: number
		kind: ts.SyntaxKind
	}> = []
	const jsxCommentExpressions: Array<{
		pos: number
		end: number
		commentText: string
	}> = []
	function collectCommentRanges(node: ts.Node) {
		const leading = ts.getLeadingCommentRanges(sourceText, node.getFullStart())
		if (leading) {
			for (const range of leading) {
				commentRanges.push({
					pos: range.pos,
					end: range.end,
					kind: range.kind
				})
			}
		}
		const trailing = ts.getTrailingCommentRanges(sourceText, node.getEnd())
		if (trailing) {
			for (const range of trailing) {
				commentRanges.push({
					pos: range.pos,
					end: range.end,
					kind: range.kind
				})
			}
		}
	}
	function isJsxCommentExpression(innerText: string): boolean {
		if (innerText.startsWith("/*") && innerText.endsWith("*/")) {
			return true
		}
		return innerText.startsWith("//")
	}
	function scanForComments(node: ts.Node) {
		collectCommentRanges(node)
		if (ts.isJsxExpression(node)) {
			const exprText = sourceText.slice(node.pos, node.end)
			const innerText = exprText.slice(1, -1).trim()
			if (isJsxCommentExpression(innerText)) {
				jsxCommentExpressions.push({
					pos: node.pos,
					end: node.end,
					commentText: innerText
				})
			}
		}
		ts.forEachChild(node, scanForComments)
	}
	const fileLeading = ts.getLeadingCommentRanges(sourceText, 0)
	if (fileLeading) {
		for (const range of fileLeading) {
			commentRanges.push({ pos: range.pos, end: range.end, kind: range.kind })
		}
	}
	scanForComments(sourceFile)
	const seen = new Set<string>()
	function isUniqueRange(r: { pos: number; end: number; kind: ts.SyntaxKind }): boolean {
		const key = `${r.pos}:${r.end}`
		if (seen.has(key)) {
			return false
		}
		seen.add(key)
		return true
	}
	const uniqueRanges = commentRanges.filter(isUniqueRange)
	for (const range of uniqueRanges) {
		const commentText = sourceText.slice(range.pos, range.end)
		if (!isAllowedComment(commentText)) {
			const { line, column } = getLineAndColumn(sourceText, range.pos)
			violations.push({
				file: filePath,
				line,
				column,
				text: commentText,
				start: range.pos,
				end: range.end
			})
		}
	}
	for (const jsx of jsxCommentExpressions) {
		if (!isAllowedComment(jsx.commentText)) {
			const fullText = sourceText.slice(jsx.pos, jsx.end)
			const { line, column } = getLineAndColumn(sourceText, jsx.pos)
			violations.push({
				file: filePath,
				line,
				column,
				text: fullText,
				start: jsx.pos,
				end: jsx.end
			})
		}
	}
	violations.sort(sortByStartAsc)
	return violations
}

function removeComments(sourceText: string, violations: CommentViolation[]): string {
	if (violations.length === 0) {
		return sourceText
	}

	const ranges: Array<{ start: number; end: number }> = []
	for (const v of violations) {
		ranges.push(computeRemovalRange(sourceText, v.start, v.end))
	}

	ranges.sort(sortByStartDescTop)

	let result = sourceText
	for (const range of ranges) {
		result = result.slice(0, range.start) + result.slice(range.end)
	}
	return result
}

export { findViolatingComments, removeComments }
