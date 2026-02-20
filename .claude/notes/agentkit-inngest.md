# AgentKit + Inngest Integration Notes

Comprehensive research notes on how Inngest's AgentKit (`@inngest/agent-kit`) integrates with Inngest's durable execution platform. Compiled from both the AgentKit docs (`docs/agentkit/`) and Inngest docs (`docs/inngest/`).

---

## 1. Integration Model: How AgentKit Uses Inngest

AgentKit is a **TypeScript library built by Inngest** (`@inngest/agent-kit`) that uses Inngest as its orchestration and execution backend. Starting with AgentKit v0.8.0 (later bumped to v0.9.0), `inngest` is a **required peer dependency**.

### Package Relationship

```
@inngest/agent-kit    -- the agent framework (agents, networks, tools, routers)
inngest               -- the durable execution runtime (steps, events, retries)
@inngest/agent-kit/server  -- HTTP server for serving AgentKit over Inngest
@inngest/realtime     -- realtime streaming middleware + subscriptions
@inngest/use-agent    -- React hook for client-side streaming UI
```

### Two Deployment Modes

1. **Standalone via `createServer`** -- AgentKit provides `createServer()` from `@inngest/agent-kit/server` which creates an HTTP server that auto-registers networks/agents as Inngest functions. You pass `networks` and/or `agents` and/or `functions` to it. It exposes `/api/inngest` for the Inngest dev server or cloud to sync with.

2. **Embedded in existing Inngest function** -- You wrap `network.run()` inside an `inngest.createFunction()` handler. This gives you full control over the Inngest function configuration (retries, concurrency, throttling, etc.) and is required for advanced patterns like multi-tenancy, custom retries, human-in-the-loop, and multi-step tools.

### Standalone Mode

```typescript
import { createNetwork } from "@inngest/agent-kit"
import { createServer } from "@inngest/agent-kit/server"

const network = createNetwork({ name: "My Network", agents: [...] })

const server = createServer({ networks: [network] })
server.listen(3010)
```

### Embedded Mode (Required for Advanced Features)

```typescript
import { createNetwork } from "@inngest/agent-kit"
import { createServer } from "@inngest/agent-kit/server"

const network = createNetwork({ name: "My Network", agents: [...] })

const myFunction = inngest.createFunction(
    { id: "my-network", retries: 1 },
    { event: "my-network/run" },
    async ({ event, step }) => {
        return network.run(event.data.input)
    }
)

const server = createServer({ functions: [myFunction] })
server.listen(3010)
```

---

## 2. Durable Execution: How Inngest Steps Provide Durability

### The Core Mechanism

Inngest functions execute incrementally, **step by step**. Each step result is persisted and memoized. On re-execution, completed steps return their cached results instantly (no re-execution). This is the foundation of durability.

Key properties of steps:
- Each step is an independent unit of work, retried independently
- Steps are executed as **separate HTTP requests**
- On retry, only the failing step re-executes; all prior steps are memoized
- State is persisted outside the function execution context

### How AgentKit Leverages Steps

When an Agent runs inside a network (with Inngest configured), inference calls are automatically made via `step.ai` (Inngest's AI step primitive). From the agents docs:

> "An inference call is made to the provided model using Inngest's `step.ai`. `step.ai` automatically retries on failure and caches the result for durability."

This means every LLM call in an AgentKit network is:
- Automatically retried on failure (4 retries by default)
- Memoized so it won't re-execute if the function restarts
- Visible in Inngest's trace UI with input/output/token usage

### `step.ai.infer()` vs `step.ai.wrap()`

These are Inngest-level primitives that AgentKit uses internally:

- **`step.ai.infer()`** -- Offloads the inference request to Inngest's infrastructure. The serverless function pauses while waiting for the LLM response. No compute cost during wait time. Supports OpenAI, Anthropic, Gemini, Grok, Azure OpenAI.
- **`step.ai.wrap()`** -- Wraps existing AI SDK calls (Vercel AI SDK, Anthropic SDK, OpenAI SDK) as steps. The call executes in your function but gets step-level observability and retry behavior.

AgentKit abstracts over these -- you just configure models via `openai()`, `anthropic()`, `gemini()` etc. and AgentKit handles the step.ai integration.

---

## 3. State Management

### In-Network State (Short-Term)

AgentKit's `State` object contains:
1. **Message History** -- Chronological record of all agent interactions (prompts, responses, tool calls) stored as `InferenceResult` objects
2. **Typed State Data** -- A generic key-value store (`state.data`) typed via TypeScript generics

```typescript
interface NetworkState {
    username?: string
    plan?: { thoughts: string; edits: Array<...> }
    done: boolean
}

const state = createState<NetworkState>({ username: "default" })
```

**Important**: State is only retained for a single Network `run()`. It is NOT persisted across different `run()` calls by default. For persistence, you implement memory/history adapters (see section below).

### Inngest-Level State Persistence

Inngest persists step results in its managed function state store. This means:
- If a network is running inside an Inngest function and the function crashes mid-execution, completed steps (including completed agent inference calls) are preserved
- On retry, the function resumes from the point of failure with all prior step results intact
- This is the "durability" part -- the network won't re-run completed LLM calls

### History Adapters (Long-Term Persistence)

AgentKit provides a `HistoryConfig` interface for persisting conversations to any database:

```typescript
interface HistoryConfig<T> {
    createThread?: (ctx) => Promise<{ threadId: string }>
    get?: (ctx) => Promise<AgentResult[]>
    appendUserMessage?: (ctx) => Promise<void>
    appendResults?: (ctx) => Promise<void>
}
```

Two persistence patterns:
- **Server-Authoritative**: Client sends `threadId`, AgentKit loads history from DB via `history.get()`
- **Client-Authoritative**: Client sends full history with each request, AgentKit skips DB read

Best practice: Wrap DB operations in `step.run()` for automatic retries:

```typescript
appendUserMessage: async ({ threadId, userMessage, step }) => {
    if (step) {
        return await step.run("save-user-message", async () => {
            return await db.saveMessage(threadId, userMessage)
        })
    }
    return await db.saveMessage(threadId, userMessage)
}
```

### Memory (Long-Term, Reflective)

AgentKit integrates with Mem0 for long-term memory. Memory operations (create/update/delete) are dispatched as Inngest events for **durable background processing**:

```typescript
handler: async ({ statements }, { step }) => {
    await step?.sendEvent("send-create-memories-event", {
        name: "app/memories.create",
        data: { statements }
    })
    return "Scheduled memory creation"
}
```

A separate Inngest function handles the actual memory write, with automatic retries.

---

## 4. Event-Driven Agents

### Triggering Agent Runs

AgentKit networks run as Inngest functions, triggered by events:

```typescript
const supportWorkflow = inngest.createFunction(
    { id: "support-agent-workflow" },
    { event: "app/support.ticket.created" },
    async ({ step, event }) => {
        const ticket = await step.run("get_ticket_details", async () => {
            return await getTicketDetails(event.data.ticketId)
        })
        return await supportNetwork.run(ticket.title)
    }
)
```

### Events from Tools

Tools can send events to trigger other Inngest functions:

```typescript
handler: async ({ statements }, { step }) => {
    await step?.sendEvent("create-memories", {
        name: "app/memories.create",
        data: { statements }
    })
}
```

### Waiting for Events (Human-in-the-Loop)

Tools can pause execution and wait for external events:

```typescript
handler: async ({ question, context }, { step }) => {
    const response = await step.waitForEvent("developer.response", {
        event: "app/support.ticket.developer-response",
        timeout: "4h",
        match: "data.ticketId"
    })
    if (!response) return { error: "No response" }
    return { developerResponse: response.data.answer }
}
```

---

## 5. Tool Execution with Steps

### Tool Handler Context

Every tool handler receives a context object with access to Inngest primitives:

```typescript
const tool = createTool({
    name: "list_charges",
    parameters: z.object({ userId: z.string() }),
    handler: async ({ userId }, { network, agent, step }) => {
        // `step` provides access to Inngest step methods
        // `network` provides access to network state
        // `agent` provides access to the calling agent
    }
})
```

### Multi-Step Tools

Tools can be entire Inngest functions with multiple steps:

```typescript
const researchWebTool = inngest.createFunction(
    { id: "research-web-tool" },
    { event: "research-web-tool/run" },
    async ({ event, step }) => {
        // Step 1: Generate search queries via LLM
        const queries = await step.ai.infer("generate-queries", { ... })

        // Step 2: Crawl web in parallel
        const results = await Promise.all(
            queries.map(q => step.run("crawl-web", async () => { ... }))
        )

        // Step 3: Summarize results via LLM
        const summary = await step.ai.infer("summarize", { ... })
        return summary.choices[0].message.content
    }
)
```

Register multi-step tools in the server:

```typescript
const server = createServer({
    networks: [network],
    functions: [researchWebTool]  // Must register separately
})
```

### Tool Lifecycles

Tools have `onStart` and `onFinish` lifecycle hooks for modifying inputs/outputs:

```typescript
createTool({
    lifecycle: {
        onStart: ({ parameters }) => { /* modify params */ return parameters },
        onFinish: ({ result }) => { /* modify result */ return result }
    }
})
```

---

## 6. Error Handling & Retries

### Default Behavior

With Inngest, AgentKit gets automatic retries: **4 retries by default** (5 total attempts) with exponential backoff.

### Configuring Retries

Wrap network in an Inngest function and set `retries`:

```typescript
const fn = inngest.createFunction(
    { id: "my-network", retries: 1 },
    { event: "my-network/run" },
    async ({ event, step }) => network.run(event.data.input)
)
```

### Step-Level Retries

Each step gets its own independent retry counter. If step A succeeds and step B fails, only step B retries. Step A's result is memoized.

### Non-Retriable Errors

```typescript
import { NonRetriableError } from "inngest"

if (!ticket) {
    throw new NonRetriableError("Ticket not found")
}
```

### RetryAfterError

```typescript
import { RetryAfterError } from "inngest"

throw new RetryAfterError("Rate limited", retryAfterTimestamp)
```

### Error Handling in AgentKit Routing

From the routing docs: "When deployed to Inngest, AgentKit provides built-in error handling: automatic retries for failed agent executions, state persistence between retries, ability to inspect state at any point in the workflow, tracing capabilities for debugging."

---

## 7. Network Patterns

### Network Core Loop

Networks are while loops with memory (State) that call Agents and Tools until the Router determines no more work is needed:

1. Router selects an Agent based on State
2. Agent runs (inference call via `step.ai`)
3. If model calls tools, tools execute
4. Result stored in State
5. Router called again with updated State
6. Return to step 1, or stop if Router returns `undefined`

### Router Types

1. **Code-based (deterministic)**: Function that returns Agent or undefined based on state inspection. Fast, predictable.
2. **Routing Agent (autonomous)**: Uses an LLM to decide which agent to run. Flexible but slower.
3. **Hybrid**: Code for known paths, agent-based for ambiguous decisions.

### State-Based Routing

```typescript
const network = createNetwork<AgentState>({
    agents: [planningAgent, editingAgent],
    router: ({ network }) => {
        if (network.state.data.done) return undefined
        if (network.state.data.plan === undefined) return planningAgent
        return editingAgent
    }
})
```

### Maximum Iterations

```typescript
const network = createNetwork({
    agents: [...],
    maxIter: 10  // Prevents infinite loops
})
```

---

## 8. Realtime / Streaming

### Architecture

AgentKit streaming uses Inngest Realtime as the transport layer:

```
Client (useAgent hook) <--WebSocket--> Inngest Realtime Service <--publish()--> Inngest Function (AgentKit)
```

### Components Required

1. **Inngest Client** with `realtimeMiddleware()`
2. **Realtime Channel** definition with typed topics
3. **Chat Route** (`POST /api/chat`) -- receives message, sends Inngest event
4. **Token Route** (`POST /api/realtime/token`) -- generates subscription token
5. **Inngest Route** (`/api/inngest`) -- serves Inngest functions

### Server-Side Streaming Setup

```typescript
// client.ts
const inngest = new Inngest({
    id: "agent-app",
    middleware: [realtimeMiddleware()]
})

// realtime.ts
const createChannel = channel(
    (userId: string) => `user:${userId}`
).addTopic(topic("agent_stream").type<AgentMessageChunk>())

// function
const fn = inngest.createFunction(
    { id: "run-agent" },
    { event: "agent/chat.requested" },
    async ({ event, publish, step }) => {
        await network.run(userMessage, {
            state: networkState,
            streaming: {
                publish: async (chunk: AgentMessageChunk) => {
                    await publish(createChannel(targetChannel).agent_stream(chunk))
                }
            }
        })
    }
)
```

### Client-Side

```tsx
import { useAgent, AgentProvider } from "@inngest/use-agent"

function App({ userId }) {
    return (
        <AgentProvider userId={userId}>
            <ChatComponent />
        </AgentProvider>
    )
}

function ChatComponent() {
    const { messages, sendMessage, status } = useAgent()
    // ...
}
```

### Event Types

The streaming system emits structured events:
- `run.started` / `run.completed` -- lifecycle
- `part.created` / `part.completed` -- message parts
- `text.delta` -- streaming text chunks
- `tool_call.arguments.delta` / `tool_call.output.delta` -- tool call streaming
- `stream.ended` -- terminal event

### Transport Options

- **Inngest Realtime** (recommended) -- WebSocket via Inngest cloud, scalable
- **Session Transport** -- In-memory, client-side only, for demos
- **Custom** -- Implement your own `publish` function

### `useAgent` Hook

Full-featured React hook providing:
- `messages` -- current thread messages
- `status` -- ready/submitted/streaming/error
- `sendMessage()` -- send user message
- `cancel()` -- cancel current run
- `approveToolCall()` / `denyToolCall()` -- HITL
- Thread management (switch, create, delete, list)
- Callbacks: `onEvent`, `onStreamEnded`, `onToolResult`, `onStateRehydrate`
- Typed tool manifests for end-to-end type safety

---

## 9. Deployment

### Prerequisites

1. Install `@inngest/agent-kit` and `inngest`
2. Serve AgentKit over HTTP via `createServer()`
3. Configure env vars: `INNGEST_API_KEY` (Event Key), `INNGEST_SIGNING_KEY`

### Local Development

```bash
# Start AgentKit server
npx tsx ./index.ts

# Start Inngest dev server pointing at AgentKit
npx inngest-cli@latest dev -u http://localhost:3010/api/inngest
```

The Inngest dev server provides:
- Live traces of agent execution
- Token usage per agent call
- Input/output inspection
- Prompt editing and re-running individual steps

### Production Deployment

1. Deploy to any cloud provider (Vercel, AWS, GCP, etc.)
2. Sync with Inngest Cloud: Dashboard > Sync new app > paste deployment URL + `/api/inngest`
3. Functions appear in Inngest dashboard

### Scaling Configuration

Via Inngest function config on the wrapped network:
- **Concurrency**: `concurrency: [{ key: "event.data.user_id", limit: 10 }]`
- **Throttling**: Standard Inngest throttling config
- **Rate Limiting**: Standard Inngest rate limiting
- **Priority**: Standard Inngest priority queuing

---

## 10. Code Patterns Summary

### Minimal Agent (Standalone)

```typescript
import { createAgent, anthropic } from "@inngest/agent-kit"
import { createServer } from "@inngest/agent-kit/server"

const agent = createAgent({
    name: "DBA",
    description: "PostgreSQL expert",
    system: "You are a PostgreSQL expert...",
    model: anthropic({ model: "claude-3-5-haiku-latest" })
})

const server = createServer({ agents: [agent] })
server.listen(3000)
```

### Multi-Agent Network with Typed State

```typescript
import { createAgent, createNetwork, createTool, openai, anthropic } from "@inngest/agent-kit"
import { z } from "zod"

interface MyState { classification?: string; answer?: string }

const classifier = createAgent<MyState>({
    name: "Classifier",
    system: "Classify the input...",
    tools: [createTool({
        name: "classify",
        parameters: z.object({ category: z.string() }),
        handler: ({ category }, { network }) => {
            network.state.data.classification = category
        }
    })]
})

const writer = createAgent<MyState>({
    name: "Writer",
    system: ({ network }) => `Write about ${network?.state.data.classification}...`,
    model: anthropic({ model: "claude-3-5-sonnet-latest" })
})

const network = createNetwork<MyState>({
    agents: [classifier, writer],
    defaultModel: openai({ model: "gpt-4o" }),
    router: ({ network, callCount }) => {
        if (callCount === 0) return classifier
        if (network.state.data.classification) return writer
        return undefined
    },
    maxIter: 5
})
```

### Network as Inngest Function with Full Config

```typescript
const fn = inngest.createFunction(
    {
        id: "my-network",
        retries: 2,
        concurrency: [{ key: "event.data.user_id", limit: 5 }]
    },
    { event: "app/network.run" },
    async ({ event, step, publish }) => {
        const { input, userId, threadId } = event.data

        const state = createState<MyState>(
            { userId },
            { threadId, messages: event.data.history }
        )

        await network.run(input, {
            state,
            streaming: {
                publish: async (chunk) => {
                    await publish(myChannel(userId).agent_stream(chunk))
                }
            }
        })
    }
)
```

### Human-in-the-Loop Tool

```typescript
const askHuman = createTool({
    name: "ask_developer",
    description: "Ask a developer for input",
    parameters: z.object({ question: z.string() }),
    handler: async ({ question }, { step }) => {
        if (!step) return { error: "Requires step context" }

        const response = await step.waitForEvent("dev.response", {
            event: "app/developer.responded",
            timeout: "4h",
            match: "data.ticketId"
        })

        if (!response) return { error: "Timed out" }
        return { answer: response.data.answer }
    }
})
```

---

## Key Takeaways

| Feature | How It Works |
|---------|-------------|
| **Durability** | Every LLM call is a `step.ai` step -- memoized, retried, persisted |
| **State** | In-memory during `run()`, persisted via History Adapters to DB |
| **Streaming** | Inngest Realtime (WebSocket) + `publish()` in functions, `useAgent` on client |
| **Retries** | 4 by default per step, configurable per function, each step independent |
| **Multi-tenancy** | Inngest concurrency/throttling on the wrapping function |
| **HITL** | `step.waitForEvent()` in tool handlers, pauses entire function |
| **Multi-step tools** | Inngest functions as tools with their own steps |
| **Observability** | Inngest dev server shows traces, token usage, I/O for every agent call |
| **Deployment** | `createServer` + Inngest Cloud sync, or embed in existing Next.js serve handler |
| **Package** | `@inngest/agent-kit` (agents), `inngest` (runtime), `@inngest/realtime` (streaming), `@inngest/use-agent` (React) |

---

## Project-Specific Notes

The current project (`paul`) already has Inngest configured:

- **Client**: `src/inngest/index.ts` with `checkpointing: true`, `realtimeMiddleware()`, event schemas, custom slog logger
- **Functions**: `src/inngest/functions/index.ts` (empty array, no functions yet)
- **Scaffolding**: `scripts/inngest/create-inngest-function.ts` for generating new functions
- **Event naming**: `superstarter/<kebab-case-action>` convention

To add AgentKit, you would:
1. `bun install @inngest/agent-kit`
2. Create agents/networks in `src/inngest/functions/` (or a dedicated `src/agents/` directory)
3. Either use `createServer` standalone or embed `network.run()` in Inngest functions
4. For streaming: install `@inngest/use-agent`, set up chat/token routes, use `useAgent` hook
