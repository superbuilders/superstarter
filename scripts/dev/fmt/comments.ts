import { Array as Arr, Option, Order, String as Str } from "effect"
import * as ts from "typescript/unstable/ast"
import { applyEdits } from "#scripts/dev/fmt/edits.ts"
import type { CommentRemoval, TextEdit } from "#scripts/dev/fmt/types.ts"
import type { SyntaxSource } from "#scripts/dev/shared/native-syntax.ts"

/** The comments a tool reads. Every other comment but JSDoc is stripped. */
const DIRECTIVES: ReadonlyArray<string> = [
	"@effect-diagnostics",
	"oxlint-disable",
	"oxlint-enable",
	"fallow-ignore"
]

const byStart = Order.mapInput(Order.Number, (span: TextEdit) => span.start)

const isKept = (comment: string): boolean => {
	if (Str.startsWith("/**")(comment) && comment !== "/**/") {
		return true
	}
	if (Str.startsWith("/// <reference")(comment)) {
		return true
	}
	return Arr.some(DIRECTIVES, (directive) => Str.includes(directive)(comment))
}

/** Tokens whose text may spell `//` or `/*` without being a comment. */
const isLiteral = (node: ts.Node): boolean => {
	if (
		ts.isStringLiteral(node) ||
		ts.isNoSubstitutionTemplateLiteral(node) ||
		ts.isRegularExpressionLiteral(node)
	) {
		return true
	}
	return ts.isTemplateHead(node) || ts.isTemplateMiddle(node) || ts.isTemplateTail(node)
}

type Syntax = Readonly<{
	literals: ReadonlyArray<TextEdit>
	emptyExpressions: ReadonlyArray<TextEdit>
}>

/** The literal spans the scan steps over, and the JSX expressions that hold nothing but comments. JSX text
 * starts at its own position: it has no leading trivia to skip. */
const syntaxOf = (sourceFile: ts.SourceFile): Syntax => {
	const literals: Array<TextEdit> = []
	const emptyExpressions: Array<TextEdit> = []
	const walk = (node: ts.Node): void => {
		if (ts.isJsxText(node)) {
			literals.push({ start: node.pos, end: node.end })
			return
		}
		if (isLiteral(node)) {
			literals.push({ start: node.getStart(sourceFile), end: node.end })
			return
		}
		if (ts.isJsxExpression(node) && node.expression === undefined) {
			emptyExpressions.push({ start: node.getStart(sourceFile), end: node.end })
		}
		node.forEachChild(walk)
	}
	walk(sourceFile)
	return { literals: Arr.sort(literals, byStart), emptyExpressions }
}

/** The end of the comment that starts at `start`: a line comment runs to its line break, a block comment
 * through its closing `*\/`. */
const commentEndOf = (text: string, start: number): number => {
	const rest = Str.slice(start)(text)
	if (Str.startsWith("//")(rest)) {
		return Option.match(Str.indexOf("\n")(rest), {
			onNone: () => text.length,
			onSome: (offset) => start + offset
		})
	}
	return Option.match(Str.indexOf("*/")(Str.slice(2)(rest)), {
		onNone: () => text.length,
		onSome: (offset) => start + 2 + offset + 2
	})
}

/** Every comment in the text: each `//` or `/*` that no literal token contains. */
const commentsOf = (text: string, literals: ReadonlyArray<TextEdit>): ReadonlyArray<TextEdit> => {
	const comments: Array<TextEdit> = []
	let next = 0
	let index = 0
	while (index < text.length) {
		const literal = literals[next]
		if (literal !== undefined && index >= literal.start) {
			index = Math.max(index, literal.end)
			next += 1
			continue
		}
		const opener = Str.slice(index, index + 2)(text)
		if (opener === "//" || opener === "/*") {
			const end = commentEndOf(text, index)
			comments.push({ start: index, end })
			index = end
			continue
		}
		index += 1
	}
	return comments
}

const isBlank = (text: string): boolean => Str.isEmpty(Str.trim(text))

const lineStartOf = (text: string, position: number): number =>
	Option.match(Str.lastIndexOf("\n")(Str.slice(0, position)(text)), {
		onNone: () => 0,
		onSome: (offset) => offset + 1
	})

const lineEndOf = (text: string, position: number): number =>
	Option.match(Str.indexOf("\n")(Str.slice(position)(text)), {
		onNone: () => text.length,
		onSome: (offset) => position + offset
	})

/** What deleting a comment takes with it: its whole line when nothing else is on it, the spaces before it
 * when it trails code, the spaces after it when code follows, and one space between code on both sides. */
const removalOf = (text: string, span: TextEdit): TextEdit => {
	const lineStart = lineStartOf(text, span.start)
	const lineEnd = lineEndOf(text, span.end)
	const before = Str.slice(lineStart, span.start)(text)
	const after = Str.slice(span.end, lineEnd)(text)
	if (isBlank(before) && isBlank(after)) {
		return { start: lineStart, end: Math.min(lineEnd + 1, text.length) }
	}
	if (isBlank(after)) {
		return { start: lineStart + Str.trimEnd(before).length, end: span.end }
	}
	if (isBlank(before)) {
		return { start: span.start, end: span.end + (after.length - Str.trimStart(after).length) }
	}
	const spaced = Str.endsWith(" ")(before) && Str.startsWith(" ")(after)
	return { start: span.start, end: spaced ? span.end + 1 : span.end }
}

/** Every comment but JSDoc and tool directives, with the text its deletion takes. A JSX expression that
 * holds only comments goes whole. */
export const findStrippableComments = (source: SyntaxSource): ReadonlyArray<CommentRemoval> => {
	const { sourceFile, text, file } = source
	const syntax = syntaxOf(sourceFile)
	const stripped = Arr.filter(
		commentsOf(text, syntax.literals),
		(comment) => !isKept(Str.slice(comment.start, comment.end)(text))
	)
	const removals = Arr.map(stripped, (comment) => {
		const enclosing = Arr.findFirst(
			syntax.emptyExpressions,
			(expression) => expression.start <= comment.start && comment.end <= expression.end
		)
		const target = Option.getOrElse(enclosing, () => comment)
		const removal = removalOf(text, target)
		return {
			file,
			line: sourceFile.getLineAndCharacterOfPosition(comment.start).line + 1,
			start: removal.start,
			end: removal.end
		}
	})
	return Arr.sort(
		Arr.dedupeWith(removals, (left, right) => left.start === right.start),
		byStart
	)
}

/** Deletes each removal's text. Overlapping removals land on the next pass. */
export const stripComments = (
	input: Readonly<{ text: string; removals: ReadonlyArray<CommentRemoval> }>
): string =>
	applyEdits<CommentRemoval>({ text: input.text, edits: input.removals, replacementOf: () => "" })
