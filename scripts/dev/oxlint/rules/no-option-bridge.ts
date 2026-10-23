import { Array as Arr } from "effect"
import { type CreateRule, type Expression } from "#scripts/dev/oxlint/rule.ts"

/** The Option functions whose only work is turning absence back into a marker. */
const BRIDGES: ReadonlyArray<string> = ["getOrUndefined", "getOrNull"]

const MESSAGE =
	"An Option is bridged back to an absent marker. Keep it an Option to its consumer (Option.match, Option.map, Option.exists, Option.isSome), or make the absent case a variant of its own."

/** `undefined`, `void 0`, `null`, `-1`, `NaN` or `Number.NaN`: a value standing in for "none". */
const isAbsentMarker = (node: Expression): boolean => {
	if (node.type === "Identifier") {
		return node.name === "undefined" || node.name === "NaN"
	}
	if (node.type === "Literal") {
		return node.raw === "null"
	}
	if (node.type === "UnaryExpression") {
		return (
			node.operator === "void" ||
			(node.operator === "-" && node.argument.type === "Literal" && node.argument.value === 1)
		)
	}
	return (
		node.type === "MemberExpression" &&
		!node.computed &&
		node.object.type === "Identifier" &&
		node.object.name === "Number" &&
		node.property.type === "Identifier" &&
		node.property.name === "NaN"
	)
}

/** What one import specifier is to this rule: a binding of Effect's Option module, a bridge imported by its own
 * name, or neither. */
type ImportRole = "option" | "bridge" | "other"

const roleOf = (
	source: string,
	specifier: Readonly<{ kind: string; imported: string | undefined }>
): ImportRole => {
	if (source === "effect") {
		return specifier.imported === "Option" ? "option" : "other"
	}
	if (source !== "effect/Option") {
		return "other"
	}
	if (specifier.kind === "ImportNamespaceSpecifier") {
		return "option"
	}
	return specifier.imported !== undefined && Arr.contains(BRIDGES, specifier.imported)
		? "bridge"
		: "other"
}

/** What a thunk evaluates to: an arrow's expression body, or the one return of a block that only returns. */
const thunkResults = (node: Expression): ReadonlyArray<Expression> => {
	if (node.type !== "ArrowFunctionExpression") {
		return []
	}
	if (node.body.type !== "BlockStatement") {
		return [node.body]
	}
	const [statement, ...rest] = node.body.body
	return statement !== undefined &&
		rest.length === 0 &&
		statement.type === "ReturnStatement" &&
		statement.argument !== null
		? [statement.argument]
		: []
}

/**
 * The bridges from an Option back to an absent marker: `getOrUndefined` and `getOrNull`, and `getOrElse` whose thunk
 * returns `undefined`, `null`, `-1` or `NaN`, an Option allocated only to turn back into a marker. The rule follows
 * the file's own binding of Effect's Option (the barrel's `Option` under any alias, or a namespace import of
 * `effect/Option`), so an unrelated `Option` is not read as Effect's. `""` and `0` stay legal defaults.
 */
export const noOptionBridge: CreateRule = {
	meta: { type: "problem" },
	create: (context) => {
		const optionNames = new Set<string>()
		const isOptionMember = (node: Expression, names: ReadonlyArray<string>): boolean =>
			node.type === "MemberExpression" &&
			!node.computed &&
			node.object.type === "Identifier" &&
			optionNames.has(node.object.name) &&
			node.property.type === "Identifier" &&
			Arr.contains(names, node.property.name)
		return {
			ImportDeclaration: (node) => {
				for (const specifier of node.specifiers) {
					const imported =
						specifier.type === "ImportSpecifier" && specifier.imported.type === "Identifier"
							? specifier.imported.name
							: undefined
					const role = roleOf(node.source.value, { kind: specifier.type, imported })
					if (role === "option") {
						optionNames.add(specifier.local.name)
					}
					if (role === "bridge") {
						context.report({ node: specifier, message: MESSAGE })
					}
				}
			},
			MemberExpression: (node) => {
				if (isOptionMember(node, BRIDGES)) {
					context.report({ node, message: MESSAGE })
				}
			},
			CallExpression: (node) => {
				const returnsMarker = Arr.some(
					node.arguments,
					(argument) =>
						argument.type !== "SpreadElement" && Arr.some(thunkResults(argument), isAbsentMarker)
				)
				if (isOptionMember(node.callee, ["getOrElse"]) && returnsMarker) {
					context.report({ node, message: MESSAGE })
				}
			}
		}
	}
}
