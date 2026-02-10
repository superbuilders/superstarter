#!/usr/bin/env bun
/**
 * Super Lint - Type-Aware Linter
 *
 * Complements Biome with rules requiring TypeScript's type checker.
 * Detects impossible/dead branches that static analysis alone cannot find.
 *
 * Rules:
 *   - no-null-undefined-union: Ban types with both null and undefined
 *   - no-unnecessary-condition: Flag always-true/false conditions
 *   - no-unnecessary-default-case: Flag unreachable default in exhaustive switch
 *   - prefer-early-return: Enforce early return pattern
 *   - no-impossible-logical-or: Flag || where left is always truthy
 *   - no-optional-array: Arrays should use [] not null/undefined
 *   - no-arrow-functions: Use named function declarations
 *   - no-object-module: Ban object namespaces, object classes, and class definitions - use ESM modules
 *   - no-extends-error: Ban extending Error - use errors.new() sentinel pattern
 *   - no-pointless-indirection: Don't wrap function calls without adding value
 *   - no-instanceof-error: Ban instanceof Error (useThrowOnlyError guarantees Error)
 *
 * Usage:
 *   bun scripts/super-lint.ts              # Check all files
 *   bun scripts/super-lint.ts --json       # Output JSON for tooling
 *   bun scripts/super-lint.ts src/foo.ts   # Check specific file
 */

import * as errors from "@superbuilders/errors"
import type { Logger } from "@superbuilders/slog"
import * as ts from "typescript"

// Logger implementation
function formatLogData(data?: Record<string, unknown>): string {
	if (data === undefined) {
		return ""
	}
	return ` ${JSON.stringify(data)}`
}

const logger: Logger = {
	debug(message: string, data?: Record<string, unknown>): void {
		process.stderr.write(`DEBUG super-lint: ${message}${formatLogData(data)}\n`)
	},
	info(message: string, data?: Record<string, unknown>): void {
		process.stderr.write(`INFO super-lint: ${message}${formatLogData(data)}\n`)
	},
	warn(message: string, data?: Record<string, unknown>): void {
		process.stderr.write(`WARN super-lint: ${message}${formatLogData(data)}\n`)
	},
	error(message: string, data?: Record<string, unknown>): void {
		process.stderr.write(`ERROR super-lint: ${message}${formatLogData(data)}\n`)
	}
}

type RuleId =
	| "no-null-undefined-union"
	| "no-unnecessary-condition"
	| "no-unnecessary-default-case"
	| "prefer-early-return"
	| "no-impossible-logical-or"
	| "no-optional-array"
	| "no-arrow-functions"
	| "no-object-module"
	| "no-extends-error"
	| "no-pointless-indirection"
	| "no-instanceof-error"

interface Violation {
	file: string
	line: number
	column: number
	rule: RuleId
	message: string
	suggestion?: string
}

function createProgram(): ts.Program {
	const configPath = ts.findConfigFile(process.cwd(), ts.sys.fileExists, "tsconfig.json")
	if (!configPath) {
		logger.error("tsconfig.json not found")
		throw errors.new("tsconfig.json not found")
	}

	const configFile = ts.readConfigFile(configPath, ts.sys.readFile)
	if (configFile.error) {
		logger.error("failed to read tsconfig.json", {
			error: configFile.error.messageText
		})
		throw errors.new("failed to read tsconfig.json")
	}

	const parsed = ts.parseJsonConfigFileContent(configFile.config, ts.sys, process.cwd())

	return ts.createProgram(parsed.fileNames, parsed.options)
}

/**
 * Checks for types that include both null and undefined.
 *
 * Only checks function boundaries (parameters, return types) and property signatures.
 * Does NOT check variable declarations - this allows Zod schemas to use
 * .nullable().optional() for normalization at API boundaries.
 */
function checkNullUndefinedUnion(sourceFile: ts.SourceFile, checker: ts.TypeChecker): Violation[] {
	const violations: Violation[] = []

	function hasBothNullAndUndefined(type: ts.Type): boolean {
		const typeStr = checker.typeToString(type)
		return typeStr.includes("null") && typeStr.includes("undefined")
	}

	function typeIncludesNull(typeNode: ts.TypeNode): boolean {
		if (ts.isUnionTypeNode(typeNode)) {
			return typeNode.types.some(typeIncludesNull)
		}
		if (ts.isLiteralTypeNode(typeNode)) {
			return typeNode.literal.kind === ts.SyntaxKind.NullKeyword
		}
		return typeNode.kind === ts.SyntaxKind.NullKeyword
	}

	function getPropertyName(node: ts.PropertySignature | ts.PropertyDeclaration): string {
		if (ts.isIdentifier(node.name)) {
			return node.name.text
		}
		return node.name.getText(sourceFile)
	}

	function getParamName(node: ts.ParameterDeclaration): string {
		if (ts.isIdentifier(node.name)) {
			return node.name.text
		}
		return node.name.getText(sourceFile)
	}

	function getFunctionName(
		node: ts.FunctionDeclaration | ts.MethodDeclaration | ts.ArrowFunction | ts.FunctionExpression
	): string {
		if (ts.isFunctionDeclaration(node) || ts.isMethodDeclaration(node)) {
			if (!node.name) {
				return "(anonymous)"
			}
			return node.name.getText(sourceFile)
		}
		const parent = node.parent
		if (ts.isVariableDeclaration(parent) && ts.isIdentifier(parent.name)) {
			return parent.name.text
		}
		return "(anonymous)"
	}

	function checkPropertyNode(node: ts.PropertySignature | ts.PropertyDeclaration): void {
		const isOptional = node.questionToken !== undefined
		if (!isOptional || !node.type || !typeIncludesNull(node.type)) {
			return
		}
		const { line, character } = sourceFile.getLineAndCharacterOfPosition(
			node.name.getStart(sourceFile)
		)
		const propName = getPropertyName(node)
		const typeStr = node.type.getText(sourceFile)
		const baseType = typeStr
			.replace(/\s*\|\s*null/g, "")
			.replace(/\s*\|\s*undefined/g, "")
			.replace(/null\s*\|\s*/g, "")
			.replace(/undefined\s*\|\s*/g, "")
			.trim()
		violations.push({
			file: sourceFile.fileName,
			line: line + 1,
			column: character + 1,
			rule: "no-null-undefined-union",
			message: `Optional property '${propName}' with '| null' creates triple-branch confusion (undefined, null, or value).`,
			suggestion: `Change to '${propName}: ${baseType} | null' (nullable) or '${propName}?: ${baseType}' (optional)`
		})
	}

	function checkParameterNode(node: ts.ParameterDeclaration): void {
		if (!node.type) {
			return
		}
		const isOptional = node.questionToken !== undefined
		const paramName = getParamName(node)
		const typeStr = node.type.getText(sourceFile)
		const baseType = typeStr
			.replace(/\s*\|\s*null/g, "")
			.replace(/\s*\|\s*undefined/g, "")
			.replace(/null\s*\|\s*/g, "")
			.replace(/undefined\s*\|\s*/g, "")
			.trim()

		if (isOptional && typeIncludesNull(node.type)) {
			const { line, character } = sourceFile.getLineAndCharacterOfPosition(
				node.name.getStart(sourceFile)
			)
			violations.push({
				file: sourceFile.fileName,
				line: line + 1,
				column: character + 1,
				rule: "no-null-undefined-union",
				message: `Optional parameter '${paramName}' with '| null' creates triple-branch confusion.`,
				suggestion: `Change to '${paramName}: ${baseType} | null' (nullable) or '${paramName}?: ${baseType}' (optional)`
			})
			return
		}

		if (isOptional) {
			return
		}

		const type = checker.getTypeFromTypeNode(node.type)
		if (!hasBothNullAndUndefined(type) || !ts.isUnionTypeNode(node.type)) {
			return
		}
		const { line, character } = sourceFile.getLineAndCharacterOfPosition(
			node.name.getStart(sourceFile)
		)
		violations.push({
			file: sourceFile.fileName,
			line: line + 1,
			column: character + 1,
			rule: "no-null-undefined-union",
			message: `Parameter '${paramName}' has type '${typeStr}' with both null and undefined.`,
			suggestion: `Change to '${paramName}: ${baseType} | null' or '${paramName}: ${baseType} | undefined'`
		})
	}

	function checkFunctionReturnType(
		node: ts.FunctionDeclaration | ts.MethodDeclaration | ts.ArrowFunction | ts.FunctionExpression
	): void {
		if (!node.type || !ts.isUnionTypeNode(node.type)) {
			return
		}
		const type = checker.getTypeFromTypeNode(node.type)
		if (!hasBothNullAndUndefined(type)) {
			return
		}
		const { line, character } = sourceFile.getLineAndCharacterOfPosition(
			node.type.getStart(sourceFile)
		)
		const funcName = getFunctionName(node)
		const typeStr = node.type.getText(sourceFile)
		const baseType = typeStr
			.replace(/\s*\|\s*null/g, "")
			.replace(/\s*\|\s*undefined/g, "")
			.replace(/null\s*\|\s*/g, "")
			.replace(/undefined\s*\|\s*/g, "")
			.trim()
		violations.push({
			file: sourceFile.fileName,
			line: line + 1,
			column: character + 1,
			rule: "no-null-undefined-union",
			message: `Function '${funcName}' return type '${typeStr}' has both null and undefined.`,
			suggestion: `Change return type to '${baseType} | null' or '${baseType} | undefined'`
		})
	}

	function walk(node: ts.Node): void {
		if (ts.isPropertySignature(node) || ts.isPropertyDeclaration(node)) {
			checkPropertyNode(node)
		}

		if (ts.isParameter(node)) {
			checkParameterNode(node)
		}

		if (
			ts.isFunctionDeclaration(node) ||
			ts.isMethodDeclaration(node) ||
			ts.isArrowFunction(node) ||
			ts.isFunctionExpression(node)
		) {
			checkFunctionReturnType(node)
		}

		ts.forEachChild(node, walk)
	}

	walk(sourceFile)
	return violations
}

function checkUnnecessaryCondition(
	sourceFile: ts.SourceFile,
	checker: ts.TypeChecker
): Violation[] {
	const violations: Violation[] = []

	function isNullishCheck(
		node: ts.BinaryExpression
	): { variable: ts.Node; isNegated: boolean } | null {
		const op = node.operatorToken.kind
		if (
			op !== ts.SyntaxKind.EqualsEqualsEqualsToken &&
			op !== ts.SyntaxKind.ExclamationEqualsEqualsToken
		) {
			return null
		}

		const isNegated = op === ts.SyntaxKind.ExclamationEqualsEqualsToken

		if (
			node.right.kind === ts.SyntaxKind.NullKeyword ||
			(ts.isIdentifier(node.right) && node.right.text === "undefined")
		) {
			return { variable: node.left, isNegated }
		}
		if (
			node.left.kind === ts.SyntaxKind.NullKeyword ||
			(ts.isIdentifier(node.left) && node.left.text === "undefined")
		) {
			return { variable: node.right, isNegated }
		}

		return null
	}

	function isNonLiteralElementAccess(node: ts.ElementAccessExpression): boolean {
		const arg = node.argumentExpression
		return !ts.isStringLiteral(arg) && !ts.isNumericLiteral(arg)
	}

	function isDeclDynamic(decl: ts.VariableDeclaration): boolean {
		if (decl.initializer && ts.isElementAccessExpression(decl.initializer)) {
			if (isNonLiteralElementAccess(decl.initializer)) {
				return true
			}
		}

		const parent = decl.parent?.parent
		if (parent && ts.isForOfStatement(parent)) {
			return true
		}
		if (parent && ts.isForInStatement(parent)) {
			return true
		}

		return false
	}

	function isIdentifierDynamic(node: ts.Identifier): boolean {
		const symbol = checker.getSymbolAtLocation(node)
		if (!symbol) {
			return false
		}

		const decls = symbol.getDeclarations()
		if (!decls || decls.length === 0) {
			return false
		}

		const decl = decls[0]
		if (!decl) {
			return false
		}

		if (ts.isBindingElement(decl)) {
			return true
		}

		if (!ts.isVariableDeclaration(decl) || !decl.initializer) {
			return false
		}

		return isDeclDynamic(decl)
	}

	function isDynamicAccess(node: ts.Node): boolean {
		if (ts.isElementAccessExpression(node)) {
			return isNonLiteralElementAccess(node)
		}

		if (!ts.isIdentifier(node)) {
			return false
		}

		return isIdentifierDynamic(node)
	}

	function hasNullishFlag(t: ts.Type): boolean {
		if ((t.flags & ts.TypeFlags.Null) !== 0) {
			return true
		}
		return (t.flags & ts.TypeFlags.Undefined) !== 0
	}

	function canBeNullish(type: ts.Type, typeStr: string): boolean {
		if (type.flags & ts.TypeFlags.Any) {
			return true
		}
		if (type.flags & ts.TypeFlags.Unknown) {
			return true
		}

		if (typeStr.includes("null") || typeStr.includes("undefined")) {
			return true
		}

		if (type.isUnion()) {
			return type.types.some(hasNullishFlag)
		}

		return false
	}

	function checkBinaryExpression(node: ts.BinaryExpression): void {
		const nullishCheck = isNullishCheck(node)
		if (!nullishCheck) {
			return
		}

		if (isDynamicAccess(nullishCheck.variable)) {
			ts.forEachChild(node, walk)
			return
		}

		const type = checker.getTypeAtLocation(nullishCheck.variable)
		const typeStr = checker.typeToString(type)

		if (!canBeNullish(type, typeStr)) {
			const { line, character } = sourceFile.getLineAndCharacterOfPosition(
				node.getStart(sourceFile)
			)
			violations.push({
				file: sourceFile.fileName,
				line: line + 1,
				column: character + 1,
				rule: "no-unnecessary-condition",
				message: `Unnecessary null/undefined check. Type '${typeStr}' is never nullish.`,
				suggestion: "Remove the redundant check"
			})
		}
	}

	function walk(node: ts.Node): void {
		if (ts.isBinaryExpression(node)) {
			checkBinaryExpression(node)
		}

		ts.forEachChild(node, walk)
	}

	walk(sourceFile)
	return violations
}

function checkUnnecessaryDefaultCase(
	sourceFile: ts.SourceFile,
	checker: ts.TypeChecker
): Violation[] {
	const violations: Violation[] = []

	function checkSwitchStatement(node: ts.SwitchStatement): void {
		const exprType = checker.getTypeAtLocation(node.expression)

		if (!exprType.isUnion()) {
			return
		}

		const unionTypes = exprType.types
		const handledTypes = new Set<string>()
		let defaultClause: ts.DefaultClause | null = null

		for (const clause of node.caseBlock.clauses) {
			if (ts.isDefaultClause(clause)) {
				defaultClause = clause
			} else if (clause.expression) {
				const caseType = checker.getTypeAtLocation(clause.expression)
				handledTypes.add(checker.typeToString(caseType))
			}
		}

		if (!defaultClause) {
			return
		}

		function isUnhandled(t: string): boolean {
			return !handledTypes.has(t)
		}

		const missingTypes = unionTypes.map((t) => checker.typeToString(t)).filter(isUnhandled)

		if (missingTypes.length > 0) {
			return
		}

		const { line, character } = sourceFile.getLineAndCharacterOfPosition(
			defaultClause.getStart(sourceFile)
		)
		violations.push({
			file: sourceFile.fileName,
			line: line + 1,
			column: character + 1,
			rule: "no-unnecessary-default-case",
			message: `Unnecessary default case. Switch is already exhaustive over all ${unionTypes.length} union members.`,
			suggestion: "Remove the unreachable default clause"
		})
	}

	function walk(node: ts.Node): void {
		if (ts.isSwitchStatement(node)) {
			checkSwitchStatement(node)
		}
		ts.forEachChild(node, walk)
	}

	walk(sourceFile)
	return violations
}

function checkPreferEarlyReturn(sourceFile: ts.SourceFile): Violation[] {
	const violations: Violation[] = []

	function countStatements(node: ts.Node): number {
		if (ts.isBlock(node)) {
			return node.statements.length
		}
		return 1
	}

	function getIfNestingDepth(node: ts.Node, depth = 0): number {
		if (ts.isIfStatement(node)) {
			const thenDepth = getIfNestingDepth(node.thenStatement, depth + 1)
			const elseDepth = node.elseStatement
				? getIfNestingDepth(node.elseStatement, depth + 1)
				: depth
			return Math.max(thenDepth, elseDepth)
		}

		if (!ts.isBlock(node)) {
			return depth
		}

		let maxDepth = depth
		for (const stmt of node.statements) {
			maxDepth = Math.max(maxDepth, getIfNestingDepth(stmt, depth))
		}
		return maxDepth
	}

	function endsWithReturn(node: ts.Node): boolean {
		if (ts.isReturnStatement(node)) {
			return true
		}
		if (!ts.isBlock(node)) {
			return false
		}
		const stmts = node.statements
		if (stmts.length === 0) {
			return false
		}
		const lastStmt = stmts[stmts.length - 1]
		if (!lastStmt) {
			return false
		}
		return endsWithReturn(lastStmt)
	}

	function checkFunctionBody(body: ts.Block, funcNode: ts.Node): void {
		const statements = body.statements
		if (statements.length < 2) {
			return
		}

		const lastStmt = statements[statements.length - 1]
		const secondLastStmt = statements[statements.length - 2]
		if (!lastStmt || !secondLastStmt) {
			return
		}

		if (
			ts.isIfStatement(secondLastStmt) &&
			!secondLastStmt.elseStatement &&
			ts.isReturnStatement(lastStmt)
		) {
			const thenSize = countStatements(secondLastStmt.thenStatement)

			if (thenSize >= 3 && endsWithReturn(secondLastStmt.thenStatement)) {
				const { line, character } = sourceFile.getLineAndCharacterOfPosition(
					secondLastStmt.getStart(sourceFile)
				)
				violations.push({
					file: sourceFile.fileName,
					line: line + 1,
					column: character + 1,
					rule: "prefer-early-return",
					message:
						"Consider inverting condition for early return. Main logic is wrapped in conditional.",
					suggestion: "Invert the condition, return early, and dedent the main logic"
				})
			}
		}

		const maxNesting = getIfNestingDepth(body)
		if (maxNesting >= 3) {
			const { line, character } = sourceFile.getLineAndCharacterOfPosition(
				funcNode.getStart(sourceFile)
			)
			violations.push({
				file: sourceFile.fileName,
				line: line + 1,
				column: character + 1,
				rule: "prefer-early-return",
				message: `Deeply nested conditionals (${maxNesting} levels). Consider using early returns.`,
				suggestion: "Flatten nested ifs by returning early for edge cases"
			})
		}
	}

	function walk(node: ts.Node): void {
		if (ts.isFunctionDeclaration(node) && node.body) {
			checkFunctionBody(node.body, node)
		}
		if (ts.isMethodDeclaration(node) && node.body) {
			checkFunctionBody(node.body, node)
		}
		if (ts.isArrowFunction(node) && ts.isBlock(node.body)) {
			checkFunctionBody(node.body, node)
		}
		if (ts.isFunctionExpression(node) && node.body) {
			checkFunctionBody(node.body, node)
		}

		ts.forEachChild(node, walk)
	}

	walk(sourceFile)
	return violations
}

function checkImpossibleLogicalOr(sourceFile: ts.SourceFile, checker: ts.TypeChecker): Violation[] {
	const violations: Violation[] = []

	function isPossiblyFalsyPrimitive(type: ts.Type): boolean {
		const falsyFlags =
			ts.TypeFlags.String | ts.TypeFlags.Number | ts.TypeFlags.Boolean | ts.TypeFlags.BigInt
		return (type.flags & falsyFlags) !== 0
	}

	function isLiteralTruthy(type: ts.Type): boolean {
		if (type.isStringLiteral()) {
			return type.value !== ""
		}
		if (type.isNumberLiteral()) {
			return type.value !== 0 && !Number.isNaN(type.value)
		}
		return false
	}

	function isAlwaysTruthy(type: ts.Type): boolean {
		const typeStr = checker.typeToString(type)

		if (typeStr.includes("null") || typeStr.includes("undefined")) {
			return false
		}

		if (isPossiblyFalsyPrimitive(type)) {
			return false
		}

		if (type.isUnion()) {
			return type.types.every(isAlwaysTruthy)
		}

		if (type.flags & ts.TypeFlags.Object) {
			return true
		}

		return isLiteralTruthy(type)
	}

	function walk(node: ts.Node): void {
		if (ts.isBinaryExpression(node) && node.operatorToken.kind === ts.SyntaxKind.BarBarToken) {
			const leftType = checker.getTypeAtLocation(node.left)

			if (isAlwaysTruthy(leftType)) {
				const { line, character } = sourceFile.getLineAndCharacterOfPosition(
					node.operatorToken.getStart(sourceFile)
				)
				const typeStr = checker.typeToString(leftType)
				violations.push({
					file: sourceFile.fileName,
					line: line + 1,
					column: character + 1,
					rule: "no-impossible-logical-or",
					message: `Right side of || is unreachable. Left side '${typeStr}' is always truthy.`,
					suggestion: "Remove the || fallback or fix the type"
				})
			}
		}

		ts.forEachChild(node, walk)
	}

	walk(sourceFile)
	return violations
}

/**
 * Detects arrow functions used as variable declarations or class properties.
 * These should be named function declarations for better stack traces.
 * Arrow functions as callbacks or inline arguments are allowed.
 *
 * BAD:  const foo = () => doThing()
 * BAD:  class Foo { bar = () => {} }
 * GOOD: function foo() { doThing() }
 * GOOD: items.map(x => x.id)  // callbacks are fine
 * GOOD: onClick={() => setOpen(true)}  // inline handlers are fine
 */
function checkArrowFunctions(sourceFile: ts.SourceFile): Violation[] {
	const violations: Violation[] = []

	function walk(node: ts.Node): void {
		if (
			ts.isVariableDeclaration(node) &&
			node.initializer &&
			ts.isArrowFunction(node.initializer)
		) {
			const { line, character } = sourceFile.getLineAndCharacterOfPosition(
				node.getStart(sourceFile)
			)
			const name = node.name.getText(sourceFile)
			violations.push({
				file: sourceFile.fileName,
				line: line + 1,
				column: character + 1,
				rule: "no-arrow-functions",
				message: `Arrow function assigned to variable '${name}'. Use a function declaration instead.`,
				suggestion: `Convert to: function ${name}() { ... }`
			})
		}

		if (
			ts.isPropertyDeclaration(node) &&
			node.initializer &&
			ts.isArrowFunction(node.initializer)
		) {
			const { line, character } = sourceFile.getLineAndCharacterOfPosition(
				node.getStart(sourceFile)
			)
			const name = node.name.getText(sourceFile)
			violations.push({
				file: sourceFile.fileName,
				line: line + 1,
				column: character + 1,
				rule: "no-arrow-functions",
				message: `Arrow function as class property '${name}'. Use a method declaration instead.`,
				suggestion: `Convert to: ${name}() { ... }`
			})
		}

		ts.forEachChild(node, walk)
	}

	walk(sourceFile)
	return violations
}

function isFunctionProperty(prop: ts.ObjectLiteralElementLike): boolean {
	if (!ts.isPropertyAssignment(prop)) {
		return false
	}
	const init = prop.initializer
	if (ts.isArrowFunction(init)) {
		return true
	}
	return ts.isFunctionExpression(init)
}

function isDataProperty(prop: ts.ObjectLiteralElementLike): boolean {
	if (ts.isShorthandPropertyAssignment(prop)) {
		return true
	}
	if (!ts.isPropertyAssignment(prop)) {
		return false
	}
	const init = prop.initializer
	return !ts.isArrowFunction(init) && !ts.isFunctionExpression(init)
}

/**
 * Analyzes an object literal and returns function/data counts.
 */
function analyzeObjectLiteral(obj: ts.ObjectLiteralExpression): {
	functionCount: number
	dataCount: number
} {
	let functionCount = 0
	let dataCount = 0
	for (const prop of obj.properties) {
		if (isFunctionProperty(prop)) {
			functionCount++
		} else if (ts.isMethodDeclaration(prop)) {
			functionCount++
		} else if (isDataProperty(prop)) {
			dataCount++
		}
	}
	return { functionCount, dataCount }
}

/**
 * Detects patterns that should be ESM modules instead:
 *   1. Object namespaces - objects with only function properties
 *   2. Object classes - objects mixing functions and state
 *   3. Class definitions - class declarations and expressions
 *
 * All three should be converted to ESM modules with exported functions
 * and module-level state.
 */
function checkObjectModule(sourceFile: ts.SourceFile): Violation[] {
	const violations: Violation[] = []

	function checkObjectLiteral(
		obj: ts.ObjectLiteralExpression,
		node: ts.Node,
		isReturn: boolean
	): void {
		const { functionCount, dataCount } = analyzeObjectLiteral(obj)

		// Object namespace: only functions, no data
		if (functionCount >= 2 && dataCount === 0) {
			const { line, character } = sourceFile.getLineAndCharacterOfPosition(
				node.getStart(sourceFile)
			)
			violations.push({
				file: sourceFile.fileName,
				line: line + 1,
				column: character + 1,
				rule: "no-object-module",
				message: "Object namespace detected. Convert to ESM module with exported functions.",
				suggestion: "Create a module file with exported functions: export function fn1() { ... }"
			})
			return
		}

		// Object class: functions + state
		if (functionCount >= 2 && dataCount >= 1) {
			const { line, character } = sourceFile.getLineAndCharacterOfPosition(
				node.getStart(sourceFile)
			)
			const message = isReturn
				? "Factory returns object with functions and state. Convert to ESM module."
				: "Object mixes functions and state. Convert to ESM module."
			violations.push({
				file: sourceFile.fileName,
				line: line + 1,
				column: character + 1,
				rule: "no-object-module",
				message,
				suggestion: "Create a module with module-level state and exported functions"
			})
		}
	}

	function checkClassNode(node: ts.ClassDeclaration | ts.ClassExpression): void {
		const { line, character } = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile))
		const name = ts.isClassDeclaration(node) && node.name ? node.name.text : "(anonymous)"
		violations.push({
			file: sourceFile.fileName,
			line: line + 1,
			column: character + 1,
			rule: "no-object-module",
			message: `Class '${name}' detected. Convert to ESM module with exported functions.`,
			suggestion:
				"Create a module with module-level state and exported functions instead of a class"
		})
	}

	function walk(node: ts.Node): void {
		// Check object literals in variable declarations
		// Skip if variable has type annotation (implementing an interface)
		if (
			ts.isVariableDeclaration(node) &&
			node.initializer &&
			ts.isObjectLiteralExpression(node.initializer) &&
			!node.type
		) {
			checkObjectLiteral(node.initializer, node.name, false)
		}

		// Check object literals in return statements (factory pattern)
		if (
			ts.isReturnStatement(node) &&
			node.expression &&
			ts.isObjectLiteralExpression(node.expression)
		) {
			checkObjectLiteral(node.expression, node.expression, true)
		}

		// Check class declarations
		if (ts.isClassDeclaration(node)) {
			checkClassNode(node)
		}

		// Check class expressions
		if (ts.isClassExpression(node)) {
			checkClassNode(node)
		}

		ts.forEachChild(node, walk)
	}

	walk(sourceFile)
	return violations
}

/**
 * Detects arrays that are optional or nullable.
 * Arrays should use empty array [] as the empty state, not null/undefined.
 */
function checkOptionalArray(sourceFile: ts.SourceFile, checker: ts.TypeChecker): Violation[] {
	const violations: Violation[] = []

	function isArrayType(type: ts.Type): boolean {
		if (checker.isArrayType(type)) {
			return true
		}
		const symbol = type.getSymbol()
		if (symbol && symbol.getName() === "Array") {
			return true
		}
		return false
	}

	function hasNullishInUnion(type: ts.Type): {
		hasNull: boolean
		hasUndefined: boolean
	} {
		let hasNull = false
		let hasUndefined = false

		if (type.isUnion()) {
			for (const member of type.types) {
				if (member.flags & ts.TypeFlags.Null) {
					hasNull = true
				}
				if (member.flags & ts.TypeFlags.Undefined) {
					hasUndefined = true
				}
			}
		}

		return { hasNull, hasUndefined }
	}

	function checkType(node: ts.Node, type: ts.Type): void {
		if (!type.isUnion()) {
			return
		}

		const hasArray = type.types.some(isArrayType)
		if (!hasArray) {
			return
		}

		const { hasNull, hasUndefined } = hasNullishInUnion(type)
		if (!hasNull && !hasUndefined) {
			return
		}

		const { line, character } = sourceFile.getLineAndCharacterOfPosition(node.getStart())
		const nullishPart =
			hasNull && hasUndefined ? "null | undefined" : hasNull ? "null" : "undefined"

		violations.push({
			file: sourceFile.fileName,
			line: line + 1,
			column: character + 1,
			rule: "no-optional-array",
			message: `Array type includes ${nullishPart}. Use empty array [] as the empty state.`,
			suggestion: "Remove the nullish type and use [] at boundaries instead"
		})
	}

	function walk(node: ts.Node): void {
		if (ts.isVariableDeclaration(node) && node.type) {
			const type = checker.getTypeAtLocation(node)
			checkType(node.name, type)
		}

		if (ts.isPropertySignature(node)) {
			const type = checker.getTypeAtLocation(node)
			checkType(node.name, type)
		}

		if (ts.isPropertyDeclaration(node)) {
			const type = checker.getTypeAtLocation(node)
			checkType(node.name, type)
		}

		if (ts.isParameter(node)) {
			const type = checker.getTypeAtLocation(node)
			checkType(node.name, type)
		}

		if (
			(ts.isFunctionDeclaration(node) ||
				ts.isMethodDeclaration(node) ||
				ts.isArrowFunction(node)) &&
			node.type
		) {
			const type = checker.getTypeFromTypeNode(node.type)
			checkType(node.type, type)
		}

		ts.forEachChild(node, walk)
	}

	walk(sourceFile)
	return violations
}

/**
 * Check if a heritage clause extends Error.
 */
function extendsError(clause: ts.HeritageClause): boolean {
	if (clause.token !== ts.SyntaxKind.ExtendsKeyword) {
		return false
	}

	for (const type of clause.types) {
		const expr = type.expression
		if (ts.isIdentifier(expr) && expr.text === "Error") {
			return true
		}
	}

	return false
}

/**
 * Get the class name from a class declaration or expression.
 */
function getClassName(node: ts.ClassDeclaration | ts.ClassExpression): string {
	if (ts.isClassDeclaration(node) && node.name) {
		return node.name.text
	}
	return "(anonymous)"
}

/**
 * Check a class node for extends Error and record violation if found.
 */
function checkClassExtendsError(
	node: ts.ClassDeclaration | ts.ClassExpression,
	sourceFile: ts.SourceFile,
	violations: Violation[]
): void {
	const heritage = node.heritageClauses
	if (!heritage) {
		return
	}

	for (const clause of heritage) {
		if (!extendsError(clause)) {
			continue
		}

		const { line, character } = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile))
		const name = getClassName(node)
		violations.push({
			file: sourceFile.fileName,
			line: line + 1,
			column: character + 1,
			rule: "no-extends-error",
			message: `Class '${name}' extends Error. Use errors.new() sentinel pattern instead.`,
			suggestion:
				"Replace with: export const Err" +
				name.replace(/Error$/, "") +
				' = errors.new("error message")'
		})
	}
}

/**
 * Detects classes that extend Error. Use errors.new() sentinel pattern instead.
 * Custom error classes are banned - define error constants with errors.new().
 *
 * BAD:  class MyError extends Error { ... }
 * GOOD: export const ErrMyError = errors.new("my error")
 */
function checkNoExtendsError(sourceFile: ts.SourceFile): Violation[] {
	const violations: Violation[] = []

	function walk(node: ts.Node): void {
		if (ts.isClassDeclaration(node) || ts.isClassExpression(node)) {
			checkClassExtendsError(node, sourceFile, violations)
		}

		ts.forEachChild(node, walk)
	}

	walk(sourceFile)
	return violations
}

/**
 * Detects pointless indirection - functions that simply wrap another function call
 * without doing any computation or type narrowing.
 *
 * A function is pointless indirection if:
 *   1. Its body is a single statement that is just a function call
 *   2. It doesn't perform type narrowing (no type predicates)
 *
 * Examples:
 *   function handleClick() { doThing() }  // just use doThing directly
 *   const open = () => setOpen(true)  // inline the call
 *   function log(msg: string) { console.log(msg) }  // just use console.log
 *   function enrichWithId(x: Foo) { return enrich(x, id) }  // inline the call
 *   function parseIt() { return JSON.parse(data) }  // inline the call
 *
 * Does NOT flag:
 *   - Type guards (return type is `value is Type`)
 *   - Functions with multiple statements
 *   - Functions that do computation (operators, conditionals, object creation)
 */
function checkPointlessIndirection(sourceFile: ts.SourceFile): Violation[] {
	const violations: Violation[] = []

	function hasTypePredicateReturn(
		node: ts.FunctionDeclaration | ts.ArrowFunction | ts.FunctionExpression
	): boolean {
		if (node.type && ts.isTypePredicateNode(node.type)) {
			return true
		}
		return false
	}

	function isTrivialLeaf(expr: ts.Expression): boolean {
		if (ts.isStringLiteral(expr)) {
			return true
		}
		if (ts.isNumericLiteral(expr)) {
			return true
		}
		if (expr.kind === ts.SyntaxKind.TrueKeyword) {
			return true
		}
		if (expr.kind === ts.SyntaxKind.FalseKeyword) {
			return true
		}
		if (expr.kind === ts.SyntaxKind.NullKeyword) {
			return true
		}
		if (ts.isIdentifier(expr)) {
			return true
		}
		if (ts.isCallExpression(expr)) {
			return true
		}
		return false
	}

	function isTrivialObjectProperty(prop: ts.ObjectLiteralElementLike): boolean {
		if (ts.isPropertyAssignment(prop)) {
			return isTrivialExpression(prop.initializer)
		}
		if (ts.isShorthandPropertyAssignment(prop)) {
			return true
		}
		if (ts.isSpreadAssignment(prop)) {
			return isTrivialExpression(prop.expression)
		}
		return false
	}

	function isTrivialObjectLiteral(expr: ts.ObjectLiteralExpression): boolean {
		for (const prop of expr.properties) {
			if (!isTrivialObjectProperty(prop)) {
				return false
			}
		}
		return true
	}

	function isTrivialArrayElement(elem: ts.Expression): boolean {
		if (ts.isSpreadElement(elem)) {
			return isTrivialExpression(elem.expression)
		}
		return isTrivialExpression(elem)
	}

	function isTrivialArrayLiteral(expr: ts.ArrayLiteralExpression): boolean {
		for (const elem of expr.elements) {
			if (!isTrivialArrayElement(elem)) {
				return false
			}
		}
		return true
	}

	function isTrivialElementAccess(expr: ts.ElementAccessExpression): boolean {
		const arg = expr.argumentExpression
		const isStringKey = ts.isStringLiteral(arg)
		const isNumericKey = ts.isNumericLiteral(arg)
		if (!isStringKey && !isNumericKey) {
			return false
		}
		return isTrivialExpression(expr.expression)
	}

	function isTrivialExpression(expr: ts.Expression): boolean {
		if (isTrivialLeaf(expr)) {
			return true
		}
		if (ts.isPropertyAccessExpression(expr)) {
			return isTrivialExpression(expr.expression)
		}
		if (ts.isParenthesizedExpression(expr)) {
			return isTrivialExpression(expr.expression)
		}
		if (ts.isObjectLiteralExpression(expr)) {
			return isTrivialObjectLiteral(expr)
		}
		if (ts.isArrayLiteralExpression(expr)) {
			return isTrivialArrayLiteral(expr)
		}
		if (ts.isElementAccessExpression(expr)) {
			return isTrivialElementAccess(expr)
		}
		return false
	}

	function getTrivialExpressionFromArrowBody(body: ts.ConciseBody): ts.Expression | null {
		if (ts.isBlock(body)) {
			return null
		}
		if (isTrivialExpression(body)) {
			return body
		}
		return null
	}

	function getTrivialExpressionFromBlock(body: ts.Block): ts.Expression | null {
		if (body.statements.length !== 1) {
			return null
		}

		const stmt = body.statements[0]
		if (!stmt) {
			return null
		}

		if (ts.isReturnStatement(stmt) && stmt.expression && isTrivialExpression(stmt.expression)) {
			return stmt.expression
		}

		if (ts.isExpressionStatement(stmt) && ts.isCallExpression(stmt.expression)) {
			return stmt.expression
		}

		return null
	}

	function getTrivialExpressionFromBody(
		node: ts.FunctionDeclaration | ts.ArrowFunction | ts.FunctionExpression
	): ts.Expression | null {
		const body = node.body
		if (!body) {
			return null
		}

		if (ts.isArrowFunction(node) && !ts.isBlock(body)) {
			return getTrivialExpressionFromArrowBody(body)
		}

		if (!ts.isBlock(body)) {
			return null
		}

		return getTrivialExpressionFromBlock(body)
	}

	function isPointlessIndirection(
		node: ts.FunctionDeclaration | ts.ArrowFunction | ts.FunctionExpression
	): boolean {
		if (hasTypePredicateReturn(node)) {
			return false
		}

		const expr = getTrivialExpressionFromBody(node)
		if (!expr) {
			return false
		}

		return true
	}

	// Build set of exported names from export { name } declarations
	const exportedNames = new Set<string>()
	function collectExportedNames(node: ts.Node): void {
		if (ts.isExportDeclaration(node) && node.exportClause) {
			if (ts.isNamedExports(node.exportClause)) {
				for (const element of node.exportClause.elements) {
					exportedNames.add(element.name.text)
				}
			}
		}
		ts.forEachChild(node, collectExportedNames)
	}
	collectExportedNames(sourceFile)

	function hasExportModifier(node: ts.Node): boolean {
		const modifiers = ts.canHaveModifiers(node) ? ts.getModifiers(node) : undefined
		if (!modifiers) {
			return false
		}
		for (const mod of modifiers) {
			if (mod.kind === ts.SyntaxKind.ExportKeyword) {
				return true
			}
		}
		return false
	}

	function isExported(name: string, node: ts.Node): boolean {
		if (hasExportModifier(node)) {
			return true
		}
		return exportedNames.has(name)
	}

	function isExportedVariable(name: string, node: ts.VariableDeclaration): boolean {
		const parent = node.parent
		if (!ts.isVariableDeclarationList(parent)) {
			return false
		}
		const grandparent = parent.parent
		if (!ts.isVariableStatement(grandparent)) {
			return false
		}
		if (hasExportModifier(grandparent)) {
			return true
		}
		return exportedNames.has(name)
	}

	function addViolation(nameNode: ts.Node): void {
		const { line, character } = sourceFile.getLineAndCharacterOfPosition(
			nameNode.getStart(sourceFile)
		)
		violations.push({
			file: sourceFile.fileName,
			line: line + 1,
			column: character + 1,
			rule: "no-pointless-indirection",
			message:
				"Pointless indirection. This function just wraps a value or call without computation.",
			suggestion: "Inline the expression or use the value directly"
		})
	}

	function checkFunctionDeclaration(node: ts.FunctionDeclaration): void {
		if (!node.name) {
			return
		}
		const name = node.name.text
		if (isExported(name, node)) {
			return
		}
		if (!isPointlessIndirection(node)) {
			return
		}
		addViolation(node.name)
	}

	function checkVariableDeclaration(node: ts.VariableDeclaration): void {
		if (!node.initializer) {
			return
		}
		if (!ts.isArrowFunction(node.initializer) && !ts.isFunctionExpression(node.initializer)) {
			return
		}
		const name = ts.isIdentifier(node.name) ? node.name.text : ""
		if (isExportedVariable(name, node)) {
			return
		}
		if (!isPointlessIndirection(node.initializer)) {
			return
		}
		addViolation(node.name)
	}

	function walk(node: ts.Node): void {
		if (ts.isFunctionDeclaration(node)) {
			checkFunctionDeclaration(node)
		}

		if (ts.isVariableDeclaration(node)) {
			checkVariableDeclaration(node)
		}

		ts.forEachChild(node, walk)
	}

	walk(sourceFile)
	return violations
}

/**
 * Detects instanceof Error checks which are unnecessary since useThrowOnlyError
 * guarantees all thrown values are Error objects.
 *
 * BAD:  if (err instanceof Error) { console.log(err.message) }
 * GOOD: console.log(err.message)  // err is guaranteed to be Error
 */
function checkInstanceofError(sourceFile: ts.SourceFile): Violation[] {
	const violations: Violation[] = []

	function walk(node: ts.Node): void {
		if (
			ts.isBinaryExpression(node) &&
			node.operatorToken.kind === ts.SyntaxKind.InstanceOfKeyword &&
			ts.isIdentifier(node.right) &&
			node.right.text === "Error"
		) {
			const { line, character } = sourceFile.getLineAndCharacterOfPosition(
				node.getStart(sourceFile)
			)
			violations.push({
				file: sourceFile.fileName,
				line: line + 1,
				column: character + 1,
				rule: "no-instanceof-error",
				message:
					"Unnecessary instanceof Error check. useThrowOnlyError guarantees all thrown values are Error objects.",
				suggestion: "Remove the check and access .message directly"
			})
		}

		ts.forEachChild(node, walk)
	}

	walk(sourceFile)
	return violations
}

function isSkippedPath(fileName: string): boolean {
	if (fileName.includes("node_modules")) {
		return true
	}
	if (fileName.includes(".next")) {
		return true
	}
	if (fileName.includes("src/components/ui")) {
		return true
	}
	return false
}

function outputText(allViolations: Violation[]): void {
	for (const v of allViolations) {
		const relativePath = v.file.replace(`${process.cwd()}/`, "")
		logger.warn("lint violation", {
			location: `${relativePath}:${v.line}:${v.column}`,
			rule: v.rule,
			message: v.message
		})
	}

	if (allViolations.length > 0) {
		logger.info("summary", {
			violations: allViolations.length,
			files: new Set(allViolations.map((v) => v.file)).size
		})
	} else {
		logger.info("no violations found")
	}
}

function isTypeScriptFile(f: string): boolean {
	if (f.endsWith(".ts")) {
		return true
	}
	if (f.endsWith(".tsx")) {
		return true
	}
	return false
}

function getStagedFiles(): string[] {
	const result = Bun.spawnSync(["git", "diff", "--cached", "--name-only", "--diff-filter=ACMR"])
	if (!result.success) {
		return []
	}
	const output = result.stdout.toString().trim()
	if (!output) {
		return []
	}
	return output
		.split("\n")
		.filter(isTypeScriptFile)
		.map((f) => `${process.cwd()}/${f}`)
}

function main(): void {
	const args = process.argv.slice(2)
	const useJsonOutput = args.includes("--json")
	const useStaged = args.includes("--staged")
	function isNotFlag(a: string): boolean {
		return !a.startsWith("--")
	}

	const specificFiles = useStaged ? getStagedFiles() : args.filter(isNotFlag)

	if (useStaged && specificFiles.length === 0) {
		logger.info("no staged TypeScript files")
		return
	}

	logger.info("creating TypeScript program")
	const program = createProgram()
	const checker = program.getTypeChecker()

	function isNotDeclarationFile(sf: ts.SourceFile): boolean {
		return !sf.isDeclarationFile
	}

	function matchesSpecificFile(sf: ts.SourceFile): boolean {
		for (const f of specificFiles) {
			if (sf.fileName.includes(f)) {
				return true
			}
		}
		return false
	}

	let sourceFiles = program.getSourceFiles().filter(isNotDeclarationFile)

	if (specificFiles.length > 0) {
		sourceFiles = sourceFiles.filter(matchesSpecificFile)
	}

	const allViolations: Violation[] = []

	for (const sourceFile of sourceFiles) {
		if (isSkippedPath(sourceFile.fileName)) {
			continue
		}

		allViolations.push(
			...checkNullUndefinedUnion(sourceFile, checker),
			...checkUnnecessaryCondition(sourceFile, checker),
			...checkUnnecessaryDefaultCase(sourceFile, checker),
			...checkPreferEarlyReturn(sourceFile),
			...checkImpossibleLogicalOr(sourceFile, checker),
			...checkOptionalArray(sourceFile, checker),
			...checkArrowFunctions(sourceFile),
			...checkObjectModule(sourceFile),
			...checkNoExtendsError(sourceFile),
			...checkPointlessIndirection(sourceFile),
			...checkInstanceofError(sourceFile)
		)
	}

	if (useJsonOutput) {
		process.stdout.write(`${JSON.stringify({ violations: allViolations }, null, 2)}\n`)
	} else {
		outputText(allViolations)
	}

	const exitCode = allViolations.length > 0 ? 1 : 0
	process.exit(exitCode)
}

const result = errors.trySync(main)
if (result.error) {
	logger.error("failed", {
		error: String(result.error),
		stack: result.error.stack
	})
	process.exit(1)
}
