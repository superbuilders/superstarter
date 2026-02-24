import * as errors from "@superbuilders/errors"
import type { Sandbox } from "@vercel/sandbox"
import { tool } from "ai"
import type { Logger } from "inngest"
import { z } from "zod"
import { db } from "@/db"
import { inngest } from "@/inngest"
import { glob, grep, read } from "@/lib/agent/fs/operations"
import { buildInstructions, MAX_STEPS, model } from "@/lib/agent/judge"
import { createMemoryTool, formatMemoriesForPrompt } from "@/lib/agent/memory"
import { connectSandbox } from "@/lib/agent/sandbox"
import { updateFeatureRunMemories } from "@/lib/pipeline/persistence"
import type { StaticToolCallGeneric } from "@/lib/pipeline/phase-loop"
import { buildToolResult, runAgentLoop } from "@/lib/pipeline/phase-loop"

// ---------------------------------------------------------------------------
// Schemas
// ---------------------------------------------------------------------------

const CriterionSchema = z.enum(["security", "bugs", "compatibility", "performance", "quality"])

const SeveritySchema = z.enum(["critical", "major", "minor"])

const FindingSchema = z.object({
	criterion: CriterionSchema,
	severity: SeveritySchema,
	description: z.string(),
	recommendation: z.string()
})

const JudgeRawOutputSchema = z.object({
	findings: z.array(FindingSchema),
	overallAssessment: z.string()
})

const VerdictSchema = z.enum(["approved", "approved_with_conditions", "rejected"])

const ConditionSchema = z.object({
	description: z.string(),
	severity: SeveritySchema
})

const JudgingOutputSchema = z.object({
	selectedApproachId: z.string(),
	findings: z.array(FindingSchema),
	overallVerdict: VerdictSchema,
	conditions: z.array(ConditionSchema),
	rejectionReason: z.string().optional(),
	overallAssessment: z.string()
})

type JudgingOutput = z.infer<typeof JudgingOutputSchema>
type Finding = z.infer<typeof FindingSchema>
type Verdict = z.infer<typeof VerdictSchema>
type Condition = z.infer<typeof ConditionSchema>

// ---------------------------------------------------------------------------
// Tool input schemas for runtime validation
// ---------------------------------------------------------------------------

const ReadInputSchema = z.object({
	path: z.string()
})

const GlobInputSchema = z.object({
	dirPath: z.string(),
	pattern: z.string()
})

const GrepInputSchema = z.object({
	dirPath: z.string(),
	pattern: z.string(),
	glob: z.string().optional(),
	maxResults: z.number().optional()
})

const CreateMemoryInputSchema = z.object({
	kind: z.string().min(1),
	content: z.string().min(1)
})

const SelectedApproachIdSchema = z.object({
	id: z.string()
})

// ---------------------------------------------------------------------------
// Schema-only tool definitions for runAgentLoop dispatch
// ---------------------------------------------------------------------------

const judgeReadTool = tool({
	description:
		"Read the contents of a file at the given path. Returns the file content, byte size, and line count. Returns an error message if the file does not exist or exceeds the size limit.",
	inputSchema: z.object({
		path: z.string().describe("Absolute path to the file to read")
	})
})

const judgeGlobTool = tool({
	description:
		"Find files matching a glob pattern in a directory tree. Supports *, **, ? wildcards. Returns matching file paths with names and sizes. Use pattern '*' to list a directory.",
	inputSchema: z.object({
		dirPath: z.string().describe("Absolute path to the directory to search"),
		pattern: z.string().describe("Glob pattern to match files against (e.g. '**/*.ts', '*.json')")
	})
})

const judgeGrepTool = tool({
	description:
		"Search for a regex pattern across files in a directory tree. Returns matching lines with file path and line number. Optionally filter by glob pattern. Skips binary files.",
	inputSchema: z.object({
		dirPath: z.string().describe("Absolute path to the directory to search"),
		pattern: z.string().describe("Regex pattern to search for in file contents"),
		glob: z.string().describe("Optional glob pattern to filter which files to search").optional(),
		maxResults: z
			.number()
			.describe("Maximum number of matching lines to return (default 100)")
			.optional()
	})
})

const judgingTools = {
	read: judgeReadTool,
	glob: judgeGlobTool,
	grep: judgeGrepTool,
	create_memory: createMemoryTool
} as const

// ---------------------------------------------------------------------------
// Deterministic verdict derivation
// ---------------------------------------------------------------------------

function deriveVerdict(findings: Finding[]): Verdict {
	const hasCritical = findings.some(function checkCritical(f) {
		return f.severity === "critical"
	})
	if (hasCritical) {
		return "rejected"
	}

	const majorCount = findings.filter(function checkMajor(f) {
		return f.severity === "major"
	}).length
	if (majorCount >= 2) {
		return "rejected"
	}

	if (majorCount >= 1) {
		return "approved_with_conditions"
	}

	return "approved"
}

function buildConditions(findings: Finding[]): Condition[] {
	const nonCritical = findings.filter(function isNotCritical(f) {
		return f.severity !== "critical"
	})
	return nonCritical.map(function toCondition(f) {
		return {
			description: `[${f.criterion}] ${f.description}: ${f.recommendation}`,
			severity: f.severity
		}
	})
}

function buildRejectionReason(findings: Finding[]): string | undefined {
	const critical = findings.filter(function isCritical(f) {
		return f.severity === "critical"
	})
	const majors = findings.filter(function isMajor(f) {
		return f.severity === "major"
	})

	if (critical.length > 0) {
		const reasons = critical.map(function describe(f) {
			return `[${f.criterion}] ${f.description}`
		})
		return `Critical findings: ${reasons.join("; ")}`
	}

	if (majors.length >= 2) {
		const reasons = majors.map(function describe(f) {
			return `[${f.criterion}] ${f.description}`
		})
		return `Multiple major findings: ${reasons.join("; ")}`
	}

	return undefined
}

// ---------------------------------------------------------------------------
// JSON parsing
// ---------------------------------------------------------------------------

function parseJudgeOutput(
	text: string,
	logger: { warn: (msg: string, ctx?: Record<string, unknown>) => void }
): z.infer<typeof JudgeRawOutputSchema> {
	const trimmed = text.trim()

	const jsonMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/)
	const captured = jsonMatch ? jsonMatch[1] : undefined
	const jsonText = captured ? captured.trim() : trimmed

	const parseResult = errors.trySync(function parseJson() {
		return JSON.parse(jsonText)
	})
	if (parseResult.error) {
		logger.warn("judge output json parse failed, attempting extraction", {
			error: parseResult.error
		})
		const braceStart = trimmed.indexOf("{")
		const braceEnd = trimmed.lastIndexOf("}")
		if (braceStart === -1) {
			logger.warn("judge output has no json object", { error: parseResult.error })
			throw errors.wrap(parseResult.error, "judge output json parse")
		}
		const extracted = trimmed.slice(braceStart, braceEnd + 1)
		const retryResult = errors.trySync(function retryParse() {
			return JSON.parse(extracted)
		})
		if (retryResult.error) {
			logger.warn("judge output json retry parse failed", { error: retryResult.error })
			throw errors.wrap(retryResult.error, "judge output json retry parse")
		}
		const retryValidation = JudgeRawOutputSchema.safeParse(retryResult.data)
		if (!retryValidation.success) {
			logger.warn("judge output schema validation retry failed", { error: retryValidation.error })
			throw errors.wrap(retryValidation.error, "judge output schema validation retry")
		}
		return retryValidation.data
	}

	const validation = JudgeRawOutputSchema.safeParse(parseResult.data)
	if (!validation.success) {
		logger.warn("judge output schema validation failed", { error: validation.error })
		throw errors.wrap(validation.error, "judge output schema validation")
	}

	return validation.data
}

// ---------------------------------------------------------------------------
// Filesystem tool dispatch
// ---------------------------------------------------------------------------

async function handleReadTool(
	toolCall: StaticToolCallGeneric,
	sbx: Sandbox,
	logger: Logger
): Promise<Record<string, unknown>> {
	const parsed = ReadInputSchema.safeParse(toolCall.input)
	if (!parsed.success) {
		logger.error("read input validation failed", { error: parsed.error })
		throw errors.wrap(parsed.error, "read input validation")
	}
	const input = parsed.data
	const result = await errors.try(read(sbx, input.path))
	if (result.error) {
		logger.warn("read tool failed", { error: result.error, path: input.path })
		return { error: String(result.error) }
	}
	return {
		content: result.data.content,
		path: result.data.path,
		size: result.data.size,
		lineCount: result.data.lineCount
	}
}

async function handleGlobTool(
	toolCall: StaticToolCallGeneric,
	sbx: Sandbox,
	logger: Logger
): Promise<Record<string, unknown>> {
	const parsed = GlobInputSchema.safeParse(toolCall.input)
	if (!parsed.success) {
		logger.error("glob input validation failed", { error: parsed.error })
		throw errors.wrap(parsed.error, "glob input validation")
	}
	const input = parsed.data
	const result = await errors.try(glob(sbx, input.dirPath, input.pattern))
	if (result.error) {
		logger.warn("glob tool failed", {
			error: result.error,
			dirPath: input.dirPath,
			pattern: input.pattern
		})
		return { error: String(result.error) }
	}
	return {
		pattern: result.data.pattern,
		basePath: result.data.basePath,
		matches: result.data.matches
	}
}

async function handleGrepTool(
	toolCall: StaticToolCallGeneric,
	sbx: Sandbox,
	logger: Logger
): Promise<Record<string, unknown>> {
	const parsed = GrepInputSchema.safeParse(toolCall.input)
	if (!parsed.success) {
		logger.error("grep input validation failed", { error: parsed.error })
		throw errors.wrap(parsed.error, "grep input validation")
	}
	const input = parsed.data
	const result = await errors.try(
		grep(sbx, input.dirPath, input.pattern, { glob: input.glob, maxResults: input.maxResults })
	)
	if (result.error) {
		logger.warn("grep tool failed", {
			error: result.error,
			dirPath: input.dirPath,
			pattern: input.pattern
		})
		return { error: String(result.error) }
	}
	return {
		pattern: result.data.pattern,
		matches: result.data.matches
	}
}

function handleCreateMemory(
	toolCall: StaticToolCallGeneric,
	collectedMemories: Array<{ phase: string; kind: string; content: string }>,
	logger: Logger
): Record<string, unknown> {
	const parsed = CreateMemoryInputSchema.safeParse(toolCall.input)
	if (!parsed.success) {
		logger.error("create_memory input validation failed", { error: parsed.error })
		throw errors.wrap(parsed.error, "create_memory input validation")
	}
	const input = parsed.data
	collectedMemories.push({ phase: "judging", kind: input.kind, content: input.content })

	logger.info("memory created", { kind: input.kind })

	return { ok: true }
}

// ---------------------------------------------------------------------------
// Approach ID extraction
// ---------------------------------------------------------------------------

function extractApproachId(selectedApproach: unknown): string {
	if (typeof selectedApproach !== "object" || selectedApproach === null) {
		return "unknown"
	}
	const parsed = SelectedApproachIdSchema.safeParse(selectedApproach)
	if (!parsed.success) {
		return "unknown"
	}
	return parsed.data.id
}

// ---------------------------------------------------------------------------
// Inngest function
// ---------------------------------------------------------------------------

const judgingFunction = inngest.createFunction(
	{ id: "paul/pipeline/judging" },
	{ event: "paul/pipeline/judging" },
	async ({ event, logger, step }) => {
		const {
			runId,
			sandboxId,
			prompt,
			githubRepoUrl,
			githubBranch,
			memories,
			selectedApproach,
			analysisOutput
		} = event.data

		logger.info("starting judging phase", { runId, sandboxId })

		const sbx = await connectSandbox(sandboxId, logger)

		const memoriesPrompt = formatMemoriesForPrompt(memories)
		const approachText =
			typeof selectedApproach === "string"
				? selectedApproach
				: JSON.stringify(selectedApproach, null, 2)
		const analysisText =
			typeof analysisOutput === "string" ? analysisOutput : JSON.stringify(analysisOutput, null, 2)

		const system = buildInstructions({
			approach: approachText,
			analysisOutput: analysisText,
			githubRepoUrl,
			githubBranch
		})

		const systemWithMemories = memoriesPrompt.length > 0 ? `${system}\n\n${memoriesPrompt}` : system

		const collectedMemories: Array<{ phase: string; kind: string; content: string }> = []

		const selectedApproachId = extractApproachId(selectedApproach)

		const result = await runAgentLoop({
			model,
			system: systemWithMemories,
			initialMessages: [{ role: "user" as const, content: prompt }],
			tools: judgingTools,
			maxSteps: MAX_STEPS,
			step,
			logger,
			onToolCall: async function handleToolCall(toolCall) {
				if (toolCall.toolName === "read") {
					const output = await handleReadTool(toolCall, sbx, logger)
					return buildToolResult(toolCall.toolCallId, toolCall.toolName, output)
				}

				if (toolCall.toolName === "glob") {
					const output = await handleGlobTool(toolCall, sbx, logger)
					return buildToolResult(toolCall.toolCallId, toolCall.toolName, output)
				}

				if (toolCall.toolName === "grep") {
					const output = await handleGrepTool(toolCall, sbx, logger)
					return buildToolResult(toolCall.toolCallId, toolCall.toolName, output)
				}

				if (toolCall.toolName === "create_memory") {
					const output = handleCreateMemory(toolCall, collectedMemories, logger)
					return buildToolResult(toolCall.toolCallId, toolCall.toolName, output)
				}

				logger.warn("unknown tool call", { toolName: toolCall.toolName })
				return buildToolResult(toolCall.toolCallId, toolCall.toolName, {
					error: "unknown tool"
				})
			}
		})

		if (collectedMemories.length > 0) {
			await step.run("persist-memories", async () => {
				await updateFeatureRunMemories(db, runId, collectedMemories)
			})
		}

		const output = await step.run("derive-verdict", function deriveVerdictStep(): JudgingOutput {
			const judgeRaw = parseJudgeOutput(result.text, logger)
			const verdict = deriveVerdict(judgeRaw.findings)
			const conditions = buildConditions(judgeRaw.findings)
			const rejectionReason = buildRejectionReason(judgeRaw.findings)

			return {
				selectedApproachId,
				findings: judgeRaw.findings,
				overallVerdict: verdict,
				conditions,
				rejectionReason,
				overallAssessment: judgeRaw.overallAssessment
			}
		})

		logger.info("judging phase complete", {
			runId,
			stepCount: result.stepCount,
			verdict: output.overallVerdict,
			findingCount: output.findings.length,
			conditionCount: output.conditions.length
		})

		return output
	}
)

export { judgingFunction, JudgingOutputSchema }
export type { JudgingOutput }
