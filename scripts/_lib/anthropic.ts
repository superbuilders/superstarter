// scripts/_lib/anthropic.ts
//
// Shared Anthropic client + throttle + backoff for the OCR pipeline scripts.
// EXEMPT FROM THE PROJECT RULESET.

import Anthropic from "@anthropic-ai/sdk"

const anthropicKey = Bun.env.ANTHROPIC_API_KEY
if (!anthropicKey) {
	console.error("ANTHROPIC_API_KEY is missing from .env")
	process.exit(1)
}

const client = new Anthropic({ apiKey: anthropicKey })

const MIN_REQUEST_INTERVAL_MS = 1000
let lastRequestStartMs = 0

async function throttle(): Promise<void> {
	const now = Date.now()
	const elapsed = now - lastRequestStartMs
	if (elapsed < MIN_REQUEST_INTERVAL_MS) {
		await Bun.sleep(MIN_REQUEST_INTERVAL_MS - elapsed)
	}
	lastRequestStartMs = Date.now()
}

const BACKOFF_DELAYS_MS = [1000, 2000, 4000]

async function withBackoff<T>(label: string, fn: () => Promise<T>): Promise<T> {
	let lastErr: unknown
	for (let attempt = 0; attempt <= BACKOFF_DELAYS_MS.length; attempt++) {
		try {
			await throttle()
			return await fn()
		} catch (err) {
			lastErr = err
			const is429 = err instanceof Anthropic.APIError && err.status === 429
			if (is429 && attempt < BACKOFF_DELAYS_MS.length) {
				const delay = BACKOFF_DELAYS_MS[attempt] ?? 4000
				console.warn(
					`[rate-limit] ${label} 429, retry ${attempt + 1}/${BACKOFF_DELAYS_MS.length} in ${delay}ms`
				)
				await Bun.sleep(delay)
				continue
			}
			throw err
		}
	}
	throw lastErr
}

function errorToString(err: unknown): string {
	if (err instanceof Error) return err.message
	return String(err)
}

const EXTRACT_MODEL = "claude-sonnet-4-6"
const SOLVE_MODEL = "claude-sonnet-4-6"
const VERIFY_MODEL = "claude-sonnet-4-6"
const EXPLAIN_MODEL = "claude-sonnet-4-6"

const EXTRACT_MAX_TOKENS = 2048
const SOLVE_MAX_TOKENS = 512
const VERIFY_MAX_TOKENS = 512
const EXPLAIN_MAX_TOKENS = 512

export {
	client,
	errorToString,
	EXPLAIN_MAX_TOKENS,
	EXPLAIN_MODEL,
	EXTRACT_MAX_TOKENS,
	EXTRACT_MODEL,
	SOLVE_MAX_TOKENS,
	SOLVE_MODEL,
	throttle,
	VERIFY_MAX_TOKENS,
	VERIFY_MODEL,
	withBackoff
}
