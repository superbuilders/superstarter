import { Array as Arr } from "effect"
import { type AnyNode, type CreateRule, docs } from "#scripts/dev/oxlint/rule.ts"

/** The statements whose condition or returned expression may be boolean logic. */
const isAllowedParent = (current: AnyNode, parent: AnyNode): boolean => {
	if (
		parent.type === "IfStatement" ||
		parent.type === "WhileStatement" ||
		parent.type === "DoWhileStatement" ||
		parent.type === "ForStatement"
	) {
		return parent.test === current
	}
	return parent.type === "ReturnStatement"
}

/** Operators the walk climbs through on its way to the statement that consumes the expression. */
const CONTINUES_UP: ReadonlyArray<AnyNode["type"]> = [
	"LogicalExpression",
	"BinaryExpression",
	"UnaryExpression",
	"AssignmentExpression",
	"SequenceExpression"
]

/** Walks up through operators and negations to the statement that consumes the expression. */
const isInAllowedPosition = (node: AnyNode): boolean => {
	let current: AnyNode = node
	while (current.parent !== null) {
		const parent: AnyNode = current.parent
		if (isAllowedParent(current, parent)) {
			return true
		}
		if (!Arr.contains(CONTINUES_UP, parent.type)) {
			return false
		}
		current = parent
	}
	return false
}

/**
 * `||` treats 0, "" and false as missing, so it is banned as a fallback. It stays legal as boolean logic in the
 * condition of an if, while, do-while or for statement, and in a return statement's expression. A concise arrow
 * body is not a return statement, and neither is a ternary's test: a predicate that needs `||` branches in an if or
 * composes with `Predicate.or`.
 */
export const noLogicalOrFallback: CreateRule = {
	meta: { type: "problem" },
	create: (context) => ({
		LogicalExpression: (node) => {
			if (node.operator === "||" && !isInAllowedPosition(node)) {
				context.report({
					node,
					message: `Logical OR (||) banned for fallbacks. Only allowed in conditionals and return statements. Branch in an if, or compose named predicates with Predicate.or. ${docs("no-logical-or-fallback")}`
				})
			}
		}
	})
}
