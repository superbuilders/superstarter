import { Array as Arr, Option, Result } from "effect"
import * as ts from "typescript/unstable/ast"
import type { Report } from "#scripts/dev/shared/finding.ts"
import { repositoryPath } from "#scripts/dev/shared/repository.ts"
import { dataSlotAttributesOf } from "#scripts/dev/style/components.ts"

/** One data-slot written in a file: its value and the attribute that writes it. */
type SlotUse = Readonly<{ slot: string; attribute: ts.JsxAttribute }>

const slotValueOf = (attribute: ts.JsxAttribute): Option.Option<string> => {
	const initializer = attribute.initializer
	const literal =
		initializer !== undefined && ts.isJsxExpression(initializer)
			? initializer.expression
			: initializer
	return literal !== undefined && ts.isStringLiteral(literal) && literal.text !== ""
		? Option.some(literal.text)
		: Option.none()
}

const slotUsesOf = (sourceFile: ts.SourceFile): ReadonlyArray<SlotUse> => {
	const uses: Array<SlotUse> = []
	const walk = (node: ts.Node): void => {
		if (ts.isJsxElement(node) || ts.isJsxSelfClosingElement(node)) {
			for (const attribute of dataSlotAttributesOf(node)) {
				uses.push(
					...Option.match(slotValueOf(attribute), {
						onNone: () => [],
						onSome: (slot) => [{ slot, attribute }]
					})
				)
			}
		}
		node.forEachChild(walk)
	}
	walk(sourceFile)
	return uses
}

const locationOf = (attribute: ts.JsxAttribute): string => {
	const sourceFile = attribute.getSourceFile()
	const { line } = sourceFile.getLineAndCharacterOfPosition(attribute.getStart(sourceFile))
	return `${repositoryPath(sourceFile.fileName)}:${line + 1}`
}

/**
 * Each data-slot value belongs to one file, so CSS selectors on it cannot collide. Sibling components in one file
 * may share a slot (InputGroupInput and InputGroupTextarea are both input-group-control); a slot already used in
 * an earlier file is reported at every use in the later files.
 */
export const noDuplicateDataSlot = (
	sourceFiles: ReadonlyArray<ts.SourceFile>
): ReadonlyArray<Report> => {
	const uses = Arr.flatMap(sourceFiles, (sourceFile) =>
		Arr.map(slotUsesOf(sourceFile), (use) => ({ ...use, file: sourceFile.fileName }))
	)
	return Arr.filterMap(uses, (use) => {
		const first = Arr.findFirst(uses, (candidate) => candidate.slot === use.slot)
		if (Option.isNone(first) || first.value.file === use.file) {
			return Result.failVoid
		}
		return Result.succeed({
			node: use.attribute,
			message: `Duplicate data-slot="${use.slot}", already defined at ${locationOf(first.value.attribute)}.`
		})
	})
}
