import * as errors from "@superbuilders/errors"
import type { ModelMessage } from "ai"
import { generateText } from "ai"
import { NonRetriableError } from "inngest"
import { inngest } from "@/inngest"
import { instructions, MAX_STEPS, model, tools } from "@/lib/agent/coder"
import { ErrSandboxContext } from "@/lib/agent/fs/context"
import { connectSandbox } from "@/lib/agent/sandbox"
import type { TokenUsage } from "@/lib/agent/step"
import { accumulateUsage, materializeStep, parseMessages } from "@/lib/agent/step"

const codeFunction = inngest.createFunction(
	{ id: "paul/agents/code" },
	{ event: "paul/agents/code" },
	async ({ event, logger, step }) => {
		logger.info("starting code", {
			prompt: event.data.prompt,
			sandboxId: event.data.sandboxId
		})

		const sbx = await connectSandbox(event.data.sandboxId, logger)

		const github = event.data.github
		const systemPrompt = github
			? `${instructions}\n\nYou are working on branch '${github.branch}' of ${github.repoUrl}`
			: instructions

		let responseMessages: ModelMessage[] = []
		let lastStepText = ""
		let stepCount = 0
		let totalUsage: TokenUsage = { inputTokens: 0, outputTokens: 0, totalTokens: 0 }

		for (let i = 0; i < MAX_STEPS; i++) {
			const stepResult = await step.run(`llm-${i}`, async () => {
				const result = await errors.try(
					generateText({
						model,
						system: systemPrompt,
						messages: [{ role: "user" as const, content: event.data.prompt }, ...responseMessages],
						tools,
						experimental_context: { sandbox: sbx }
					})
				)
				if (result.error) {
					if (errors.is(result.error, ErrSandboxContext)) {
						logger.error("sandbox context error", { error: result.error, step: i })
						throw new NonRetriableError("sandbox missing from tool context")
					}
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
			totalUsage = accumulateUsage(totalUsage, stepResult.step)
			lastStepText = stepResult.step.text
			stepCount++

			await step.sendEvent(`echo-${i}`, [
				{
					name: "paul/debug/echo" as const,
					data: {
						source: "paul/agents/code",
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

		logger.info("code complete", { stepCount, totalUsage })

		return { text: lastStepText, stepCount, totalUsage }
	}
)

export { codeFunction }
