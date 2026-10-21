import type * as ts from "typescript/unstable/ast"
import { isDrizzleMethodCall } from "#scripts/dev/lint/drizzle.ts"
import type { LintRule, Violation } from "#scripts/dev/lint/types.ts"
import { violationAt } from "#scripts/dev/lint/violation.ts"

const DEFAULT_RANDOM: ReadonlySet<string> = new Set(["defaultRandom"])

/**
 * Drizzle's `.defaultRandom()` generates UUIDv4, which is random and not time-sortable; primary keys default to
 * PostgreSQL 18's native `uuidv7()`. The method is resolved through the checker to drizzle-orm, so it is caught on
 * any builder, however its column factory was imported. See rules/no-uuid-default-random.md.
 */
export const noUuidDefaultRandom: LintRule = ({ sourceFile, semantics }) => {
	const violations: Array<Violation> = []

	const walk = (node: ts.Node): void => {
		const call = { semantics, node, names: DEFAULT_RANDOM }
		if (isDrizzleMethodCall(call)) {
			violations.push(
				violationAt({
					sourceFile,
					node: call.node.expression.name,
					rule: "no-uuid-default-random",
					message:
						".defaultRandom() generates UUIDv4 (random, not time-sortable). Use .default(sql`uuidv7()`) for PostgreSQL 18's native UUIDv7. No exceptions.",
					suggestion:
						"Replace .defaultRandom() with .default(sql`uuidv7()`). See rules/no-uuid-default-random.md."
				})
			)
		}
		node.forEachChild(walk)
	}

	walk(sourceFile)
	return violations
}
