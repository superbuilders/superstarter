import { anthropic } from "@ai-sdk/anthropic"
import { globTool, grepTool, readTool } from "@/lib/agent/fs/tools"

const MAX_STEPS = 20 as const

const model = anthropic("claude-haiku-4-5-20251001")

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

type ExplorerStepResult = {
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
export type { ExplorerStepResult, ExplorerTools }
