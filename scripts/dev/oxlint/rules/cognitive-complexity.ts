import { Array as Arr } from "effect"
import { type AnyNode, type Context, type CreateRule } from "#scripts/dev/oxlint/rule.ts"

/** The highest cognitive complexity a function may score. */
const MAX_COMPLEXITY = 15
/** Scores saturate like Biome's u8; a function nested deeper than this marks its parent as maximally complex. */
const MAX_SCORE = 255
const MAX_FUNCTION_DEPTH = 10

const LOOPS: ReadonlyArray<string> = [
	"DoWhileStatement",
	"ForOfStatement",
	"ForInStatement",
	"ForStatement",
	"WhileStatement"
]

const NESTING: ReadonlyArray<string> = [
	...LOOPS,
	"CatchClause",
	"ConditionalExpression",
	"IfStatement",
	"SwitchStatement"
]

const increasesNesting = (node: AnyNode): boolean => Arr.contains(NESTING, node.type)

const isLabelledJump = (node: AnyNode): boolean => {
	if (node.type === "BreakStatement" || node.type === "ContinueStatement") {
		return node.label !== null
	}
	return false
}

/** `with` and labelled jumps cost one each, without nesting. */
const costsOne = (node: AnyNode): boolean => {
	if (node.type === "WithStatement") {
		return true
	}
	return isLabelledJump(node)
}

/** A getter or setter is not a function to Biome: its body counts toward the function around it. */
const isFunctionLike = (node: AnyNode): boolean => {
	if (node.type === "FunctionDeclaration" || node.type === "ArrowFunctionExpression") {
		return true
	}
	if (node.type !== "FunctionExpression") {
		return false
	}
	const parent = node.parent
	return !(
		(parent.type === "MethodDefinition" || parent.type === "Property") &&
		(parent.kind === "get" || parent.kind === "set")
	)
}

/** Biome's else clause is a node of its own; in ESTree it is the alternate of its if. */
const isAlternate = (node: AnyNode): boolean =>
	node.parent?.type === "IfStatement" && node.parent.alternate === node

const isFinalizer = (node: AnyNode): boolean =>
	node.parent?.type === "TryStatement" && node.parent.finalizer === node

/** ESTree drops parentheses, which Biome keeps as a node; a parenthesized left operand starts after its parent. */
const isParenthesizedLeftOperand = (node: AnyNode): boolean =>
	node.type === "LogicalExpression" &&
	node.parent.type === "LogicalExpression" &&
	node.parent.left === node &&
	node.start !== node.parent.start

type FunctionState = Readonly<{
	node: AnyNode
	score: number
	nesting: number
	lastOperator: string | undefined
}>

const saturating = (value: number): number => Math.min(MAX_SCORE, Math.max(0, value))

/** Entering Biome's else clause: a plain else costs one; an else-if gives back the level its if is about to take. */
const enterElse = (state: FunctionState, node: AnyNode): FunctionState => {
	if (!isAlternate(node)) {
		return state
	}
	if (node.type === "IfStatement") {
		return { ...state, nesting: saturating(state.nesting - 1) }
	}
	return { ...state, score: saturating(state.score + 1) }
}

/** A run of one logical operator costs one; any other node ends the run. */
const enterOperator = (state: FunctionState, node: AnyNode): FunctionState => {
	if (node.type !== "LogicalExpression") {
		return { ...state, lastOperator: undefined }
	}
	if (state.lastOperator === node.operator) {
		return state
	}
	return { ...state, score: saturating(state.score + 1), lastOperator: node.operator }
}

const enterStructure = (state: FunctionState, node: AnyNode): FunctionState => {
	const finalized = isFinalizer(node)
		? { ...state, score: saturating(state.score + 1), lastOperator: undefined }
		: state
	const grouped = isParenthesizedLeftOperand(node)
		? { ...finalized, lastOperator: undefined }
		: finalized
	if (increasesNesting(node)) {
		return {
			...grouped,
			score: saturating(grouped.score + 1 + grouped.nesting),
			lastOperator: undefined,
			nesting: saturating(grouped.nesting + 1)
		}
	}
	const jumped = costsOne(node) ? { ...grouped, score: saturating(grouped.score + 1) } : grouped
	return enterOperator(jumped, node)
}

/** Leaving a nesting node takes its level back. Biome's else clause also takes one level back on the way out, after
 * a plain else as well, so an if-else leaves the nesting below where it found it; the score follows Biome exactly. */
const leaveNesting = (state: FunctionState, node: AnyNode): FunctionState => {
	const left = increasesNesting(node) ? { ...state, nesting: saturating(state.nesting - 1) } : state
	if (!isAlternate(node)) {
		return left
	}
	const nesting =
		node.type === "IfStatement" ? saturating(left.nesting + 1) : saturating(left.nesting - 1)
	return { ...left, nesting }
}

/** Where Biome reports: the function's name, else its `=>`, else the function itself. */
const reportTargetOf = (context: Context, node: AnyNode) => {
	if (
		(node.type === "FunctionDeclaration" || node.type === "FunctionExpression") &&
		node.id !== null
	) {
		return node.id
	}
	const parent = node.parent
	if (parent?.type === "MethodDefinition" || parent?.type === "Property") {
		return parent.key
	}
	if (node.type === "ArrowFunctionExpression") {
		const arrow = context.sourceCode.getTokenBefore(node.body, (token) => token.value === "=>")
		return arrow === null ? node : arrow
	}
	return node
}

const complexityMessage = (score: number): string => {
	const detail =
		score === MAX_SCORE
			? "It is too complex or too deeply nested to score accurately."
			: `Reduce its complexity score from ${score} to at most ${MAX_COMPLEXITY}.`
	return `Excessive complexity of ${score} detected (max: ${MAX_COMPLEXITY}). ${detail}`
}

/**
 * Biome's noExcessiveCognitiveComplexity, node for node: loops, catch, conditional expressions, if and switch cost
 * one plus their nesting; finally, with and labelled jumps cost one; each run of one logical operator costs one; an
 * else costs one and an else-if does not nest. A nested function starts one level deeper and is scored on its own.
 */
export const cognitiveComplexity: CreateRule = {
	meta: { type: "suggestion" },
	create: (context) => {
		const stack: Array<FunctionState> = []

		/** The innermost function's state moves forward by replacing the top of the stack. */
		const replaceTop = (next: FunctionState): void => {
			stack[stack.length - 1] = next
		}

		const open = (node: AnyNode): void => {
			const parent = stack.at(-1)
			if (stack.length < MAX_FUNCTION_DEPTH) {
				const nesting = parent === undefined ? 0 : saturating(parent.nesting + 1)
				stack.push({ node, score: 0, nesting, lastOperator: undefined })
				return
			}
			if (parent !== undefined) {
				replaceTop({ ...parent, score: MAX_SCORE })
			}
		}

		const close = (node: AnyNode): void => {
			const finished = stack.pop()
			if (finished === undefined) {
				return
			}
			if (finished.node !== node) {
				stack.push(finished)
				return
			}
			if (finished.score > MAX_COMPLEXITY) {
				context.report({
					node: reportTargetOf(context, node),
					message: complexityMessage(finished.score)
				})
			}
		}

		const enter = (node: AnyNode): void => {
			if (stack.at(-1)?.score === MAX_SCORE) {
				return
			}
			if (isFunctionLike(node)) {
				open(node)
			}
			const state = stack.at(-1)
			if (state === undefined) {
				return
			}
			replaceTop(enterStructure(enterElse(state, node), node))
		}

		const leave = (node: AnyNode): void => {
			if (isFunctionLike(node)) {
				close(node)
				return
			}
			const state = stack.at(-1)
			if (state === undefined || state.score >= MAX_SCORE) {
				return
			}
			replaceTop(leaveNesting(state, node))
		}

		return { "*": enter, "*:exit": leave }
	}
}
