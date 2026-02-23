# CTA System + Orchestrator Agent Design

## Problem

Agents need a way to request human feedback and incorporate it into their decision-making. This requires durable suspension (up to 30 days) while waiting for a response.

## Solution

An **orchestrator agent** that manages subagents (explore, code) and can suspend for typed human CTAs via Inngest's `step.waitForEvent()`.

## Architecture: Unified Execution Loop

The LLM only decides what to do. The Inngest loop executes everything.

**Analogy:** The LLM is a waiter that only takes orders. The Inngest loop is the kitchen that makes everything — no exceptions. Every action goes on a ticket (Inngest step), so nothing is lost on crash.

`generateText` is called with tools that have **no `execute` function**. The model returns tool calls, and the loop dispatches each one via the appropriate Inngest primitive:

| Tool Call | Inngest Primitive | Result |
|-----------|------------------|--------|
| `spawn_subagent` | `step.invoke()` | Subagent return value |
| `request_human_feedback` | `step.sendEvent()` + `step.waitForEvent()` | Human's typed response |

### Benefits over split execution

- One code path for all tool calls
- Every tool call is individually checkpointed and memoized
- Every action visible in Inngest dashboard
- No manual message injection for "magic" tools

## Orchestrator Agent

### Scope

Pure orchestrator — no FS tools. Two tools only:

- `spawn_subagent` — delegate work to explore/code agents
- `request_human_feedback` — suspend for human CTA

### Event

```
"paul/agents/orchestrate": {
  prompt: string
  sandboxId: string
}
```

No github info — that's a subagent concern, passed via `spawn_subagent` tool parameters.

### Loop Pseudocode

```
orchestrate(prompt, sandboxId):
  messages = [{ role: "user", content: prompt }]

  for i in 0..MAX_STEPS:
    // LLM thinks (no side effects)
    thought = step.run(`think-${i}`, generateText({
      model, system, messages, tools (no execute)
    }))

    if thought.finishReason === "stop":
      break

    // Append assistant message to history
    messages.push(thought.assistantMessage)

    // Execute each tool call via Inngest primitive
    for each toolCall in thought.toolCalls:
      result = dispatch(toolCall)
      messages.push({ role: "tool", toolCallId, result })

  return final text
```

## CTA System

### Typed CTA Kinds

Three kinds, each with typed request and response schemas:

| Kind | Request Data | Response Data |
|------|-------------|---------------|
| `approval` | `{ message: string }` | `{ approved: boolean, reason?: string }` |
| `text` | `{ prompt: string, placeholder?: string }` | `{ text: string }` |
| `choice` | `{ prompt: string, options: { id: string, label: string }[] }` | `{ selectedId: string }` |

### Events (Discriminated Unions on `kind`)

**Request** (orchestrator → UI) — `z.discriminatedUnion("kind", [...])`:

```
kind: "approval" → { ctaId, runId, kind, message: string }
kind: "text"     → { ctaId, runId, kind, prompt: string, placeholder?: string }
kind: "choice"   → { ctaId, runId, kind, prompt: string, options: { id, label }[] }
```

**Response** (UI → orchestrator) — `z.discriminatedUnion("kind", [...])`:

```
kind: "approval" → { ctaId, kind, approved: boolean, reason?: string }
kind: "text"     → { ctaId, kind, text: string }
kind: "choice"   → { ctaId, kind, selectedId: string }
```

Each kind carries only its relevant fields — no optional sprawl. TypeScript narrows automatically when you check `kind`.

### CTA Flow

1. LLM calls `request_human_feedback` with kind + data
2. Loop generates `ctaId` via `crypto.randomUUID()`
3. `step.sendEvent()` emits `paul/cta/request`
4. `step.waitForEvent()` suspends for `paul/cta/response` matching `data.ctaId`, 30-day timeout
5. If timeout (null) → log and exit gracefully
6. If response → inject as tool result, continue loop

### Spawn Flow

1. LLM calls `spawn_subagent` with agent type, prompt, sandboxId, optional github
2. `step.invoke()` calls the target function (exploreFunction or codeFunction)
3. Returns `{ text, stepCount, totalUsage }`
4. Inject as tool result, continue loop

## File Layout

| File | Purpose |
|------|---------|
| `src/lib/agent/cta.ts` | CTA Zod schemas, types, `request_human_feedback` tool def |
| `src/lib/agent/orchestrator.ts` | Model, instructions, tools (spawn + CTA), MAX_STEPS |
| `src/inngest/functions/agents/orchestrate.ts` | Inngest function with unified execution loop |
| `src/inngest/index.ts` | Three new event schemas added |
| `src/inngest/functions/index.ts` | Register orchestrateFunction |

## UI Delivery

Out of scope for this effort. The event contract (`paul/cta/request` / `paul/cta/response`) is the interface. The UI subscribes to request events and emits response events via an API route.
