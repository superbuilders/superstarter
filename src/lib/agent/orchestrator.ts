import { anthropic } from "@ai-sdk/anthropic"
import { tool } from "ai"
import { z } from "zod"
import { requestHumanFeedbackTool } from "@/lib/agent/cta"

const MAX_STEPS = 50 as const

const model = anthropic("claude-sonnet-4-6")

const spawnSubagentTool = tool({
	description: [
		"Spawn a subagent to perform work.",
		"Use 'explore' for researching codebases, reading files, searching for patterns.",
		"Use 'code' for writing code, editing files, running commands.",
		"The subagent runs to completion and returns a summary of its work."
	].join(" "),
	inputSchema: z.object({
		agent: z.enum(["explore", "code"]).describe("Which subagent to spawn"),
		prompt: z.string().min(1).describe("Detailed instructions for the subagent"),
		sandboxId: z.string().min(1).describe("Sandbox ID for the subagent to work in"),
		github: z
			.object({
				repoUrl: z.string().url(),
				branch: z.string().min(1)
			})
			.describe("GitHub repo context for the subagent")
			.optional()
	})
})

const tools = {
	request_human_feedback: requestHumanFeedbackTool,
	spawn_subagent: spawnSubagentTool
} as const

type OrchestratorContext = {
	sandboxId: string
	github?: { repoUrl: string; branch: string }
}

function buildInstructions(ctx: OrchestratorContext): string {
	const contextLines = [`Sandbox ID: ${ctx.sandboxId}`]
	if (ctx.github) {
		contextLines.push(`GitHub repo: ${ctx.github.repoUrl}`)
		contextLines.push(`Branch: ${ctx.github.branch}`)
	}

	return [
		"You are an orchestrator agent that manages a team of subagents.",
		"You MUST use your tools to accomplish tasks. Never respond with just text.",
		"",
		"## Environment",
		...contextLines.map(function prefixLine(line) {
			return `- ${line}`
		}),
		"",
		"## Subagents",
		"- 'explore': researches codebases, reads files, finds patterns",
		"- 'code': writes code, edits files, runs commands",
		"Always pass the sandbox ID when spawning subagents.",
		"",
		"## Human Feedback",
		"You can request feedback from a human user.",
		"Use this when you need decisions, approvals, or clarification.",
		"Ask early for architectural decisions. Don't ask for things you can decide yourself.",
		"",
		"## Workflow",
		"1. Break down the user's request into subtasks",
		"2. Delegate each subtask to the appropriate subagent",
		"3. Review subagent results and decide next steps",
		"4. Request human feedback when you need input on decisions",
		"5. Provide a final summary when the work is complete"
	].join("\n")
}

type OrchestratorTools = typeof tools

export { MAX_STEPS, buildInstructions, model, spawnSubagentTool, tools }
export type { OrchestratorContext, OrchestratorTools }
