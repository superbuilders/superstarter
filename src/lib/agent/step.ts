import * as errors from "@superbuilders/errors"
import * as logger from "@superbuilders/slog"
import type { ModelMessage, StepResult, ToolSet } from "ai"
import { modelMessageSchema } from "ai"
import { z } from "zod"

type AgentStepResult = {
	stepNumber: number
	model: { provider: string; modelId: string }
	functionId?: string
	metadata?: Record<string, unknown>
	experimental_context?: unknown
	content: unknown[]
	text: string
	reasoning: unknown[]
	reasoningText?: string
	files: unknown[]
	sources: unknown[]
	toolCalls: unknown[]
	staticToolCalls: unknown[]
	dynamicToolCalls: unknown[]
	toolResults: unknown[]
	staticToolResults: unknown[]
	dynamicToolResults: unknown[]
	finishReason: string
	rawFinishReason?: string
	usage: {
		inputTokens?: number
		outputTokens?: number
		totalTokens?: number
	}
	warnings: unknown[]
	request: unknown
	response: unknown
	providerMetadata?: unknown
}

type TokenUsage = { inputTokens: number; outputTokens: number; totalTokens: number }

const messagesSchema = z.array(modelMessageSchema)

function parseMessages(raw: unknown): ModelMessage[] {
	const parsed = messagesSchema.safeParse(raw)
	if (!parsed.success) {
		logger.error("response messages failed validation", { error: parsed.error })
		throw errors.new("response messages failed validation")
	}
	return parsed.data
}

function materializeStep<T extends ToolSet>(step: StepResult<T>): AgentStepResult {
	const own = { ...step }
	return {
		...own,
		text: step.text,
		reasoning: step.reasoning,
		reasoningText: step.reasoningText,
		files: step.files,
		sources: step.sources,
		toolCalls: step.toolCalls,
		staticToolCalls: step.staticToolCalls,
		dynamicToolCalls: step.dynamicToolCalls,
		toolResults: step.toolResults,
		staticToolResults: step.staticToolResults,
		dynamicToolResults: step.dynamicToolResults,
		warnings: step.warnings ? step.warnings : []
	}
}

function accumulateUsage(total: TokenUsage, step: AgentStepResult): TokenUsage {
	const input = step.usage.inputTokens
	const output = step.usage.outputTokens
	const stepTotal = step.usage.totalTokens
	return {
		inputTokens: total.inputTokens + (input ? input : 0),
		outputTokens: total.outputTokens + (output ? output : 0),
		totalTokens: total.totalTokens + (stepTotal ? stepTotal : 0)
	}
}

export { accumulateUsage, materializeStep, parseMessages }
export type { AgentStepResult, TokenUsage }
