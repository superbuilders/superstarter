import { Array as Arr, Option, String as Str } from "effect"
import type { RuleTester } from "oxlint/plugins-dev"

/**
 * The repository's own oxlint rules: the syntactic bans oxlint has no native rule for, and Biome's cognitive
 * complexity. Each rule is syntax only; type-aware rules live in superlint (scripts/dev/lint.ts). oxlint loads this
 * file through `jsPlugins` in .oxlintrc.json, and Node strips its types.
 */

type Rule = Parameters<RuleTester["run"]>[1]
type CreateRule = Extract<Rule, { create: unknown }>
type Context = Parameters<CreateRule["create"]>[0]
type Program = Context["sourceCode"]["ast"]
type AnyNode = Extract<Program["body"][number], { type: "ExpressionStatement" }>["parent"]
type NodeOf<T extends AnyNode["type"]> = Extract<AnyNode, { type: T }>
type Expression = NodeOf<"ExpressionStatement">["expression"]

const docs = (rule: string): string => `See rules/${rule}.md.`

/** `Effect.withSpan`, `observed`: a dotted or bare callee name, or undefined for any other callee shape. */
const calleeNameOf = (callee: Expression): string | undefined => {
	if (callee.type === "Identifier") {
		return callee.name
	}
	if (
		callee.type === "MemberExpression" &&
		!callee.computed &&
		callee.object.type === "Identifier" &&
		callee.property.type === "Identifier"
	) {
		return `${callee.object.name}.${callee.property.name}`
	}
	return undefined
}

/** The application's source: a workspace package's src/, except the telemetry package that defines the span and
 * attribute registries. */
const isApplicationSource = (filename: string): boolean =>
	Str.includes("/packages/")(filename) &&
	Str.includes("/src/")(filename) &&
	!Str.includes("/packages/platform/operational-telemetry/")(filename)

const noTry: CreateRule = {
	meta: { type: "problem" },
	create: (context) => ({
		TryStatement: (node) => {
			const handles = node.handler !== null
			const cleans = node.finalizer !== null
			if (handles && cleans) {
				context.report({
					node,
					message: `try...catch...finally is disallowed. Capture failures with Effect.try / Effect.tryPromise (Result.try outside Effect), mapping the cause to a Schema.TaggedError, and release resources with Effect.acquireRelease inside Effect.scoped. ${docs("no-try")}`
				})
				return
			}
			if (handles) {
				context.report({
					node,
					message: `try...catch is disallowed. Use Effect.try for sync code or Effect.tryPromise for async code (Result.try outside Effect), mapping the cause to a Schema.TaggedError. ${docs("no-try")}`
				})
				return
			}
			context.report({
				node,
				message: `try...finally is disallowed. Acquire the resource with Effect.acquireRelease inside Effect.scoped; the release runs when the scope closes, even on failure or interruption. ${docs("no-try")}`
			})
		}
	})
}

const NULLISH_MESSAGE = `Nullish coalescing (??) is banned. A ternary is the same problem. Find out why the value can be missing and fix the source. ${docs("no-nullish-coalescing")}`

const noNullishCoalescing: CreateRule = {
	meta: { type: "problem" },
	create: (context) => ({
		LogicalExpression: (node) => {
			if (node.operator === "??") {
				context.report({ node, message: NULLISH_MESSAGE })
			}
		},
		AssignmentExpression: (node) => {
			if (node.operator === "??=") {
				context.report({ node, message: NULLISH_MESSAGE })
			}
		}
	})
}

const noIife: CreateRule = {
	meta: { type: "problem" },
	create: (context) => ({
		CallExpression: (node) => {
			if (
				node.callee.type === "FunctionExpression" ||
				node.callee.type === "ArrowFunctionExpression"
			) {
				context.report({
					node,
					message: `IIFE usage is disallowed. Define a named function and call it, or restructure the code so it needs no function. ${docs("no-iife")}`
				})
			}
		}
	})
}

const NEW_ERROR_MESSAGE = `Constructing Error is disallowed. Define a Schema.TaggedError class (its tag equals its name) and fail with \`yield* Failure.make({ ... })\` or \`Effect.fail(...)\`, so the failure is typed and can be handled with Effect.catchTag. ${docs("no-new-error")}`

const noNewError: CreateRule = {
	meta: { type: "problem" },
	create: (context) => ({
		NewExpression: (node) => {
			if (node.callee.type === "Identifier" && node.callee.name === "Error") {
				context.report({ node, message: NEW_ERROR_MESSAGE })
			}
		},
		CallExpression: (node) => {
			if (node.callee.type === "Identifier" && node.callee.name === "Error") {
				context.report({ node, message: NEW_ERROR_MESSAGE })
			}
		}
	})
}

const noInstanceofError: CreateRule = {
	meta: { type: "problem" },
	create: (context) => ({
		BinaryExpression: (node) => {
			if (
				node.operator === "instanceof" &&
				node.right.type === "Identifier" &&
				node.right.name === "Error"
			) {
				context.report({
					node,
					message: `instanceof Error is banned. Failures are Schema.TaggedError values: recognise one with Schema.is(Failure) or handle it with Effect.catchTag("Failure", ...). ${docs("no-instanceof-error")}`
				})
			}
		}
	})
}

/** Browser and DOM types an assertion may name: the platform hands these out loosely typed. */
const DOM_TYPES: ReadonlyArray<string> = [
	"HTMLElement",
	"HTMLInputElement",
	"HTMLButtonElement",
	"HTMLAnchorElement",
	"HTMLDivElement",
	"HTMLSpanElement",
	"HTMLFormElement",
	"HTMLSelectElement",
	"HTMLOptionElement",
	"HTMLTextAreaElement",
	"HTMLImageElement",
	"HTMLVideoElement",
	"HTMLAudioElement",
	"HTMLCanvasElement",
	"HTMLIFrameElement",
	"HTMLTableElement",
	"HTMLTableRowElement",
	"HTMLTableCellElement",
	"HTMLLIElement",
	"HTMLUListElement",
	"HTMLOListElement",
	"HTMLHeadingElement",
	"HTMLParagraphElement",
	"HTMLPreElement",
	"HTMLLabelElement",
	"HTMLFieldSetElement",
	"HTMLLegendElement",
	"HTMLDetailsElement",
	"HTMLDialogElement",
	"HTMLProgressElement",
	"HTMLMeterElement",
	"HTMLScriptElement",
	"HTMLStyleElement",
	"HTMLLinkElement",
	"HTMLMetaElement",
	"HTMLBaseElement",
	"HTMLTitleElement",
	"HTMLBodyElement",
	"HTMLHeadElement",
	"HTMLHtmlElement",
	"SVGElement",
	"SVGSVGElement",
	"Event",
	"MouseEvent",
	"KeyboardEvent",
	"TouchEvent",
	"PointerEvent",
	"WheelEvent",
	"DragEvent",
	"FocusEvent",
	"InputEvent",
	"CompositionEvent",
	"AnimationEvent",
	"TransitionEvent",
	"ClipboardEvent",
	"StorageEvent",
	"HashChangeEvent",
	"PopStateEvent",
	"BeforeUnloadEvent",
	"MessageEvent",
	"ErrorEvent",
	"ProgressEvent",
	"SubmitEvent",
	"FormDataEvent",
	"CustomEvent",
	"Element",
	"Document",
	"Window",
	"EventTarget",
	"Node",
	"NodeList",
	"HTMLCollection",
	"DOMTokenList",
	"CSSStyleDeclaration",
	"File",
	"FileList",
	"Blob",
	"FormData",
	"URLSearchParams",
	"Headers",
	"Request",
	"Response",
	"AbortController",
	"AbortSignal",
	"IntersectionObserver",
	"MutationObserver",
	"ResizeObserver",
	"PerformanceObserver",
	"MediaQueryList",
	"Selection",
	"Range",
	"DOMRect",
	"DOMRectReadOnly",
	"DOMPoint",
	"DOMPointReadOnly",
	"DOMMatrix",
	"DOMMatrixReadOnly"
]

/** Of the DOM types, only these two may carry a type argument. */
const GENERIC_DOM_TYPES: ReadonlyArray<string> = ["CustomEvent", "MessageEvent"]

type TypeNode = NodeOf<"TSAsExpression">["typeAnnotation"]

const isAllowedAssertionTarget = (target: TypeNode): boolean => {
	if (target.type !== "TSTypeReference" || target.typeName.type !== "Identifier") {
		return false
	}
	const name = target.typeName.name
	if (target.typeArguments === null) {
		return name === "const" || Arr.contains(DOM_TYPES, name)
	}
	return Arr.contains(GENERIC_DOM_TYPES, name)
}

const AS_MESSAGE = `Type assertions are disallowed, except \`as const\` and assertions to browser or DOM types (\`as HTMLElement\`, \`as MouseEvent\`). Decode outside data with a Schema, or narrow with a type guard, a _tag check or Schema.is. ${docs("no-as-type-assertion")}`

const noAsTypeAssertion: CreateRule = {
	meta: { type: "problem" },
	create: (context) => ({
		TSAsExpression: (node) => {
			if (!isAllowedAssertionTarget(node.typeAnnotation)) {
				context.report({ node, message: AS_MESSAGE })
			}
		},
		TSTypeAssertion: (node) => {
			if (!isAllowedAssertionTarget(node.typeAnnotation)) {
				context.report({ node, message: AS_MESSAGE })
			}
		}
	})
}

const isLiteralName = (node: AnyNode): boolean => {
	if (node.type === "TemplateLiteral") {
		return true
	}
	return node.type === "Literal" && typeof node.value === "string"
}

/** Callee -> the argument positions that may hold its span name (the data-last and data-first forms). */
const SPAN_NAME_POSITIONS: ReadonlyMap<string, ReadonlyArray<number>> = new Map([
	["Effect.fn", [0]],
	["Effect.withSpan", [0, 1]],
	["Effect.makeSpanScoped", [0]],
	["observed", [0, 1]]
])

const noLiteralSpanName: CreateRule = {
	meta: { type: "problem" },
	create: (context) => ({
		CallExpression: (node) => {
			if (!isApplicationSource(context.filename)) {
				return
			}
			const name = calleeNameOf(node.callee)
			const positions = name === undefined ? undefined : SPAN_NAME_POSITIONS.get(name)
			if (
				positions !== undefined &&
				Arr.some(positions, (index) => {
					const argument = node.arguments[index]
					return argument !== undefined && isLiteralName(argument)
				})
			) {
				context.report({
					node,
					message:
						"Span names come from OPERATIONAL_SPANS in #observability/spans.ts; a literal or generated name is outside the exportable roster."
				})
			}
		}
	})
}

const isOperationalKey = (node: AnyNode): boolean =>
	node.type === "Literal" &&
	typeof node.value === "string" &&
	Str.startsWith("superstarter.")(node.value)

type ObjectMember = NodeOf<"ObjectExpression">["properties"][number]

/** True when an options expression spells a `superstarter.*` key: in its object literals, their spreads and values,
 * and either branch of a conditional or logical expression. */
const spellsOperationalKey = (node: AnyNode): boolean => {
	if (node.type === "ObjectExpression") {
		return Arr.some(node.properties, memberSpellsOperationalKey)
	}
	if (node.type === "ConditionalExpression") {
		return spellsOperationalKey(node.consequent) || spellsOperationalKey(node.alternate)
	}
	if (node.type === "LogicalExpression") {
		return spellsOperationalKey(node.left) || spellsOperationalKey(node.right)
	}
	return false
}

const memberSpellsOperationalKey = (member: ObjectMember): boolean => {
	if (member.type === "SpreadElement") {
		return spellsOperationalKey(member.argument)
	}
	return isOperationalKey(member.key) || spellsOperationalKey(member.value)
}

/** Callee -> the argument position of its span options. */
const SPAN_OPTION_POSITIONS: ReadonlyMap<string, ReadonlyArray<number>> = new Map([
	["Effect.withSpan", [1, 2]],
	["Effect.makeSpanScoped", [1]],
	["Effect.fn", [1]]
])

const ATTRIBUTE_MESSAGE =
	"Span attributes go through observed or annotateOperation from #observability/effect.ts, which type the key. Effect.annotateCurrentSpan, a literal superstarter.* key on Span.attribute, and a literal superstarter.* key in the options of Effect.withSpan, Effect.makeSpanScoped or Effect.fn bypass them."

const noLiteralAttributeKey: CreateRule = {
	meta: { type: "problem" },
	create: (context) => ({
		CallExpression: (node) => {
			if (!isApplicationSource(context.filename)) {
				return
			}
			const name = calleeNameOf(node.callee)
			const attribute =
				node.callee.type === "MemberExpression" &&
				!node.callee.computed &&
				node.callee.property.type === "Identifier" &&
				node.callee.property.name === "attribute"
			const [first] = node.arguments
			const literalAttribute = attribute && first !== undefined && isOperationalKey(first)
			const positions = name === undefined ? undefined : SPAN_OPTION_POSITIONS.get(name)
			const literalOption =
				positions !== undefined &&
				Arr.some(positions, (index) => {
					const argument = node.arguments[index]
					return argument !== undefined && spellsOperationalKey(argument)
				})
			if (name === "Effect.annotateCurrentSpan" || literalAttribute || literalOption) {
				context.report({ node, message: ATTRIBUTE_MESSAGE })
			}
		}
	})
}

/** `null` and `[]` start a variable's type as `any` or `any[]`, which then evolves with each assignment. */
const isEvolvingInitializer = (init: Expression): boolean => {
	if (init.type === "Literal") {
		return init.value === null && init.raw === "null"
	}
	return init.type === "ArrayExpression" && init.elements.length === 0
}

const noEvolvingTypes: CreateRule = {
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

const noUnusedTemplateLiteral: CreateRule = {
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

const noSvgWithoutTitle: CreateRule = {
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
const cognitiveComplexity: CreateRule = {
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
const noUselessContinue: CreateRule = {
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

const plugin: Readonly<{
	meta: Readonly<{ name: string }>
	rules: Readonly<Record<string, Rule>>
}> = {
	meta: { name: "superstarter" },
	rules: {
		"cognitive-complexity": cognitiveComplexity,
		"no-as-type-assertion": noAsTypeAssertion,
		"no-evolving-types": noEvolvingTypes,
		"no-iife": noIife,
		"no-instanceof-error": noInstanceofError,
		"no-literal-attribute-key": noLiteralAttributeKey,
		"no-literal-span-name": noLiteralSpanName,
		"no-new-error": noNewError,
		"no-nullish-coalescing": noNullishCoalescing,
		"no-svg-without-title": noSvgWithoutTitle,
		"no-try": noTry,
		"no-unused-template-literal": noUnusedTemplateLiteral,
		"no-useless-continue": noUselessContinue
	}
}

export default plugin
