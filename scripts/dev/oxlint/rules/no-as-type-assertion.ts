import { Array as Arr } from "effect"
import { type CreateRule, type NodeOf, docs } from "#scripts/dev/oxlint/rule.ts"

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

export const noAsTypeAssertion: CreateRule = {
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
