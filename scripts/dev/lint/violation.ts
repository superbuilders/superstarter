import type * as ts from "typescript/unstable/ast"
import type { RuleId, Violation } from "#scripts/dev/lint/types.ts"

/** A violation located at a node's first token, with 1-based line and column like an editor shows them. */
export const violationAt = (
	input: Readonly<{
		sourceFile: ts.SourceFile
		node: ts.Node
		rule: RuleId
		message: string
		suggestion?: string
	}>
): Violation => {
	const { line, character } = input.sourceFile.getLineAndCharacterOfPosition(
		input.node.getStart(input.sourceFile)
	)
	const location = {
		file: input.sourceFile.fileName,
		line: line + 1,
		column: character + 1,
		rule: input.rule,
		message: input.message
	}
	return input.suggestion === undefined ? location : { ...location, suggestion: input.suggestion }
}
