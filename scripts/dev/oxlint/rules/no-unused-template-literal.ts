import { Array as Arr, String as Str } from "effect"
import type { CreateRule } from "#scripts/dev/oxlint/rule.ts"

export const noUnusedTemplateLiteral: CreateRule = {
	meta: { type: "suggestion" },
	create: (context) => ({
		TemplateLiteral: (node) => {
			if (node.expressions.length > 0 || node.parent.type === "TaggedTemplateExpression") {
				return
			}
			const raw = Arr.join(
				Arr.map(node.quasis, (quasi) => quasi.value.raw),
				""
			)
			if (Str.includes("\n")(raw) || Str.includes("'")(raw) || Str.includes('"')(raw)) {
				return
			}
			context.report({
				node,
				message:
					"Unnecessary template literal: it interpolates nothing and holds no quote or line break. Use a string literal."
			})
		}
	})
}
