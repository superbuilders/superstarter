import type * as ts from "typescript/unstable/ast"
import type { Checker } from "typescript/unstable/sync"
import type { Report } from "#scripts/dev/shared/finding.ts"
import type { Semantics } from "#scripts/dev/shared/semantic.ts"

/** What a rule sees: one owned source file, its program's checker, and the file's prepared semantic lookups. */
export type RuleContext = Readonly<{
	sourceFile: ts.SourceFile
	checker: Checker
	semantics: Semantics
}>

/** A rule prepares once per file and answers the visitor that the engine's one traversal calls with every node of
 * the file, in document order. It reports nodes; the engine stamps the rule's id. */
export type Visit = (context: RuleContext) => (node: ts.Node) => ReadonlyArray<Report>
