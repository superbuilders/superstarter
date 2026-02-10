import type { Violation } from "@scripts/dev/lint/types"
import * as ts from "typescript"

/**
 * Detects instanceof Error checks which are unnecessary since useThrowOnlyError
 * guarantees all thrown values are Error objects.
 *
 * BAD:  if (err instanceof Error) { console.log(err.message) }
 * GOOD: console.log(err.message)  // err is guaranteed to be Error
 */
function check(sourceFile: ts.SourceFile): Violation[] {
	const violations: Violation[] = []

	function walk(node: ts.Node): void {
		if (
			ts.isBinaryExpression(node) &&
			node.operatorToken.kind === ts.SyntaxKind.InstanceOfKeyword &&
			ts.isIdentifier(node.right) &&
			node.right.text === "Error"
		) {
			const { line, character } = sourceFile.getLineAndCharacterOfPosition(
				node.getStart(sourceFile)
			)
			violations.push({
				file: sourceFile.fileName,
				line: line + 1,
				column: character + 1,
				rule: "no-instanceof-error",
				message:
					"Unnecessary instanceof Error check. useThrowOnlyError guarantees all thrown values are Error objects.",
				suggestion: "Remove the check and access .message directly"
			})
		}

		ts.forEachChild(node, walk)
	}

	walk(sourceFile)
	return violations
}

export { check }
