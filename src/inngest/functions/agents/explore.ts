import * as errors from "@superbuilders/errors"
import * as logger from "@superbuilders/slog"
import type { ModelMessage, StepResult } from "ai"
import { generateText, modelMessageSchema } from "ai"
import { z } from "zod"
import { inngest } from "@/inngest"
import type { ExplorerStepResult, ExplorerTools } from "@/lib/agent/explorer"
import { instructions, MAX_STEPS, model, tools } from "@/lib/agent/explorer"

const messagesSchema = z.array(modelMessageSchema)

function parseMessages(raw: unknown): ModelMessage[] {
	const parsed = messagesSchema.safeParse(raw)
	if (!parsed.success) {
		logger.error("response messages failed validation", { error: parsed.error })
		throw errors.new("response messages failed validation")
	}
	return parsed.data
}

function materializeStep(step: StepResult<ExplorerTools>): ExplorerStepResult {
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

const exploreFunction = inngest.createFunction(
	{ id: "paul/agents/explore" },
	{ event: "paul/agents/explore" },
	async ({ event, logger, step }) => {
		logger.info("starting explore", { prompt: event.data.prompt })

		let responseMessages: ModelMessage[] = []
		const steps: ExplorerStepResult[] = []
		let totalUsage = { inputTokens: 0, outputTokens: 0, totalTokens: 0 }

		for (let i = 0; i < MAX_STEPS; i++) {
			const stepResult = await step.run(`llm-${i}`, async () => {
				const result = await errors.try(
					generateText({
						model,
						system: instructions,
						messages: [{ role: "user" as const, content: event.data.prompt }, ...responseMessages],
						tools
					})
				)
				if (result.error) {
					logger.error("llm call failed", { error: result.error, step: i })
					throw errors.wrap(result.error, `llm step ${i}`)
				}

				const firstStep = result.data.steps[0]
				if (!firstStep) {
					logger.error("no step in result", { step: i })
					throw errors.new("generateText returned no steps")
				}

				return {
					step: materializeStep(firstStep),
					responseMessages: result.data.response.messages
				}
			})

			responseMessages = [...responseMessages, ...parseMessages(stepResult.responseMessages)]

			const inputTokens = stepResult.step.usage.inputTokens
			const outputTokens = stepResult.step.usage.outputTokens
			const stepTotalTokens = stepResult.step.usage.totalTokens
			totalUsage = {
				inputTokens: totalUsage.inputTokens + (inputTokens ? inputTokens : 0),
				outputTokens: totalUsage.outputTokens + (outputTokens ? outputTokens : 0),
				totalTokens: totalUsage.totalTokens + (stepTotalTokens ? stepTotalTokens : 0)
			}

			steps.push(stepResult.step)

			await step.sendEvent(`echo-${i}`, [
				{
					name: "paul/debug/echo" as const,
					data: {
						source: "paul/agents/explore",
						payload: stepResult.step
					}
				}
			])

			logger.info("step complete", {
				step: i,
				finishReason: stepResult.step.finishReason,
				usage: stepResult.step.usage
			})

			if (stepResult.step.finishReason === "stop") {
				break
			}
		}

		logger.info("explore complete", {
			stepCount: steps.length,
			totalUsage
		})

		const lastStep = steps.at(-1)
		const text = lastStep ? lastStep.text : ""

		return {
			text,
			steps,
			totalUsage
		}
	}
)

export { exploreFunction }
