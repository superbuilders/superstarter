import { String as Str } from "effect"
import type { RuleTester } from "oxlint/plugins-dev"

/** A rule as oxlint's plugin API types it. */
export type Rule = Parameters<RuleTester["run"]>[1]
export type CreateRule = Extract<Rule, { create: unknown }>
export type Context = Parameters<CreateRule["create"]>[0]
type Program = Context["sourceCode"]["ast"]
export type AnyNode = Extract<Program["body"][number], { type: "ExpressionStatement" }>["parent"]
export type NodeOf<T extends AnyNode["type"]> = Extract<AnyNode, { type: T }>
export type Expression = NodeOf<"ExpressionStatement">["expression"]

/** The application's source: a workspace package's src/, except the telemetry package that defines the span and
 * attribute registries. */
export const isApplicationSource = (filename: string): boolean =>
	Str.includes("/packages/")(filename) &&
	Str.includes("/src/")(filename) &&
	!Str.includes("/packages/platform/operational-telemetry/")(filename)
