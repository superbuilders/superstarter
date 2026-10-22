import { Array as Arr } from "effect"
import type { AnyNode, CreateRule, NodeOf } from "#scripts/dev/oxlint/rule.ts"

/** What an early exit dedents: a function's body (generators included, so `Effect.gen` and `Effect.fn` bodies)
 * exits with `return`, a loop's with `continue`. */
type ExitKind = "function" | "loop"

const MESSAGES = {
	function:
		"Function body is wrapped in a single conditional. Invert the condition and return early (`return yield*` in a generator), then dedent the body.",
	loop: "Loop body is wrapped in a single conditional. Invert the condition and `continue`, then dedent the body."
} as const satisfies Record<ExitKind, string>

const TRIVIAL_SETUP: ReadonlyArray<AnyNode["type"]> = ["VariableDeclaration", "ExpressionStatement"]

const countStatements = (node: AnyNode): number =>
	node.type === "BlockStatement" ? node.body.length : 1

/** The dominant if: the last statement, preceded only by declarations and expression statements. */
const wrappingIfOf = (body: AnyNode): NodeOf<"IfStatement"> | undefined => {
	if (body.type !== "BlockStatement") {
		return undefined
	}
	const last = Arr.last(body.body)
	if (last._tag === "None" || last.value.type !== "IfStatement") {
		return undefined
	}
	return Arr.every(Arr.dropRight(body.body, 1), (statement) =>
		Arr.contains(TRIVIAL_SETUP, statement.type)
	)
		? last.value
		: undefined
}

/**
 * Early exits keep the main path unindented: a function or loop body wrapped in one else-less if whose branch has
 * 3+ statements is reported. oxlint's no-else-return and max-depth refuse an else after an exiting branch and deep
 * nesting.
 */
export const preferEarlyReturn: CreateRule = {
	meta: { type: "suggestion" },
	create: (context) => {
		const check = (body: AnyNode, kind: ExitKind): void => {
			const wrapping = wrappingIfOf(body)
			if (
				wrapping === undefined ||
				wrapping.alternate !== null ||
				countStatements(wrapping.consequent) < 3
			) {
				return
			}
			context.report({ node: wrapping, message: MESSAGES[kind] })
		}
		return {
			FunctionDeclaration: (node) => {
				if (node.body !== null) {
					check(node.body, "function")
				}
			},
			FunctionExpression: (node) => {
				if (node.body !== null) {
					check(node.body, "function")
				}
			},
			ArrowFunctionExpression: (node) => {
				check(node.body, "function")
			},
			ForStatement: (node) => {
				check(node.body, "loop")
			},
			ForOfStatement: (node) => {
				check(node.body, "loop")
			},
			ForInStatement: (node) => {
				check(node.body, "loop")
			},
			WhileStatement: (node) => {
				check(node.body, "loop")
			},
			DoWhileStatement: (node) => {
				check(node.body, "loop")
			}
		}
	}
}
