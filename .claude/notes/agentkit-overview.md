# AgentKit Comprehensive Overview

Research notes from `/Users/sterling/Documents/superbuilders/paul/docs/agentkit/` (46 pages, scraped 2026-02-17).

---

## 1. What is AgentKit?

AgentKit is a **TypeScript framework by Inngest** for building AI agent systems. Package: `@inngest/agent-kit`. It ranges from single-model inference calls to multi-agent systems with tools, routing, and shared state. Orchestration-aware by design.

**Key value props:**
- Composable primitives (Agents, Networks, Tools, Routers, State)
- Multi-model support (OpenAI, Anthropic, Gemini, Grok)
- MCP tool integration (Model Context Protocol)
- Realtime UI streaming via `useAgent` hook + Inngest Realtime
- Local dev server with live traces, input/output logs, token usage
- Production deployment with retries, multitenancy, concurrency via Inngest

**npm:** `@inngest/agent-kit` (peer dep: `inngest`)

---

## 2. Directory Structure

```
docs/agentkit/
    index.md                    # TOC and section listing
    overview.md                 # High-level intro + code example
    getting-started/
        installation.md         # npm install instructions
        local-development.md    # Inngest Dev Server setup
        quick-start.md          # DBA agent + multi-agent network tutorial
    concepts/
        agents.md               # Agent creation, lifecycle, system prompts
        networks.md             # Network loop, model config, maxIter, state
        routers.md              # Code-based, Routing Agent, hybrid patterns
        state.md                # History + typed key-value state
        tools.md                # createTool, Zod parameters, handler
        models.md               # openai(), anthropic(), gemini(), grok()
        deployment.md           # Production with Inngest (retries, LLM offload)
        history.md              # HistoryConfig adapter for persistent conversations
        memory.md               # Long-term memory with Mem0 integration
    advanced-patterns/
        human-in-the-loop.md    # step.waitForEvent() for human input
        legacy-ui-streaming.md  # useAgent hook (legacy streaming pattern)
        mcp.md                  # MCP servers as tools (SSE, WS, Streamable HTTP)
        multi-steps-tools.md    # Inngest Functions as multi-step tools
        multitenancy.md         # Per-user concurrency/throttling via Inngest
        retries.md              # Custom retry policies
        routing.md              # Deterministic state-based routing patterns
    streaming/
        overview.md             # useAgent hook overview + endpoints needed
        events.md               # Full event reference (run.started, text.delta, etc.)
        provider.md             # AgentProvider React component
        transport.md            # Transport layer (Inngest Realtime, Session, Custom)
        usage-guide.md          # End-to-end SQL agent with streaming example
    reference/
        introduction.md         # SDK overview
        create-agent.md         # createAgent() options + lifecycle hooks
        create-network.md       # createNetwork() options
        create-tool.md          # createTool() options + lifecycle hooks
        network-router.md       # Function Router + createRoutingAgent()
        state.md                # createState(), InferenceResult, Message types
        use-agent.md            # useAgent React hook full API reference
        model-openai.md         # openai() config
        model-anthropic.md      # anthropic() config (max_tokens required)
        model-gemini.md         # gemini() config
        model-grok.md           # grok() config
    guided-tour/
        overview.md             # Three levels of AI apps
        ai-workflows.md         # v1: RAG workflow (single agent, static)
        agentic-workflows.md    # v2: Tools + Router + Network (agentic)
        ai-agents.md            # v3: Routing Agent (autonomous)
    integrations/
        browserbase.md          # Headless browser / Stagehand
        e2b.md                  # Code execution sandboxes
        daytona.md              # Secure code execution infrastructure
        smithery.md             # MCP server registry (2000+ servers)
    examples/
        overview.md             # Links to all examples
    changelog/
        overview.md             # v0.1.0 through v0.5.0
```

---

## 3. Core Concepts

### 3.1 Agents

An Agent wraps a model + system prompt + optional tools. Created via `createAgent()`.

```ts
import { createAgent, openai } from "@inngest/agent-kit"

const agent = createAgent({
    name: "Code writer",
    description: "An expert TypeScript programmer", // required when in Network
    system: "You are an expert TypeScript programmer...",
    model: openai("gpt-4o-mini"),
    tools: [myTool],
    lifecycle: { onStart, onResponse, onFinish },
})
```

**Key properties:**
- `name` (required): displayed in tracing
- `description`: used by routing agents to decide which agent to call
- `system`: static string OR async callback `({ network }) => string` for dynamic prompts
- `model`: provider model instance
- `tools`: array of tools created via `createTool()`
- `lifecycle`: hooks for `onStart`, `onResponse`, `onFinish`

**Execution flow when `agent.run()` is called:**
1. Messages created from system prompt + user input + network state
2. `onStart` hook fires (can modify prompts)
3. Inference call to model (via Inngest `step.ai` if deployed)
4. Result parsed into `InferenceResult`
5. `onResponse` hook fires (can modify result before tool calling)
6. Tools automatically called if model requested them
7. `onFinish` hook fires
8. Result returned

**Agents are stateless.** State is managed by the Network.

### 3.2 Networks

A Network is a "system of agents" - a while loop with memory that calls agents until the router says stop.

```ts
const network = createNetwork({
    agents: [searchAgent, summaryAgent],
    defaultModel: openai({ model: "gpt-4o" }),
    router: myRouterFunction, // optional, defaults to Default Routing Agent
    maxIter: 10,              // optional iteration limit
    defaultState: new State({ foo: "bar" }), // optional initial state
    history: myHistoryAdapter, // optional persistence
})

const result = await network.run("user prompt", { state, streaming })
```

**Network loop:**
1. Router decides first agent
2. Agent runs (with lifecycle hooks and tools)
3. Result stored in network state
4. Router called again with new state
5. Repeat until router returns `undefined` or `maxIter` reached

**Model configuration:** Network `defaultModel` is used for agents without their own model AND for the routing agent. Individual agents can override with their own `model`.

### 3.3 Routers

Three routing patterns:

**Code-based Router (supervised, deterministic):**
```ts
router: ({ lastResult, callCount, network, stack, input }) => {
    if (callCount === 0) return classifier
    if (callCount === 1) return writer
    return undefined // stop
}
```

**Routing Agent (autonomous):**
```ts
const routingAgent = createRoutingAgent({
    name: "Custom routing agent",
    lifecycle: {
        onRoute: ({ result, network }) => {
            // return string[] of agent names or undefined to stop
        },
    },
})
// then: router: routingAgent
```

**Hybrid (semi-supervised):**
```ts
router: ({ callCount }) => {
    if (callCount === 0) return classifier // deterministic first step
    return getDefaultRoutingAgent()        // LLM takes over
}
```

**Router function signature:**
```ts
interface RouterArgs {
    network: Network
    stack: Agent[]
    callCount: number
    lastResult?: InferenceResult
    input: string
}
// Return: Agent | Agent[] | RoutingAgent | undefined
```

### 3.4 State

Two kinds of state:
1. **History** - chronological `InferenceResult[]` of all agent interactions
2. **Typed data** - mutable key-value store (`state.data`)

```ts
import { createState } from "@inngest/agent-kit"

interface NetworkState {
    username?: string
}

const state = createState<NetworkState>({ username: "default" })
state.data.username = "Alice"
```

State is accessible in:
- Router functions via `network.state`
- Tool handlers via `network.state`
- Agent system prompts via `({ network }) => network.state`
- Lifecycle hooks

**State is per-run only.** Not persisted across `network.run()` calls. Use History adapters for persistence.

### 3.5 Tools

Tools extend agent capabilities. Defined via `createTool()`.

```ts
const myTool = createTool({
    name: "list_charges",
    description: "Returns all of a user's charges",
    parameters: z.object({
        userId: z.string(),
        created: z.object({ gte: z.string().date(), lte: z.string().date() }).nullable(),
    }),
    handler: async (input, { network, agent, step }) => {
        // input is typed to match parameters
        // network.state.data for reading/writing state
        // step for Inngest step tools (retries, waitForEvent, etc.)
        return [{ /* results */ }]
    },
    lifecycle: { onStart, onFinish },
})
```

**Key points:**
- `parameters` can be Zod schemas or JSON Schema
- Optional parameters use `.nullable()` (not `.optional()`)
- `handler` receives typed input + context (`{ network, agent, step }`)
- `step` is available when running inside Inngest (enables retries, human-in-the-loop, etc.)
- Tools can also be Inngest Functions for multi-step operations
- MCP servers can be configured as tool sources via `mcpServers`

### 3.6 Models

Four built-in providers:

| Provider | Helper | Env Var | Notes |
|----------|--------|---------|-------|
| OpenAI | `openai()` | `OPENAI_API_KEY` | |
| Anthropic | `anthropic()` | `ANTHROPIC_API_KEY` | `max_tokens` required in `defaultParameters` |
| Gemini | `gemini()` | `GEMINI_API_KEY` | No parameterless functions |
| Grok | `grok()` | `XAI_API_KEY` | No strict function parameters |

Each accepts `{ model, apiKey?, baseUrl?, defaultParameters? }`.

```ts
openai({ model: "gpt-4o", defaultParameters: { temperature: 0.5 } })
anthropic({ model: "claude-3-5-sonnet-latest", defaultParameters: { max_tokens: 4096 } })
gemini({ model: "gemini-1.5-flash" })
grok({ model: "grok-4-latest" })
```

---

## 4. Inngest Integration

AgentKit is built by Inngest and deeply integrates with it. The `inngest` package is a **required peer dependency** as of v0.8.0+.

### What Inngest Provides

- **Automatic retries** with exponential backoff (default 4 retries)
- **LLM request offloading** via `step.ai.infer()` for serverless
- **Durable execution** - state persisted between retries
- **Live observability** - step-by-step traces with token usage
- **Concurrency control** - per-user/org limits
- **Throttling and rate limiting**
- **Human-in-the-loop** via `step.waitForEvent()`
- **Realtime streaming** via `@inngest/realtime`

### Wrapping Networks in Inngest Functions

```ts
const myFunction = inngest.createFunction(
    { id: "my-network", concurrency: [{ key: "event.data.user_id", limit: 10 }] },
    { event: "my-network/run" },
    async ({ event, step }) => {
        return network.run(event.data.input)
    }
)
```

### HTTP Server

```ts
import { createServer } from "@inngest/agent-kit/server"

const server = createServer({
    agents: [myAgent],
    networks: [myNetwork],
    functions: [myInngestFunction],
})
server.listen(3010)
```

### Dev Server

```bash
npx inngest-cli@latest dev -u http://localhost:3000/api/inngest
```

Provides: function triggering, agent trace inspection, token usage, input/output viewing, rerun with modified prompts.

---

## 5. History & Persistence

The `HistoryConfig` interface enables persistent conversations across runs.

**Four adapter methods:**
1. `createThread({ state, input })` - create/upsert thread, return `{ threadId }`
2. `get({ threadId, state })` - load conversation history as `AgentResult[]`
3. `appendUserMessage({ threadId, userMessage })` - save user message immediately
4. `appendResults({ threadId, newResults })` - save agent results after run

**Persistence patterns:**
- **Server-Authoritative**: Client sends `threadId`, server loads history from DB
- **Client-Authoritative**: Client sends full history, server skips DB read (faster)
- **Hybrid**: Server loads on first request, client sends history on subsequent ones

```ts
const network = createNetwork({
    history: myHistoryAdapter, // HistoryConfig implementation
    // ...
})
```

---

## 6. Memory (Long-term)

Integration with **Mem0** for long-term, reflective memory. Two patterns:

1. **Autonomous Agent**: Single agent with granular memory tools (create, recall, update, delete). Non-deterministic - agent decides when to use them.

2. **Multi-Agent Network**: Deterministic pipeline:
   - Memory Retrieval Agent (recall_memories tool)
   - Personal Assistant Agent (no tools, just synthesizes answer)
   - Memory Updater Agent (manage_memories tool)
   - Code-based router enforces sequence

Memory writes are typically async via Inngest events for responsiveness.

---

## 7. Streaming & UI

### useAgent Hook

Package: `@inngest/use-agent`

A React hook for real-time, multi-threaded AI conversations. Manages the full lifecycle: sending messages, receiving streaming events, handling out-of-order sequences, connection state.

```tsx
import { useAgent, AgentProvider } from "@inngest/use-agent"

function App() {
    return (
        <AgentProvider userId="user-123">
            <ChatComponent />
        </AgentProvider>
    )
}

function ChatComponent() {
    const { messages, sendMessage, status } = useAgent()
    // status: "ready" | "submitted" | "streaming" | "error"
    // messages: ConversationMessage[] with parts (text, tool-call, etc.)
}
```

### Streaming Architecture

1. Client connects to Inngest Realtime via WebSocket (subscription token from backend)
2. Client sends message to API route, which triggers Inngest function
3. Inngest function runs `network.run(message, { streaming: { publish } })`
4. AgentKit generates structured events (run.started, text.delta, part.completed, etc.)
5. Events published to Inngest Realtime channel
6. Client receives events via WebSocket, useAgent processes and renders

### Required Backend Endpoints

- `POST /api/chat` - receives message, sends Inngest event
- `POST /api/realtime/token` - generates subscription token
- `POST /api/inngest` - serves Inngest functions

### Inngest Realtime Setup

```ts
// Client
import { realtimeMiddleware } from "@inngest/realtime/middleware"
const inngest = new Inngest({ id: "app", middleware: [realtimeMiddleware()] })

// Channel definition
import { channel, topic } from "@inngest/realtime"
const createChannel = channel((userId: string) => `user:${userId}`)
    .addTopic(topic("agent_stream").type<AgentMessageChunk>())
```

### Event Types

| Event | Purpose |
|-------|---------|
| `run.started` | Agent/network execution began |
| `run.completed` | Agent/network logic finished |
| `stream.ended` | All streaming complete, agent idle |
| `part.created` | New message part (text or tool-call) |
| `text.delta` | Text chunk for streaming |
| `part.completed` | Part finalized with full content |
| `tool_call.arguments.delta` | Tool input streaming |
| `tool_call.output.delta` | Tool output streaming |

### AgentProvider

Wraps components in shared context. Single WebSocket connection shared across all `useAgent` hooks. Supports authenticated users, anonymous users (auto-generates sessionStorage ID), and collaborative sessions via `channelKey`.

### Transport Layer

Default: Inngest Realtime. Also supports:
- **Session Transport** (in-memory, client-side only, for demos)
- **Custom transports** (any real-time provider via custom `publish` function)

Transport methods: `sendMessage`, `getRealtimeToken`, `fetchHistory`, `fetchThreads`, `createThread`, `deleteThread`.

### Type Safety with Tool Manifests

```ts
const manifest = createToolManifest([tool1, tool2] as const)
export type ToolManifest = typeof manifest

// Client-side: strongly typed tool outputs
function useInsightsAgent(config) {
    return useAgent<{ tools: ToolManifest; state: ClientState }>(config)
}
```

### useAgent Return Values

**State:** `messages`, `status`, `error`, `threads`, `currentThreadId`, `isConnected`
**Actions:** `sendMessage`, `cancel`, `approveToolCall`, `denyToolCall`
**Thread Management:** `switchToThread`, `createNewThread`, `deleteThread`, `loadMoreThreads`, `refreshThreads`
**Callbacks:** `onEvent`, `onStreamEnded`, `onToolResult`, `onStateRehydrate`, `onThreadNotFound`

---

## 8. Advanced Patterns

### Human-in-the-Loop

Uses Inngest `step.waitForEvent()` inside tool handlers. The tool pauses execution (up to configurable timeout) waiting for an external event (e.g., from Slack). Requires wrapping the network in an Inngest function.

```ts
handler: async ({ question }, { step }) => {
    const response = await step.waitForEvent("developer.response", {
        event: "app/support.ticket.developer-response",
        timeout: "4h",
        match: "data.ticketId",
    })
    return response?.data.answer
}
```

### MCP as Tools

Agents can consume MCP servers directly via `mcpServers` config:

```ts
const agent = createAgent({
    mcpServers: [{
        name: "neon",
        transport: { type: "ws", url: "ws://localhost:8080" },
        // or: { type: "sse", url: "..." }
        // or: { type: "streamable-http", url: "..." }
    }],
})
```

AgentKit auto-fetches tool lists from MCP servers and namespaces them (e.g., "neon-createBranch").

### Multi-Step Tools

Inngest Functions used as tools for complex operations with multiple retried steps:

```ts
const researchWebTool = inngest.createFunction(
    { id: "research-web-tool" },
    { event: "research-web-tool/run" },
    async ({ event, step }) => {
        const queries = await step.ai.infer("generate-queries", { /* ... */ })
        const results = await Promise.all(queries.map(q => step.run("crawl", () => { /* ... */ })))
        const summary = await step.ai.infer("summarize", { /* ... */ })
        return summary
    }
)
// Register with: createServer({ functions: [researchWebTool] })
```

### Multitenancy

Per-user concurrency via Inngest function config:

```ts
inngest.createFunction({
    id: "my-network",
    concurrency: [{ key: "event.data.user_id", limit: 10 }],
}, /* ... */)
```

Also supports throttling, rate limiting, and priority.

### Retries

Default: 4 retries with exponential backoff. Configurable:

```ts
inngest.createFunction({ id: "my-network", retries: 1 }, /* ... */)
```

### Deterministic State Routing

Model workflows as state machines:

```ts
interface AgentState {
    plan?: { /* ... */ }
    done: boolean
}

router: ({ network }) => {
    if (network.state.data.done) return undefined
    if (!network.state.data.plan) return planningAgent
    return editingAgent
}
```

Benefits: predictable, testable, debuggable. Tools update state, router inspects state.

---

## 9. Error Handling

AgentKit's error handling is primarily delegated to Inngest:

- **Automatic retries** for failed agent executions (configurable)
- **State persistence** between retries
- **NonRetriableError** for permanent failures
- **step.run()** wraps operations for individual retry
- **step.ai.infer()** auto-retries LLM requests and caches results
- **Tracing** for debugging at any point in the workflow

Tool handlers should throw errors to signal failure. The Inngest runtime handles retry logic.

---

## 10. Workflow Patterns

### Pattern 1: Single Agent (RAG)
Simple retrieval + generation. Agent.run() with inline context.

### Pattern 2: Agentic Workflow (Code-based Router)
Multiple specialized agents + shared state + deterministic router. Tools modify state, router reads state to decide next agent.

### Pattern 3: Autonomous Agent (Routing Agent)
LLM-powered router that decides which agent to call based on conversation history and available agents. More flexible but less predictable.

### Pattern 4: Hybrid
Code-based router for known steps, then delegate to routing agent for flexible parts.

### Pattern 5: Recall-Respond-Update (Memory)
Three-agent pipeline: recall memories, generate response, update memories. Deterministic router enforces sequence.

### Pattern 6: Human-in-the-Loop
Tool pauses for human input via `step.waitForEvent()`. Network resumes when event received.

---

## 11. Key Configuration Reference

### createAgent()
| Option | Type | Required | Notes |
|--------|------|----------|-------|
| `name` | string | yes | displayed in tracing |
| `description` | string | for networks | helps LLM routing |
| `model` | AiAdapter | yes (or network default) | provider model instance |
| `system` | string \| fn | yes | static or dynamic prompt |
| `tools` | TypedTool[] | no | |
| `lifecycle` | { onStart, onResponse, onFinish } | no | |
| `mcpServers` | MCP.Server[] | no | MCP tool sources |
| `history` | HistoryConfig | no | persistence adapter |
| `tool_choice` | string | no | force specific tool |

### createNetwork()
| Option | Type | Required | Notes |
|--------|------|----------|-------|
| `agents` | Agent[] | yes | |
| `defaultModel` | AiAdapter | recommended | fallback for agents + routing |
| `router` | fn \| RoutingAgent | no | defaults to Default Routing Agent |
| `maxIter` | number | no | iteration limit |
| `defaultState` | State | no | initial state |
| `history` | HistoryConfig | no | persistence adapter |
| `name` | string | no | displayed in tracing |

### createTool()
| Option | Type | Required | Notes |
|--------|------|----------|-------|
| `name` | string | yes | |
| `description` | string | yes | |
| `parameters` | Zod \| JSONSchema | yes | |
| `handler` | fn | yes | `(input, { network, agent, step }) => any` |
| `lifecycle` | { onStart, onFinish } | no | |

### createRoutingAgent()
| Option | Type | Required | Notes |
|--------|------|----------|-------|
| `name` | string | yes | |
| `description` | string | no | |
| `lifecycle.onRoute` | fn | yes | returns string[] or undefined |
| `model` | AiAdapter | no | uses network default |
| `tools` | TypedTool[] | no | |
| `tool_choice` | string | no | |

---

## 12. Integrations

| Integration | Purpose | Package |
|-------------|---------|---------|
| **Browserbase** | Headless browser (Playwright) | `@browserbasehq/sdk` |
| **Stagehand** | Autonomous web browsing | `@browserbasehq/stagehand` |
| **E2B** | Secure code execution sandboxes | `@e2b/code-interpreter` |
| **Daytona** | Secure code execution infrastructure | `@daytonaio/sdk` |
| **Smithery** | MCP server registry (2000+ servers) | `@smithery/sdk` |
| **Mem0** | Long-term reflective memory | `mem0` |

---

## 13. Changelog Highlights

| Version | Date | Key Changes |
|---------|------|-------------|
| v0.1.0 | 2024-12-19 | Initial release: OpenAI + Anthropic, Networks, State, Tools |
| v0.2.0 | 2025-01-16 | MCP tool calling, dev server, Anthropic fixes |
| v0.2.2 | 2025-01-29 | Inngest functions as tools, Inngest now optional |
| v0.3.0 | 2025-02-19 | Non-Node runtime support, E2B integration |
| v0.4.0 | 2025-03-06 | Model hyper params, Browserbase integration |
| v0.5.0 | 2025-03-11 | Grok models, Gemini latest models |

---

## 14. Relationship to Vercel AI SDK

AgentKit does **not** integrate with or wrap the Vercel AI SDK. It has its own model abstraction layer (`openai()`, `anthropic()`, `gemini()`, `grok()`) that directly calls provider APIs. The streaming system uses Inngest Realtime (WebSocket-based) rather than AI SDK streaming primitives. The `useAgent` hook is a custom React hook from `@inngest/use-agent`, not related to AI SDK's `useChat`.

---

## 15. Key Takeaways for Paul Project

- AgentKit is tightly coupled to Inngest. Our project already uses Inngest, making integration straightforward.
- Networks wrap in Inngest functions for production (retries, concurrency, observability).
- `createServer()` from `@inngest/agent-kit/server` provides the HTTP layer.
- State is per-run only (not persisted). Use History adapters for cross-run persistence.
- Streaming requires Inngest Realtime middleware + channel/topic setup.
- The `useAgent` hook manages the full client-side conversation lifecycle.
- Tools access Inngest step tools for durable operations (retries, waitForEvent, sendEvent).
