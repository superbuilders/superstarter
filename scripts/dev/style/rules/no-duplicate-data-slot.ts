import { Array as Arr, Predicate } from "effect"
import * as ts from "typescript/unstable/ast"
import type { SyntaxSource } from "#scripts/dev/shared/native-syntax.ts"
import { repositoryPath } from "#scripts/dev/shared/repository.ts"
import { dataSlotAttributesOf, isComponentFile } from "#scripts/dev/style/components.ts"
import type { StyleViolation } from "#scripts/dev/style/types.ts"

type SlotUsage = Readonly<{ file: string; line: number; column: number; componentName: string }>

const slotValueOf = (attribute: ts.JsxAttribute): string | undefined => {
	const initializer = attribute.initializer
	if (initializer === undefined) {
		return undefined
	}
	if (ts.isStringLiteral(initializer)) {
		return initializer.text
	}
	const expression = ts.isJsxExpression(initializer) ? initializer.expression : undefined
	return expression !== undefined && ts.isStringLiteral(expression) ? expression.text : undefined
}

const isFunctionValue = (node: ts.Expression | undefined): boolean =>
	node !== undefined && Predicate.or(ts.isArrowFunction, ts.isFunctionExpression)(node)

const recordUsage = (
	usages: Map<string, Array<SlotUsage>>,
	slot: string,
	usage: SlotUsage
): void => {
	const known = usages.get(slot)
	if (known === undefined) {
		usages.set(slot, [usage])
		return
	}
	known.push(usage)
}

const slotAttributesOf = (node: ts.Node): ReadonlyArray<ts.JsxAttribute> => {
	if (ts.isJsxElement(node) || ts.isJsxSelfClosingElement(node)) {
		return dataSlotAttributesOf(node)
	}
	return []
}

/** The name of the function a node declares, when it declares one: the component its JSX belongs to. */
const declaredFunctionNameOf = (node: ts.Node): string | undefined => {
	if (ts.isFunctionDeclaration(node) && node.name !== undefined) {
		return node.name.text
	}
	if (
		ts.isVariableDeclaration(node) &&
		ts.isIdentifier(node.name) &&
		isFunctionValue(node.initializer)
	) {
		return node.name.text
	}
	return undefined
}

const collectSlotUsages = (source: SyntaxSource, usages: Map<string, Array<SlotUsage>>): void => {
	const { sourceFile, file } = source
	let componentName = ""
	const walk = (node: ts.Node): void => {
		const declared = declaredFunctionNameOf(node)
		if (declared !== undefined) {
			componentName = declared
		}
		for (const attribute of slotAttributesOf(node)) {
			const slot = slotValueOf(attribute)
			if (slot !== undefined && slot !== "") {
				const { line, character } = sourceFile.getLineAndCharacterOfPosition(
					attribute.getStart(sourceFile)
				)
				recordUsage(usages, slot, { file, line: line + 1, column: character + 1, componentName })
			}
		}
		node.forEachChild(walk)
	}
	walk(sourceFile)
}

/**
 * Each data-slot value belongs to one file, so CSS selectors on it cannot collide. Sibling components in one file
 * may share a slot (InputGroupInput and InputGroupTextarea are both input-group-control); a slot already used in
 * an earlier file is reported at every use in the later files.
 */
export const noDuplicateDataSlot = (
	sources: ReadonlyArray<SyntaxSource>
): ReadonlyArray<StyleViolation> => {
	const usages = new Map<string, Array<SlotUsage>>()
	for (const source of sources) {
		if (isComponentFile(source.file)) {
			collectSlotUsages(source, usages)
		}
	}
	const violations: Array<StyleViolation> = []
	for (const [slot, slotUsages] of usages) {
		const first = slotUsages[0]
		if (first === undefined) {
			continue
		}
		for (const usage of Arr.filter(slotUsages, (candidate) => candidate.file !== first.file)) {
			violations.push({
				file: usage.file,
				line: usage.line,
				column: usage.column,
				rule: "no-duplicate-data-slot",
				message: `Duplicate data-slot="${slot}". Already defined in ${repositoryPath(first.file)}:${first.line}.`,
				componentName: usage.componentName
			})
		}
	}
	return violations
}
