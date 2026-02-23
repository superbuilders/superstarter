import { openai } from "@ai-sdk/openai"
import { globTool, grepTool, readTool } from "@/lib/agent/fs/tools"
import type { AgentStepResult } from "@/lib/agent/step"

const MAX_STEPS = 20 as const

const model = openai("gpt-5-nano")

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

type ExplorerTools = typeof tools

type ExplorerStepResult = AgentStepResult

export { MAX_STEPS, instructions, model, tools }
export type { ExplorerStepResult, ExplorerTools }
