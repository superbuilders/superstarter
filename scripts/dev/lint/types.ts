import { Schema } from "effect"
import type * as ts from "typescript/unstable/ast"
import type { Checker } from "typescript/unstable/sync"
import type { Semantics } from "#scripts/dev/lint/semantic.ts"

/** Every rule superlint reports. A rule's id is its name in the output and in the rules/*.md docs. */
const RULE_IDS = [
	"no-null-undefined-union",
	"prefer-early-return",
	"no-logical-or-fallback",
	"effect-classes-only",
	"no-module-state",
	"no-pointless-indirection",
	"no-pointless-type-alias",
	"no-timestamp-columns",
	"no-uuid-default-random",
	"no-implicit-select-all",
	"no-drizzle-write-without-where",
	"program-isolation"
] as const

const RuleId = Schema.Literals(RULE_IDS)

export type RuleId = typeof RuleId.Type

export const Violation = Schema.Struct({
	file: Schema.String,
	line: Schema.Int,
	column: Schema.Int,
	rule: RuleId,
	message: Schema.String,
	suggestion: Schema.optional(Schema.String)
})

export type Violation = typeof Violation.Type

/** What a rule sees: one owned source file, its program's checker, and the file's prepared semantic lookups. */
export type RuleContext = Readonly<{
	sourceFile: ts.SourceFile
	checker: Checker
	semantics: Semantics
}>

export type LintRule = (context: RuleContext) => ReadonlyArray<Violation>
