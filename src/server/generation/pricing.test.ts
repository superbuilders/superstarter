import { expect, test } from "bun:test"
import { estimateCostUsd, SONNET_46_PRICING } from "@/server/generation/pricing"

test("SONNET_46_PRICING: per-token rates match Anthropic published pricing", () => {
	expect(SONNET_46_PRICING.input_per_mtok).toBe(3.0)
	expect(SONNET_46_PRICING.output_per_mtok).toBe(15.0)
	expect(SONNET_46_PRICING.cache_read_per_mtok).toBe(0.3)
	expect(SONNET_46_PRICING.cache_creation_per_mtok).toBe(3.75)
})

test("estimateCostUsd: hand-computed scenario", () => {
	const usage = {
		input_tokens: 1_000_000,
		output_tokens: 500_000,
		cache_read_input_tokens: 100_000,
		cache_creation_input_tokens: 200_000
	}
	const expected = 3.0 + 7.5 + 0.03 + 0.75
	const cost = estimateCostUsd(usage)
	expect(cost).toBeCloseTo(expected, 6)
})

test("estimateCostUsd: zero usage returns zero", () => {
	const cost = estimateCostUsd({
		input_tokens: 0,
		output_tokens: 0,
		cache_read_input_tokens: 0,
		cache_creation_input_tokens: 0
	})
	expect(cost).toBe(0)
})
