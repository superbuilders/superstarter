import { Array as Arr, String as Str } from "effect"
import * as ts from "typescript/unstable/ast"

/** Components live in src/components and, for shadcn's primitives, in src/ui; data-slot rules apply there only. */
const COMPONENT_DIRECTORIES: ReadonlyArray<string> = ["src/components/", "src/ui/"]

export const isComponentFile = (file: string): boolean =>
	Arr.some(COMPONENT_DIRECTORIES, (directory) => Str.includes(directory)(file))

export type JsxRoot = ts.JsxElement | ts.JsxSelfClosingElement | ts.JsxFragment

/** The data-slot attributes written on one JSX element. */
export const dataSlotAttributesOf = (
	element: ts.JsxElement | ts.JsxSelfClosingElement
): ReadonlyArray<ts.JsxAttribute> => {
	const attributes = ts.isJsxElement(element)
		? element.openingElement.attributes
		: element.attributes
	return Arr.filter(
		attributes.properties,
		(attribute): attribute is ts.JsxAttribute =>
			ts.isJsxAttribute(attribute) &&
			ts.isIdentifier(attribute.name) &&
			attribute.name.text === "data-slot"
	)
}
