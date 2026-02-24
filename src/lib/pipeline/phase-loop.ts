import * as errors from "@superbuilders/errors"
import type { LanguageModel, ModelMessage, ToolResultPart, ToolSet } from "ai"
import { generateText } from "ai"
import type { Logger } from "inngest"
import type { inngest } from "@/inngest"
import type { CtaRequestEvent } from "@/lib/agent/cta"
import { CtaResponseEventSchema } from "@/lib/agent/cta"
import { parseMessages } from "@/lib/agent/step"

const CTA_TIMEOUT = "30d" as const

type InngestStep = Parameters<Parameters<typeof inngest.createFunction>[2]>[0]["step"]

type HumanFeedbackInput = {
	kind: string
	message?: string
	prompt?: string
	placeholder?: string
	options: Array<{ id: string; label: string }>
}

type StaticToolCallGeneric = {
	toolCallId: string
	toolName: string
	input: unknown
}

type AgentLoopConfig = {
	model: LanguageModel
	system: string
	initialMessages: ModelMessage[]
	tools: ToolSet
	maxSteps: number
	step: InngestStep
	logger: Logger
	onToolCall: (toolCall: StaticToolCallGeneric) => Promise<ToolResultPart>
	experimentalContext?: Record<string, unknown>
}

type AgentLoopResult = {
	text: string
	stepCount: number
	finishReason: string
}

function buildToolResult(toolCallId: string, toolName: string, value: unknown): ToolResultPart {
	return {
		type: "tool-result" as const,
		toolCallId,
		toolName,
		output: { type: "text" as const, value: JSON.stringify(value) }
	}
}

function buildCtaRequest(ctaId: string, runId: string, input: HumanFeedbackInput): CtaRequestEvent {
	if (input.kind === "approval") {
		return {
			ctaId,
			runId,
			kind: "approval" as const,
			message: input.message ? input.message : "Approval requested"
		}
	}
	if (input.kind === "text") {
		return {
			ctaId,
			runId,
			kind: "text" as const,
			prompt: input.prompt ? input.prompt : "Input requested",
			placeholder: input.placeholder
		}
	}
	return {
		ctaId,
		runId,
		kind: "choice" as const,
		prompt: input.prompt ? input.prompt : "Choice requested",
		options: input.options
	}
}

async function dispatchCta(
	toolCallId: string,
	toolName: string,
	input: HumanFeedbackInput,
	stepIndex: number,
	runId: string,
	step: InngestStep,
	logger: Logger
): Promise<ToolResultPart> {
	const ctaId = crypto.randomUUID()
	const ctaData = buildCtaRequest(ctaId, runId, input)

	await step.sendEvent(`cta-emit-${stepIndex}`, {
		name: "paul/cta/request" as const,
		data: ctaData
	})

	logger.info("cta emitted, suspending", { ctaId, kind: input.kind })

	const ctaResponse = await step.waitForEvent(`cta-wait-${stepIndex}`, {
		event: "paul/cta/response",
		if: `async.data.ctaId == "${ctaId}"`,
		timeout: CTA_TIMEOUT
	})

	if (!ctaResponse) {
		logger.warn("cta timeout", { ctaId, kind: input.kind })
		return buildToolResult(toolCallId, toolName, {
			error: "timeout",
			message: "Human feedback request timed out after 30 days."
		})
	}

	logger.info("cta response received", { ctaId, kind: ctaResponse.data.kind })

	const validated = CtaResponseEventSchema.safeParse(ctaResponse.data)
	if (!validated.success) {
		logger.error("cta response validation failed", { error: validated.error })
		throw errors.new("cta response validation failed")
	}

	return buildToolResult(toolCallId, toolName, validated.data)
}

async function runAgentLoop(config: AgentLoopConfig): Promise<AgentLoopResult> {
	const logger = config.logger
	let messages: ModelMessage[] = [...config.initialMessages]
	let lastText = ""
	let stepCount = 0
	let lastFinishReason = "unknown"

	for (let i = 0; i < config.maxSteps; i++) {
		const thought = await config.step.run(`think-${i}`, async () => {
			const result = await errors.try(
				generateText({
					model: config.model,
					system: config.system,
					messages,
					tools: config.tools,
					experimental_context: config.experimentalContext
				})
			)
			if (result.error) {
				logger.error("llm call failed", { error: result.error, step: i })
				throw errors.wrap(result.error, `llm step ${i}`)
			}

			return {
				text: result.data.text,
				finishReason: result.data.finishReason,
				staticToolCalls: result.data.staticToolCalls,
				responseMessages: result.data.response.messages,
				usage: result.data.usage
			}
		})

		logger.info("thought complete", {
			step: i,
			finishReason: thought.finishReason,
			toolCallCount: thought.staticToolCalls.length
		})

		lastText = thought.text
		lastFinishReason = thought.finishReason
		stepCount++

		if (thought.finishReason === "stop") {
			break
		}

		const assistantMessages = parseMessages(thought.responseMessages)
		messages = [...messages, ...assistantMessages]

		const toolResultPromises = thought.staticToolCalls.map(function dispatchToolCall(toolCall: {
			toolCallId: string
			toolName: string
			input: unknown
		}) {
			logger.info("dispatching tool", {
				step: i,
				tool: toolCall.toolName,
				toolCallId: toolCall.toolCallId
			})

			return config.onToolCall({
				toolCallId: toolCall.toolCallId,
				toolName: toolCall.toolName,
				input: toolCall.input
			})
		})

		const toolResults = await Promise.all(toolResultPromises)

		if (toolResults.length > 0) {
			messages.push({ role: "tool" as const, content: toolResults })
		}
	}

	return { text: lastText, stepCount, finishReason: lastFinishReason }
}

export { buildCtaRequest, buildToolResult, dispatchCta, runAgentLoop }
export type {
	AgentLoopConfig,
	AgentLoopResult,
	HumanFeedbackInput,
	InngestStep,
	StaticToolCallGeneric
}
