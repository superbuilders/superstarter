import * as errors from "@superbuilders/errors"
import type { ToolResultPart } from "ai"
import { tool } from "ai"
import type { Logger } from "inngest"
import { z } from "zod"
import { db } from "@/db"
import { inngest } from "@/inngest"
import { exploreFunction } from "@/inngest/functions/agents/explore"
import { requestHumanFeedbackTool } from "@/lib/agent/cta"
import { createMemoryTool, formatMemoriesForPrompt } from "@/lib/agent/memory"
import { model } from "@/lib/agent/orchestrator"
import { connectSandbox } from "@/lib/agent/sandbox"
import { updateFeatureRunMemories } from "@/lib/pipeline/persistence"
import type {
	HumanFeedbackInput,
	InngestStep,
	StaticToolCallGeneric
} from "@/lib/pipeline/phase-loop"
import { buildToolResult, dispatchCta, runAgentLoop } from "@/lib/pipeline/phase-loop"

const AssumptionSchema = z.object({
	claim: z.string(),
	validated: z.boolean(),
	evidence: z.string()
})

const TradeoffsSchema = z.object({
	pros: z.array(z.string()),
	cons: z.array(z.string())
})

const ApproachSchema = z.object({
	id: z.string(),
	title: z.string(),
	summary: z.string(),
	rationale: z.string(),
	implementation: z.string(),
	affectedFiles: z.array(z.string()),
	tradeoffs: TradeoffsSchema,
	assumptions: z.array(AssumptionSchema),
	estimatedComplexity: z.enum(["low", "medium", "high"])
})

const ApproachesOutputSchema = z.object({
	approaches: z.array(ApproachSchema).min(2),
	recommendation: z.string(),
	singleApproachJustification: z.string().optional()
})

type ApproachesOutput = z.infer<typeof ApproachesOutputSchema>

const SpawnExplorerInputSchema = z.object({
	prompt: z.string().min(1),
	sandboxId: z.string().min(1),
	github: z
		.object({
			repoUrl: z.string().url(),
			branch: z.string().min(1)
		})
		.optional()
})

const HumanFeedbackInputSchema = z.object({
	kind: z.string(),
	message: z.string().optional(),
	prompt: z.string().optional(),
	placeholder: z.string().optional(),
	options: z
		.array(
			z.object({
				id: z.string().min(1),
				label: z.string().min(1)
			})
		)
		.optional()
})

const CreateMemoryInputSchema = z.object({
	kind: z.string().min(1),
	content: z.string().min(1)
})

const spawnExplorerTool = tool({
	description: [
		"Spawn an explorer subagent to validate technical assumptions in the codebase.",
		"Use this to read files, search for patterns, verify that specific APIs exist,",
		"check dependency versions, or confirm architectural constraints.",
		"The explorer runs to completion and returns a summary of its findings."
	].join(" "),
	inputSchema: z.object({
		prompt: z.string().min(1).describe("Detailed instructions for the explorer"),
		sandboxId: z.string().min(1).describe("Sandbox ID for the explorer to work in"),
		github: z
			.object({
				repoUrl: z.string().url(),
				branch: z.string().min(1)
			})
			.describe("GitHub repo context for the explorer")
			.optional()
	})
})

const approachesTools = {
	spawn_subagent: spawnExplorerTool,
	request_human_feedback: requestHumanFeedbackTool,
	create_memory: createMemoryTool
} as const

function buildApproachesSystemPrompt(ctx: {
	sandboxId: string
	githubRepoUrl: string
	githubBranch: string
	memories: string
	analysisOutput: string
}): string {
	const sections = [
		"You are the Approaches Phase orchestrator for a feature implementation pipeline.",
		"Your job is to generate 2 or more distinct implementation approaches, each with validated technical assumptions.",
		"",
		"## Differentiation Constraint",
		"Approaches must differ along a structural axis (which layer, what abstraction, sync vs async).",
		"Do NOT produce approach B by weakening approach A.",
		"Each approach must represent a genuinely different way to solve the problem,",
		"not a variation in effort level or completeness.",
		"",
		"## Environment",
		`- Sandbox ID: ${ctx.sandboxId}`,
		`- GitHub repo: ${ctx.githubRepoUrl}`,
		`- Branch: ${ctx.githubBranch}`,
		"",
		"## Your Tools",
		"- **spawn_subagent**: Spawn explorer agents to validate technical assumptions.",
		"  Use this to verify APIs exist, check dependency compatibility, confirm file structures.",
		"  Always pass the sandbox ID and github context when spawning.",
		"- **request_human_feedback**: Ask the human for clarification on design preferences.",
		"  Use this when the feature has ambiguous UX or architectural tradeoffs that need human input.",
		"  Don't ask for things you can decide yourself.",
		"- **create_memory**: Record important findings for future phases.",
		"  Use 'insight' for non-obvious discoveries, 'constraint' for hard limitations,",
		"  'decision' for meaningful choices, 'failure' for things that didn't work.",
		"",
		"## Workflow",
		"1. Review the analysis output below to understand the codebase landscape.",
		"2. Identify 2+ structurally distinct axes for implementing the feature.",
		"3. For each approach, spawn explorers to validate key technical assumptions.",
		"4. Write the implementation plan as a numbered list of concrete steps:",
		"   which file, what change, in what order.",
		"5. Assess tradeoffs (pros/cons) for each approach.",
		"6. Create memory records for validated assumptions and key decisions.",
		"7. Produce the final structured output with all approaches.",
		"",
		"## Analysis Output (from previous phase)",
		ctx.analysisOutput,
		"",
		"## Final Output",
		"When approach generation is complete, respond with a JSON object matching this exact schema:",
		"```json",
		"{",
		'  "approaches": [',
		"    {",
		'      "id": "approach-1",',
		'      "title": "Short descriptive title",',
		'      "summary": "One paragraph summary of the approach",',
		'      "rationale": "Why this approach is worth considering",',
		'      "implementation": "Numbered list of concrete steps: which file, what change, in what order",',
		'      "affectedFiles": ["src/path/to/file.ts"],',
		'      "tradeoffs": { "pros": ["..."], "cons": ["..."] },',
		'      "assumptions": [',
		'        { "claim": "Assumption text", "validated": true, "evidence": "What was found" }',
		"      ],",
		'      "estimatedComplexity": "low" | "medium" | "high"',
		"    }",
		"  ],",
		'  "recommendation": "Which approach is recommended and why",',
		'  "singleApproachJustification": "Only if fewer than 2 approaches exist, explain why"',
		"}",
		"```",
		"",
		"IMPORTANT: Your final message MUST be ONLY the JSON object, with no surrounding text or markdown fences."
	]

	if (ctx.memories.length > 0) {
		sections.push("", ctx.memories)
	}

	return sections.join("\n")
}

type ParseLogger = {
	warn: (msg: string, ctx?: Record<string, unknown>) => void
	error: (msg: string, ctx?: Record<string, unknown>) => void
}

function parseApproachesOutput(text: string, logger: ParseLogger): ApproachesOutput {
	const trimmed = text.trim()

	const jsonMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/)
	const captured = jsonMatch ? jsonMatch[1] : undefined
	const jsonText = captured ? captured.trim() : trimmed

	const parseResult = errors.trySync(function parseJson() {
		return JSON.parse(jsonText)
	})
	if (parseResult.error) {
		logger.warn("approaches output json parse failed, attempting extraction", {
			error: parseResult.error
		})
		const braceStart = trimmed.indexOf("{")
		const braceEnd = trimmed.lastIndexOf("}")
		if (braceStart === -1) {
			logger.error("no json object found in approaches output", { error: parseResult.error })
			throw errors.wrap(parseResult.error, "approaches output json parse")
		}
		const extracted = trimmed.slice(braceStart, braceEnd + 1)
		const retryResult = errors.trySync(function retryParse() {
			return JSON.parse(extracted)
		})
		if (retryResult.error) {
			logger.error("approaches output json retry parse failed", { error: retryResult.error })
			throw errors.wrap(retryResult.error, "approaches output json retry parse")
		}
		const retryValidation = ApproachesOutputSchema.safeParse(retryResult.data)
		if (!retryValidation.success) {
			logger.error("approaches output schema validation retry failed", {
				error: retryValidation.error
			})
			throw errors.wrap(retryValidation.error, "approaches output schema validation retry")
		}
		return retryValidation.data
	}

	const validation = ApproachesOutputSchema.safeParse(parseResult.data)
	if (!validation.success) {
		logger.error("approaches output schema validation failed", { error: validation.error })
		throw errors.wrap(validation.error, "approaches output schema validation")
	}

	return validation.data
}

async function handleSpawnSubagent(
	toolCall: StaticToolCallGeneric,
	step: InngestStep,
	github: { repoUrl: string; branch: string },
	logger: Logger
): Promise<ToolResultPart> {
	const parsed = SpawnExplorerInputSchema.safeParse(toolCall.input)
	if (!parsed.success) {
		logger.error("spawn_subagent input validation failed", { error: parsed.error })
		throw errors.wrap(parsed.error, "spawn_subagent input validation")
	}
	const input = parsed.data

	const invokeResult = await step.invoke(`explore-${toolCall.toolCallId}`, {
		function: exploreFunction,
		data: {
			prompt: input.prompt,
			sandboxId: input.sandboxId,
			github: input.github ? input.github : github
		}
	})

	logger.info("explorer complete", {
		toolCallId: toolCall.toolCallId,
		stepCount: invokeResult.stepCount
	})

	return buildToolResult(toolCall.toolCallId, toolCall.toolName, invokeResult)
}

async function handleHumanFeedback(
	toolCall: StaticToolCallGeneric,
	runId: string,
	step: InngestStep,
	logger: Logger
): Promise<ToolResultPart> {
	const parsed = HumanFeedbackInputSchema.safeParse(toolCall.input)
	if (!parsed.success) {
		logger.error("request_human_feedback input validation failed", { error: parsed.error })
		throw errors.wrap(parsed.error, "request_human_feedback input validation")
	}
	const input = parsed.data
	const options = input.options ? input.options : []
	const feedbackInput: HumanFeedbackInput = {
		kind: input.kind,
		message: input.message,
		prompt: input.prompt,
		placeholder: input.placeholder,
		options
	}
	return dispatchCta(toolCall.toolCallId, toolCall.toolName, feedbackInput, 0, runId, step, logger)
}

function handleCreateMemory(
	toolCall: StaticToolCallGeneric,
	collectedMemories: Array<{ phase: string; kind: string; content: string }>,
	logger: Logger
): ToolResultPart {
	const parsed = CreateMemoryInputSchema.safeParse(toolCall.input)
	if (!parsed.success) {
		logger.error("create_memory input validation failed", { error: parsed.error })
		throw errors.wrap(parsed.error, "create_memory input validation")
	}
	const input = parsed.data
	collectedMemories.push({ phase: "approaches", kind: input.kind, content: input.content })

	logger.info("memory created", { kind: input.kind })

	return buildToolResult(toolCall.toolCallId, toolCall.toolName, { ok: true })
}

const approachesFunction = inngest.createFunction(
	{ id: "paul/pipeline/approaches" },
	{ event: "paul/pipeline/approaches" },
	async ({ event, logger, step }) => {
		const { runId, sandboxId, prompt, githubRepoUrl, githubBranch, memories, analysisOutput } =
			event.data

		logger.info("starting approaches phase", { runId, sandboxId })

		await connectSandbox(sandboxId, logger)

		const memoriesPrompt = formatMemoriesForPrompt(memories)
		const analysisText =
			typeof analysisOutput === "string" ? analysisOutput : JSON.stringify(analysisOutput, null, 2)
		const system = buildApproachesSystemPrompt({
			sandboxId,
			githubRepoUrl,
			githubBranch,
			memories: memoriesPrompt,
			analysisOutput: analysisText
		})

		const github = { repoUrl: githubRepoUrl, branch: githubBranch }
		const collectedMemories: Array<{ phase: string; kind: string; content: string }> = []

		const result = await runAgentLoop({
			model,
			system,
			initialMessages: [{ role: "user" as const, content: prompt }],
			tools: approachesTools,
			maxSteps: 50,
			step,
			logger,
			onToolCall: async function handleToolCall(toolCall) {
				if (toolCall.toolName === "spawn_subagent") {
					return handleSpawnSubagent(toolCall, step, github, logger)
				}
				if (toolCall.toolName === "request_human_feedback") {
					return handleHumanFeedback(toolCall, runId, step, logger)
				}
				if (toolCall.toolName === "create_memory") {
					return handleCreateMemory(toolCall, collectedMemories, logger)
				}
				logger.warn("unknown tool call", { toolName: toolCall.toolName })
				return buildToolResult(toolCall.toolCallId, toolCall.toolName, {
					error: "unknown tool"
				})
			}
		})

		if (collectedMemories.length > 0) {
			await step.run("persist-memories", async function persistMemories() {
				await updateFeatureRunMemories(db, runId, collectedMemories)
			})
		}

		const output = await step.run("validate-output", function validateOutput() {
			return parseApproachesOutput(result.text, logger)
		})

		logger.info("approaches phase complete", {
			runId,
			stepCount: result.stepCount,
			approachCount: output.approaches.length,
			recommendation: output.recommendation.slice(0, 100)
		})

		return output
	}
)

export { ApproachesOutputSchema, approachesFunction }
export type { ApproachesOutput }
