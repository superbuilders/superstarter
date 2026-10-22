import { Array as Arr, Option } from "effect"
import { type CreateRule, type NodeOf } from "#scripts/dev/oxlint/rule.ts"

type JsxAttributeItem = NodeOf<"JSXOpeningElement">["attributes"][number]

const attributeNamed = (
	attributes: ReadonlyArray<JsxAttributeItem>,
	name: string
): NodeOf<"JSXAttribute"> | undefined =>
	Option.getOrUndefined(
		Arr.findFirst(
			attributes,
			(attribute): attribute is NodeOf<"JSXAttribute"> =>
				attribute.type === "JSXAttribute" &&
				attribute.name.type === "JSXIdentifier" &&
				attribute.name.name === name
		)
	)

/** `aria-hidden`, `aria-hidden="true"` or `aria-hidden={true}`. */
const isHidden = (attribute: NodeOf<"JSXAttribute"> | undefined): boolean => {
	if (attribute === undefined) {
		return false
	}
	const value = attribute.value
	if (value === null) {
		return true
	}
	if (value.type === "Literal") {
		return value.value === "true"
	}
	return (
		value.type === "JSXExpressionContainer" &&
		value.expression.type === "Literal" &&
		value.expression.value === true
	)
}

const hasAccessibleName = (attributes: ReadonlyArray<JsxAttributeItem>): boolean => {
	if (attributeNamed(attributes, "aria-label") !== undefined) {
		return true
	}
	return attributeNamed(attributes, "aria-labelledby") !== undefined
}

const hasTitleChild = (element: NodeOf<"JSXElement">): boolean =>
	Arr.some(
		element.children,
		(child) =>
			child.type === "JSXElement" &&
			child.openingElement.name.type === "JSXIdentifier" &&
			child.openingElement.name.name === "title"
	)

export const noSvgWithoutTitle: CreateRule = {
	meta: { type: "problem" },
	create: (context) => ({
		JSXElement: (node) => {
			const opening = node.openingElement
			if (opening.name.type !== "JSXIdentifier" || opening.name.name !== "svg") {
				return
			}
			const attributes = opening.attributes
			const role = attributeNamed(attributes, "role")
			const isImage = role?.value?.type === "Literal" && role.value.value === "img"
			if (
				hasTitleChild(node) ||
				isHidden(attributeNamed(attributes, "aria-hidden")) ||
				(isImage && hasAccessibleName(attributes))
			) {
				return
			}
			context.report({
				node: opening,
				message:
					'An svg needs a <title> child, role="img" with aria-label or aria-labelledby, or aria-hidden="true" when it is decoration.'
			})
		}
	})
}
