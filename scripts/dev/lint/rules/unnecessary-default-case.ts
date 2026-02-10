import type { Violation } from "@scripts/dev/lint/types"
import * as ts from "typescript"

function check(sourceFile: ts.SourceFile, checker: ts.TypeChecker): Violation[] {
	const violations: Violation[] = []

	function checkSwitchStatement(node: ts.SwitchStatement): void {
		const exprType = checker.getTypeAtLocation(node.expression)

		if (!exprType.isUnion()) {
			return
		}

		const unionTypes = exprType.types
		const handledTypes = new Set<string>()
		let defaultClause: ts.DefaultClause | null = null

		for (const clause of node.caseBlock.clauses) {
			if (ts.isDefaultClause(clause)) {
				defaultClause = clause
			} else if (clause.expression) {
				const caseType = checker.getTypeAtLocation(clause.expression)
				handledTypes.add(checker.typeToString(caseType))
			}
		}

		if (!defaultClause) {
			return
		}

		function isUnhandled(t: string): boolean {
			return !handledTypes.has(t)
		}

		const missingTypes = unionTypes.map((t) => checker.typeToString(t)).filter(isUnhandled)

		if (missingTypes.length > 0) {
			return
		}

		const { line, character } = sourceFile.getLineAndCharacterOfPosition(
			defaultClause.getStart(sourceFile)
		)
		violations.push({
			file: sourceFile.fileName,
			line: line + 1,
			column: character + 1,
			rule: "no-unnecessary-default-case",
			message: `Unnecessary default case. Switch is already exhaustive over all ${unionTypes.length} union members.`,
			suggestion: "Remove the unreachable default clause"
		})
	}

	function walk(node: ts.Node): void {
		if (ts.isSwitchStatement(node)) {
			checkSwitchStatement(node)
		}
		ts.forEachChild(node, walk)
	}

	walk(sourceFile)
	return violations
}

export { check }
