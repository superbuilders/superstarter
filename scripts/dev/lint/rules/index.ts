import { check as checkArrowFunctions } from "@scripts/dev/lint/rules/arrow-functions"
import { check as checkImpossibleLogicalOr } from "@scripts/dev/lint/rules/impossible-logical-or"
import { check as checkLogicalOrFallback } from "@scripts/dev/lint/rules/logical-or-fallback"
import { check as checkNullUndefinedUnion } from "@scripts/dev/lint/rules/null-undefined-union"
import { check as checkObjectModule } from "@scripts/dev/lint/rules/object-module"
import { check as checkPointlessIndirection } from "@scripts/dev/lint/rules/pointless-indirection"
import { check as checkPreferEarlyReturn } from "@scripts/dev/lint/rules/prefer-early-return"
import { check as checkTimestampColumns } from "@scripts/dev/lint/rules/no-timestamp-columns"
import { check as checkUnnecessaryCondition } from "@scripts/dev/lint/rules/unnecessary-condition"
import { check as checkUnnecessaryDefaultCase } from "@scripts/dev/lint/rules/unnecessary-default-case"
import { check as checkUuidDefaultRandom } from "@scripts/dev/lint/rules/no-uuid-default-random"
import type { LintRule } from "@scripts/dev/lint/types"

const rules: LintRule[] = [
	{ id: "no-null-undefined-union", check: checkNullUndefinedUnion },
	{ id: "no-unnecessary-condition", check: checkUnnecessaryCondition },
	{ id: "no-unnecessary-default-case", check: checkUnnecessaryDefaultCase },
	{ id: "prefer-early-return", check: checkPreferEarlyReturn },
	{ id: "no-impossible-logical-or", check: checkImpossibleLogicalOr },
	{ id: "no-logical-or-fallback", check: checkLogicalOrFallback },
	{ id: "no-arrow-functions", check: checkArrowFunctions },
	{ id: "no-object-module", check: checkObjectModule },
	{ id: "no-pointless-indirection", check: checkPointlessIndirection },
	{ id: "no-timestamp-columns", check: checkTimestampColumns },
	{ id: "no-uuid-default-random", check: checkUuidDefaultRandom }
]

export { rules }
