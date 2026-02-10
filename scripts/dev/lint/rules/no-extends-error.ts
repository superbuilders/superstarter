import type { Violation } from "@scripts/dev/lint/types"
import * as ts from "typescript"

/**
 * Check if a heritage clause extends Error.
 */
function extendsError(clause: ts.HeritageClause): boolean {
	if (clause.token !== ts.SyntaxKind.ExtendsKeyword) {
		return false
	}

	for (const type of clause.types) {
		const expr = type.expression
		if (ts.isIdentifier(expr) && expr.text === "Error") {
			return true
		}
	}

	return false
}

/**
 * Get the class name from a class declaration or expression.
 */
function getClassName(node: ts.ClassDeclaration | ts.ClassExpression): string {
	if (ts.isClassDeclaration(node) && node.name) {
		return node.name.text
	}
	return "(anonymous)"
}

/**
 * Check a class node for extends Error and record violation if found.
 */
function checkClassExtendsError(
	node: ts.ClassDeclaration | ts.ClassExpression,
	sourceFile: ts.SourceFile,
	violations: Violation[]
): void {
	const heritage = node.heritageClauses
	if (!heritage) {
		return
	}

	for (const clause of heritage) {
		if (!extendsError(clause)) {
			continue
		}

		const { line, character } = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile))
		const name = getClassName(node)
		violations.push({
			file: sourceFile.fileName,
			line: line + 1,
			column: character + 1,
			rule: "no-extends-error",
			message: `Class '${name}' extends Error. Use errors.new() sentinel pattern instead.`,
			suggestion:
				"Replace with: export const Err" +
				name.replace(/Error$/, "") +
				' = errors.new("error message")'
		})
	}
}

/**
 * Detects classes that extend Error. Use errors.new() sentinel pattern instead.
 * Custom error classes are banned - define error constants with errors.new().
 *
 * BAD:  class MyError extends Error { ... }
 * GOOD: export const ErrMyError = errors.new("my error")
 */
function check(sourceFile: ts.SourceFile): Violation[] {
	const violations: Violation[] = []

	function walk(node: ts.Node): void {
		if (ts.isClassDeclaration(node) || ts.isClassExpression(node)) {
			checkClassExtendsError(node, sourceFile, violations)
		}

		ts.forEachChild(node, walk)
	}

	walk(sourceFile)
	return violations
}

export { check }
