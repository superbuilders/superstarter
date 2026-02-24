import * as errors from "@superbuilders/errors"
import type { ModelMessage, ToolResultPart } from "ai"
import { generateText } from "ai"
import type { Logger } from "inngest"
import { inngest } from "@/inngest"
import { codeFunction } from "@/inngest/functions/agents/code"
import { exploreFunction } from "@/inngest/functions/agents/explore"
import type { CtaRequestEvent } from "@/lib/agent/cta"
import { CtaResponseEventSchema } from "@/lib/agent/cta"
import { buildInstructions, MAX_STEPS, model, tools } from "@/lib/agent/orchestrator"
import { parseMessages } from "@/lib/agent/step"

const CTA_TIMEOUT = "30d" as const

type HumanFeedbackInput = {
	kind: string
	message?: string
	prompt?: string
	placeholder?: string
	options: Array<{ id: string; label: string }>
}

type InngestStep = Parameters<Parameters<typeof inngest.createFunction>[2]>[0]["step"]

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

async function dispatchSubagent(
	toolCallId: string,
	toolName: string,
	input: {
		agent: "explore" | "code"
		prompt: string
		sandboxId: string
		github?: { repoUrl: string; branch: string }
	},
	stepIndex: number,
	step: InngestStep,
	logger: Logger
): Promise<ToolResultPart> {
	const targetFunction = input.agent === "explore" ? exploreFunction : codeFunction
	const invokeResult = await step.invoke(`spawn-${stepIndex}-${toolCallId}`, {
		function: targetFunction,
		data: {
			prompt: input.prompt,
			sandboxId: input.sandboxId,
			github: input.github
		}
	})

	logger.info("subagent complete", {
		step: stepIndex,
		agent: input.agent,
		stepCount: invokeResult.stepCount
	})

	return buildToolResult(toolCallId, toolName, invokeResult)
}

async function dispatchHumanFeedback(
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

const orchestrateFunction = inngest.createFunction(
	{ id: "paul/agents/orchestrate" },
	{ event: "paul/agents/orchestrate" },
	async ({ event, logger, step }) => {
		logger.info("starting orchestrate", {
			prompt: event.data.prompt,
			sandboxId: event.data.sandboxId
		})

		const runId = event.id ? event.id : crypto.randomUUID()
		const system = buildInstructions({
			sandboxId: event.data.sandboxId,
			github: event.data.github
		})

		let messages: ModelMessage[] = [{ role: "user" as const, content: event.data.prompt }]
		let lastText = ""
		let stepCount = 0

		for (let i = 0; i < MAX_STEPS; i++) {
			const thought = await step.run(`think-${i}`, async () => {
				const result = await errors.try(generateText({ model, system, messages, tools }))
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
			stepCount++

			if (thought.finishReason === "stop") {
				break
			}

			const assistantMessages = parseMessages(thought.responseMessages)
			messages = [...messages, ...assistantMessages]

			const toolResultPromises = thought.staticToolCalls.map(function dispatchToolCall(toolCall) {
				logger.info("dispatching tool", {
					step: i,
					tool: toolCall.toolName,
					toolCallId: toolCall.toolCallId
				})

				if (toolCall.toolName === "spawn_subagent") {
					return dispatchSubagent(
						toolCall.toolCallId,
						toolCall.toolName,
						toolCall.input,
						i,
						step,
						logger
					)
				}

				const rawInput = toolCall.input
				const feedbackOptions = rawInput.options ? rawInput.options : []
				const feedbackInput: HumanFeedbackInput = {
					kind: rawInput.kind,
					message: rawInput.message,
					prompt: rawInput.prompt,
					placeholder: rawInput.placeholder,
					options: feedbackOptions
				}
				return dispatchHumanFeedback(
					toolCall.toolCallId,
					toolCall.toolName,
					feedbackInput,
					i,
					runId,
					step,
					logger
				)
			})

			const toolResults = await Promise.all(toolResultPromises)

			if (toolResults.length > 0) {
				messages.push({ role: "tool" as const, content: toolResults })
			}
		}

		logger.info("orchestrate complete", { stepCount })

		return { text: lastText, stepCount }
	}
)

export { orchestrateFunction }
