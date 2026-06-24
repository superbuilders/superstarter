import type { Violation } from "@scripts/dev/lint/types"
import * as ts from "typescript"

function chainStartsWithUuidCall(expr: ts.Expression): boolean {
	let current: ts.Expression = expr
	while (ts.isCallExpression(current) || ts.isPropertyAccessExpression(current)) {
		if (ts.isCallExpression(current)) {
			current = current.expression
			continue
		}
		current = current.expression
	}
	if (!ts.isIdentifier(current)) {
		return false
	}
	return current.text === "uuid"
}

function check(sourceFile: ts.SourceFile): Violation[] {
	const violations: Violation[] = []

	function walk(node: ts.Node): void {
		if (
			ts.isCallExpression(node) &&
			ts.isPropertyAccessExpression(node.expression) &&
			node.expression.name.text === "defaultRandom"
		) {
			const receiver = node.expression.expression
			if (chainStartsWithUuidCall(receiver)) {
				const { line, character } = sourceFile.getLineAndCharacterOfPosition(
					node.expression.name.getStart(sourceFile)
				)
				violations.push({
					file: sourceFile.fileName,
					line: line + 1,
					column: character + 1,
					rule: "no-uuid-default-random",
					message:
						"uuid().defaultRandom() generates UUIDv4 (random, not time-sortable). Use .default(sql`uuidv7()`) for the PG18 native UUIDv7. No exceptions.",
					suggestion:
						"Replace .defaultRandom() with .default(sql`uuidv7()`). See rules/no-uuid-default-random.md."
				})
			}
		}
		ts.forEachChild(node, walk)
	}

	walk(sourceFile)
	return violations
}

export { check }
