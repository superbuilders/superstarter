# Inngest Comprehensive Overview

Research notes from 160-page documentation corpus at `docs/inngest/`.

---

## 1. What is Inngest?

Inngest is a **durable execution engine** for background jobs and workflows. It replaces traditional job queues (Redis/Bull, SQS, etc.) with an event-driven, step-based model where:

- Functions are triggered by **events** or **cron schedules**
- Inngest manages the queue, retries, scheduling, and state persistence
- Your code runs on YOUR infrastructure (serverless, Express, etc.) -- Inngest calls your functions via HTTP
- Functions can span minutes to months with sleeps, waits, and multi-step workflows
- Each step is individually retried and memoized

**Key differentiator**: Inngest functions don't run inside Inngest's infrastructure. Inngest acts as an orchestrator that calls your HTTP endpoints. Your `serve()` handler exposes functions, and Inngest invokes them via POST requests.

---

## 2. Documentation Structure

```
docs/inngest/
├── learn/                    # Core concepts (how-functions-are-executed, inngest-steps, glossary)
├── features/
│   ├── events-triggers/      # Event format, triggers, Neon integration
│   ├── inngest-functions/
│   │   ├── cancellation/     # Cancel on events, cancel on timeouts
│   │   ├── error-retries/    # Retries, failure handlers, inngest errors, rollbacks
│   │   └── steps-workflows/  # step.run, sleep, waitForEvent, waitForSignal, fetch, AI
│   ├── middleware/           # Create, dependency injection, encryption, Sentry
│   └── realtime/            # Core realtime, Next.js, React hooks, subscribe
├── guides/                   # Practical how-tos (30+ guides)
│   ├── flow-control.md       # Index of concurrency, throttling, rate-limiting, debounce, priority
│   ├── concurrency.md        # Step-level concurrency with keys and scopes
│   ├── throttling.md         # GCRA-based function start throttling
│   ├── debounce.md           # Sliding window event debounce
│   ├── rate-limiting.md      # Hard limits (lossy, drops events)
│   ├── priority.md           # Dynamic priority via expressions
│   ├── batching.md           # Process multiple events in one run
│   ├── step-parallelism.md   # Promise.all for parallel steps
│   ├── fan-out-jobs.md       # Trigger multiple functions from one
│   ├── singleton.md          # Ensure only one run at a time
│   ├── error-handling.md     # Errors vs failures, retries, idempotency
│   └── ... (more)
├── reference/                # API reference
│   ├── client/create.md      # Inngest client constructor
│   ├── functions/            # createFunction, step.*, debounce, rate-limit, etc.
│   ├── middleware/           # Lifecycle hooks reference
│   ├── serve.md             # serve() handler
│   ├── testing.md           # @inngest/test library
│   ├── typescript.md        # TS helpers (GetEvents, GetFunctionInput, etc.)
│   └── system-events/       # inngest/function.failed, inngest/function.cancelled
├── getting-started/          # Quick starts (Next.js, Express, Node.js, Astro, etc.)
├── deploy/                   # Vercel, Cloudflare, Netlify, Render, DigitalOcean
├── platform/                 # Cloud dashboard, environments, deployment, monitoring
├── sdk/                      # Environment variables, ESLint plugin, migration guide
├── setup/                    # Checkpointing, Connect
├── examples/                 # Realtime, email sequences, AI agents, etc.
└── llms-full.txt            # Full concatenated docs for LLM context
```

---

## 3. Core Concepts

### 3.1 The Inngest Client

Created once, shared across codebase:

```ts
import { Inngest, EventSchemas } from "inngest"

const inngest = new Inngest({
    id: "my-app",
    schemas: new EventSchemas().fromSchema({
        "app/user.created": z.object({ userId: z.string() })
    }),
    middleware: [realtimeMiddleware()],
    checkpointing: true,
    // eventKey, signingKey via env vars preferred
})
```

**Client options**: `id`, `baseUrl`, `env`, `eventKey`, `fetch`, `isDev`, `logger`, `middleware`, `schemas`, `checkpointing`

### 3.2 Events

Events are the primary trigger mechanism. Format:

```ts
type EventPayload = {
    name: string           // Required: "app/user.created"
    data: Record<string, any>  // Required: event data
    id?: string            // Optional: deduplication ID (24h window)
    ts?: number            // Optional: timestamp (ms since epoch)
    v?: string             // Optional: schema version
    user?: Record<string, any> // Optional: user data (encrypted at rest)
}
```

**Sending events**:
- `inngest.send({ name, data })` -- from anywhere in your app
- `step.sendEvent("id", { name, data })` -- from within functions (preferred, ensures delivery)
- HTTP API: `POST https://inn.gs/e/$INNGEST_EVENT_KEY` with JSON body
- Multiple events: pass an array to `send()`

**Event naming**: Use `prefix/object.action` pattern (e.g., `app/user.created`, `billing/invoice.paid`). Past tense verbs.

**Deduplication**: Set `id` on event payload. Same ID within 24 hours is ignored.

### 3.3 Functions

Functions are defined with `inngest.createFunction()` taking three arguments:

1. **Configuration** -- `id`, flow control options, retries, cancelOn, etc.
2. **Trigger** -- event name, cron schedule, or array of up to 10 triggers
3. **Handler** -- async function receiving `{ event, events, step, runId, logger, attempt }`

```ts
inngest.createFunction(
    { id: "sync-data", retries: 5, concurrency: 10 },
    { event: "app/sync.requested" },
    async ({ event, step, logger }) => {
        // function body with steps
    }
)
```

**Trigger types**:
- `{ event: "event.name" }` -- triggered by event
- `{ event: "event.name", if: "event.data.priority >= 4" }` -- with CEL filter
- `{ cron: "0 12 * * 5" }` -- cron schedule (with optional TZ prefix)
- Array of up to 10 triggers for multiple triggers

### 3.4 Steps (Durable Execution)

Steps are the building blocks that make functions durable. Each step:
- Is executed as a **separate HTTP request**
- Is individually **retried** on failure
- Has its result **memoized** (not re-executed on subsequent invocations)
- Returns data usable by subsequent steps

**Critical rule**: Any non-deterministic logic (DB calls, API calls) MUST be inside a `step.run()`.

**Execution model**:
1. Function is called, first step discovered and executed
2. Step result saved to Inngest state store
3. Function re-invoked with previous state; completed steps are memoized (skipped)
4. Next unexecuted step runs
5. Repeat until function completes

---

## 4. Step API Reference

### `step.run(id, handler)` -- Execute code as a retriable step

```ts
const data = await step.run("fetch-data", async () => {
    return await fetchFromAPI()
})
```

### `step.sleep(id, duration)` -- Pause execution (no compute used)

```ts
await step.sleep("wait-a-day", "1d")
// Formats: "30s", "5m", "2h", "1d", "1w"
// Max: 1 year (7 days on free tier)
```

### `step.sleepUntil(id, date)` -- Pause until specific datetime

```ts
await step.sleepUntil("wait-for-date", new Date(event.data.remindAt))
```

### `step.waitForEvent(id, options)` -- Pause until event received or timeout

```ts
const completionEvent = await step.waitForEvent("wait-for-completion", {
    event: "app/onboarding.completed",
    timeout: "3d",
    if: "event.data.userId == async.data.userId",  // match expression
    // OR: match: "data.userId"  -- shorthand for same field match
})
// Returns the event object, or null if timeout
```

### `step.waitForSignal(id, options)` -- Pause until signal received

```ts
const signal = await step.waitForSignal("wait-for-approval", {
    signal: "task/unique-signal-id",
    timeout: "3d",
})
```

Signals are unique across runs (unlike events which can trigger multiple functions).

### `step.invoke(id, options)` -- Call another Inngest function

```ts
const result = await step.invoke("compute-square", {
    function: computeSquare,    // reference to another function
    data: { number: 4 },       // typed input data
})
// Returns the result of the invoked function
```

### `step.sendEvent(id, eventPayload)` -- Send events reliably from within a function

```ts
await step.sendEvent("notify-users", {
    name: "app/user.activated",
    data: { userId: event.data.userId },
})
```

Preferred over `inngest.send()` inside functions (wraps in a step for reliability).

---

## 5. Flow Control

All flow control is configured in the function's configuration object.

### 5.1 Concurrency

Limits **number of steps executing** at a single time (NOT function runs). Sleeping/waiting steps don't count.

```ts
{
    concurrency: 10,
    // OR with key (per-tenant):
    concurrency: [
        { scope: "fn", key: "event.data.account_id", limit: 1 },
        { scope: "account", key: '"openai"', limit: 60 },
    ]
}
```

**Scopes**: `fn` (default, per-function), `env` (per-environment), `account` (global across environments)
**Keys**: CEL expressions evaluated per event, creating virtual queues per unique value
**Max**: 2 concurrency constraints per function
**Queue order**: FIFO within same function

### 5.2 Throttling

Limits **number of new function runs started** over a time period. Uses GCRA algorithm. Excess runs are **enqueued** (not dropped).

```ts
{
    throttle: {
        limit: 1,          // runs per period
        period: "5s",       // time window
        burst: 2,           // extra burst allowance on top of limit
        key: "event.data.user_id",  // optional per-key throttle
    }
}
```

**Period range**: 1s to 7d.

### 5.3 Rate Limiting

Limits function runs -- excess events are **dropped** (lossy). Hard limit.

```ts
{
    rateLimit: {
        limit: 1,
        period: "60s",     // 1s to 60s
        key: "event.data.customer_id",
    }
}
```

### 5.4 Debounce

Delays execution until events stop arriving. Uses sliding window. Runs with the **last** event received.

```ts
{
    debounce: {
        period: "5m",       // 1s to 7d
        key: "event.data.account_id",
        timeout: "10m",     // optional max debounce time
    }
}
```

### 5.5 Priority

Dynamic execution order based on expression returning -600 to 600.

```ts
{
    priority: {
        run: "event.data.plan == 'enterprise' ? 180 : 0"
    }
}
```

### 5.6 Singleton

Ensures only one run of a function at a time (per key). Two modes:
- `"skip"` -- new runs are skipped if one is already running
- `"cancel"` -- existing run is cancelled, new one starts

```ts
{
    singleton: {
        key: "event.data.user_id",
        mode: "skip",  // or "cancel"
    }
}
```

### 5.7 Idempotency

Prevents duplicate runs within 24 hours:

```ts
{
    idempotency: "event.data.customer_id"
}
```

Equivalent to rate limit with key, limit 1, period 24h.

### 5.8 Event Batching

Process multiple events in a single function run:

```ts
{
    batchEvents: {
        maxSize: 100,
        timeout: "5s",
        key: "event.data.user_id",    // optional per-key batching
        if: 'event.data.account_type == "free"',  // optional conditional
    }
}
```

Access events via `events` array argument (not `event`).

---

## 6. Error Handling

### Retry Behavior
- Default: 4 retries (5 total attempts including initial)
- Configurable: `retries: 0` to `retries: 20`
- Each `step.run()` has its **own independent retry counter**
- Retries use exponential backoff with jitter

### Error Types

| Error | Import | Effect |
|-------|--------|--------|
| Standard `Error` | built-in | Retried automatically |
| `NonRetriableError` | `import { NonRetriableError } from "inngest"` | Skips remaining retries, fails immediately |
| `RetryAfterError` | `import { RetryAfterError } from "inngest"` | Retries after specified delay |
| `StepError` | thrown by SDK | Thrown when a step exhausts all retries |

```ts
// NonRetriableError -- permanent failure
throw new NonRetriableError("User not found", { cause: originalError })

// RetryAfterError -- retry after specific time
throw new RetryAfterError("Rate limited", "30s")
// Accepts: number (ms), string (ms-compatible), Date
```

### Step Error Handling

After a step exhausts retries, it throws `StepError`. Can be caught with `.catch()`:

```ts
const data = await step.run("risky-step", async () => {
    return await riskyApiCall()
}).catch((err) => {
    // Recover with fallback step
    return step.run("fallback-step", async () => {
        return await fallbackApiCall()
    })
})
```

### Failure Handlers

Two approaches for handling permanent failures:

1. **`onFailure` callback** (per-function):
```ts
inngest.createFunction({
    id: "my-fn",
    retries: 5,
    onFailure: async ({ event, error }) => {
        await cleanupResources(event.data)
    },
}, ...)
```

2. **`inngest/function.failed` system event** (global):
```ts
inngest.createFunction(
    { id: "handle-failures" },
    { event: "inngest/function.failed" },
    async ({ event }) => { /* handle any function failure */ }
)
```

### Attempt Counter

```ts
async ({ attempt }) => {
    // attempt is zero-indexed (0, 1, 2, ...)
    // Reset after each successful step
    if (attempt < 2) {
        // try primary API
    } else {
        // try fallback API
    }
}
```

---

## 7. Cancellation

### Cancel on Events

```ts
{
    cancelOn: [{
        event: "user/account.deleted",
        if: "event.data.userId == async.data.userId",
        timeout: "30m",    // optional: only listen for cancellation event this long
    }]
}
```

### Cancel on Timeouts

```ts
{
    timeouts: {
        start: "10m",    // max time between scheduling and starting
        finish: "1h",    // max total execution time (excludes start wait)
    }
}
```

### System Events for Cleanup

- `inngest/function.cancelled` -- triggered when a function is cancelled
- `inngest/function.failed` -- triggered when a function permanently fails

---

## 8. Middleware

Middleware runs at various lifecycle points. Two lifecycles: `onFunctionRun` and `onSendEvent`.

### Creating Middleware

```ts
import { InngestMiddleware } from "inngest"

const myMiddleware = new InngestMiddleware({
    name: "My Middleware",
    init() {
        return {
            onFunctionRun({ ctx, fn, steps }) {
                return {
                    transformInput({ ctx, fn, steps }) { /* modify input */ },
                    beforeMemoization() { },
                    afterMemoization() { },
                    beforeExecution() { },
                    afterExecution() { },
                    transformOutput({ result, step }) { /* modify output */ },
                    finished({ result }) { },
                    beforeResponse() { },
                }
            },
            onSendEvent() {
                return {
                    transformInput({ payloads }) { /* modify events */ },
                    transformOutput() { /* after events sent */ },
                }
            },
        }
    },
})
```

### Registration Order

1. Client middleware (descending order)
2. Function middleware (descending order)

### Built-in Middleware

- **Encryption**: `@inngest/middleware-encryption` -- E2E encryption for events and step data
- **Sentry**: Error tracking integration
- **Realtime**: `@inngest/realtime/middleware` -- adds `publish()` to function handler
- **Dependency Injection**: Pass shared clients (OpenAI, DB) to functions

---

## 9. Testing

Use `@inngest/test` library. Requires `inngest@>=3.22.12`.

```ts
import { InngestTestEngine } from "@inngest/test"

const t = new InngestTestEngine({ function: myFunction })

// Full execution
const { result, error, ctx, state } = await t.execute()

// Single step execution
const { result } = await t.executeStep("step-id")

// Mock events
t.execute({ events: [{ name: "test/event", data: { message: "Hi" } }] })

// Mock steps
t.execute({
    steps: [
        { id: "my-step", handler() { return "mocked result" } },
        { id: "sleep-step", handler() {} },  // mock sleep as no-op
        { id: "wait-step", handler() { return null } },  // mock timeout
    ],
})

// Assert step usage
expect(ctx.step.run).toHaveBeenCalledWith("my-step", expect.any(Function))

// Assert state
expect(state["my-step"]).resolves.toEqual("expected output")
```

**Supports**: jest, vitest, bun:test, Deno, chai/expect

**Always mock**: `step.sleep`, `step.sleepUntil`, `step.waitForEvent`

---

## 10. TypeScript Integration

### Event Schema Definition

Three methods to define event types:

```ts
// 1. Standard Schema (Zod, Valibot, etc.)
schemas: new EventSchemas().fromSchema({
    "app/user.created": z.object({ userId: z.string() })
})

// 2. Record type
schemas: new EventSchemas().fromRecord<{
    "app/user.created": { data: { userId: string } }
}>()

// 3. Union type
schemas: new EventSchemas().fromUnion<AppUserCreated | AppPostCreated>()

// Can be stacked
schemas: new EventSchemas()
    .fromRecord<Events>()
    .fromSchema(zodSchemas)
```

### Helper Types

```ts
import type { GetEvents, GetFunctionInput, GetStepTools, InngestFunction } from "inngest"

type Events = GetEvents<typeof inngest>
type Input = GetFunctionInput<typeof inngest, "app/user.created">
type Steps = GetStepTools<typeof inngest>
type FnArray = InngestFunction.Any[]
```

---

## 11. Realtime / Streaming

### Realtime (Developer Preview)

Stream data from functions to clients via WebSocket. Requires `@inngest/realtime`.

**Publishing** (from functions):
```ts
// Add realtimeMiddleware() to client
async ({ event, step, publish }) => {
    await publish({
        channel: `user:${event.data.userId}`,
        topic: "ai",
        data: { response: "Hello" },
    })
}
```

**Subscribing** (from browser):
```ts
// Server: create subscription token
const token = await getSubscriptionToken(inngest, {
    channel: `user:${userId}`,
    topics: ["ai"],
})

// Client: React hook
const { data } = useInngestSubscription({
    refreshToken: fetchRealtimeSubscriptionToken,
})

// Client: basic subscribe
const stream = await subscribe(token)
for await (const message of stream) { /* ... */ }
```

**Typed channels**:
```ts
const userChannel = channel((userId: string) => `user:${userId}`)
    .addTopic(topic("ai").schema(z.object({ response: z.string() })))
```

### Response Streaming (Serverless Timeouts)

Extends max serverless timeouts up to 15 minutes by streaming responses:

```ts
serve({
    client: inngest,
    functions: [...],
    streaming: "allow",  // "allow" | "force" | false
})
```

Supported: Cloudflare Workers, Express, Next.js (Vercel Fluid/Edge), Remix (Vercel Edge).

---

## 12. Deployment & Local Development

### Local Development

```bash
# Start dev server
npx inngest-cli@latest dev -u http://localhost:3000/api/inngest

# Docker
docker run -p 8288:8288 inngest/inngest inngest dev -u http://host.docker.internal:3000/api/inngest
```

Dev server: `http://localhost:8288`
- Auto-discovers apps on common ports/endpoints
- Provides UI for testing events, viewing runs, invoking functions
- No event key required locally

### Serving Functions

```ts
import { serve } from "inngest/next"  // or inngest/express, inngest/lambda, etc.

serve({
    client: inngest,
    functions: [fn1, fn2, fn3],
    // signingKey via INNGEST_SIGNING_KEY env var
    // streaming: "allow",
})
```

Exposes single endpoint (typically `/api/inngest`):
- GET: debug info
- POST: invoke functions
- PUT: register functions with Inngest

### Production Deployment

**Environment Variables**:
| Variable | Purpose |
|----------|---------|
| `INNGEST_EVENT_KEY` | Authenticate event sending |
| `INNGEST_SIGNING_KEY` | Secure communication with Inngest |
| `INNGEST_DEV` | Force dev/cloud mode |
| `INNGEST_BASE_URL` | Override Inngest API URL |
| `INNGEST_ENV` | Branch environment name |
| `INNGEST_SERVE_HOST` | Your app's public host |
| `INNGEST_SERVE_PATH` | Path to serve handler |
| `INNGEST_LOG_LEVEL` | SDK log level |
| `INNGEST_STREAMING` | Enable response streaming |

**Supported platforms**: Vercel, Cloudflare, Netlify, Render, DigitalOcean, AWS Lambda, any HTTP server.

---

## 13. Checkpointing

Performance optimization that executes steps eagerly on your server instead of round-tripping to Inngest between each step. Dramatically reduces inter-step latency.

```ts
const inngest = new Inngest({
    id: "my-app",
    checkpointing: true,
    // OR per-function:
})

// Configuration options:
checkpointing: {
    maxRuntime: "300s",      // max continuous execution time
    bufferedSteps: 2,        // steps to buffer before checkpointing
    maxInterval: "10s",      // max interval between checkpoints
}
```

Requires SDK `3.51.0+`. Falls back to standard orchestration on step failure.

---

## 14. Step Parallelism

Run steps in parallel via `Promise.all()`:

```ts
async ({ step }) => {
    const email = step.run("send-email", async () => { /* ... */ })
    const update = step.run("update-db", async () => { /* ... */ })
    const [emailResult, updateResult] = await Promise.all([email, update])
}
```

**Limits**: 1,000 steps max per function, 4MB total state.
**`optimizeParallelism: true`**: Reduces HTTP requests per parallel step from 2 to 1.

---

## 15. Project-Specific Setup (paul codebase)

The project's Inngest setup at `src/inngest/index.ts`:

```ts
const inngest = new Inngest({
    id: "superstarter",
    checkpointing: true,
    schemas: new EventSchemas().fromSchema({
        "superstarter/hello": z.object({ message: z.string().min(1) })
    }),
    logger: inngestLogger,  // pipes to @superbuilders/slog
    eventKey: env.INNGEST_EVENT_KEY,
    signingKey: env.INNGEST_SIGNING_KEY,
    middleware: [realtimeMiddleware()]
})
```

- Functions array at `src/inngest/functions/index.ts` (currently empty)
- Inngest functions use the `logger` parameter from handler context (NOT imported slog)
- Type context pattern: `Context<typeof inngest, EventKey, Overrides>`
- Commands: `bun dev:inngest` for local dev server

---

## 16. Key Patterns & Best Practices

### Function References

For cross-client invocation without pulling in dependencies:

```ts
import { referenceFunction } from "inngest"
const ref = referenceFunction({ functionId: "other-app-fn-id" })
await step.invoke("call-other", { function: ref, data: { ... } })
```

### Working with Loops

Steps in loops automatically get incremented counters:

```ts
for (const item of items) {
    await step.run("process-item", async () => {
        // Same ID "process-item" is fine -- SDK tracks counter
        return await processItem(item)
    })
}
```

### Fan-Out Pattern

Trigger multiple functions from one:

```ts
await step.sendEvent("fan-out", items.map(item => ({
    name: "app/item.process",
    data: item,
})))
```

### Expressions (CEL)

Used in flow control keys, event matching, filtering. Common Expression Language:

```
event.data.customer_id
event.data.plan == "enterprise"
event.data.userId == async.data.userId
"static-key"
event.data.account_id + "-" + event.user.email
```

`event` = triggering event, `async` = the original event (in waitForEvent context).

---

## TL;DR

- Inngest = durable execution engine: event-driven, step-based background jobs with automatic retries, memoization, and flow control
- Steps are individually retried HTTP requests; each step result is memoized to prevent re-execution
- Flow control: concurrency (step-level), throttling (GCRA-based), rate limiting (lossy), debounce, priority, singleton, batching
- Error handling: NonRetriableError, RetryAfterError, StepError catch/rollback, onFailure handlers, inngest/function.failed system event
- Testing via @inngest/test with InngestTestEngine; always mock sleep/waitForEvent steps
- Realtime streaming via @inngest/realtime middleware (publish from functions, subscribe from browser via WebSocket tokens)
- Checkpointing reduces inter-step latency by executing steps eagerly on your server
