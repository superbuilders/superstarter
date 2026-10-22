import { effectClassesOnly } from "#scripts/dev/lint/rules/effect-classes-only.ts"
import { noDrizzleWriteWithoutWhere } from "#scripts/dev/lint/rules/no-drizzle-write-without-where.ts"
import { noImplicitSelectAll } from "#scripts/dev/lint/rules/no-implicit-select-all.ts"
import { noModuleState } from "#scripts/dev/lint/rules/no-module-state.ts"
import { noTimestampColumns } from "#scripts/dev/lint/rules/no-timestamp-columns.ts"
import { noUuidDefaultRandom } from "#scripts/dev/lint/rules/no-uuid-default-random.ts"
import { noNullUndefinedUnion } from "#scripts/dev/lint/rules/null-undefined-union.ts"
import { noPointlessIndirection } from "#scripts/dev/lint/rules/pointless-indirection.ts"
import type { Visit } from "#scripts/dev/lint/types.ts"

/** Every rule superlint runs, by the id it reports under: its name in the output, its fixture directory and its
 * rules/*.md doc. Every rule visits every owned file. */
export const RULES: ReadonlyArray<Readonly<{ id: string; visit: Visit }>> = [
	{ id: "no-null-undefined-union", visit: noNullUndefinedUnion },
	{ id: "effect-classes-only", visit: effectClassesOnly },
	{ id: "no-module-state", visit: noModuleState },
	{ id: "no-pointless-indirection", visit: noPointlessIndirection },
	{ id: "no-timestamp-columns", visit: noTimestampColumns },
	{ id: "no-uuid-default-random", visit: noUuidDefaultRandom },
	{ id: "no-implicit-select-all", visit: noImplicitSelectAll },
	{ id: "no-drizzle-write-without-where", visit: noDrizzleWriteWithoutWhere }
]
