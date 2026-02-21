import { anthropic } from "@ai-sdk/anthropic"
import { ToolLoopAgent, stepCountIs } from "ai"
import { readTool, globTool, grepTool } from "@/lib/agent/fs/tools"

const MAX_STEPS = 20 as const

const tools = {
	read: readTool,
	glob: globTool,
	grep: grepTool
} as const

const instructions = [
	"You are a codebase explorer.",
	"Given a question or task about a codebase, use the available tools to read files, search for patterns, and find relevant code.",
	"Be thorough but efficient:",
	"- Start with glob to understand directory structure",
	"- Use grep to find relevant code by pattern",
	"- Read specific files to understand implementation details",
	"Provide a clear, structured answer with file paths and relevant code excerpts."
].join("\n")

const explorer = new ToolLoopAgent({
	id: "paul/explorer",
	model: anthropic("claude-haiku-4-5-20251001"),
	instructions,
	tools,
	stopWhen: stepCountIs(MAX_STEPS)
})

export { explorer, MAX_STEPS }
