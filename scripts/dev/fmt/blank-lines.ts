import { Array as Arr, Option, Order, Result, String as Str } from "effect"
import * as ts from "typescript/unstable/ast"
import { applyEdits } from "#scripts/dev/fmt/edits.ts"
import type { BlankLineBound, BlankLineViolation } from "#scripts/dev/fmt/types.ts"
import type { SyntaxSource } from "#scripts/dev/shared/native-syntax.ts"

const NONE: BlankLineBound = { kind: "at-most", blankLines: 0 }
const AT_MOST_ONE: BlankLineBound = { kind: "at-most", blankLines: 1 }
const AT_LEAST_ONE: BlankLineBound = { kind: "at-least", blankLines: 1 }

const byStart = Order.mapInput(Order.Number, (violation: BlankLineViolation) => violation.start)

/** A gap between two nodes holds only trivia. Split on its comments, its even pieces are the whitespace runs
 * between them and its odd pieces the comments themselves, so a line inside a block comment is never blank. */
const COMMENT = /(\/\/[^\n]*|\/\*[\s\S]*?\*\/)/

const piecesOf = (gap: string): ReadonlyArray<string> => Str.split(COMMENT)(gap)

const isRun = (index: number): boolean => index % 2 === 0

/** A whitespace run with n line breaks holds n - 1 blank lines. */
const blankLinesOf = (run: string): number => Math.max(0, Str.split("\n")(run).length - 2)

const runBlankLines = (gap: string): ReadonlyArray<number> =>
	Arr.filterMap(piecesOf(gap), (piece, index) =>
		isRun(index) ? Result.succeed(blankLinesOf(piece)) : Result.failVoid
	)

/** An at-most bound holds for every run on its own, since a comment ends a run of blank lines; an at-least bound
 * counts the whole gap. */
const measuredBlankLines = (gap: string, bound: BlankLineBound): number => {
	const runs = runBlankLines(gap)
	return bound.kind === "at-most"
		? Arr.reduce(runs, 0, (widest, run) => Math.max(widest, run))
		: Arr.reduce(runs, 0, (total, run) => total + run)
}

const breaks = (bound: BlankLineBound, blankLines: number): boolean =>
	bound.kind === "at-most" ? blankLines > bound.blankLines : blankLines < bound.blankLines

/** The run with `blankLines` blank lines, keeping the indentation of the line that follows it. */
const runWith = (run: string, blankLines: number): string =>
	`${Str.repeat(blankLines + 1)("\n")}${Arr.lastNonEmpty(Str.split("\n")(run))}`

const hasLineBreak = (piece: string, index: number): boolean =>
	isRun(index) && Str.includes("\n")(piece)

/** The gap with its runs brought within the bound. Comments stay as they are: at most trims every run that holds
 * too many; at least widens the first run that breaks a line, right after the previous node. */
const gapWithin = (gap: string, bound: BlankLineBound): string => {
	const pieces = piecesOf(gap)
	if (bound.kind === "at-most") {
		return Arr.join(
			Arr.map(pieces, (piece, index) =>
				hasLineBreak(piece, index)
					? runWith(piece, Math.min(blankLinesOf(piece), bound.blankLines))
					: piece
			),
			""
		)
	}
	const first = Arr.findFirstIndex(pieces, hasLineBreak)
	return Arr.join(
		Arr.map(pieces, (piece, index) =>
			Option.contains(first, index)
				? runWith(piece, Math.max(blankLinesOf(piece), bound.blankLines))
				: piece
		),
		""
	)
}

const isStringDirective = (node: ts.Node): boolean =>
	ts.isExpressionStatement(node) && ts.isStringLiteral(node.expression)

const isFunctionBody = (block: ts.Block): boolean => {
	const parent = block.parent
	return (
		ts.isFunctionDeclaration(parent) ||
		ts.isFunctionExpression(parent) ||
		ts.isArrowFunction(parent) ||
		ts.isMethodDeclaration(parent) ||
		ts.isConstructorDeclaration(parent) ||
		ts.isGetAccessorDeclaration(parent) ||
		ts.isSetAccessorDeclaration(parent)
	)
}

/**
 * Blank-line rules ported from gofumpt:
 * - no blank lines in an empty block, at the start or end of a function body, or around a block's lone statement,
 *   except a blank line after a multiline if, for or while condition;
 * - at most one blank line between statements inside a block;
 * - a blank line between consecutive multiline top-level statements, only ever added;
 * - a blank line after a file's string directives ("use client", "use server");
 * - no blank lines between JSX children.
 */
export const findBlankLineViolations = (
	source: SyntaxSource
): ReadonlyArray<BlankLineViolation> => {
	const { sourceFile, text, file } = source
	const violations: Array<BlankLineViolation> = []

	const lineOf = (position: number): number =>
		sourceFile.getLineAndCharacterOfPosition(position).line + 1

	const checkGap = (
		gap: Readonly<{
			start: number
			end: number
			bound: BlankLineBound
		}>
	): void => {
		const blankLines = measuredBlankLines(Str.slice(gap.start, gap.end)(text), gap.bound)
		if (!breaks(gap.bound, blankLines)) {
			return
		}
		violations.push({
			file,
			line: lineOf(gap.start),
			currentBlankLines: blankLines,
			bound: gap.bound,
			start: gap.start,
			end: gap.end
		})
	}

	const isMultiline = (node: ts.Node): boolean =>
		lineOf(node.getStart(sourceFile)) < lineOf(node.getEnd() - 1)

	const processTopLevelStatements = (statements: ts.NodeArray<ts.Statement>): void => {
		let previousMultiline = false
		let inDirectivePrologue = true
		for (const [index, current] of statements.entries()) {
			const directive = isStringDirective(current)
			if (!directive) {
				inDirectivePrologue = false
			}
			const previous = index > 0 ? statements[index - 1] : undefined
			const afterDirectives = previous !== undefined && isStringDirective(previous) && !directive
			const betweenMultiline = !inDirectivePrologue && previousMultiline && isMultiline(current)
			if (previous !== undefined && (afterDirectives || betweenMultiline)) {
				checkGap({
					start: previous.getEnd(),
					end: current.getStart(sourceFile),
					bound: AT_LEAST_ONE
				})
			}
			previousMultiline = isMultiline(current)
		}
	}

	const processBlockStatements = (statements: ts.NodeArray<ts.Statement>): void => {
		for (const [index, current] of statements.entries()) {
			const previous = index > 0 ? statements[index - 1] : undefined
			if (previous !== undefined) {
				checkGap({
					start: previous.getEnd(),
					end: current.getStart(sourceFile),
					bound: AT_MOST_ONE
				})
			}
		}
	}

	const isConditionMultiline = (node: ts.Expression): boolean =>
		lineOf(node.getStart(sourceFile)) !== lineOf(node.getEnd())

	const hasMultilineParentCondition = (block: ts.Block): boolean => {
		const parent = block.parent
		if (ts.isIfStatement(parent) || ts.isWhileStatement(parent)) {
			return isConditionMultiline(parent.expression)
		}
		return (
			ts.isForStatement(parent) &&
			parent.condition !== undefined &&
			isConditionMultiline(parent.condition)
		)
	}

	const checkBlockBoundaries = (block: ts.Block): void => {
		const statements = block.statements
		const openBrace = block.getStart(sourceFile)
		const closeBrace = block.getEnd() - 1
		const first = statements[0]
		const last = statements[statements.length - 1]
		if (first === undefined || last === undefined) {
			checkGap({ start: openBrace + 1, end: closeBrace, bound: NONE })
			return
		}
		if (statements.length !== 1 && !isFunctionBody(block)) {
			return
		}
		if (!hasMultilineParentCondition(block)) {
			checkGap({
				start: openBrace + 1,
				end: first.getStart(sourceFile),
				bound: NONE
			})
		}
		checkGap({ start: last.getEnd(), end: closeBrace, bound: NONE })
	}

	const checkJsxChildren = (children: ts.NodeArray<ts.JsxChild>): void => {
		const significant = Arr.filter(
			children,
			(child) => !(ts.isJsxText(child) && Str.isEmpty(Str.trim(child.getText(sourceFile))))
		)
		for (const [index, current] of significant.entries()) {
			const previous = index > 0 ? significant[index - 1] : undefined
			if (previous !== undefined) {
				checkGap({
					start: previous.getEnd(),
					end: current.getStart(sourceFile),
					bound: NONE
				})
			}
		}
	}

	const walk = (node: ts.Node): void => {
		if (ts.isSourceFile(node) || ts.isModuleBlock(node)) {
			processTopLevelStatements(node.statements)
		}
		if (ts.isBlock(node)) {
			checkBlockBoundaries(node)
			processBlockStatements(node.statements)
		}
		if (ts.isCaseClause(node) || ts.isDefaultClause(node)) {
			processBlockStatements(node.statements)
		}
		if (ts.isJsxElement(node) || ts.isJsxFragment(node)) {
			checkJsxChildren(node.children)
		}
		node.forEachChild(walk)
	}

	walk(sourceFile)
	return Arr.sort(violations, byStart)
}

/** Rewrites each violating gap's whitespace within its bound; its comments stay. */
export const normalizeBlankLines = (
	input: Readonly<{ text: string; violations: ReadonlyArray<BlankLineViolation> }>
): string =>
	applyEdits<BlankLineViolation>({
		text: input.text,
		edits: Arr.filter(input.violations, (violation) =>
			Str.includes("\n")(Str.slice(violation.start, violation.end)(input.text))
		),
		replacementOf: (violation) =>
			gapWithin(Str.slice(violation.start, violation.end)(input.text), violation.bound)
	})
