import type { Violation } from "@scripts/dev/style/types"
import * as ts from "typescript"

/**
 * Detects duplicate data-slot values across different files.
 * Each data-slot value should be unique to avoid CSS selector collisions.
 *
 * Duplicates within the same file are allowed - these are typically
 * variant components serving the same role (e.g., InputGroupInput and
 * InputGroupTextarea both using data-slot="input-group-control").
 *
 * BAD:  Two components in different files using data-slot="button"
 * GOOD: Each file has unique data-slot values
 * GOOD: Sibling components in same file sharing a slot (variants)
 */
function check(sourceFiles: ts.SourceFile[]): Violation[] {
	const slotUsages = new Map<string, SlotUsage[]>()

	for (const sourceFile of sourceFiles) {
		collectSlotUsages(sourceFile, slotUsages)
	}

	return findCrossFileDuplicates(slotUsages)
}

function findCrossFileDuplicates(slotUsages: Map<string, SlotUsage[]>): Violation[] {
	const violations: Violation[] = []

	for (const [slotValue, usages] of slotUsages) {
		if (usages.length <= 1) continue

		const byFile = groupByFile(usages)
		if (byFile.size <= 1) continue

		const duplicateViolations = createViolationsForDuplicates(slotValue, byFile)
		violations.push(...duplicateViolations)
	}

	return violations
}

function groupByFile(usages: SlotUsage[]): Map<string, SlotUsage[]> {
	const byFile = new Map<string, SlotUsage[]>()

	for (const usage of usages) {
		const existing = byFile.get(usage.file)
		if (existing) {
			existing.push(usage)
		} else {
			byFile.set(usage.file, [usage])
		}
	}

	return byFile
}

function createViolationsForDuplicates(
	slotValue: string,
	byFile: Map<string, SlotUsage[]>
): Violation[] {
	const violations: Violation[] = []
	const files = Array.from(byFile.entries())

	const firstFile = files[0]
	if (!firstFile) return violations

	const firstUsage = firstFile[1][0]
	if (!firstUsage) return violations

	for (let i = 1; i < files.length; i++) {
		const fileEntry = files[i]
		if (!fileEntry) continue

		for (const usage of fileEntry[1]) {
			violations.push({
				file: usage.file,
				line: usage.line,
				column: usage.column,
				rule: "no-duplicate-data-slot",
				message: `Duplicate data-slot="${slotValue}". Already defined in ${firstUsage.file}:${firstUsage.line}.`,
				componentName: usage.componentName
			})
		}
	}

	return violations
}

interface SlotUsage {
	file: string
	line: number
	column: number
	componentName: string
}

function collectSlotUsages(sourceFile: ts.SourceFile, slotUsages: Map<string, SlotUsage[]>): void {
	if (!sourceFile.fileName.includes("src/components")) {
		return
	}

	let currentComponentName = ""

	function walk(node: ts.Node): void {
		updateCurrentComponent(node)
		checkForDataSlot(node, sourceFile, slotUsages, currentComponentName)
		ts.forEachChild(node, walk)
	}

	function updateCurrentComponent(node: ts.Node): void {
		if (ts.isFunctionDeclaration(node) && node.name) {
			currentComponentName = node.name.text
		}
		if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name)) {
			if (
				node.initializer &&
				(ts.isArrowFunction(node.initializer) || ts.isFunctionExpression(node.initializer))
			) {
				currentComponentName = node.name.text
			}
		}
	}

	walk(sourceFile)
}

function checkForDataSlot(
	node: ts.Node,
	sourceFile: ts.SourceFile,
	slotUsages: Map<string, SlotUsage[]>,
	componentName: string
): void {
	if (ts.isJsxElement(node)) {
		checkJsxAttributes(node.openingElement.attributes, sourceFile, slotUsages, componentName)
	}
	if (ts.isJsxSelfClosingElement(node)) {
		checkJsxAttributes(node.attributes, sourceFile, slotUsages, componentName)
	}
}

function checkJsxAttributes(
	attributes: ts.JsxAttributes,
	sourceFile: ts.SourceFile,
	slotUsages: Map<string, SlotUsage[]>,
	componentName: string
): void {
	for (const attr of attributes.properties) {
		if (!ts.isJsxAttribute(attr)) continue
		if (!ts.isIdentifier(attr.name)) continue
		if (attr.name.text !== "data-slot") continue

		const slotValue = getAttributeStringValue(attr)
		if (!slotValue) continue

		addSlotUsage(slotUsages, slotValue, attr, sourceFile, componentName)
	}
}

function addSlotUsage(
	slotUsages: Map<string, SlotUsage[]>,
	slotValue: string,
	attr: ts.JsxAttribute,
	sourceFile: ts.SourceFile,
	componentName: string
): void {
	const { line, character } = sourceFile.getLineAndCharacterOfPosition(attr.getStart(sourceFile))

	const usage: SlotUsage = {
		file: sourceFile.fileName,
		line: line + 1,
		column: character + 1,
		componentName
	}

	const usages = slotUsages.get(slotValue)
	if (usages) {
		usages.push(usage)
	} else {
		slotUsages.set(slotValue, [usage])
	}
}

function getAttributeStringValue(attr: ts.JsxAttribute): string | undefined {
	const init = attr.initializer
	if (!init) return undefined

	if (ts.isStringLiteral(init)) {
		return init.text
	}

	if (ts.isJsxExpression(init) && init.expression && ts.isStringLiteral(init.expression)) {
		return init.expression.text
	}

	return undefined
}

export { check }
