import * as errors from "@superbuilders/errors"
import { inngest } from "@/inngest"
import { explorer } from "@/lib/agent/explorer"

const exploreFunction = inngest.createFunction(
	{ id: "paul/agents/explore" },
	{ event: "paul/agents/explore" },
	async ({ event, logger, step }) => {
		logger.info("starting explore", { prompt: event.data.prompt })

		const result = await step.run("explore", async () => {
			const generation = await errors.try(
				explorer.generate({
					prompt: event.data.prompt
				})
			)
			if (generation.error) {
				logger.error("explore failed", { error: generation.error })
				throw errors.wrap(generation.error, "explore")
			}

			return {
				text: generation.data.text,
				steps: generation.data.steps.map(function summarizeStep(s) {
					return {
						stepNumber: s.stepNumber,
						finishReason: s.finishReason,
						usage: s.usage,
						text: s.text,
						toolCalls: s.toolCalls,
						toolResults: s.toolResults
					}
				}),
				totalUsage: generation.data.totalUsage
			}
		})

		await step.sendEvent(
			"emit-steps",
			result.steps.map(function toEchoEvent(s) {
				return {
					name: "paul/debug/echo" as const,
					data: {
						source: "paul/agents/explore",
						payload: {
							stepNumber: s.stepNumber,
							finishReason: s.finishReason,
							usage: s.usage,
							text: s.text,
							toolCalls: s.toolCalls,
							toolResults: s.toolResults
						}
					}
				}
			})
		)

		logger.info("explore complete", {
			stepCount: result.steps.length,
			totalUsage: result.totalUsage
		})

		return result
	}
)

export { exploreFunction }
