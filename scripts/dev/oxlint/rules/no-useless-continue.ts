import { Array as Arr } from "effect"
import { type AnyNode, type CreateRule } from "#scripts/dev/oxlint/rule.ts"

const LOOP_TYPES: ReadonlyArray<AnyNode["type"]> = [
	"ForStatement",
	"ForInStatement",
	"ForOfStatement",
	"WhileStatement",
	"DoWhileStatement"
]

/** Nothing in the loop body runs after `node`: it is the body, or the last statement of a block or an if or else
 * branch that is itself in that position. */
const endsLoopBody = (node: AnyNode): boolean => {
	const parent = node.parent
	if (parent === null) {
		return false
	}
	if (Arr.contains(LOOP_TYPES, parent.type)) {
		return true
	}
	if (parent.type === "BlockStatement") {
		return parent.body[parent.body.length - 1] === node && endsLoopBody(parent)
	}
	return parent.type === "IfStatement" && endsLoopBody(parent)
}

/** Biome's noUselessContinue: an unlabelled `continue` that ends its loop body changes nothing. */
export const noUselessContinue: CreateRule = {
	meta: { type: "suggestion" },
	create: (context) => ({
		ContinueStatement: (node) => {
			if (node.label === null && endsLoopBody(node)) {
				context.report({
					node,
					message: "This continue ends its loop body, so it changes nothing. Delete it."
				})
			}
		}
	})
}
