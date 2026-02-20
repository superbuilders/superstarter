# AI SDK Documentation Overview

Comprehensive notes from exploring `/docs/ai-sdk/`. The AI SDK is currently at **version 6.0**, published by Vercel. The `ai` npm package is `^6.0.0`, provider packages are `^3.0.0`.

---

## 1. Directory Structure

```
docs/ai-sdk/
├── llms.txt                          # Full docs in plaintext for LLM consumption
├── llms-full.txt                     # Extended version
├── docs/
│   ├── introduction.md               # Top-level overview + full navigation sitemap
│   ├── foundations/                   # Conceptual primers
│   │   ├── overview.md               # LLMs, embeddings, generative AI basics
│   │   ├── providers-and-models.md   # Provider architecture + model capability matrix
│   │   ├── prompts.md                # Text, message, system prompts; provider options
│   │   ├── tools.md                  # Tool types, schemas, tool packages/toolsets
│   │   └── streaming.md              # Blocking vs streaming UIs
│   ├── getting-started/              # Quickstarts per framework
│   │   ├── nextjs-app-router.md
│   │   ├── nextjs-pages-router.md
│   │   ├── nodejs.md
│   │   ├── svelte.md
│   │   ├── nuxt.md
│   │   ├── expo.md
│   │   └── tanstack-start.md
│   ├── agents/                       # Agent system (NEW in v5/v6)
│   │   ├── overview.md               # Agents = LLM + tools + loop
│   │   ├── building-agents.md        # ToolLoopAgent class
│   │   ├── workflows.md              # Structured workflow patterns
│   │   ├── loop-control.md           # stopWhen, prepareStep
│   │   ├── configuring-call-options.md
│   │   └── subagents.md              # Subagent delegation pattern
│   ├── ai-sdk-core/                  # Core API documentation
│   │   ├── overview.md
│   │   ├── generating-text.md        # generateText + streamText
│   │   ├── generating-structured-data.md  # Output.object/array/choice/json
│   │   ├── tools-and-tool-calling.md # Tool calling deep dive
│   │   ├── mcp-tools.md             # Model Context Protocol integration
│   │   ├── prompt-engineering.md
│   │   ├── settings.md              # temperature, maxOutputTokens, etc.
│   │   ├── embeddings.md            # embed, embedMany, cosineSimilarity
│   │   ├── reranking.md
│   │   ├── image-generation.md
│   │   ├── transcription.md
│   │   ├── speech.md
│   │   ├── video-generation.md
│   │   ├── middleware.md            # Language model middleware system
│   │   ├── provider-management.md   # customProvider, providerRegistry
│   │   ├── error-handling.md
│   │   ├── testing.md              # MockLanguageModelV3, simulateReadableStream
│   │   └── telemetry.md            # OpenTelemetry integration
│   ├── ai-sdk-ui/                   # UI hooks documentation
│   │   ├── overview.md
│   │   ├── chatbot.md              # useChat hook
│   │   ├── chatbot-message-persistence.md
│   │   ├── chatbot-resume-streams.md
│   │   ├── chatbot-tool-usage.md
│   │   ├── generative-user-interfaces.md
│   │   ├── completion.md           # useCompletion hook
│   │   ├── object-generation.md    # useObject hook
│   │   ├── streaming-data.md
│   │   ├── error-handling.md
│   │   ├── transport.md            # Custom transport for useChat
│   │   ├── reading-ui-message-streams.md
│   │   ├── message-metadata.md
│   │   └── stream-protocol.md
│   ├── ai-sdk-rsc/                  # React Server Components (legacy, migrate to UI)
│   ├── advanced/                    # Advanced patterns
│   ├── reference/                   # API reference for all functions/types
│   │   ├── ai-sdk-core/            # generateText, streamText, tool, agent, etc.
│   │   ├── ai-sdk-ui/             # useChat, useCompletion, useObject, etc.
│   │   ├── ai-sdk-rsc/            # streamUI, createAI, etc.
│   │   └── ai-sdk-errors/         # ~30 typed error classes
│   ├── migration-guides/           # v3.1 through v6.0
│   └── troubleshooting/            # ~30 specific troubleshooting guides
├── providers/
│   ├── ai-sdk-providers/           # Official: anthropic, openai, google, mistral, etc.
│   ├── openai-compatible-providers/ # LM Studio, Heroku, etc.
│   ├── community-providers/        # Ollama, OpenRouter, Cloudflare, etc.
│   └── observability/              # Langfuse, Langsmith, Axiom, etc.
└── cookbook/                         # Example recipes
    ├── next/                        # Next.js examples
    ├── node/                        # Node.js examples
    ├── rsc/                         # React Server Components examples
    ├── api-servers/                 # Express, Hono, Fastify, NestJS
    └── guides/                      # Model-specific guides (R1, Gemini, Claude 4, etc.)
```

**Total files:** 458

---

## 2. Core Concepts

### What is the AI SDK?

The AI SDK is a TypeScript toolkit for building AI-powered applications. It provides a **unified API** across model providers, eliminating vendor lock-in. Two main libraries:

1. **AI SDK Core** (`ai` package) -- Unified API for text generation, structured data, tool calling, agents, embeddings, image/speech/video generation
2. **AI SDK UI** (`@ai-sdk/react`, `@ai-sdk/vue`, `@ai-sdk/svelte`, `@ai-sdk/angular`) -- Framework-agnostic hooks for chat, completion, and object streaming UIs

### Key Abstractions

| Abstraction | Purpose |
|---|---|
| **Provider** | Adapter for a specific AI service (OpenAI, Anthropic, etc.) |
| **Model** | A specific model from a provider (e.g., `anthropic('claude-opus-4-6')`) |
| **Tool** | An action the LLM can invoke (description + schema + execute function) |
| **Agent** | LLM + tools + loop orchestration (`ToolLoopAgent` class) |
| **Middleware** | Interceptors for model calls (logging, caching, RAG, guardrails) |
| **Output** | Structured output specification (`Output.object()`, `Output.array()`, etc.) |
| **UIMessage** | Client-side message format for UI hooks |
| **ModelMessage** | Server-side message format for model calls |

---

## 3. API Surface

### Text Generation (Core)

```typescript
import { generateText, streamText } from "ai"

// Blocking generation
const { text, toolCalls, toolResults, steps, usage, response } = await generateText({
    model: anthropic("claude-opus-4-6"),
    system: "You are a helpful assistant.",
    prompt: "Write a recipe.",
    // OR messages: ModelMessage[]
    tools: { ... },
    stopWhen: stepCountIs(5),    // multi-step tool loops
    output: Output.object({ schema: z.object({ ... }) }),  // structured output
    maxOutputTokens: 512,
    temperature: 0.3,
    providerOptions: { anthropic: { thinking: { type: "enabled", budgetTokens: 12000 } } },
})

// Streaming generation
const result = streamText({
    model: anthropic("claude-opus-4-6"),
    prompt: "Tell me a story.",
    onChunk({ chunk }) { ... },
    onFinish({ text, usage, steps }) { ... },
    onError({ error }) { ... },
    onAbort({ steps }) { ... },
    experimental_transform: smoothStream(),
})

// Consumption patterns:
for await (const textPart of result.textStream) { ... }  // async iterable
for await (const part of result.fullStream) { ... }       // full event stream
result.toUIMessageStreamResponse()                        // Next.js API response
result.pipeUIMessageStreamToResponse(res)                 // Node.js response
```

### Structured Data Generation

In v6, `generateObject`/`streamObject` are **deprecated**. Use `generateText`/`streamText` with `output`:

```typescript
import { generateText, streamText, Output } from "ai"

// Object output
const { output } = await generateText({
    model,
    output: Output.object({
        schema: z.object({ name: z.string(), ingredients: z.array(z.string()) }),
        name: "Recipe",          // optional
        description: "A recipe", // optional
    }),
    prompt: "Generate a lasagna recipe.",
})

// Array output
const { output } = await generateText({
    model,
    output: Output.array({ element: z.object({ ... }) }),
    prompt: "List 5 cities.",
})

// Choice output (classification)
const { output } = await generateText({
    model,
    output: Output.choice({ options: ["sunny", "rainy", "snowy"] }),
    prompt: "What's the weather?",
})

// Unstructured JSON
const { output } = await generateText({
    model,
    output: Output.json(),
    prompt: "Return some JSON.",
})

// Streaming structured data
const { partialOutputStream } = streamText({
    model,
    output: Output.object({ schema }),
    prompt: "...",
})
for await (const partial of partialOutputStream) { ... }

// Streaming array elements (complete elements)
const { elementStream } = streamText({
    model,
    output: Output.array({ element: schema }),
    prompt: "...",
})
for await (const item of elementStream) { ... }
```

### Embeddings

```typescript
import { embed, embedMany, cosineSimilarity } from "ai"

const { embedding } = await embed({
    model: "openai/text-embedding-3-small",
    value: "sunny day at the beach",
})

const { embeddings } = await embedMany({
    model: "openai/text-embedding-3-small",
    values: ["text1", "text2", "text3"],
})

const similarity = cosineSimilarity(embeddings[0], embeddings[1])
```

### Image Generation, Transcription, Speech

```typescript
import { generateImage, transcribe, generateSpeech } from "ai"

const { image } = await generateImage({ model: "openai/dall-e-3", prompt: "..." })
const { text } = await transcribe({ model: "openai/whisper-1", audio: buffer })
const { audio } = await generateSpeech({ model: "openai/tts-1", text: "..." })
```

---

## 4. Provider System

### Architecture

Providers implement a **language model specification** (`LanguageModelV3`). The SDK abstracts differences so you can swap providers by changing one line.

### Installation Pattern

Each provider is a separate npm package:

```
@ai-sdk/anthropic
@ai-sdk/openai
@ai-sdk/google
@ai-sdk/mistral
@ai-sdk/groq
@ai-sdk/xai
@ai-sdk/deepseek
@ai-sdk/cohere
@ai-sdk/fireworks
@ai-sdk/togetherai
@ai-sdk/deepinfra
@ai-sdk/elevenlabs
@ai-sdk/hume
...
```

### Usage

```typescript
import { anthropic } from "@ai-sdk/anthropic"
import { openai } from "@ai-sdk/openai"

// Direct usage
const model = anthropic("claude-opus-4-6")

// Custom provider setup
import { createAnthropic } from "@ai-sdk/anthropic"
const myAnthropic = createAnthropic({ apiKey: "...", baseURL: "..." })
```

### Provider Registry

Centralized model management:

```typescript
import { createProviderRegistry, customProvider, gateway } from "ai"
import { anthropic } from "@ai-sdk/anthropic"

const registry = createProviderRegistry({
    gateway,       // Vercel AI Gateway
    anthropic,
}, { separator: " > " })

// Usage: registry.languageModel("anthropic > claude-opus-4-6")
```

### Custom Providers

Pre-configure settings, aliases, or limit available models:

```typescript
const myProvider = customProvider({
    languageModels: {
        fast: anthropic("claude-haiku-4-5"),
        reasoning: wrapLanguageModel({
            model: anthropic("claude-sonnet-4-5"),
            middleware: defaultSettingsMiddleware({
                settings: { providerOptions: { anthropic: { thinking: { type: "enabled", budgetTokens: 32000 } } } },
            }),
        }),
    },
    fallbackProvider: anthropic,
})
```

### Global Provider

```typescript
// Set once at startup
globalThis.AI_SDK_DEFAULT_PROVIDER = openai

// Then use plain strings everywhere
const result = await streamText({ model: "gpt-5.1", prompt: "..." })
```

---

## 5. Tool / Function Calling

### Three Types of Tools

1. **Custom Tools** -- You define everything (description, schema, execute)
2. **Provider-Defined Tools** -- Provider defines schema/description, you provide execute (e.g., Anthropic's `bash`, `text_editor`)
3. **Provider-Executed Tools** -- Fully server-side (e.g., OpenAI's `webSearch`, Anthropic's code execution)

### Tool Definition

```typescript
import { tool } from "ai"
import { z } from "zod"

const weatherTool = tool({
    description: "Get the weather in a location",
    inputSchema: z.object({
        location: z.string().describe("The location to get the weather for"),
    }),
    strict: true,                    // optional: strict schema validation
    needsApproval: true,             // optional: require human approval
    inputExamples: [                 // optional: example inputs (Anthropic only)
        { input: { location: "San Francisco" } },
    ],
    execute: async ({ location }, { toolCallId, messages, abortSignal }) => {
        return { temperature: 72, conditions: "sunny" }
    },
    // Lifecycle hooks (streaming only):
    onInputStart: () => { ... },
    onInputDelta: ({ inputTextDelta }) => { ... },
    onInputAvailable: ({ input }) => { ... },
})
```

### Multi-Step Tool Loops

```typescript
const { text, steps } = await generateText({
    model,
    tools: { weather: weatherTool },
    stopWhen: stepCountIs(5),     // allow up to 5 steps
    prompt: "What's the weather in SF?",
})

// Steps contain all intermediate tool calls and results
const allToolCalls = steps.flatMap(step => step.toolCalls)
```

### Tool Execution Approval

```typescript
const dangerousTool = tool({
    description: "Delete files",
    inputSchema: z.object({ path: z.string() }),
    needsApproval: true,  // or: async ({ path }) => path.startsWith("/critical")
    execute: async ({ path }) => { ... },
})

// After generateText returns tool-approval-request parts:
// 1. Show approval UI
// 2. Add tool-approval-response message
// 3. Call generateText again
```

### Dynamic Tools

For runtime-determined schemas (MCP tools without schemas):

```typescript
import { dynamicTool } from "ai"

const mcpTool = dynamicTool({
    description: "Execute MCP tool",
    inputSchema: z.object({}),
    execute: async (input) => { /* input is unknown */ },
})
```

### Tool Choice

```typescript
toolChoice: "auto"       // default: model decides
toolChoice: "required"   // must call a tool
toolChoice: "none"       // no tools
toolChoice: { type: "tool", toolName: "weather" }  // specific tool
```

### Active Tools

Limit which tools the model can see (for large tool sets):

```typescript
activeTools: ["firstTool", "secondTool"]
```

---

## 6. Streaming

### Stream Types

`streamText` returns an object with multiple stream accessors:

| Property | Description |
|---|---|
| `textStream` | `ReadableStream` + `AsyncIterable` of text deltas |
| `fullStream` | Full event stream with typed parts (text-delta, tool-call, tool-result, error, etc.) |
| `partialOutputStream` | Streaming partial structured objects (with `Output.object()`) |
| `elementStream` | Streaming complete array elements (with `Output.array()`) |

### Full Stream Event Types

```
start, start-step, text-start, text-delta, text-end,
reasoning-start, reasoning-delta, reasoning-end,
source, file,
tool-call, tool-input-start, tool-input-delta, tool-input-end,
tool-result, tool-error,
finish-step, finish,
error, abort, raw
```

### Stream Transformations

```typescript
// Built-in smooth streaming
const result = streamText({
    model,
    prompt,
    experimental_transform: smoothStream(),
})

// Custom transforms
const upperCaseTransform = <TOOLS extends ToolSet>() =>
    (options: { tools: TOOLS; stopStream: () => void }) =>
        new TransformStream<TextStreamPart<TOOLS>, TextStreamPart<TOOLS>>({
            transform(chunk, controller) {
                controller.enqueue(
                    chunk.type === "text-delta"
                        ? { ...chunk, text: chunk.text.toUpperCase() }
                        : chunk,
                )
            },
        })

// Multiple transforms (applied in order)
experimental_transform: [firstTransform, secondTransform]
```

### Response Helpers

```typescript
// Next.js App Router API response
return result.toUIMessageStreamResponse()

// Node.js response piping
result.pipeUIMessageStreamToResponse(res)

// Simple text stream
return result.toTextStreamResponse()
result.pipeTextStreamToResponse(res)
```

---

## 7. Agent System

### ToolLoopAgent Class (v6)

Replaces `Experimental_Agent`. Encapsulates LLM + tools + loop into reusable components.

```typescript
import { ToolLoopAgent, stepCountIs, tool, Output } from "ai"

const agent = new ToolLoopAgent({
    model: anthropic("claude-opus-4-6"),
    instructions: "You are a research assistant.",  // system prompt
    tools: { search: searchTool, analyze: analyzeTool },
    stopWhen: stepCountIs(20),   // default
    output: Output.object({ schema: z.object({ ... }) }),  // optional structured output
    toolChoice: "auto",
    onStepFinish({ usage, finishReason, toolCalls }) { ... },
})

// Generate (blocking)
const result = await agent.generate({ prompt: "Research AI trends" })

// Stream
const result = await agent.stream({ prompt: "Tell me a story" })
for await (const chunk of result.textStream) { ... }

// API response for useChat
return createAgentUIStreamResponse({ agent: myAgent, uiMessages: messages })
```

### Stop Conditions

```typescript
import { stepCountIs, hasToolCall } from "ai"

// Built-in
stopWhen: stepCountIs(20)
stopWhen: hasToolCall("someTool")

// Combined (any condition stops)
stopWhen: [stepCountIs(20), hasToolCall("done")]

// Custom
const hasAnswer: StopCondition<typeof tools> = ({ steps }) => {
    return steps.some(step => step.text?.includes("ANSWER:")) ?? false
}
```

### prepareStep Callback

Modify settings per step (model, tools, messages, toolChoice):

```typescript
prepareStep: async ({ model, stepNumber, steps, messages }) => {
    if (stepNumber === 0) {
        return {
            model: differentModel,
            toolChoice: { type: "tool", toolName: "search" },
            activeTools: ["search"],
        }
    }
    // Prompt compression for long loops
    if (messages.length > 20) {
        return { messages: messages.slice(-10) }
    }
}
```

### Subagents

Agents that delegate to other agents via tools:

```typescript
const researchSubagent = new ToolLoopAgent({
    model,
    instructions: "You are a research agent.",
    tools: { read: readFileTool, search: searchTool },
})

const researchTool = tool({
    description: "Research a topic in depth.",
    inputSchema: z.object({ task: z.string() }),
    execute: async ({ task }, { abortSignal }) => {
        const result = await researchSubagent.generate({
            prompt: task,
            abortSignal,
        })
        return result.text
    },
    // Control what the parent model sees
    toModelOutput: ({ output }) => ({
        type: "content",
        value: [{ type: "text", text: `Research summary: ${output}` }],
    }),
})
```

---

## 8. Middleware System

### Usage

```typescript
import { wrapLanguageModel } from "ai"

const wrappedModel = wrapLanguageModel({
    model: yourModel,
    middleware: yourMiddleware,           // single
    // middleware: [first, second],       // multiple (applied in order)
})
```

### Built-in Middlewares

| Middleware | Purpose |
|---|---|
| `extractReasoningMiddleware({ tagName: "think" })` | Extract reasoning from `<think>` tags |
| `extractJsonMiddleware()` | Strip markdown code fences from JSON responses |
| `simulateStreamingMiddleware()` | Simulate streaming for non-streaming models |
| `defaultSettingsMiddleware({ settings })` | Apply default settings (temperature, providerOptions, etc.) |
| `addToolInputExamplesMiddleware()` | Add tool input examples to descriptions |

### Custom Middleware Interface

```typescript
import type { LanguageModelV3Middleware } from "@ai-sdk/provider"

const myMiddleware: LanguageModelV3Middleware = {
    // Transform params before generation (both doGenerate and doStream)
    transformParams: async ({ params }) => {
        // Modify params (e.g., inject RAG context)
        return modifiedParams
    },

    // Wrap the non-streaming generation
    wrapGenerate: async ({ doGenerate, params }) => {
        const result = await doGenerate()
        // Modify result (e.g., guardrails, logging)
        return result
    },

    // Wrap the streaming generation
    wrapStream: async ({ doStream, params }) => {
        const { stream, ...rest } = await doStream()
        const transformedStream = stream.pipeThrough(myTransform)
        return { stream: transformedStream, ...rest }
    },
}
```

### Use Cases

- **Logging**: Intercept params and results for observability
- **Caching**: Cache results by params hash
- **RAG**: Inject context into the last user message
- **Guardrails**: Filter/redact generated content
- **Custom metadata**: Pass via `providerOptions` key matching middleware name

---

## 9. Error Handling

### Error Types (30+ typed errors)

Key errors from `ai` package:

| Error | When |
|---|---|
| `AI_APICallError` | API call fails (network, auth, rate limit) |
| `AI_RetryError` | All retries exhausted |
| `AI_NoObjectGeneratedError` | Structured output generation fails |
| `AI_NoContentGeneratedError` | No content generated |
| `AI_InvalidToolInputError` | Model calls tool with invalid inputs |
| `AI_NoSuchToolError` | Model tries to call undefined tool |
| `AI_ToolCallRepairError` | Tool call repair fails |
| `AI_TypeValidationError` | Type validation failure |
| `AI_UnsupportedFunctionalityError` | Provider doesn't support feature |

### Pattern: generateText

```typescript
try {
    const result = await generateText({ ... })
} catch (error) {
    if (NoSuchToolError.isInstance(error)) { ... }
    if (InvalidToolInputError.isInstance(error)) { ... }
    if (NoObjectGeneratedError.isInstance(error)) {
        console.log(error.text)      // raw generated text
        console.log(error.cause)     // underlying parse error
        console.log(error.usage)     // token usage
    }
}
```

### Pattern: streamText

Errors become part of the stream (don't crash server). Use callbacks:

```typescript
const result = streamText({
    model,
    prompt,
    onError({ error }) { console.error(error) },
})

// Or handle in fullStream
for await (const part of result.fullStream) {
    if (part.type === "error") { /* handle */ }
    if (part.type === "tool-error") { /* handle */ }
    if (part.type === "abort") { /* handle */ }
}
```

### Stream Abort Handling

```typescript
const result = streamText({
    model,
    prompt,
    abortSignal: myAbortSignal,
    onAbort: ({ steps }) => {
        // Cleanup: update stored messages, etc.
    },
    onFinish: ({ steps, totalUsage }) => {
        // Only called on normal completion (NOT on abort)
    },
})
```

---

## 10. AI SDK UI Integration

### useChat Hook (React)

```typescript
"use client"
import { useChat } from "@ai-sdk/react"
import { DefaultChatTransport } from "ai"

function Chat() {
    const { messages, sendMessage, status, error, stop } = useChat({
        transport: new DefaultChatTransport({ api: "/api/chat" }),
    })

    // status: "submitted" | "streaming" | "ready" | "error"
    // messages: UIMessage[] with .parts (text, tool-invocation, etc.)
}
```

### Server-side API Route (Next.js)

```typescript
import { convertToModelMessages, streamText, UIMessage } from "ai"

export async function POST(req: Request) {
    const { messages }: { messages: UIMessage[] } = await req.json()

    const result = streamText({
        model: anthropic("claude-opus-4-6"),
        system: "You are a helpful assistant.",
        messages: await convertToModelMessages(messages),  // async in v6!
    })

    return result.toUIMessageStreamResponse()
}
```

### Agent + useChat Integration

```typescript
// Server: app/api/chat/route.ts
import { createAgentUIStreamResponse } from "ai"

export async function POST(request: Request) {
    const { messages } = await request.json()
    return createAgentUIStreamResponse({ agent: myAgent, uiMessages: messages })
}
```

### useObject Hook (Streaming Structured Data)

```typescript
"use client"
import { useObject } from "@ai-sdk/react"

function MyComponent() {
    const { object, submit, isLoading, error } = useObject({
        api: "/api/generate",
        schema: myZodSchema,
    })
}
```

### useCompletion Hook

```typescript
"use client"
import { useCompletion } from "@ai-sdk/react"

function TextCompletion() {
    const { completion, input, handleInputChange, handleSubmit } = useCompletion()
}
```

### Transport System

Custom communication (WebSocket, auth, etc.):

```typescript
const { messages, sendMessage } = useChat({
    transport: new DefaultChatTransport({
        api: "/api/chat",
        headers: () => ({ Authorization: `Bearer ${getToken()}` }),
        body: () => ({ sessionId: getCurrentSessionId() }),
        credentials: "include",
    }),
})
```

### UIMessage vs ModelMessage

- **UIMessage**: Client-side format from `useChat`. Has `parts` array (text, tool-invocation, etc.)
- **ModelMessage**: Server-side format for model API calls. Has `role` + `content`.
- Convert: `await convertToModelMessages(uiMessages)` (async in v6)

### DirectChatTransport

Skip HTTP entirely -- run the model in the same process (useful for Node.js scripts):

```typescript
import { DirectChatTransport } from "ai"
```

---

## 11. Configuration Reference

### Common Settings for generateText/streamText

| Setting | Type | Description |
|---|---|---|
| `model` | `LanguageModel` or `string` | The model to use |
| `prompt` | `string` | Text prompt |
| `system` | `string` | System prompt |
| `messages` | `ModelMessage[]` | Message array |
| `tools` | `ToolSet` | Available tools |
| `toolChoice` | `"auto" \| "required" \| "none" \| { type: "tool", toolName }` | Tool selection mode |
| `activeTools` | `string[]` | Limit visible tools |
| `output` | `Output.object() \| Output.array() \| ...` | Structured output spec |
| `stopWhen` | `StopCondition \| StopCondition[]` | Multi-step stopping |
| `maxOutputTokens` | `number` | Max tokens to generate |
| `temperature` | `number` | Randomness (0 = deterministic) |
| `topP` | `number` | Nucleus sampling |
| `topK` | `number` | Top-K sampling |
| `presencePenalty` | `number` | Repeat info penalty |
| `frequencyPenalty` | `number` | Repeat words penalty |
| `stopSequences` | `string[]` | Stop generation sequences |
| `seed` | `number` | Random seed |
| `maxRetries` | `number` | Retry count (default: 2) |
| `abortSignal` | `AbortSignal` | Cancel signal |
| `timeout` | `number \| { totalMs, stepMs, chunkMs }` | Timeout config |
| `headers` | `Record<string, string>` | Extra HTTP headers |
| `providerOptions` | `Record<string, unknown>` | Provider-specific options |

### Anthropic-Specific Options

```typescript
providerOptions: {
    anthropic: {
        thinking: { type: "enabled", budgetTokens: 12000 },
        effort: "high" | "medium" | "low",
        disableParallelToolUse: boolean,
        sendReasoning: boolean,
        toolStreaming: boolean,
        structuredOutputMode: "outputFormat" | "jsonTool" | "auto",
        contextManagement: { edits: [...] },
    } satisfies AnthropicProviderOptions,
}
```

---

## 12. Testing

```typescript
import { generateText, streamText, simulateReadableStream } from "ai"
import { MockLanguageModelV3 } from "ai/test"

// Mock generateText
const result = await generateText({
    model: new MockLanguageModelV3({
        doGenerate: async () => ({
            content: [{ type: "text", text: "Hello, world!" }],
            finishReason: { unified: "stop", raw: undefined },
            usage: { inputTokens: { total: 10 }, outputTokens: { total: 20 } },
            warnings: [],
        }),
    }),
    prompt: "Hello, test!",
})

// Mock streamText with simulated stream
const result = streamText({
    model: new MockLanguageModelV3({
        doStream: async () => ({
            stream: simulateReadableStream({
                chunks: [
                    { type: "text-start", id: "text-1" },
                    { type: "text-delta", id: "text-1", delta: "Hello" },
                    { type: "text-end", id: "text-1" },
                    { type: "finish", ... },
                ],
            }),
        }),
    }),
    prompt: "Hello, test!",
})
```

---

## 13. MCP (Model Context Protocol) Integration

Connect to MCP servers for tool discovery:

```typescript
import { createMCPClient } from "@ai-sdk/mcp"

// HTTP transport (production)
const client = await createMCPClient({
    transport: { type: "http", url: "https://server.com/mcp", headers: { ... } },
})

// SSE transport
const client = await createMCPClient({
    transport: { type: "sse", url: "https://server.com/sse" },
})

// Stdio transport (local dev only)
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js"
const client = await createMCPClient({
    transport: new StdioClientTransport({ command: "node", args: ["server.js"] }),
})

// Use MCP tools in generateText
const tools = await client.tools()
const result = await generateText({ model, tools, prompt: "..." })

// Clean up
await client.close()
```

---

## 14. Telemetry

OpenTelemetry integration (experimental):

```typescript
const result = await generateText({
    model,
    prompt,
    experimental_telemetry: {
        isEnabled: true,
        functionId: "my-function",
        metadata: { userId: "123" },
        recordInputs: true,   // default: true
        recordOutputs: true,  // default: true
    },
})
```

Supported observability providers: Langfuse, Langsmith, Axiom, Helicone, Braintrust, Traceloop, and many more.

---

## 15. Key Migration Notes (v5 to v6)

| Change | v5 | v6 |
|---|---|---|
| Agent class | `Experimental_Agent` | `ToolLoopAgent` |
| Agent system prompt | `system:` | `instructions:` |
| Default stopWhen | `stepCountIs(1)` | `stepCountIs(20)` |
| Message type | `CoreMessage` | `ModelMessage` |
| Convert messages | `convertToCoreMessages()` (sync) | `await convertToModelMessages()` (async) |
| Structured output | `generateObject()` / `streamObject()` | `generateText({ output: Output.object() })` |
| Mock classes | `MockLanguageModelV2` | `MockLanguageModelV3` |
| Provider spec | `LanguageModelV2` | `LanguageModelV3` |
| Provider middleware type | `LanguageModelV2Middleware` | `LanguageModelV3Middleware` |
| toModelOutput param | `output` | `{ output }` |
| Embedding model | `textEmbeddingModel` | `embeddingModel` |

Codemods available: `npx @ai-sdk/codemod v6`

---

## TL;DR

- AI SDK v6 is a TypeScript toolkit providing `generateText`, `streamText`, `embed`, `generateImage`, `transcribe`, `generateSpeech` with a unified provider-agnostic API
- **ToolLoopAgent** class encapsulates LLM + tools + loop for agent patterns; `stopWhen` controls multi-step execution
- **Output.object/array/choice/json** replaces deprecated `generateObject`/`streamObject` for structured data
- **Middleware system** (`wrapLanguageModel`) enables logging, caching, RAG, guardrails as composable interceptors
- **UI hooks** (`useChat`, `useCompletion`, `useObject`) work across React, Vue, Svelte, Angular with streaming support
- Anthropic provider supports thinking/reasoning (`budgetTokens`), effort levels, tool streaming, context management, and provider-defined tools (bash, text_editor)
