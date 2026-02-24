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

const AnalysisOutputSchema = z.object({
	affectedSystems: z.array(z.string()),
	architecturalConstraints: z.array(z.string()),
	risks: z.array(z.string()),
	codebaseMap: z.array(
		z.object({
			path: z.string(),
			purpose: z.string(),
			relevance: z.string()
		})
	),
	feasibilityAssessment: z.string()
})

type AnalysisOutput = z.infer<typeof AnalysisOutputSchema>

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
		"Spawn an explorer subagent to research the codebase.",
		"Use this to read files, search for patterns, understand architecture.",
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

const analysisTools = {
	spawn_subagent: spawnExplorerTool,
	request_human_feedback: requestHumanFeedbackTool,
	create_memory: createMemoryTool
} as const

function buildAnalysisSystemPrompt(ctx: {
	sandboxId: string
	githubRepoUrl: string
	githubBranch: string
	memories: string
}): string {
	const sections = [
		"You are the Analysis Phase orchestrator for a feature implementation pipeline.",
		"Your job is to thoroughly analyze a target codebase to assess architectural feasibility for a proposed feature.",
		"",
		"## Environment",
		`- Sandbox ID: ${ctx.sandboxId}`,
		`- GitHub repo: ${ctx.githubRepoUrl}`,
		`- Branch: ${ctx.githubBranch}`,
		"",
		"## Your Tools",
		"- **spawn_subagent**: Spawn explorer agents to read files, search patterns, understand architecture.",
		"  Always pass the sandbox ID and github context when spawning.",
		"- **request_human_feedback**: Ask the human for clarification when the feature request is ambiguous.",
		"  Use this early if requirements are unclear. Don't ask for things you can decide yourself.",
		"- **create_memory**: Record important findings for future phases.",
		"  Use 'insight' for non-obvious discoveries, 'constraint' for hard limitations,",
		"  'decision' for meaningful choices, 'failure' for things that didn't work.",
		"",
		"## Workflow",
		"1. If the feature request is ambiguous, request human feedback FIRST.",
		"2. Break the codebase into logical areas (e.g., database, API, UI, config).",
		"3. Spawn explorer agents for each area to understand the architecture.",
		"4. Identify which files, modules, and systems the feature will touch.",
		"5. List architectural constraints (e.g., framework limitations, dependency version locks).",
		"6. Identify risks (e.g., breaking changes, migration complexity).",
		"7. Create memory records for key findings so future phases can use them.",
		"8. Produce a feasibility assessment summarizing whether the feature is buildable and what the main challenges are.",
		"",
		"## Final Output",
		"When analysis is complete, respond with a JSON object matching this exact schema:",
		"```json",
		"{",
		'  "affectedSystems": ["list of systems/modules the feature touches"],',
		'  "architecturalConstraints": ["list of hard constraints discovered"],',
		'  "risks": ["list of risks identified"],',
		'  "codebaseMap": [',
		'    { "path": "src/some/path", "purpose": "what this file/dir does", "relevance": "how it relates to the feature" }',
		"  ],",
		'  "feasibilityAssessment": "A paragraph summarizing feasibility, main challenges, and recommended approach"',
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

function parseAnalysisOutput(text: string, logger: ParseLogger): AnalysisOutput {
	const trimmed = text.trim()

	const jsonMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/)
	const captured = jsonMatch ? jsonMatch[1] : undefined
	const jsonText = captured ? captured.trim() : trimmed

	const parseResult = errors.trySync(function parseJson() {
		return JSON.parse(jsonText)
	})
	if (parseResult.error) {
		logger.warn("analysis output json parse failed, attempting extraction", {
			error: parseResult.error
		})
		const braceStart = trimmed.indexOf("{")
		const braceEnd = trimmed.lastIndexOf("}")
		if (braceStart === -1) {
			logger.error("no json object found in analysis output", { error: parseResult.error })
			throw errors.wrap(parseResult.error, "analysis output json parse")
		}
		const extracted = trimmed.slice(braceStart, braceEnd + 1)
		const retryResult = errors.trySync(function retryParse() {
			return JSON.parse(extracted)
		})
		if (retryResult.error) {
			logger.error("analysis output json retry parse failed", { error: retryResult.error })
			throw errors.wrap(retryResult.error, "analysis output json retry parse")
		}
		const retryValidation = AnalysisOutputSchema.safeParse(retryResult.data)
		if (!retryValidation.success) {
			logger.error("analysis output schema validation retry failed", {
				error: retryValidation.error
			})
			throw errors.wrap(retryValidation.error, "analysis output schema validation retry")
		}
		return retryValidation.data
	}

	const validation = AnalysisOutputSchema.safeParse(parseResult.data)
	if (!validation.success) {
		logger.error("analysis output schema validation failed", { error: validation.error })
		throw errors.wrap(validation.error, "analysis output schema validation")
	}

	return validation.data
}

async function handleSpawnSubagent(
	toolCall: StaticToolCallGeneric,
	github: { repoUrl: string; branch: string },
	step: InngestStep,
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
	const memoryRecord = {
		phase: "analysis",
		kind: input.kind,
		content: input.content
	}
	collectedMemories.push(memoryRecord)

	logger.info("memory created", { kind: input.kind })

	return buildToolResult(toolCall.toolCallId, toolCall.toolName, { ok: true })
}

const analysisFunction = inngest.createFunction(
	{ id: "paul/pipeline/analysis" },
	{ event: "paul/pipeline/analysis" },
	async ({ event, logger, step }) => {
		const { runId, sandboxId, prompt, githubRepoUrl, githubBranch, memories } = event.data

		logger.info("starting analysis phase", { runId, sandboxId })

		await connectSandbox(sandboxId, logger)

		const memoriesPrompt = formatMemoriesForPrompt(memories)
		const system = buildAnalysisSystemPrompt({
			sandboxId,
			githubRepoUrl,
			githubBranch,
			memories: memoriesPrompt
		})

		const github = { repoUrl: githubRepoUrl, branch: githubBranch }
		const collectedMemories: Array<{ phase: string; kind: string; content: string }> = []

		const result = await runAgentLoop({
			model,
			system,
			initialMessages: [{ role: "user" as const, content: prompt }],
			tools: analysisTools,
			maxSteps: 50,
			step,
			logger,
			onToolCall: async function handleToolCall(toolCall) {
				if (toolCall.toolName === "spawn_subagent") {
					return handleSpawnSubagent(toolCall, github, step, logger)
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
			return parseAnalysisOutput(result.text, logger)
		})

		logger.info("analysis phase complete", {
			runId,
			stepCount: result.stepCount,
			affectedSystems: output.affectedSystems.length,
			risks: output.risks.length
		})

		return output
	}
)

export { AnalysisOutputSchema, analysisFunction }
export type { AnalysisOutput }
