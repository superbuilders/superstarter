import type { Violation } from "@scripts/dev/lint/types"
import * as ts from "typescript"

/**
 * Detects arrow functions used as variable declarations or class properties.
 * These should be named function declarations for better stack traces.
 * Arrow functions as callbacks or inline arguments are allowed.
 *
 * BAD:  const foo = () => doThing()
 * BAD:  class Foo { bar = () => {} }
 * GOOD: function foo() { doThing() }
 * GOOD: items.map(x => x.id)  // callbacks are fine
 * GOOD: onClick={() => setOpen(true)}  // inline handlers are fine
 */
function check(sourceFile: ts.SourceFile): Violation[] {
	const violations: Violation[] = []

	function walk(node: ts.Node): void {
		if (
			ts.isVariableDeclaration(node) &&
			node.initializer &&
			ts.isArrowFunction(node.initializer)
		) {
			const { line, character } = sourceFile.getLineAndCharacterOfPosition(
				node.getStart(sourceFile)
			)
			const name = node.name.getText(sourceFile)
			violations.push({
				file: sourceFile.fileName,
				line: line + 1,
				column: character + 1,
				rule: "no-arrow-functions",
				message: `Arrow function assigned to variable '${name}'. Use a function declaration instead.`,
				suggestion: `Convert to: function ${name}() { ... }`
			})
		}

		if (
			ts.isPropertyDeclaration(node) &&
			node.initializer &&
			ts.isArrowFunction(node.initializer)
		) {
			const { line, character } = sourceFile.getLineAndCharacterOfPosition(
				node.getStart(sourceFile)
			)
			const name = node.name.getText(sourceFile)
			violations.push({
				file: sourceFile.fileName,
				line: line + 1,
				column: character + 1,
				rule: "no-arrow-functions",
				message: `Arrow function as class property '${name}'. Use a method declaration instead.`,
				suggestion: `Convert to: ${name}() { ... }`
			})
		}

		ts.forEachChild(node, walk)
	}

	walk(sourceFile)
	return violations
}

export { check }
