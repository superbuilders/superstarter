import type { Rule } from "#scripts/dev/oxlint/rule.ts"
import { cognitiveComplexity } from "#scripts/dev/oxlint/rules/cognitive-complexity.ts"
import { noEvolvingTypes } from "#scripts/dev/oxlint/rules/no-evolving-types.ts"
import { noIife } from "#scripts/dev/oxlint/rules/no-iife.ts"
import { noLiteralAttributeKey } from "#scripts/dev/oxlint/rules/no-literal-attribute-key.ts"
import { noLogicalOrFallback } from "#scripts/dev/oxlint/rules/no-logical-or-fallback.ts"
import { noNewError } from "#scripts/dev/oxlint/rules/no-new-error.ts"
import { noNullishCoalescing } from "#scripts/dev/oxlint/rules/no-nullish-coalescing.ts"
import { noOptionBridge } from "#scripts/dev/oxlint/rules/no-option-bridge.ts"
import { noPointlessTypeAlias } from "#scripts/dev/oxlint/rules/no-pointless-type-alias.ts"
import { noSvgWithoutTitle } from "#scripts/dev/oxlint/rules/no-svg-without-title.ts"
import { noTry } from "#scripts/dev/oxlint/rules/no-try.ts"
import { noUnusedTemplateLiteral } from "#scripts/dev/oxlint/rules/no-unused-template-literal.ts"
import { noUselessContinue } from "#scripts/dev/oxlint/rules/no-useless-continue.ts"
import { preferEarlyReturn } from "#scripts/dev/oxlint/rules/prefer-early-return.ts"
import { telemetryOwnership } from "#scripts/dev/oxlint/rules/telemetry-ownership.ts"

/**
 * The repository's own oxlint rules, one module each under `scripts/dev/oxlint/rules/`: the syntactic bans oxlint
 * has no native rule for, telemetry ownership, and Biome's cognitive complexity. Each rule is syntax only;
 * type-aware rules live in superlint (scripts/dev/lint.ts). oxlint loads this file through `jsPlugins` in
 * .oxlintrc.json, and Node strips its types.
 */
const plugin: Readonly<{
	meta: Readonly<{ name: string }>
	rules: Readonly<Record<string, Rule>>
}> = {
	meta: { name: "superstarter" },
	rules: {
		"cognitive-complexity": cognitiveComplexity,
		"no-evolving-types": noEvolvingTypes,
		"no-iife": noIife,
		"no-literal-attribute-key": noLiteralAttributeKey,
		"no-logical-or-fallback": noLogicalOrFallback,
		"no-new-error": noNewError,
		"no-nullish-coalescing": noNullishCoalescing,
		"no-option-bridge": noOptionBridge,
		"no-pointless-type-alias": noPointlessTypeAlias,
		"no-svg-without-title": noSvgWithoutTitle,
		"no-try": noTry,
		"no-unused-template-literal": noUnusedTemplateLiteral,
		"no-useless-continue": noUselessContinue,
		"prefer-early-return": preferEarlyReturn,
		"telemetry-ownership": telemetryOwnership
	}
}

export default plugin
