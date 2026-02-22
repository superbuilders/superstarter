# Round 2: Documentation & Session Notes Research

> Compiled from 2 subagent doc explorations + 6 existing session note files

---

## 1. AgentKit API Surface (from docs/agentkit/ — 18 files)

### Core Functions

| Function | Purpose | Key Params |
|----------|---------|------------|
| `createAgent()` | Create an AI agent | `name`, `system`, `model`, `tools`, `lifecycle` |
| `createNetwork()` | Orchestrate multiple agents | `agents`, `defaultModel`, `maxIter`, `router`, `defaultState` |
| `createTool()` | Define agent-callable tools | `name`, `description`, `parameters` (Zod), `handler` |
| `createState()` | Typed state container | `initial` state value, type parameter |
| `useAgent()` | React hook for streaming | `agent`, `url`, `threadId`, options |

### Routing Patterns

1. **Function Router** — Code-based: `router: ({ network, lastResult }) => network.agents.get("name")`
2. **Routing Agent** — LLM-based: `router: createRoutingAgent({ model, ... })`
3. **Hybrid** — Combine both: function router calls routing agent for complex decisions

### Agent Lifecycle Hooks

- `lifecycle.onStart({ prompt, history })` — Before first inference
- `lifecycle.onResponse({ result, agent })` — After each inference
- `lifecycle.onFinish({ result, agent })` — After agent completes
- `lifecycle.enabled({ network, lastResult })` — Dynamic agent enable/disable

### Network Execution Loop

1. Router selects agent (or returns `undefined` to stop)
2. Agent runs inference with tools
3. Tool calls execute → results fed back
4. Repeat until router returns `undefined` or `maxIter` reached
5. Returns `{ output, state, history }`

### Model Providers

| Provider | Import | Key Config |
|----------|--------|------------|
| OpenAI | `agenticOpenai` | `model`, `step` (for Inngest durability) |
| Anthropic | `agenticAnthropic` | `model`, `step` |
| Gemini | `agenticGemini` | `model`, `step` |
| Grok | `agenticGrok` | `model`, `baseURL`, `step` |

### State Management

- `createState<T>()` with typed initial value
- Agents can read/write state in tool handlers via `handler({ state })`
- State persists across agent turns within a network run
- History tracking: `kv` adapter (key-value) or `assistant` adapter (for thread-based)

### Tool Definition Pattern

```typescript
createTool({
  name: "search_code",
  description: "Search codebase for pattern",
  parameters: z.object({
    query: z.string(),
    fileGlob: z.string().optional()
  }),
  handler: async (params, { network, agent, state }) => {
    // Tool implementation
    return JSON.stringify(results)
  }
})
```

### Inngest Integration

- `step.ai.infer()` — Offload inference (function pauses, no compute cost during LLM call)
- `step.ai.wrap()` — Wrap existing AI SDK calls for observability
- Pass `step` to model provider for durable execution: `agenticOpenai({ model: "gpt-4o", step })`
- Each agent inference becomes a checkpointed step

### Advanced Patterns

- **HITL** — `step.waitForEvent()` mid-network to pause for human approval
- **Multi-step tools** — Tools that internally use `step.run()` for their own durability
- **MCP** — Consume MCP servers as tool sources
- **Multitenancy** — State keyed by user/org for isolated agent contexts

---

## 2. Inngest Platform (from docs/inngest/ — 160+ pages)

### Event System

- Events trigger functions: `inngest.send({ name: "agent/task.requested", data: {...} })`
- Multiple triggers per function (event + cron)
- Event filtering: `if: "event.data.priority == 'high'"`
- Fan-out: one event triggers many functions

### Function Configuration

```typescript
inngest.createFunction(
  {
    id: "my-function",
    retries: 5,        // 5 retries + 1 initial = 6 total
    timeout: "1h",
    throttle: { limit: 10, period: "1m" },
    concurrency: { limit: 10, key: "event.data.orgId" }
  },
  { event: "agent/task.requested" },
  async ({ event, step, logger, publish, attempt }) => { ... }
)
```

### Step Orchestration API

| Method | Purpose | Blocks? |
|--------|---------|---------|
| `step.run(id, fn)` | Execute work with retries | Yes |
| `step.sleep(id, duration)` | Non-blocking pause | Yes (but no compute) |
| `step.sleepUntil(id, date)` | Sleep until timestamp | Yes (but no compute) |
| `step.waitForEvent(id, opts)` | Wait for external event | Yes (but no compute) |
| `step.waitForSignal(id, opts)` | Wait for signal | Yes (but no compute) |
| `step.invoke(id, opts)` | Call another function & wait | Yes |
| `step.sendEvent(id, events)` | Fire-and-forget fan-out | No (async) |
| `step.ai.infer(id, opts)` | Offloaded AI inference | Yes (but no compute) |
| `step.ai.wrap(id, fn, opts)` | Wrap AI SDK for observability | Yes |

### Realtime Streaming

**Architecture**: Channels → Topics → WebSocket subscriptions

**Server-side publishing**:
```typescript
// In Inngest function (requires realtimeMiddleware)
await publish({
  channel: `user:${userId}`,
  topic: "agent_output",
  data: { chunk, tokenCount, isComplete }
})
```

**Typed channels** (recommended):
```typescript
const userChannel = channel((userId: string) => `user:${userId}`)
  .addTopic(topic("agent_output").schema(z.object({ ... })))
```

**Subscription token** (server action):
```typescript
const token = await getSubscriptionToken(inngest, {
  channel: `user:${userId}`,
  topics: ["agent_output"]
})
```

**Client hook**:
```typescript
const { data, latestData, freshData, error, state, clear } =
  useInngestSubscription({ refreshToken: fetchToken, bufferInterval: 100 })
```

### Error Handling

- `NonRetriableError` — Skip remaining retries
- `RetryAfterError` — Specify exact retry time
- `StepError` — Wraps step failures
- Each step has independent retry counter
- `onFailure` handler for function-level failure handling
- System events: `inngest/function.failed`, `inngest/function.finished`

### Flow Control

| Control | Purpose | Key Config |
|---------|---------|------------|
| Concurrency | Limit parallel executions | `limit`, `key` (per-user/org) |
| Throttle | Rate limit (GCRA) | `limit`, `period`, `key` |
| Rate Limit | Hard cap | `limit`, `period`, `key` |
| Debounce | Coalesce rapid events | `period`, `key` |
| Priority | Execution ordering | `run: "event.data.priority"` |
| Singleton | One active instance | `key` (cancel/skip existing) |
| Batching | Process events in groups | `maxSize`, `timeout` |

### Middleware

- Client-level (global) and function-level
- Hooks: `beforeExecution`, `afterExecution`, `transformInput`, `transformOutput`, `onFunctionRun`
- `realtimeMiddleware()` adds `publish()` to handler context

### Testing (@inngest/test)

- `createTestClient()` for unit testing functions
- Mocks step execution for fast tests
- Assert on function runs, step outputs, events sent

---

## 3. Session Notes Synthesis (from .claude/notes/ — 6 files)

### AgentKit + Inngest Integration (agentkit-inngest.md)

**Two deployment modes**:
1. **Standalone** — `createServer()` with Express/HTTP (for dedicated agent service)
2. **Embedded** — `network.run()` inside `inngest.createFunction()` (our pattern)

**Durable execution** — Pass `step` to model providers → inference becomes checkpointed
**State management** — In-network state + history adapters (kv/assistant) + Mem0 memory
**HITL pattern** — `step.waitForEvent()` pauses network, dashboard publishes approval event

### AgentKit Overview (agentkit-overview.md)

**Key insight**: AgentKit is NOT Vercel AI SDK — separate model abstraction, separate streaming
**`useAgent` hook** — React hook for real-time multi-threaded AI with:
- `url` pointing to agent HTTP endpoint
- `threadId` for conversation threading
- Streaming output via WebSocket
- History management built-in

### Inngest Overview (inngest-overview.md)

**Comprehensive reference** covering:
- Client creation with `schemas` for type-safe events
- All step methods with retry semantics
- Checkpointing: function pauses between steps, resumes on retry
- Parallel steps: multiple `step.run()` calls resolve concurrently
- Cancellation via events or API
- Realtime: channels, topics, typed schemas, subscription tokens

### AI SDK Notes (ai-sdk-overview.md, ai-sdk-vercel.md, ai-sdk-agents.md)

**Not directly relevant** — These cover Vercel AI SDK (`ai` package), which is a different system from AgentKit. The project uses AgentKit for agent orchestration, not `ai`.

Key distinction:
- **Vercel AI SDK** (`ai`) — `useChat`, `streamText`, `generateObject`, provider adapters
- **Inngest AgentKit** (`@inngest/agent-kit`) — `createAgent`, `createNetwork`, `createTool`, durable execution

---

## 4. Key Patterns for Command Center

### Triggering Workflows

```typescript
// Server action to trigger a workflow
await inngest.send({
  name: "agent/feature.requested",
  data: {
    feature: "Add user authentication",
    branchName: "feature/auth",
    presetId: "default",
    configOverrides: { /* per-role model overrides */ },
    targetPath: "src/auth/"
  }
})
```

### Real-time Status Updates

```typescript
// In agent function: publish progress
await publish({
  channel: `workspace:${workspaceId}`,
  topic: "agent_status",
  data: { agentId, status: "processing", phase: "onboarding", progress: 45 }
})

// On client: subscribe
const { data } = useInngestSubscription({
  refreshToken: () => getToken(`workspace:${workspaceId}`, ["agent_status"])
})
```

### HITL Approval Flow

```typescript
// Function A ends, emits "ready-for-review"
// Dashboard shows pending review
// User clicks approve → sends event
await inngest.send({
  name: "agent/feature.approved",
  data: { workflowRunId, approved: true }
})
// Function B picks up with step.waitForEvent()
```

### Config Resolution (4 levels)

1. Event payload `configOverrides` → merge over preset
2. Event payload `presetId` → load from DB
3. Neither → load `isDefault=true` for workflow type
4. No default in DB → code `DEFAULT_CONFIG`

### Judge Panel

- 4-N parallel judges with DB-persisted personalities
- Each judge has: `slug`, `persona`, `evaluationFocus`, `modelConfig`, `isActive`, `isBuiltIn`
- Panel results aggregated for approval decision

---

## Summary

| Area | Key Takeaway |
|------|-------------|
| AgentKit | Factory-based agents, network orchestration, function/routing-agent routers, typed state, Inngest step integration |
| Inngest | Event-driven, durable steps, checkpointing, realtime streaming via channels/topics, comprehensive flow control |
| Realtime | `publish()` in functions → `useInngestSubscription()` on client, typed channels with Zod schemas |
| HITL | Event-break pattern: function ends → dashboard shows → user acts → next function starts |
| Config | 4-level resolution pipeline with DB presets and per-run overrides |
| NOT using | Vercel AI SDK (`ai` package) — using Inngest AgentKit instead |
