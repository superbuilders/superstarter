import { type CreateRule, type Expression } from "#scripts/dev/oxlint/rule.ts"

/** `null` and `[]` start a variable's type as `any` or `any[]`, which then evolves with each assignment. */
const isEvolvingInitializer = (init: Expression): boolean => {
	if (init.type === "Literal") {
		return init.value === null && init.raw === "null"
	}
	return init.type === "ArrayExpression" && init.elements.length === 0
}

export const noEvolvingTypes: CreateRule = {
	meta: { type: "problem" },
	create: (context) => ({
		VariableDeclarator: (node) => {
			if (
				node.id.type === "Identifier" &&
				node.id.typeAnnotation === null &&
				node.init !== null &&
				isEvolvingInitializer(node.init)
			) {
				context.report({
					node: node.id,
					message:
						"This variable's type may evolve implicitly to any. Annotate it with the type it holds, or initialise it with a value of that type."
				})
			}
		}
	})
}
