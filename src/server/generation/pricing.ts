// Per-model price table + per-call cost estimator for Phase 4 sub-phase a's
// generator. The single landing site for "what does an LLM call cost?" so
// commit 4's sibling-generator and commit 7's run-summary aggregator share
// the same numbers.
//
// Rates are USD per million tokens, taken from Anthropic's published pricing
// for `claude-sonnet-4-6`:
//   - input:           $3.00 / MTok
//   - output:          $15.00 / MTok
//   - cache read:      $0.30 / MTok  (0.1× input)
//   - cache creation:  $3.75 / MTok  (1.25× input; 5-minute cache window)
//
// The 1-hour cache window's higher rate ($6.00) is not modeled here because
// the generator uses default 5-minute prompt caching.

interface ModelPricing {
	input_per_mtok: number
	output_per_mtok: number
	cache_read_per_mtok: number
	cache_creation_per_mtok: number
}

const SONNET_46_PRICING: ModelPricing = {
	input_per_mtok: 3.0,
	output_per_mtok: 15.0,
	cache_read_per_mtok: 0.3,
	cache_creation_per_mtok: 3.75
}

const TOKENS_PER_MILLION = 1_000_000

interface UsageTokens {
	input_tokens: number
	output_tokens: number
	cache_read_input_tokens: number
	cache_creation_input_tokens: number
}

function estimateCostUsd(usage: UsageTokens, pricing: ModelPricing = SONNET_46_PRICING): number {
	const inputCost = (usage.input_tokens * pricing.input_per_mtok) / TOKENS_PER_MILLION
	const outputCost = (usage.output_tokens * pricing.output_per_mtok) / TOKENS_PER_MILLION
	const cacheReadCost =
		(usage.cache_read_input_tokens * pricing.cache_read_per_mtok) / TOKENS_PER_MILLION
	const cacheCreationCost =
		(usage.cache_creation_input_tokens * pricing.cache_creation_per_mtok) / TOKENS_PER_MILLION
	return inputCost + outputCost + cacheReadCost + cacheCreationCost
}

export type { ModelPricing, UsageTokens }
export { estimateCostUsd, SONNET_46_PRICING }
