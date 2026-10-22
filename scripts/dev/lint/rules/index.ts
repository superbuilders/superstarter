import { effectClassesOnly } from "#scripts/dev/lint/rules/effect-classes-only.ts"
import { noLogicalOrFallback } from "#scripts/dev/lint/rules/logical-or-fallback.ts"
import { noDrizzleWriteWithoutWhere } from "#scripts/dev/lint/rules/no-drizzle-write-without-where.ts"
import { noImplicitSelectAll } from "#scripts/dev/lint/rules/no-implicit-select-all.ts"
import { noModuleState } from "#scripts/dev/lint/rules/no-module-state.ts"
import { noPointlessTypeAlias } from "#scripts/dev/lint/rules/no-pointless-type-alias.ts"
import { noTimestampColumns } from "#scripts/dev/lint/rules/no-timestamp-columns.ts"
import { noUuidDefaultRandom } from "#scripts/dev/lint/rules/no-uuid-default-random.ts"
import { noNullUndefinedUnion } from "#scripts/dev/lint/rules/null-undefined-union.ts"
import { noPointlessIndirection } from "#scripts/dev/lint/rules/pointless-indirection.ts"
import { preferEarlyReturn } from "#scripts/dev/lint/rules/prefer-early-return.ts"
import type { LintRule, RuleId } from "#scripts/dev/lint/types.ts"

/** Every rule runs on every owned file; a rule may report under its own id only. */
export const RULES: ReadonlyArray<Readonly<{ id: RuleId; check: LintRule }>> = [
	{ id: "no-null-undefined-union", check: noNullUndefinedUnion },
	{ id: "prefer-early-return", check: preferEarlyReturn },
	{ id: "no-logical-or-fallback", check: noLogicalOrFallback },
	{ id: "effect-classes-only", check: effectClassesOnly },
	{ id: "no-module-state", check: noModuleState },
	{ id: "no-pointless-indirection", check: noPointlessIndirection },
	{ id: "no-pointless-type-alias", check: noPointlessTypeAlias },
	{ id: "no-timestamp-columns", check: noTimestampColumns },
	{ id: "no-uuid-default-random", check: noUuidDefaultRandom },
	{ id: "no-implicit-select-all", check: noImplicitSelectAll },
	{ id: "no-drizzle-write-without-where", check: noDrizzleWriteWithoutWhere }
]
