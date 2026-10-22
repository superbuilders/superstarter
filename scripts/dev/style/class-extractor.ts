import { Array as Arr, Option, Predicate, Result, String as Str } from "effect"
import * as ts from "typescript/unstable/ast"
import { type Checker, type Type, TypeFlags } from "typescript/unstable/sync"
import { type Finding, findingAt } from "#scripts/dev/shared/finding.ts"
import { packageOfSymbol } from "#scripts/dev/shared/packages.ts"
import { appRoot } from "#scripts/dev/shared/repository.ts"
import type { Semantics } from "#scripts/dev/shared/semantic.ts"
import type { ClassList, StyleRule } from "#scripts/dev/style/types.ts"

/** How a class helper reads its arguments: `join` helpers (cn, clsx, twMerge, cx) take class values the way clsx
 * does; `variants` (cva) takes a base and a config of variant classes. */
type HelperKind = "join" | "variants"

/** The class helpers libraries declare, by package and export. */
const LIBRARY_HELPERS: ReadonlyArray<Readonly<{ module: string; name: string; kind: HelperKind }>> =
	[
		{ module: "clsx", name: "clsx", kind: "join" },
		{ module: "tailwind-merge", name: "twMerge", kind: "join" },
		{ module: "class-variance-authority", name: "cva", kind: "variants" },
		{ module: "class-variance-authority", name: "cx", kind: "join" }
	]

/** The app's own `cn`, the module shadcn's components.json names as their utils. */
const APP_CLASS_HELPER = { file: `${appRoot}/src/lib/cn.ts`, name: "cn" }

/** Type members a class value may hold that add no class: clsx skips them. */
const CLASSLESS_TYPES =
	TypeFlags.Undefined | TypeFlags.Null | TypeFlags.Void | TypeFlags.BooleanLiteral

const DYNAMIC_CLASS = {
	message:
		"Interpolation inside a class: Tailwind generates only the classes it reads whole in the source, so this one never exists.",
	suggestion: 'Map each state to a complete class: `wide ? "w-full" : "w-1/2"`.'
}

const UNVERIFIABLE_SUGGESTION =
	"Write the classes as literals, a union of literal types, or a lookup in an `as const` table."

/** What reading a file's classes works with: the checker and its lookups, and where what it reads goes. A literal
 * is read once per run, however many paths reach it. */
type Reader = Readonly<{
	checker: Checker
	semantics: Semantics
	firstVisit: (node: ts.Node) => boolean
	list: (list: ClassList) => void
	report: (finding: Finding) => void
}>

/** A JSX attribute that takes classes: `className`, or a component's `*ClassName` slot. */
const isClassName = (name: string): boolean => {
	if (name === "className") {
		return true
	}
	return Str.endsWith("ClassName")(name)
}

const isWrapper = Predicate.or(
	Predicate.or(ts.isParenthesizedExpression, ts.isAsExpression),
	Predicate.or(ts.isSatisfiesExpression, ts.isNonNullExpression)
)

const unwrapped = (expression: ts.Expression): ts.Expression =>
	isWrapper(expression) ? unwrapped(expression.expression) : expression

const startsWithSpace = (text: string): boolean => /^\s/.test(text)

const endsWithSpace = (text: string): boolean => /\s$/.test(text)

/** The parameter a binding the caller passes in belongs to: the parameter itself, or the one a name is
 * destructured from. */
const parameterOf = (node: ts.Node): Option.Option<ts.ParameterDeclaration> => {
	if (ts.isParameterDeclaration(node)) {
		return Option.some(node)
	}
	return ts.isBindingElement(node) ? parameterOf(node.parent.parent) : Option.none()
}

/** A parameter of the app's `cn` itself: the classes its callers pass, read at every call. */
const isHelperParameter = (node: ts.Node): boolean =>
	Option.exists(parameterOf(node), (parameter) => {
		const declaration = parameter.parent.parent
		return (
			ts.isVariableDeclaration(declaration) &&
			ts.isIdentifier(declaration.name) &&
			declaration.name.text === APP_CLASS_HELPER.name &&
			declaration.getSourceFile().fileName === APP_CLASS_HELPER.file
		)
	})

const bindingNameOf = (node: ts.Node): string | undefined => {
	if (!ts.isParameterDeclaration(node) && !ts.isBindingElement(node)) {
		return undefined
	}
	if (
		ts.isBindingElement(node) &&
		node.propertyName !== undefined &&
		ts.isIdentifier(node.propertyName)
	) {
		return node.propertyName.text
	}
	return node.name !== undefined && ts.isIdentifier(node.name) ? node.name.text : undefined
}

/** A component's className-like parameter, or a parameter of `cn` itself. */
const isForwardedBinding = (declaration: ts.Node): boolean => {
	if (isHelperParameter(declaration)) {
		return true
	}
	const name = bindingNameOf(declaration)
	return name !== undefined && isClassName(name) && Option.isSome(parameterOf(declaration))
}

/** The words of a class string, each with its offset in the string. */
const wordsOf = (text: string): ReadonlyArray<Readonly<{ word: string; offset: number }>> => {
	const words: Array<Readonly<{ word: string; offset: number }>> = []
	let offset = 0
	for (const part of Str.split(/(\s+)/)(text)) {
		if (Str.isNonEmpty(Str.trim(part))) {
			words.push({ word: part, offset })
		}
		offset += part.length
	}
	return words
}

/** The classes of a piece of literal text that starts `offset` characters into `node`. */
const tokensAt = (node: ts.Node, text: string, offset: number): ClassList => {
	const sourceFile = node.getSourceFile()
	const start = node.getStart(sourceFile) + offset
	return Arr.map(wordsOf(text), ({ word, offset: at }) => {
		const { line, character } = sourceFile.getLineAndCharacterOfPosition(start + at)
		return { text: word, file: sourceFile.fileName, line: line + 1, column: character + 1 }
	})
}

const report = (
	reader: Reader,
	rule: Extract<StyleRule, "no-dynamic-class" | "no-unverifiable-class">,
	node: ts.Node,
	said: Readonly<{ message: string; suggestion: string }>
): void => {
	reader.report(findingAt({ sourceFile: node.getSourceFile(), rule, report: { node, ...said } }))
}

/** The one declaration a name resolves to, through import aliases. */
const declarationOf = (reader: Reader, node: ts.Node): Option.Option<ts.Node> => {
	const symbol = reader.semantics.symbolAt(node)
	if (symbol === undefined) {
		return Option.none()
	}
	const declarations = reader.semantics.declarationsOf(reader.semantics.aliasTarget(symbol))
	return declarations.length === 1 ? Arr.head(declarations) : Option.none()
}

/** A value a library declares, such as next/font's `variable`: that library generates its classes. */
const isLibraryValue = (reader: Reader, node: ts.Node): boolean => {
	const symbol = reader.semantics.symbolAt(node)
	return symbol !== undefined && packageOfSymbol(reader.semantics.aliasTarget(symbol)) !== undefined
}

const helperOf = (reader: Reader, call: ts.CallExpression): Option.Option<HelperKind> => {
	const symbol = reader.semantics.symbolAt(call.expression)
	if (symbol === undefined) {
		return Option.none()
	}
	const target = reader.semantics.aliasTarget(symbol)
	const library = Arr.findFirst(
		LIBRARY_HELPERS,
		(helper) => helper.name === target.name && packageOfSymbol(target) === helper.module
	)
	if (Option.isSome(library)) {
		return Option.some(library.value.kind)
	}
	if (target.name !== APP_CLASS_HELPER.name) {
		return Option.none()
	}
	return Arr.some(
		reader.semantics.declarationsOf(target),
		(declaration) => declaration.getSourceFile().fileName === APP_CLASS_HELPER.file
	)
		? Option.some("join")
		: Option.none()
}

/** The value a name holds when its one declaration gives it: a constant's or an object property's initializer. */
const initializerOf = (reader: Reader, node: ts.Expression): Option.Option<ts.Expression> =>
	Option.flatMap(declarationOf(reader, node), (declaration) => {
		if (
			ts.isVariableDeclaration(declaration) &&
			(declaration.parent.flags & ts.NodeFlags.Const) !== 0
		) {
			return Option.fromUndefinedOr(declaration.initializer)
		}
		return ts.isPropertyAssignment(declaration)
			? Option.some(declaration.initializer)
			: Option.none()
	})

/** `buttonVariants(…)` where `const buttonVariants = cva(…)`: its classes are read at the cva call. */
const isVariantsCall = (reader: Reader, call: ts.CallExpression): boolean =>
	Option.exists(initializerOf(reader, call.expression), (initializer) => {
		const value = unwrapped(initializer)
		return ts.isCallExpression(value) && Option.contains(helperOf(reader, value), "variants")
	})

/** A component's own className-like parameter, a className-like member of one, or a parameter of `cn` itself:
 * read where the caller writes it. */
const isForwardedClass = (reader: Reader, expression: ts.Expression): boolean => {
	if (!ts.isPropertyAccessExpression(expression)) {
		return Option.exists(declarationOf(reader, expression), isForwardedBinding)
	}
	return (
		isClassName(expression.name.text) &&
		Option.exists(declarationOf(reader, expression.expression), (declaration) =>
			Option.isSome(parameterOf(declaration))
		)
	)
}

/** An expression read through its type: each string literal member is a class list, and any member that is not
 * a literal or a classless value makes the expression unverifiable. */
const fromType = (reader: Reader, expression: ts.Expression): void => {
	const type = reader.semantics.typeAt(expression)
	if (type === undefined) {
		report(reader, "no-unverifiable-class", expression, {
			message: "A class expression the checker gives no type holds classes no one can check.",
			suggestion: UNVERIFIABLE_SUGGESTION
		})
		return
	}
	const members: ReadonlyArray<Type> = type.isUnionType() ? type.getTypes() : [type]
	const classed = Arr.filter(members, (member) => (member.flags & CLASSLESS_TYPES) === 0)
	const literals = Arr.filterMap(classed, (member) =>
		member.isStringLiteralType() ? Result.succeed(member.value) : Result.failVoid
	)
	if (literals.length < classed.length) {
		report(reader, "no-unverifiable-class", expression, {
			message: `A class expression of type '${reader.checker.typeToString(type)}' holds classes no one can check.`,
			suggestion: UNVERIFIABLE_SUGGESTION
		})
		return
	}
	for (const literal of literals) {
		reader.list(tokensAt(expression, literal, 0))
	}
}

/** Whether the interpolation after `before` and ahead of `after` stands as whole classes: whitespace or the
 * template's ends on both sides. */
const standsAlone = (
	input: Readonly<{ before: string; after: string; first: boolean; last: boolean }>
): boolean => {
	if (!endsWithSpace(input.before) && !(input.first && input.before === "")) {
		return false
	}
	if (startsWithSpace(input.after)) {
		return true
	}
	return input.last && input.after === ""
}

/** A template's literal text is one class list, less the partial classes glued to an interpolation; an
 * interpolation that stands alone is read as classes, one glued inside a class is `no-dynamic-class`. */
const fromTemplate = (reader: Reader, template: ts.TemplateExpression): void => {
	const pieces = [template.head, ...Arr.map(template.templateSpans, (span) => span.literal)]
	const spans = template.templateSpans
	const alone = Arr.makeBy(spans.length, (index) =>
		standsAlone({
			before: Option.match(Arr.get(pieces, index), {
				onNone: () => "",
				onSome: (piece) => piece.text
			}),
			after: Option.match(Arr.get(pieces, index + 1), {
				onNone: () => "",
				onSome: (piece) => piece.text
			}),
			first: index === 0,
			last: index === spans.length - 1
		})
	)
	const tokens = Arr.flatMap(pieces, (piece, index) => {
		const words = tokensAt(piece, piece.text, 1)
		const gluedBefore = index > 0 && !Option.contains(Arr.get(alone, index - 1), true)
		const gluedAfter = index < spans.length && !Option.contains(Arr.get(alone, index), true)
		const kept = gluedBefore && !startsWithSpace(piece.text) ? Arr.drop(words, 1) : words
		return gluedAfter && !endsWithSpace(piece.text) ? Arr.dropRight(kept, 1) : kept
	})
	reader.list(tokens)
	for (const [index, span] of spans.entries()) {
		if (Option.contains(Arr.get(alone, index), true)) {
			classesOf(reader, span.expression)
		} else {
			report(reader, "no-dynamic-class", span.expression, DYNAMIC_CLASS)
		}
	}
}

const objectLiteralOf = (
	reader: Reader,
	expression: ts.Expression
): Option.Option<ts.ObjectLiteralExpression> => {
	const value = unwrapped(expression)
	if (ts.isObjectLiteralExpression(value)) {
		return Option.some(value)
	}
	return Option.flatMap(initializerOf(reader, value), (initializer) =>
		objectLiteralOf(reader, initializer)
	)
}

const isPlainName = Predicate.or(ts.isIdentifier, ts.isStringLiteral)

const propertyNameOf = (property: ts.PropertyAssignment): string | undefined =>
	isPlainName(property.name) ? property.name.text : undefined

/** The values of an object literal's properties, every one or the named ones; an expression that is no literal
 * object, even through its constant, is unverifiable. */
const propertyValuesOf = (
	reader: Reader,
	expression: ts.Expression,
	names?: ReadonlyArray<string>
): ReadonlyArray<ts.Expression> =>
	Option.match(objectLiteralOf(reader, expression), {
		onNone: () => {
			fromType(reader, expression)
			return []
		},
		onSome: (object) =>
			Arr.filterMap(object.properties, (property) => {
				if (!ts.isPropertyAssignment(property)) {
					return Result.failVoid
				}
				const name = propertyNameOf(property)
				if (names !== undefined && (name === undefined || !Arr.contains(names, name))) {
					return Result.failVoid
				}
				return Result.succeed(property.initializer)
			})
	})

/** cva(base, { variants: { name: { value: classes } }, compoundVariants: [{ class }] }). */
const fromVariants = (reader: Reader, call: ts.CallExpression): void => {
	const [base, config] = call.arguments
	if (base !== undefined) {
		classesOf(reader, base)
	}
	if (config === undefined) {
		return
	}
	const variants = Arr.flatMap(propertyValuesOf(reader, config, ["variants"]), (section) =>
		propertyValuesOf(reader, section)
	)
	const compounds = Arr.flatMap(propertyValuesOf(reader, config, ["compoundVariants"]), (list) => {
		const entries = unwrapped(list)
		return ts.isArrayLiteralExpression(entries) ? entries.elements : []
	})
	const classes = [
		...Arr.flatMap(variants, (variant) => propertyValuesOf(reader, variant)),
		...Arr.flatMap(compounds, (entry) => propertyValuesOf(reader, entry, ["class", "className"]))
	]
	for (const value of classes) {
		classesOf(reader, value)
	}
}

/** A clsx object's key is a class list; its value is only the condition. */
const fromProperty = (reader: Reader, property: ts.ObjectLiteralElementLike): void => {
	if (ts.isSpreadAssignment(property)) {
		classesOf(reader, property.expression)
		return
	}
	if (!ts.isPropertyAssignment(property) && !ts.isShorthandPropertyAssignment(property)) {
		return
	}
	const key = property.name
	if (ts.isComputedPropertyName(key)) {
		classesOf(reader, key.expression)
		return
	}
	if (ts.isIdentifier(key) || ts.isStringLiteral(key)) {
		reader.list(tokensAt(key, key.text, ts.isStringLiteral(key) ? 1 : 0))
	}
}

const fromCall = (reader: Reader, call: ts.CallExpression): void => {
	const helper = helperOf(reader, call)
	if (Option.contains(helper, "variants")) {
		fromVariants(reader, call)
		return
	}
	if (Option.isNone(helper)) {
		if (!isVariantsCall(reader, call)) {
			fromType(reader, call)
		}
		return
	}
	for (const argument of call.arguments) {
		classesOf(reader, ts.isSpreadElement(argument) ? argument.expression : argument)
	}
}

const fromBinary = (reader: Reader, binary: ts.BinaryExpression): void => {
	const operator = binary.operatorToken.kind
	if (operator === ts.SyntaxKind.AmpersandAmpersandToken) {
		classesOf(reader, binary.right)
		return
	}
	if (operator === ts.SyntaxKind.BarBarToken || operator === ts.SyntaxKind.QuestionQuestionToken) {
		classesOf(reader, binary.left)
		classesOf(reader, binary.right)
		return
	}
	fromType(reader, binary)
}

const fromName = (reader: Reader, name: ts.Expression): void => {
	if (isForwardedClass(reader, name) || isLibraryValue(reader, name)) {
		return
	}
	Option.match(initializerOf(reader, name), {
		onNone: () => {
			fromType(reader, name)
		},
		onSome: (initializer) => {
			classesOf(reader, initializer)
		}
	})
}

/** Reads one class expression down to its literals; a node already read in this run is skipped. */
const classesOf = (reader: Reader, node: ts.Expression): void => {
	const expression = unwrapped(node)
	if (!reader.firstVisit(expression)) {
		return
	}
	if (ts.isStringLiteral(expression) || ts.isNoSubstitutionTemplateLiteral(expression)) {
		reader.list(tokensAt(expression, expression.text, 1))
		return
	}
	if (ts.isConditionalExpression(expression)) {
		classesOf(reader, expression.whenTrue)
		classesOf(reader, expression.whenFalse)
		return
	}
	if (ts.isArrayLiteralExpression(expression)) {
		for (const element of expression.elements) {
			classesOf(reader, ts.isSpreadElement(element) ? element.expression : element)
		}
		return
	}
	if (ts.isObjectLiteralExpression(expression)) {
		for (const property of expression.properties) {
			fromProperty(reader, property)
		}
		return
	}
	readComposite(reader, expression)
}

/** The class expressions built from others: templates, operators, calls and names. */
const readComposite = (reader: Reader, expression: ts.Expression): void => {
	if (ts.isTemplateExpression(expression)) {
		fromTemplate(reader, expression)
		return
	}
	if (ts.isBinaryExpression(expression)) {
		fromBinary(reader, expression)
		return
	}
	if (ts.isCallExpression(expression)) {
		fromCall(reader, expression)
		return
	}
	if (ts.isIdentifier(expression) || ts.isPropertyAccessExpression(expression)) {
		fromName(reader, expression)
		return
	}
	fromType(reader, expression)
}

const fromAttribute = (reader: Reader, attribute: ts.JsxAttribute): void => {
	const initializer = attribute.initializer
	if (initializer !== undefined && ts.isStringLiteral(initializer)) {
		classesOf(reader, initializer)
		return
	}
	if (
		initializer !== undefined &&
		ts.isJsxExpression(initializer) &&
		initializer.expression !== undefined
	) {
		classesOf(reader, initializer.expression)
	}
}

/** The static class lists and the findings for class expressions that hold classes no one can read. */
export type FileClasses = Readonly<{
	lists: ReadonlyArray<ClassList>
	findings: ReadonlyArray<Finding>
}>

/**
 * Finds every class string in a file: JSX `className` and `*ClassName` attributes, and every call the checker
 * resolves to a class helper, anywhere in the file. A class expression is read down to its literals: branches of
 * conditionals and logical operators, a template's literal text, clsx-style objects and arrays, cva's base, variant
 * values and compound classes, and names followed to the constants that declare them. What cannot be read
 * statically is a finding: an interpolation inside a class (`no-dynamic-class`), or an expression typed as a plain
 * `string` (`no-unverifiable-class`); a union of literal types is read literal by literal. A component's own
 * `className` parameter is read where its caller writes it, a call to a cva-made function where cva is called, and
 * a class a library hands over (next/font's `variable`) is that library's to generate. One extractor serves a whole
 * run, so a literal reached from several files is read once.
 */
export const classExtractor = (checker: Checker) => {
	const visited = new Set<string>()
	const firstVisit = (node: ts.Node): boolean => {
		const key = `${node.getSourceFile().fileName}:${node.pos}:${node.end}`
		if (visited.has(key)) {
			return false
		}
		visited.add(key)
		return true
	}
	return (input: Readonly<{ sourceFile: ts.SourceFile; semantics: Semantics }>): FileClasses => {
		const lists: Array<ClassList> = []
		const findings: Array<Finding> = []
		const reader: Reader = {
			checker,
			semantics: input.semantics,
			firstVisit,
			list: (list) => {
				lists.push(list)
			},
			report: (finding) => {
				findings.push(finding)
			}
		}
		const walk = (node: ts.Node): void => {
			if (ts.isJsxAttribute(node) && ts.isIdentifier(node.name) && isClassName(node.name.text)) {
				fromAttribute(reader, node)
			}
			if (ts.isCallExpression(node) && Option.isSome(helperOf(reader, node))) {
				classesOf(reader, node)
			}
			node.forEachChild(walk)
		}
		walk(input.sourceFile)
		return { lists, findings }
	}
}
