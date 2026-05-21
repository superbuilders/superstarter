import * as errors from "@superbuilders/errors"
import OpenAI from "openai"
import { env } from "@/env"
import { logger } from "@/logger"

const EMBEDDING_MODEL = "text-embedding-3-small"

const client = new OpenAI({ apiKey: env.OPENAI_API_KEY })

async function embedText(text: string): Promise<number[]> {
	const result = await errors.try(
		client.embeddings.create({
			model: EMBEDDING_MODEL,
			input: text
		})
	)
	if (result.error) {
		logger.error({ error: result.error, model: EMBEDDING_MODEL }, "openai embeddings.create failed")
		throw errors.wrap(result.error, "openai embeddings.create")
	}

	const response = result.data
	const first = response.data[0]
	if (!first) {
		logger.error({ model: EMBEDDING_MODEL }, "openai embeddings response missing data[0]")
		throw errors.new("openai embeddings response missing data[0]")
	}

	logger.debug(
		{
			model: EMBEDDING_MODEL,
			input_tokens: response.usage.prompt_tokens,
			dimensions: first.embedding.length
		},
		"openai embeddings.create succeeded"
	)

	return first.embedding
}

export { EMBEDDING_MODEL, embedText }
