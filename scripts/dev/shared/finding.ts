import { Array as Arr, Order } from "effect"
import type * as ts from "typescript/unstable/ast"
import { repositoryPath } from "#scripts/dev/shared/repository.ts"

/** One report of a repository linter: the rule that fired, where, what is wrong, and how to fix it when the rule
 * knows. Lines and columns are 1-based, as an editor shows them. */
export type Finding = Readonly<{
	file: string
	line: number
	column: number
	rule: string
	message: string
	suggestion?: string
}>

/** What a rule says at a node; the engine that ran the rule stamps its id and locates it. */
export type Report = Readonly<{ node: ts.Node; message: string; suggestion?: string }>

/** A report located at its node's first token. */
export const findingAt = (
	input: Readonly<{ sourceFile: ts.SourceFile; rule: string; report: Report }>
): Finding => {
	const { report, sourceFile } = input
	const { line, character } = sourceFile.getLineAndCharacterOfPosition(
		report.node.getStart(sourceFile)
	)
	const located = {
		file: sourceFile.fileName,
		line: line + 1,
		column: character + 1,
		rule: input.rule,
		message: report.message
	}
	return report.suggestion === undefined ? located : { ...located, suggestion: report.suggestion }
}

const byLocation = Order.combineAll<Finding>([
	Order.mapInput(Order.String, (finding: Finding) => finding.file),
	Order.mapInput(Order.Number, (finding: Finding) => finding.line),
	Order.mapInput(Order.Number, (finding: Finding) => finding.column),
	Order.mapInput(Order.String, (finding: Finding) => finding.rule)
])

/** The findings in file and line order, one per line with its suggestion beneath, and the tool's tally. */
export const renderFindings = (
	input: Readonly<{ tool: string; findings: ReadonlyArray<Finding> }>
): string => {
	const { tool, findings } = input
	if (!Arr.isReadonlyArrayNonEmpty(findings)) {
		return `${tool}: no findings`
	}
	const lines = Arr.flatMap(Arr.sort(findings, byLocation), (finding) => {
		const located = `${repositoryPath(finding.file)}:${finding.line}:${finding.column} ${finding.rule} ${finding.message}`
		return finding.suggestion === undefined ? [located] : [located, `  ↳ ${finding.suggestion}`]
	})
	return Arr.join([...lines, `${tool}: ${findings.length} finding(s)`], "\n")
}

/** A linter's exit status: 1 when it found anything. */
export const statusOf = (findings: ReadonlyArray<unknown>): number =>
	Arr.isReadonlyArrayNonEmpty(findings) ? 1 : 0
