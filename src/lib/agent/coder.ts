import { openai } from "@ai-sdk/openai"
import { editTool, globTool, grepTool, readTool, writeTool } from "@/lib/agent/fs/tools"

const MAX_STEPS = 20 as const

const model = openai("gpt-5.1-codex")

const tools = {
	read: readTool,
	glob: globTool,
	grep: grepTool,
	write: writeTool,
	edit: editTool
} as const

const instructions = [
	"You are a coding agent.",
	"Given explicit instructions, use the available tools to read files for context, then write or edit code to complete the task.",
	"Follow these rules:",
	"- Read relevant files first to understand existing patterns and conventions",
	"- Use glob and grep to find files you need to understand or modify",
	"- Use write to create new files and edit to modify existing files",
	"- Make only the changes described in your instructions — no extra refactoring or improvements",
	"- Match the style and conventions of the existing codebase",
	"When finished, provide a brief summary of what you changed and why."
].join("\n")

type CoderTools = typeof tools

type CoderStepResult = {
	stepNumber: number
	model: { provider: string; modelId: string }
	functionId?: string
	metadata?: Record<string, unknown>
	experimental_context?: unknown
	content: unknown[]
	text: string
	reasoning: unknown[]
	reasoningText?: string
	files: unknown[]
	sources: unknown[]
	toolCalls: unknown[]
	staticToolCalls: unknown[]
	dynamicToolCalls: unknown[]
	toolResults: unknown[]
	staticToolResults: unknown[]
	dynamicToolResults: unknown[]
	finishReason: string
	rawFinishReason?: string
	usage: {
		inputTokens?: number
		outputTokens?: number
		totalTokens?: number
	}
	warnings: unknown[]
	request: unknown
	response: unknown
	providerMetadata?: unknown
}

export { MAX_STEPS, instructions, model, tools }
export type { CoderStepResult, CoderTools }
