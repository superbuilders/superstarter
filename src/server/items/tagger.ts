import Anthropic from "@anthropic-ai/sdk"
import * as errors from "@superbuilders/errors"
import { z } from "zod"
import { type Difficulty, type SubTypeId, subTypeIds, subTypes } from "@/config/sub-types"
import { env } from "@/env"
import { logger } from "@/logger"

const TAGGER_MODEL = "claude-haiku-4-5-20251001"

const FALLBACK: TaggerResult = {
	subTypeId: "verbal.antonyms",
	difficulty: "medium",
	confidence: 0
}

const taggerResponse = z.object({
	subTypeId: z.enum(subTypeIds),
	difficulty: z.enum(["easy", "medium", "hard", "brutal"]),
	confidence: z.number().min(0).max(1)
})

interface TaggerResult {
	subTypeId: SubTypeId
	difficulty: Difficulty
	confidence: number
}

const client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY })

async function classifyItem(prompt: string, options: string[]): Promise<TaggerResult> {
	const systemPrompt = buildSystemPrompt()
	const userPrompt = buildUserPrompt(prompt, options)

	const result = await errors.try(
		client.messages.create({
			model: TAGGER_MODEL,
			max_tokens: 256,
			system: systemPrompt,
			messages: [{ role: "user", content: userPrompt }]
		})
	)
	if (result.error) {
		logger.error({ error: result.error, model: TAGGER_MODEL }, "tagger: anthropic call failed")
		throw errors.wrap(result.error, "tagger anthropic.messages.create")
	}

	const message = result.data
	logger.debug(
		{
			model: TAGGER_MODEL,
			tokens_in: message.usage.input_tokens,
			tokens_out: message.usage.output_tokens,
			cost_estimate_usd: null
		},
		"tagger: classification call"
	)

	const text = extractText(message.content)
	if (!text) {
		logger.warn({ model: TAGGER_MODEL }, "tagger: response had no text content; using fallback")
		return FALLBACK
	}

	const stripped = stripCodeFences(text)

	const json = errors.trySync(function parseJson() {
		return JSON.parse(stripped)
	})
	if (json.error) {
		logger.warn(
			{ rawOutput: text, error: json.error },
			"tagger: response was not valid JSON; using fallback"
		)
		return FALLBACK
	}

	const parsed = taggerResponse.safeParse(json.data)
	if (!parsed.success) {
		logger.warn(
			{ rawOutput: text, issues: parsed.error.issues },
			"tagger: response failed schema validation; using fallback"
		)
		return FALLBACK
	}

	return parsed.data
}

const CODE_FENCE_REGEX = /^\s*```(?:json)?\s*\n?([\s\S]*?)\n?```\s*$/

function stripCodeFences(raw: string): string {
	const match = raw.match(CODE_FENCE_REGEX)
	if (match) {
		const captured = match[1]
		if (captured !== undefined) {
			return captured.trim()
		}
	}
	return raw.trim()
}

function extractText(content: Anthropic.ContentBlock[]): string | undefined {
	for (const block of content) {
		if (block.type === "text") {
			return block.text
		}
	}
	return undefined
}

function buildSystemPrompt(): string {
	const lines: string[] = [
		"You are a CCAT (Criteria Cognitive Aptitude Test) item-classification helper.",
		"Given a question prompt and its multiple-choice options, you must classify it into exactly one of the 14 v1 sub-types and assign a difficulty.",
		"",
		"Sub-types:"
	]
	for (const entry of subTypes) {
		lines.push(`- ${entry.id} — ${entry.displayName} (section: ${entry.section})`)
	}
	lines.push(
		"",
		'Difficulty levels: "easy" (under 8s), "medium" (8–14s), "hard" (14–18s), "brutal" (over 18s).',
		"",
		"Examples (input question → expected JSON output):",
		'- verbal.antonyms — "Choose the word most nearly OPPOSITE in meaning to SCARCE." (target word in ALL CAPS, options are candidate antonyms) → {"subTypeId":"verbal.antonyms","difficulty":"medium","confidence":0.97}',
		'- verbal.analogies — "PUPPY is to DOG as KITTEN is to ___." (A is to B as C is to ___ pattern) → {"subTypeId":"verbal.analogies","difficulty":"easy","confidence":0.98}',
		'- verbal.sentence_completion — "After the long hike, the children were so ___ that they fell asleep immediately." (single missing word in a prose sentence) → {"subTypeId":"verbal.sentence_completion","difficulty":"easy","confidence":0.97}',
		'- verbal.critical_reasoning — "All robins are birds. All birds have feathers. Which conclusion follows?" (premises + conclusion; syllogism, modus tollens, spatial-direction, or similar) → {"subTypeId":"verbal.critical_reasoning","difficulty":"easy","confidence":0.96}',
		'- numerical.number_series — "What number comes next? 2, 4, 6, 8, ___" (numeric sequence, find next term) → {"subTypeId":"numerical.number_series","difficulty":"easy","confidence":0.99}',
		'- verbal.letter_series — "What letter comes next? A, C, E, G, ___" (alphabetic sequence, find next letter or letter pair) → {"subTypeId":"verbal.letter_series","difficulty":"easy","confidence":0.99}',
		'- numerical.word_problems — "A bus has 47 passengers; 12 get off and 8 get on. How many passengers are on the bus now?" (prose arithmetic with no %, no a/b fraction notation, no average/ratio) → {"subTypeId":"numerical.word_problems","difficulty":"easy","confidence":0.95}',
		'- numerical.fractions — "What is 1/2 + 1/4?" or "What is 2/3 of 9?" (explicit a/b fraction notation drives the operation) → {"subTypeId":"numerical.fractions","difficulty":"easy","confidence":0.97}',
		'- numerical.percentages — "A jacket costs $80; after a 15% discount, what is the sale price?" ("%" symbol or the word "percent" present) → {"subTypeId":"numerical.percentages","difficulty":"medium","confidence":0.97}',
		'- numerical.averages — "What is the average of 4, 6, and 8?" or "The mean score of five tests was…" ("average"/"mean" of a value set) → {"subTypeId":"numerical.averages","difficulty":"easy","confidence":0.97}',
		'- numerical.ratios — "The ratio of cats to dogs is 3:2; if there are 9 cats, how many dogs?" (a:b ratio notation, scale or split) → {"subTypeId":"numerical.ratios","difficulty":"easy","confidence":0.97}',
		'- numerical.workrate — "Anna can paint a room in 4 hours; Ben in 6. How long together?" (combined-work or rate-of-completion) → {"subTypeId":"numerical.workrate","difficulty":"medium","confidence":0.96}',
		'- numerical.speed_distance_time — "A car travels 180 miles in 3 hours; what is its speed?" (any of speed / distance / time given the other two) → {"subTypeId":"numerical.speed_distance_time","difficulty":"easy","confidence":0.97}',
		'- numerical.lowest_values — "Which of the following is the smallest? 0.5, 1/3, 0.45, 2/5" (compare expressions, pick smallest or largest) → {"subTypeId":"numerical.lowest_values","difficulty":"medium","confidence":0.96}',
		"",
		"Disambiguation for numerical items — classify by the dominant operation, not surface vocabulary:",
		"- When a problem matches multiple rules, prefer the most specific: percentages > fractions > workrate / speed_distance_time / averages / lowest_values > ratios > word_problems.",
		'- "%" symbol or the word "percent" → numerical.percentages.',
		"- a/b fraction notation as operands → numerical.fractions.",
		'- "average"/"mean" of a value set → numerical.averages.',
		'- a:b ratio notation, OR proportional/unit-rate reasoning involving objects, money, or static quantities ("X items cost Y, what about Z items?"; "A is k times B, given A+B, find A or B"; "scale up/down by factor") → numerical.ratios. Time/work/speed/distance scenarios — even when proportional in shape — go to numerical.workrate or numerical.speed_distance_time per their rules below.',
		'- combined-work or rate-of-completion ("A and B together can…") → numerical.workrate.',
		'- speed / distance / time scenario → numerical.speed_distance_time.',
		'- compare a small set of numeric expressions → numerical.lowest_values.',
		"- Otherwise prose arithmetic without those markers → numerical.word_problems.",
		"",
		"Respond with raw JSON only — no markdown code fences, no commentary, just the object.",
		'{"subTypeId": "<one of the 14 ids>", "difficulty": "easy|medium|hard|brutal", "confidence": <number from 0 to 1>}'
	)
	return lines.join("\n")
}

function buildUserPrompt(prompt: string, options: string[]): string {
	const optionsBlock = options.map(function formatOption(option, i) {
		const letter = String.fromCharCode("A".charCodeAt(0) + i)
		return `${letter}. ${option}`
	})
	return ["Question:", prompt, "", "Options:", ...optionsBlock].join("\n")
}

export type { TaggerResult }
export { classifyItem, TAGGER_MODEL }
