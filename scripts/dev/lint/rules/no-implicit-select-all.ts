import { Array as Arr, Predicate } from "effect"
import * as ts from "typescript/unstable/ast"
import { isDrizzleMethodCall, type MethodCall } from "#scripts/dev/lint/drizzle.ts"
import type { LintRule, Violation } from "#scripts/dev/lint/types.ts"
import { violationAt } from "#scripts/dev/lint/violation.ts"

/** Each column-taking builder method, with how many arguments come before its column object. */
const COLUMN_POSITIONS: ReadonlyMap<string, number> = new Map([
	["select", 0],
	["selectDistinct", 0],
	["selectDistinctOn", 1],
	["returning", 0]
])

/** The relational query methods, which read every column unless their config names `columns`. */
const FINDERS: ReadonlySet<string> = new Set(["findMany", "findFirst"])

const METHODS: ReadonlySet<string> = new Set([...COLUMN_POSITIONS.keys(), ...FINDERS])

/** A config literal that names `columns`, or spreads another object that may. */
const mayNameColumns = (config: ts.ObjectLiteralExpression): boolean =>
	Arr.some(config.properties, (property) => {
		if (ts.isSpreadAssignment(property)) {
			return true
		}
		return (
			Predicate.or(ts.isPropertyAssignment, ts.isShorthandPropertyAssignment)(property) &&
			ts.isIdentifier(property.name) &&
			property.name.text === "columns"
		)
	})

const omitsColumns = (call: MethodCall): boolean => {
	const position = COLUMN_POSITIONS.get(call.expression.name.text)
	if (position !== undefined) {
		return call.arguments.length <= position
	}
	const [config] = call.arguments
	if (config === undefined) {
		return true
	}
	return ts.isObjectLiteralExpression(config) && !mayNameColumns(config)
}

const messageOf = (method: string): string => {
	if (method === "returning") {
		return "Implicit `.returning()` with no column object returns every column. Return only what the code uses, almost always `{ id: table.id }`."
	}
	if (FINDERS.has(method)) {
		return `\`${method}\` without \`columns\` reads every column. Name the columns the code uses: \`columns: { id: true }\`.`
	}
	return `Implicit \`${method}()\` with no column object reads every column. Name the columns the code uses: \`.${method}({ id: table.id })\`.`
}

/**
 * Every Drizzle select, returning and relational find names its columns. The builder is recognised by the type its
 * method resolves to, not by a receiver name, so a query scope's `database` is checked like `db` and `tx`. See
 * rules/no-implicit-select-all.md.
 */
export const noImplicitSelectAll: LintRule = ({ sourceFile, semantics }) => {
	const violations: Array<Violation> = []

	const walk = (node: ts.Node): void => {
		const call = { semantics, node, names: METHODS }
		if (isDrizzleMethodCall(call) && omitsColumns(call.node)) {
			violations.push(
				violationAt({
					sourceFile,
					node: call.node.expression.name,
					rule: "no-implicit-select-all",
					message: messageOf(call.node.expression.name.text),
					suggestion: "See rules/no-implicit-select-all.md."
				})
			)
		}
		node.forEachChild(walk)
	}

	walk(sourceFile)
	return violations
}
