import { Array as Arr, String as Str } from "effect"
import * as ts from "typescript/unstable/ast"
import { appRoot } from "#scripts/dev/shared/repository.ts"

/** The app's components: its routes in src/app, its own components in src/components, and shadcn's primitives in
 * src/ui. The data-slot rules apply there. */
const COMPONENT_DIRECTORIES: ReadonlyArray<string> = Arr.map(
	["src/app/", "src/components/", "src/ui/"],
	(directory) => `${appRoot}/${directory}`
)

export const isComponentFile = (file: string): boolean =>
	Arr.some(COMPONENT_DIRECTORIES, (directory) => Str.startsWith(directory)(file))

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
