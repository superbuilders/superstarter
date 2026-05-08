// Anthropic SDK call wrapper for Phase 4 sub-phase a's similar-item
// generator. The single integration touchpoint that consumes commit 3's
// pure-function foundation (sibling-prompts, sibling-tool, sibling-schema,
// pricing) and returns a parsed sibling-set + usage telemetry.
//
// NO DB writes — commit 5's `ingest-siblings.ts` consumes the result and
// performs id-assignment, correctAnswer resolution, embedding, and the
// DB transaction. NO workflow integration — commit 6's
// `sibling-generation-steps.ts` wraps `generateSiblingSet` as a
// `"use step"`.
//
// Cache strategy: 5-minute default cache TTL on the system prompt (per
// plan §11 cost estimate). The system prompt is per-sub-type, so cache
// hits land within a single sub-type's run.

import Anthropic from "@anthropic-ai/sdk"
import * as errors from "@superbuilders/errors"
import type { Difficulty, SubTypeId } from "@/config/sub-types"
import { env } from "@/env"
import { logger } from "@/logger"
import { estimateCostUsd } from "@/server/generation/pricing"
import {
	buildSiblingSystemPrompt,
	buildSiblingUserPrompt,
	type SiblingSourceContext
} from "@/server/generation/sibling-prompts"
import {
	type SubmitSiblingSetOutput,
	submitSiblingSetSchema
} from "@/server/generation/sibling-schema"
import { SIBLING_TOOL, SIBLING_TOOL_NAME } from "@/server/generation/sibling-tool"

const SIBLING_GEN_MODEL = "claude-sonnet-4-6"
const SIBLING_GEN_MAX_TOKENS = 4096
const RETRY_DELAYS_MS = [1000, 2000, 4000]

const ErrSiblingGenerationParse = errors.new("sibling-set parse failed")
const ErrSiblingGenerationNoToolUse = errors.new("sibling-set response missing tool_use block")

interface SiblingGenerationResult {
	siblingSet: SubmitSiblingSetOutput
	usage: SiblingGenerationUsage
	durationMs: number
	costEstimateUsd: number
}

interface SiblingGenerationUsage {
	model: string
	input_tokens: number
	output_tokens: number
	cache_read_input_tokens: number
	cache_creation_input_tokens: number
}

interface SourceItem {
	id: string
	subTypeId: SubTypeId
	difficulty: Difficulty
	body: { kind: "text"; text: string }
	options: { id: string; text: string }[]
	correctAnswer: string
	explanation?: string
}

const client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY })

async function withRateLimitRetry<T>(label: string, fn: () => Promise<T>): Promise<T> {
	for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt++) {
		const result = await errors.try(fn())
		if (!result.error) {
			return result.data
		}
		const is429 =
			result.error instanceof Anthropic.APIError && result.error.status === 429
		if (is429 && attempt < RETRY_DELAYS_MS.length) {
			const delay = RETRY_DELAYS_MS[attempt]
			if (delay === undefined) {
				logger.error(
					{ label, attempt },
					"sibling-generator: retry-delay lookup out of bounds"
				)
				throw errors.wrap(result.error, "sibling-generator retry-delay lookup")
			}
			logger.warn(
				{ label, attempt: attempt + 1, retries: RETRY_DELAYS_MS.length, delayMs: delay },
				"sibling-generator: 429 rate-limited; backing off"
			)
			await Bun.sleep(delay)
			continue
		}
		logger.error(
			{ label, error: result.error, attempt },
			"sibling-generator: anthropic call failed"
		)
		throw errors.wrap(result.error, `sibling-generator ${label}`)
	}
	logger.error({ label }, "sibling-generator: retry loop exited without return")
	throw errors.new("sibling-generator retry loop fall-through")
}

function buildSourceContext(source: SourceItem): SiblingSourceContext {
	const ctx: SiblingSourceContext = {
		subTypeId: source.subTypeId,
		difficulty: source.difficulty,
		body: source.body,
		options: source.options,
		correctAnswer: source.correctAnswer
	}
	if (source.explanation !== undefined) {
		ctx.explanation = source.explanation
	}
	return ctx
}

function extractToolUseInput(
	content: Anthropic.Messages.ContentBlock[]
): unknown | undefined {
	for (const block of content) {
		if (block.type === "tool_use" && block.name === SIBLING_TOOL_NAME) {
			return block.input
		}
	}
	return undefined
}

async function generateSiblingSet(source: SourceItem): Promise<SiblingGenerationResult> {
	const systemText = buildSiblingSystemPrompt(source.subTypeId)
	const userText = buildSiblingUserPrompt(buildSourceContext(source))

	const startMs = Date.now()
	const message = await withRateLimitRetry("messages.create", () =>
		client.messages.create({
			model: SIBLING_GEN_MODEL,
			max_tokens: SIBLING_GEN_MAX_TOKENS,
			tools: [SIBLING_TOOL],
			tool_choice: { type: "tool", name: SIBLING_TOOL_NAME },
			system: [
				{
					type: "text",
					text: systemText,
					cache_control: { type: "ephemeral" }
				}
			],
			messages: [{ role: "user", content: userText }]
		})
	)
	const durationMs = Date.now() - startMs

	const toolInput = extractToolUseInput(message.content)
	if (toolInput === undefined) {
		logger.error(
			{ sourceItemId: source.id, content: message.content },
			"sibling-generator: response missing submit_sibling_set tool_use block"
		)
		throw errors.wrap(ErrSiblingGenerationNoToolUse, `source id '${source.id}'`)
	}

	const parsed = submitSiblingSetSchema.safeParse(toolInput)
	if (!parsed.success) {
		logger.error(
			{ sourceItemId: source.id, issues: parsed.error.issues, rawInput: toolInput },
			"sibling-generator: tool_use input failed Zod validation"
		)
		throw errors.wrap(ErrSiblingGenerationParse, `source id '${source.id}'`)
	}

	// Anthropic SDK types `cache_read_input_tokens` / `cache_creation_input_tokens`
	// as `number | null`; we normalize null → 0 at this boundary so the rest of
	// the pipeline carries a uniform `number` shape (per rules/no-null-undefined-union).
	const rawCacheRead = message.usage.cache_read_input_tokens
	const rawCacheCreate = message.usage.cache_creation_input_tokens
	const cacheReadInputTokens = rawCacheRead === null ? 0 : rawCacheRead
	const cacheCreationInputTokens = rawCacheCreate === null ? 0 : rawCacheCreate
	const usage: SiblingGenerationUsage = {
		model: SIBLING_GEN_MODEL,
		input_tokens: message.usage.input_tokens,
		output_tokens: message.usage.output_tokens,
		cache_read_input_tokens: cacheReadInputTokens,
		cache_creation_input_tokens: cacheCreationInputTokens
	}
	const costEstimateUsd = estimateCostUsd({
		input_tokens: usage.input_tokens,
		output_tokens: usage.output_tokens,
		cache_read_input_tokens: usage.cache_read_input_tokens,
		cache_creation_input_tokens: usage.cache_creation_input_tokens
	})

	logger.info(
		{
			model: SIBLING_GEN_MODEL,
			sourceItemId: source.id,
			subTypeId: source.subTypeId,
			input_tokens: usage.input_tokens,
			output_tokens: usage.output_tokens,
			cache_read_input_tokens: usage.cache_read_input_tokens,
			cache_creation_input_tokens: usage.cache_creation_input_tokens,
			cost_estimate_usd: costEstimateUsd,
			durationMs,
			siblingCount: 4
		},
		"sibling-generator: tool-use call"
	)

	return {
		siblingSet: parsed.data,
		usage,
		durationMs,
		costEstimateUsd
	}
}

export type { SiblingGenerationResult, SiblingGenerationUsage, SourceItem }
export {
	ErrSiblingGenerationNoToolUse,
	ErrSiblingGenerationParse,
	generateSiblingSet,
	SIBLING_GEN_MAX_TOKENS,
	SIBLING_GEN_MODEL
}
