import { String as Str } from "effect"
import { type AnyNode, type CreateRule, isApplicationSource } from "#scripts/dev/oxlint/rule.ts"

const isOperationalKey = (node: AnyNode): boolean =>
	node.type === "Literal" &&
	typeof node.value === "string" &&
	Str.startsWith("superstarter.")(node.value)

/** `span.attribute(...)`: a member call named `attribute`, the one Effect span API that writes a key outside the
 * span writers `superstarter/telemetry-ownership` already confines to the telemetry package. */
const isAttributeCall = (node: AnyNode): boolean =>
	node.type === "CallExpression" &&
	node.callee.type === "MemberExpression" &&
	!node.callee.computed &&
	node.callee.property.type === "Identifier" &&
	node.callee.property.name === "attribute"

const ATTRIBUTE_MESSAGE =
	"Span attributes go through observed or annotateOperation from @superstarter/operational-telemetry/effect, which type the key. A literal superstarter.* key on Span.attribute bypasses them."

export const noLiteralAttributeKey: CreateRule = {
	meta: { type: "problem" },
	create: (context) => ({
		CallExpression: (node) => {
			const [first] = node.arguments
			if (
				isApplicationSource(context.filename) &&
				isAttributeCall(node) &&
				first !== undefined &&
				isOperationalKey(first)
			) {
				context.report({ node, message: ATTRIBUTE_MESSAGE })
			}
		}
	})
}
