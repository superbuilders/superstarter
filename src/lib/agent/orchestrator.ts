import { openai } from "@ai-sdk/openai"
import { tool } from "ai"
import { z } from "zod"
import { requestHumanFeedbackTool } from "@/lib/agent/cta"

const MAX_STEPS = 50 as const

const model = openai("gpt-5-nano")

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

const instructions = [
	"You are an orchestrator agent that manages a team of subagents.",
	"You have two subagents available:",
	"- 'explore': researches codebases, reads files, finds patterns",
	"- 'code': writes code, edits files, runs commands",
	"",
	"You also have the ability to request feedback from a human user.",
	"Use this when you need decisions, approvals, or clarification.",
	"",
	"Your job is to:",
	"1. Break down the user's request into subtasks",
	"2. Delegate each subtask to the appropriate subagent",
	"3. Review subagent results and decide next steps",
	"4. Request human feedback when you need input on decisions",
	"5. Provide a final summary when the work is complete",
	"",
	"Be strategic about when to ask for human feedback.",
	"Ask early for architectural decisions and approvals.",
	"Don't ask for things you can decide yourself."
].join("\n")

type OrchestratorTools = typeof tools

export { MAX_STEPS, instructions, model, spawnSubagentTool, tools }
export type { OrchestratorTools }
