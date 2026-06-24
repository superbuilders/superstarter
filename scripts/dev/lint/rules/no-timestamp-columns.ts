import type { Violation } from "@scripts/dev/lint/types"
import * as ts from "typescript"

const BANNED_FACTORIES = new Set<string>(["timestamp", "date", "time", "interval"])
const DRIZZLE_PG_CORE = "drizzle-orm/pg-core"

function isDrizzlePgCoreImport(statement: ts.Statement): statement is ts.ImportDeclaration {
	if (!ts.isImportDeclaration(statement)) {
		return false
	}
	const moduleSpecifier = statement.moduleSpecifier
	if (!ts.isStringLiteral(moduleSpecifier)) {
		return false
	}
	return moduleSpecifier.text === DRIZZLE_PG_CORE
}

function collectBannedFromNamedImports(namedImports: ts.NamedImports, out: Set<string>): void {
	for (const element of namedImports.elements) {
		const importedName = element.propertyName ? element.propertyName.text : element.name.text
		if (BANNED_FACTORIES.has(importedName)) {
			out.add(element.name.text)
		}
	}
}

function getBannedImportNames(sourceFile: ts.SourceFile): Set<string> {
	const bannedLocal = new Set<string>()
	for (const statement of sourceFile.statements) {
		if (!isDrizzlePgCoreImport(statement)) {
			continue
		}
		const namedBindings = statement.importClause?.namedBindings
		if (!namedBindings || !ts.isNamedImports(namedBindings)) {
			continue
		}
		collectBannedFromNamedImports(namedBindings, bannedLocal)
	}
	return bannedLocal
}

function check(sourceFile: ts.SourceFile): Violation[] {
	const violations: Violation[] = []
	const bannedLocal = getBannedImportNames(sourceFile)
	if (bannedLocal.size === 0) {
		return violations
	}

	function walk(node: ts.Node): void {
		if (ts.isCallExpression(node) && ts.isIdentifier(node.expression)) {
			const name = node.expression.text
			if (bannedLocal.has(name)) {
				const { line, character } = sourceFile.getLineAndCharacterOfPosition(
					node.expression.getStart(sourceFile)
				)
				violations.push({
					file: sourceFile.fileName,
					line: line + 1,
					column: character + 1,
					rule: "no-timestamp-columns",
					message: `Drizzle column factory '${name}(…)' is banned. Tables must use UUIDv7 primary keys (uuid().default(sql\`uuidv7()\`)) and recover creation order from the id via timestampFromUuidv7(). No exceptions.`,
					suggestion:
						"Drop the column. If you need a separate event time, model it as a UUIDv7-keyed ledger row, not a time-shaped column. See rules/no-timestamp-columns.md."
				})
			}
		}
		ts.forEachChild(node, walk)
	}

	walk(sourceFile)
	return violations
}

export { check }
