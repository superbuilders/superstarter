import type { Violation } from "@scripts/dev/lint/types"
import * as ts from "typescript"

function isTracingOptionsType(type: ts.Type): boolean {
	const symbol = type.aliasSymbol ?? type.getSymbol()
	if (symbol === undefined || symbol.getName() !== "Options") {
		return false
	}
	const declarations = symbol.getDeclarations()
	if (declarations === undefined) {
		return false
	}
	return declarations.some(function isTracingDeclaration(declaration) {
		return declaration.getSourceFile().fileName.includes("@superbuilders/tracing")
	})
}

function checkParameters(
	sourceFile: ts.SourceFile,
	checker: ts.TypeChecker,
	parameters: ts.NodeArray<ts.ParameterDeclaration>,
	violations: Violation[]
): void {
	for (let i = 0; i < parameters.length; i++) {
		const parameter = parameters[i]
		if (parameter === undefined) {
			continue
		}
		const type = checker.getTypeAtLocation(parameter)
		if (!isTracingOptionsType(type)) {
			continue
		}
		if (i === parameters.length - 1) {
			continue
		}
		const { line, character } = sourceFile.getLineAndCharacterOfPosition(parameter.getStart(sourceFile))
		violations.push({
			file: sourceFile.fileName,
			line: line + 1,
			column: character + 1,
			rule: "tracing-options-last",
			message: `tracing.Options parameter '${parameter.name.getText(sourceFile)}' must be the final parameter.`,
			suggestion: "Move the tracing.Options parameter to the end of the parameter list."
		})
	}
}

function visitNode(sourceFile: ts.SourceFile, checker: ts.TypeChecker, node: ts.Node, violations: Violation[]): void {
	if (
		ts.isFunctionDeclaration(node) ||
		ts.isFunctionExpression(node) ||
		ts.isArrowFunction(node) ||
		ts.isMethodDeclaration(node) ||
		ts.isConstructorDeclaration(node) ||
		ts.isFunctionTypeNode(node) ||
		ts.isCallSignatureDeclaration(node) ||
		ts.isMethodSignature(node)
	) {
		checkParameters(sourceFile, checker, node.parameters, violations)
	}

	ts.forEachChild(node, function visitChild(child) {
		visitNode(sourceFile, checker, child, violations)
	})
}

function check(sourceFile: ts.SourceFile, checker: ts.TypeChecker): Violation[] {
	const violations: Violation[] = []
	visitNode(sourceFile, checker, sourceFile, violations)
	return violations
}

export { check }
