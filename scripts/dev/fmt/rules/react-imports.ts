import type { ReactImportCollection, ReactImportViolation } from "@scripts/dev/fmt/types"
import { getScriptKind, sortByStartDescTop } from "@scripts/dev/shared/ts-utils"
import * as ts from "typescript"

/**
 * Detects React imports that don't use the namespace import pattern.
 *
 * CORRECT: import * as React from "react"
 * WRONG: import { useState, useEffect } from "react"
 * WRONG: import React from "react"
 */
function isReactImport(statement: ts.ImportDeclaration): boolean {
	const moduleSpecifier = statement.moduleSpecifier
	if (!ts.isStringLiteral(moduleSpecifier)) {
		return false
	}
	return moduleSpecifier.text === "react"
}

function isNamespaceReactImport(importClause: ts.ImportClause): boolean {
	if (!importClause.namedBindings) {
		return false
	}
	return ts.isNamespaceImport(importClause.namedBindings)
}

function collectNamedImportsFromClause(importClause: ts.ImportClause): string[] {
	const namedImports: string[] = []
	if (importClause.name) {
		namedImports.push(importClause.name.text)
	}
	if (importClause.namedBindings && ts.isNamedImports(importClause.namedBindings)) {
		for (const element of importClause.namedBindings.elements) {
			namedImports.push(element.name.text)
		}
	}
	return namedImports
}

function findReactImportViolations(file: string, content: string): ReactImportViolation[] {
	const violations: ReactImportViolation[] = []
	const scriptKind = getScriptKind(file)
	const sourceFile = ts.createSourceFile(file, content, ts.ScriptTarget.Latest, true, scriptKind)

	for (const statement of sourceFile.statements) {
		if (!ts.isImportDeclaration(statement)) {
			continue
		}
		if (!isReactImport(statement)) {
			continue
		}
		const importClause = statement.importClause
		if (!importClause) {
			continue
		}
		if (isNamespaceReactImport(importClause)) {
			continue
		}
		const namedImports = collectNamedImportsFromClause(importClause)
		if (namedImports.length === 0) {
			continue
		}
		const { line } = sourceFile.getLineAndCharacterOfPosition(statement.getStart())
		violations.push({
			file,
			line: line + 1,
			importText: statement.getText(sourceFile),
			namedImports
		})
	}

	return violations
}

/**
 * Fixes React imports to use namespace pattern and updates all usages.
 *
 * Changes: import { useState, useEffect } from "react"
 * To: import * as React from "react"
 * And updates: useState() -> React.useState()
 */

function collectImportNamesToFix(
	importClause: ts.ImportClause,
	importsToFix: Map<string, string>
): void {
	if (importClause.name) {
		if (importClause.name.text !== "React") {
			importsToFix.set(importClause.name.text, importClause.name.text)
		}
	}
	if (importClause.namedBindings && ts.isNamedImports(importClause.namedBindings)) {
		for (const element of importClause.namedBindings.elements) {
			const localName = element.name.text
			const hasAlias = element.propertyName !== undefined
			const originalName = hasAlias ? element.propertyName.text : element.name.text
			importsToFix.set(localName, originalName)
		}
	}
}

function collectReactImports(sourceFile: ts.SourceFile, content: string): ReactImportCollection {
	const importsToFix = new Map<string, string>()
	let hasNamespaceImport = false
	const importRangesToRemove: Array<{ start: number; end: number }> = []

	for (const statement of sourceFile.statements) {
		if (!ts.isImportDeclaration(statement)) {
			continue
		}
		if (!isReactImport(statement)) {
			continue
		}
		const importClause = statement.importClause
		if (!importClause) {
			continue
		}
		if (isNamespaceReactImport(importClause)) {
			hasNamespaceImport = true
			continue
		}
		if (statement.importClause?.isTypeOnly) {
			continue
		}
		collectImportNamesToFix(importClause, importsToFix)
		let start = statement.getStart()
		let end = statement.getEnd()
		if (content[end] === "\n") {
			end++
		}
		importRangesToRemove.push({ start, end })
	}

	return { importsToFix, hasNamespaceImport, importRangesToRemove }
}

function isImportContext(parent: ts.Node): boolean {
	if (ts.isImportSpecifier(parent)) {
		return true
	}
	if (ts.isImportClause(parent)) {
		return true
	}
	return false
}

function isNameOfParent(parent: ts.Node, node: ts.Node): boolean {
	if (ts.isVariableDeclaration(parent)) {
		return parent.name === node
	}
	if (ts.isParameter(parent)) {
		return parent.name === node
	}
	if (ts.isFunctionDeclaration(parent)) {
		return parent.name === node
	}
	if (ts.isPropertyAssignment(parent)) {
		return parent.name === node
	}
	if (ts.isShorthandPropertyAssignment(parent)) {
		return parent.name === node
	}
	if (ts.isBindingElement(parent)) {
		return parent.name === node
	}
	if (ts.isPropertySignature(parent)) {
		return parent.name === node
	}
	if (ts.isMethodDeclaration(parent)) {
		return parent.name === node
	}
	return false
}

function isLabelOfParent(parent: ts.Node, node: ts.Node): boolean {
	if (ts.isLabeledStatement(parent)) {
		return parent.label === node
	}
	return false
}

function isDeclarationContext(node: ts.Node): boolean {
	const parent = node.parent
	if (isImportContext(parent)) {
		return true
	}
	if (ts.isTypeReferenceNode(parent)) {
		return true
	}
	if (isNameOfParent(parent, node)) {
		return true
	}
	return isLabelOfParent(parent, node)
}

function findNamespaceInsertPosition(
	sourceFile: ts.SourceFile,
	importRangesToRemove: Array<{ start: number; end: number }>,
	result: string
): number {
	let insertPos = 0
	for (const statement of sourceFile.statements) {
		if (!ts.isExpressionStatement(statement)) {
			break
		}
		if (!ts.isStringLiteral(statement.expression)) {
			break
		}
		insertPos = statement.getEnd()
		for (const removal of importRangesToRemove) {
			if (removal.end <= statement.getEnd()) {
				insertPos -= removal.end - removal.start
			}
		}
		if (result[insertPos] === "\n") {
			insertPos++
		}
	}
	return insertPos
}

function applyReactImportFixes(content: string, file: string): string {
	const scriptKind = getScriptKind(file)
	const sourceFile = ts.createSourceFile(file, content, ts.ScriptTarget.Latest, true, scriptKind)

	const collection = collectReactImports(sourceFile, content)
	if (collection.importsToFix.size === 0 && collection.importRangesToRemove.length === 0) {
		return content
	}

	const replacements: Array<{ start: number; end: number; text: string }> = []

	function walk(node: ts.Node): void {
		if (!ts.isIdentifier(node)) {
			ts.forEachChild(node, walk)
			return
		}
		const localName = node.text
		const originalName = collection.importsToFix.get(localName)
		if (originalName === undefined) {
			ts.forEachChild(node, walk)
			return
		}
		if (isDeclarationContext(node)) {
			ts.forEachChild(node, walk)
			return
		}
		const parent = node.parent
		if (ts.isPropertyAccessExpression(parent) && parent.name === node) {
			ts.forEachChild(node, walk)
			return
		}
		replacements.push({
			start: node.getStart(),
			end: node.getEnd(),
			text: `React.${originalName}`
		})
		ts.forEachChild(node, walk)
	}

	walk(sourceFile)

	const allChanges = [
		...replacements,
		...collection.importRangesToRemove.map((r) => ({ ...r, text: "" }))
	]
	allChanges.sort(sortByStartDescTop)

	let result = content
	for (const change of allChanges) {
		result = result.slice(0, change.start) + change.text + result.slice(change.end)
	}

	if (!collection.hasNamespaceImport && collection.importsToFix.size > 0) {
		const insertPos = findNamespaceInsertPosition(
			sourceFile,
			collection.importRangesToRemove,
			result
		)
		const importStatement = 'import * as React from "react"\n'
		result = result.slice(0, insertPos) + importStatement + result.slice(insertPos)
	}

	return result
}

export { applyReactImportFixes, findReactImportViolations }
