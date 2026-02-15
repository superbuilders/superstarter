import type * as ts from "typescript"

type RuleId =
	| "no-null-undefined-union"
	| "no-unnecessary-condition"
	| "no-unnecessary-default-case"
	| "prefer-early-return"
	| "no-impossible-logical-or"
	| "no-logical-or-fallback"
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

interface LintRule {
	id: RuleId
	check: (sourceFile: ts.SourceFile, checker: ts.TypeChecker) => Violation[]
}

export type { LintRule, RuleId, Violation }
